import { test, expect } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const { students } = (await (await request.get("/students")).json()) as {
    students: { id: number }[];
  };
  for (const student of students)
    await request.delete(`/students/${student.id}`);
});

const wording = {
  uz: {
    heading: "To‘lovlar nazoratda",
    add: "To‘lov qo‘shish",
    save: "Saqlash",
    savePayment: "To‘lovni saqlash",
    invalidPhone: "Telefon raqami noto‘g‘ri.",
    history: "Barcha oylardagi to‘lovlar · 1 ta yozuv",
  },
  ru: {
    heading: "Оплаты под контролем",
    add: "Добавить оплату",
    save: "Сохранить",
    savePayment: "Сохранить оплату",
    invalidPhone: "Некорректный номер телефона.",
    history: "Оплаты за все месяцы · записей: 1",
  },
  en: {
    heading: "Payments under control",
    add: "Add payment",
    save: "Save",
    savePayment: "Save payment",
    invalidPhone: "Invalid phone number.",
    history: "Payments across all months · records: 1",
  },
};

for (const language of ["uz", "ru", "en"] as const) {
  test(`student and payment flow in ${language}; live switching keeps form values and errors`, async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?month=2026-10&lang=${language}`);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${wording[language].heading}.`,
    );
    await expect(page.locator("#add-payment")).toHaveText(
      wording[language].add,
    );
    await expect(page.locator("#table-content")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await page.locator("#add-student").click();
    await expect(
      page.locator("#student-dialog [data-language-control]"),
    ).toHaveValue(language);
    await page.locator("#student-name").fill("Locale <img src=x> Student");
    await page.locator("#student-phone").fill("abcde");
    await page.locator("#student-group").fill("Node N1");
    await page.locator("#student-fee").fill("100");
    await page.locator("#save-student").click();
    await expect(page.locator("#student-error")).toContainText(
      wording[language].invalidPhone,
    );
    const other = language === "ru" ? "en" : "ru";
    const dialogLanguage = page.locator(
      "#student-dialog [data-language-control]",
    );
    await dialogLanguage.selectOption(other);
    await expect(page.locator("#student-name")).toHaveValue(
      "Locale <img src=x> Student",
    );
    await expect(page.locator("#student-fee")).toHaveValue("100");
    await expect(page.locator("#student-error")).toContainText(
      wording[other].invalidPhone,
    );
    await expect(page.locator("#save-student")).toHaveText(wording[other].save);
    await dialogLanguage.selectOption(language);
    await page.locator("#student-phone").fill("+998 90 111 22 33");
    await page.locator("#save-student").click();
    await expect(page.locator(".student-name")).toHaveText(
      "Locale <img src=x> Student",
    );
    await expect(page.locator("#table-content img")).toHaveCount(0);
    await page.locator(".row-pay").click();
    await expect(
      page.locator("#payment-dialog [data-language-control]"),
    ).toHaveValue(language);
    await expect(page.locator("#save-payment")).toHaveText(
      wording[language].savePayment,
    );
    await page.locator("#payment-amount").fill("12.5");
    await page.locator("#payment-date").fill("2026-10-09");
    const paymentRequest = page.waitForRequest(
      (request) =>
        request.url().endsWith("/payments") && request.method() === "POST",
    );
    await page.locator("#save-payment").click();
    expect((await paymentRequest).headers()["accept-language"]).toBe(language);
    await expect(page.locator("#table-content")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    const report = (await (
      await request.get("/debtors?month=2026-10")
    ).json()) as { totalDebt: number };
    expect(report.totalDebt).toBe(87.5);
    await page.locator(".student-name").click();
    await expect(page.locator("#history-content")).toContainText(
      wording[language].history,
    );
    const historyLanguage = page.locator(
      "#history-dialog [data-language-control]",
    );
    await historyLanguage.selectOption(other);
    await expect(page.locator("#history-content")).toContainText(
      wording[other].history,
    );
    await page.locator("#history-dialog .close-dialog").click();
    await page.goto("/?month=2026-10");
    await expect(page.locator("#language")).toHaveValue(other);
    await expect(page.locator("html")).toHaveAttribute("lang", other);
    await expect(page.locator(".student-name")).toHaveText(
      "Locale <img src=x> Student",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("unsupported locales fall back safely and a supported URL choice overrides storage", async ({
  page,
}) => {
  await page.goto("/?lang=xx");
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await page.locator("#language").selectOption("ru");
  await expect(page.locator("#search")).toHaveAttribute(
    "placeholder",
    "Имя, телефон или группа…",
  );
  await page.goto("/?lang=xx");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.goto("/?lang=en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("Ecomdev — Payments");
  await page.reload();
  await expect(page.locator("#language")).toHaveValue("en");
});

test("language selection works when localStorage access is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Unavailable", "SecurityError");
      },
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?lang=en");
  await expect(page.locator("#language")).toHaveValue("en");
  await page.locator("#language").selectOption("ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("#table-content")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.reload();
  await expect(page.locator("#language")).toHaveValue("ru");
  expect(errors).toEqual([]);
});

test("server errors, empty states and retry controls change language immediately", async ({
  page,
}) => {
  await page.route("**/debtors?*", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Server xatosi. Qayta urinib ko‘ring.",
          messageKey: "apiInternal",
        },
      }),
    }),
  );
  await page.goto("/?lang=en");
  await expect(page.locator("#load-error-text")).toHaveText(
    "Server error. Please try again.",
  );
  await page.locator("#language").selectOption("ru");
  await expect(page.locator("#load-error-text")).toHaveText(
    "Ошибка сервера. Повторите попытку.",
  );
  await expect(page.locator("#table-content")).toContainText(
    "Не удалось загрузить данные",
  );
  await expect(page.locator("#retry")).toHaveText("Повторить");
  await page.unroute("**/debtors?*");
  await page.locator("#retry").click();
  await expect(page.locator("#table-content")).toContainText(
    "Начните с добавления ученика",
  );
});
