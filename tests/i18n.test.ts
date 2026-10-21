import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatCalendarDate,
  formatNumber,
  isLanguage,
  isMessageKey,
  languages,
  messages,
  resolveLanguage,
  translate,
} from "../src/shared/i18n.js";

test("language selection gives a supported URL language priority and safely falls back to Uzbek", () => {
  assert.equal(resolveLanguage("ru", "en"), "ru");
  assert.equal(resolveLanguage(null, "en"), "en");
  assert.equal(resolveLanguage("de", "ru"), "ru");
  assert.equal(resolveLanguage("de", "invalid"), "uz");
  assert.equal(resolveLanguage(undefined, undefined), "uz");
  assert.equal(isLanguage("__proto__"), false);
  assert.equal(isMessageKey("constructor"), false);
  assert.equal(isMessageKey("unknown.translation"), false);
});

test("every language has nonempty text with the same interpolation placeholders", () => {
  const placeholders = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [key, translations] of Object.entries(messages)) {
    for (const translation of translations) {
      assert.ok(translation.trim(), key);
      assert.deepEqual(
        placeholders(translation),
        placeholders(translations[0]),
        key,
      );
    }
  }
  const html = readFileSync("public/index.html", "utf8");
  for (const match of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g))
    assert.equal(isMessageKey(match[1]), true, match[1]);
});

test("translation preserves literal user values and does not interpolate inherited properties", () => {
  assert.equal(translate("ru", "addPayment"), "Добавить оплату");
  assert.equal(translate("en", "addPayment"), "Add payment");
  assert.equal(
    translate("en", "payFor", { name: "<img src=x> $&" }),
    "Payment for <img src=x> $&",
  );
  assert.equal(
    translate(
      "en",
      "payFor",
      Object.create({ name: "inherited" }) as Record<string, string>,
    ),
    "Payment for {name}",
  );
});

test("amounts follow the locale without converting the stored currency or value", () => {
  assert.equal(formatNumber("en", 1234.5), "1,234.5");
  assert.equal(
    formatNumber("ru", 1234.5).replace(/[\u00a0\u202f]/g, " "),
    "1 234,5",
  );
  for (const language of languages)
    assert.ok(formatNumber(language, 0.01).includes("01"));
});

test("calendar-date display respects the language and cannot shift to the previous day", () => {
  assert.equal(formatCalendarDate("en", "2026-02-01"), "02/01/2026");
  assert.equal(formatCalendarDate("ru", "2026-02-01"), "01.02.2026");
  assert.equal(formatCalendarDate("en", "9999-12-31"), "12/31/9999");
});
