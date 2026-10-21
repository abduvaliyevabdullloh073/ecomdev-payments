import { z } from "zod";

export const MAX_AMOUNT = 100_000_000;

/** Convert a validated decimal value without multiplying a binary fraction. */
export function toMinor(value: number): number {
  const [whole = "0", fraction = ""] = String(value).split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const fromMinor = (value: number): number => value / 100;

export function isCalendarDate(value: string): boolean {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export const monthSchema = z
  .string()
  .regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, "validationMonth");
export const dateSchema = z.string().refine(isCalendarDate, "validationDate");
const money = z
  .number()
  .finite()
  .min(0, "validationNonnegative")
  .max(MAX_AMOUNT, "validationMaximum")
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(String(value)),
    "validationDecimals",
  );
const positiveMoney = money.refine((value) => value > 0, "validationPositive");
export const studentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "validationRequired")
      .max(100, "validationLength"),
    phone: z
      .string()
      .trim()
      .min(5, "validationPhoneDigits")
      .max(30, "validationLength")
      .regex(/^\+?[\d ()-]+$/, "validationPhone")
      .refine(
        (value) => value.replace(/\D/g, "").length >= 5,
        "validationPhoneDigits",
      ),
    group: z
      .string()
      .trim()
      .min(1, "validationRequired")
      .max(80, "validationLength"),
    monthlyFee: money,
  })
  .strict();
export const updateStudentSchema = studentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "validationPatch");
export const idSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "validationId")
  .transform(Number)
  .refine(Number.isSafeInteger, "validationIdLarge");
export const paymentSchema = z
  .object({
    studentId: z
      .number()
      .int("validationInteger")
      .positive("validationId")
      .max(Number.MAX_SAFE_INTEGER, "validationIdLarge"),
    amount: positiveMoney,
    date: dateSchema,
  })
  .strict();
export const nestedPaymentSchema = paymentSchema.omit({ studentId: true });

export type StudentInput = z.infer<typeof studentSchema>;
export type StudentPatch = z.infer<typeof updateStudentSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export interface Student extends StudentInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}
export interface Payment extends PaymentInput {
  id: number;
  createdAt: string;
  studentName: string;
  group: string;
}
export interface Balance {
  studentId: number;
  name: string;
  phone: string;
  group: string;
  monthlyFee: number;
  paid: number;
  debt: number;
}

export function monthRange(month: string): { start: string; end: string } {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${lastDay}` };
}

export function calendarToday(timeZone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
