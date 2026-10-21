// Real HTTP server + isolated temporary SQLite database + desktop/mobile Chromium.
// The application itself does not need Node.js.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const python =
  process.env.PYTHON ||
  join(
    root,
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
const temporary = await mkdtemp(join(tmpdir(), "ecomdev-browser-"));
const reservation = createServer();
await new Promise((done) => reservation.listen(0, "127.0.0.1", done));
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const env = {
  ...process.env,
  DATABASE_PATH: join(temporary, "test.sqlite3"),
  HOST: "127.0.0.1",
  PORT: String(port),
};
let serverLog = "";
const server = spawn(python, ["-m", "app"], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (data) => {
  serverLog += data;
});
server.stderr.on("data", (data) => {
  serverLog += data;
});
let spawnError;
server.on("error", (error) => {
  spawnError = error;
});
const base = `http://127.0.0.1:${port}`;
let browser;
const checks = [];

async function waitUntil(check, message) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(50);
  }
  throw new Error(message);
}

try {
  await waitUntil(async () => {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) throw new Error(serverLog);
    try {
      return (await fetch(base + "/health")).ok;
    } catch {
      return false;
    }
  }, "Application did not start");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? {
          executablePath: process.env.BROWSER_EXECUTABLE,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const loaded = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#stats").getAttribute("aria-busy") ===
          "false" && document.querySelector("#loading-state").hidden,
    );
  const text = (selector) => page.locator(selector).textContent();
  const hasText = (selector, expected) =>
    waitUntil(
      async () => (await text(selector)).includes(expected),
      `Expected ${selector} to contain ${expected}`,
    );

  await page.goto(base);
  await loaded();
  assert.match(await text("#empty-title"), /первого ученика/);
  checks.push("Empty database has a useful onboarding state");

  await page.locator("#new-student").click();
  await page.locator("#student-name").fill("Ali UI");
  await page.locator("#student-phone").fill("+998 90 123 45 67");
  await page.locator("#student-group").fill("Python-01");
  await page.locator("#student-fee").fill("100.30");
  await page.locator("#student-form button[type=submit]").click();
  await page.locator("#student-dialog").waitFor({ state: "hidden" });
  await loaded();
  await hasText("#table-container", "Ali UI");
  checks.push("Student can be created through the UI");

  await page
    .getByRole("button", { name: "Изменить: Ali UI", exact: true })
    .click();
  await page.locator("#student-group").fill("Python-02");
  await page.locator("#student-fee").fill("100.50");
  await page.locator("#student-form button[type=submit]").click();
  await page.locator("#student-dialog").waitFor({ state: "hidden" });
  await loaded();
  await hasText("#table-container", "Python-02");
  checks.push("Student details and fee can be edited");

  const unsafeName = '<img src=x onerror="window.__xss=true">';
  const unsafeResponse = await page.request.post(base + "/students", {
    data: {
      name: unsafeName,
      phone: "998901111111",
      group: "Free",
      monthly_fee: "0",
    },
  });
  assert.equal(unsafeResponse.status(), 201);
  await page.locator("#refresh").click();
  await loaded();
  await hasText("#table-container", unsafeName);
  assert.equal(await page.locator("#table-container img").count(), 0);
  assert.equal(await page.evaluate(() => Boolean(window.__xss)), false);
  checks.push("Untrusted names are rendered as text, without script execution");

  await page.locator("#month").fill("2026-10");
  await page.locator("#month").dispatchEvent("change");
  await loaded();
  await page.locator("#nav-overview").click();
  await page
    .getByRole("button", { name: "Внести оплату: Ali UI", exact: true })
    .click();
  assert.equal(await page.locator("#payment-amount").inputValue(), "100.50");
  await page.locator("#payment-amount").fill("0");
  await page.locator("#payment-form button[type=submit]").click();
  assert.match(await text("#payment-dialog .form-error"), /больше 0/);
  let paymentRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/payments"))
      paymentRequests++;
  });
  await page.locator("#payment-amount").fill("40,20");
  await page.locator("#payment-date").fill("2026-10-15");
  await page.locator("#payment-form").evaluate((form) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await page.locator("#payment-dialog").waitFor({ state: "hidden" });
  await loaded();
  assert.equal(paymentRequests, 1);
  const report = await (
    await page.request.get(base + "/debtors?month=2026-10")
  ).json();
  assert.equal(report.total_debt, "60.30");
  checks.push(
    "Payment validation, comma input, exact debt and double-submit protection work",
  );

  await page
    .getByRole("button", { name: "История оплат: Ali UI", exact: true })
    .click();
  await hasText("#history-content", "40,2");
  assert.equal(await page.locator("#history-content tbody tr").count(), 1);
  await page.locator("#history-pay").click();
  await page.locator("#payment-amount").fill("60.30");
  await page.locator("#payment-date").fill("2026-10-31");
  await page.locator("#payment-form button[type=submit]").click();
  await page.locator("#payment-dialog").waitFor({ state: "hidden" });
  await loaded();
  await hasText("#empty-title", "Должников нет");
  checks.push(
    "History shows saved payments and fully paid students leave the debt list",
  );

  await page.locator("#month").fill("2026-11");
  await page.locator("#month").dispatchEvent("change");
  await loaded();
  await hasText("#table-container", "Ali UI");
  checks.push("Changing the selected month recalculates debts");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#nav-students").click();
    await page.locator("#search").fill("Ali UI");
    assert.equal(await page.locator("#table-container tbody tr").count(), 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
      `Horizontal overflow at ${width}px`,
    );
    await page.locator("#new-payment").click();
    const bounds = await page.locator("#payment-dialog").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
    await page.locator("#payment-dialog [data-close]").first().click();
  }
  checks.push(
    "Search, payment dialog and layout work at 390px and 320px widths",
  );

  await page
    .getByRole("button", { name: "Удалить: Ali UI", exact: true })
    .click();
  await page.locator("#confirm-delete").click();
  await page.locator("#delete-dialog").waitFor({ state: "hidden" });
  await loaded();
  assert.equal(
    (await page.request.get(base + "/students/1/payments")).status(),
    404,
  );
  checks.push("Deletion through the UI removes the student and their payments");

  await page.route("**/debtors?*", (route) => route.abort());
  await page.locator("#refresh").click();
  await page.locator("#connection-error").waitFor({ state: "visible" });
  await page.unroute("**/debtors?*");
  await page.locator("#refresh").click();
  await loaded();
  assert.equal(await page.locator("#connection-error").isVisible(), false);
  checks.push(
    "Connection errors are shown and refreshing recovers the interface",
  );

  // Optional visual QA uses fictitious data and remains outside source control.
  const remaining = await (await page.request.get(base + "/students")).json();
  for (const student of remaining)
    await page.request.delete(base + `/students/${student.id}`);
  const seed = spawnSync(python, ["-m", "app.seed"], { cwd: root, env });
  assert.equal(seed.status, 0, String(seed.stderr));
  await page.locator("#search").fill("");
  // Read the authoritative server month instead of relying on locale order.
  const config = await (await page.request.get(base + "/config")).json();
  await page.locator("#month").fill(config.month);
  await page.locator("#month").dispatchEvent("change");
  await loaded();
  await page.locator("#nav-overview").click();
  await page.locator("#toast").waitFor({ state: "hidden" });
  await mkdir(join(root, "test-results"), { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: join(root, "test-results/desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(root, "test-results/mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, [], "Uncaught browser errors");
  console.log(
    checks.map((name, index) => `${index + 1}. PASS: ${name}`).join("\n"),
  );
  console.log(
    `\n${checks.length} browser checks passed. No uncaught browser errors.`,
  );
} catch (error) {
  console.error(error);
  console.error(serverLog);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  const closed = new Promise((done) => {
    if (server.exitCode !== null || spawnError) done();
    else server.once("close", done);
  });
  server.kill("SIGTERM");
  await closed;
  await rm(temporary, { recursive: true, force: true });
}
