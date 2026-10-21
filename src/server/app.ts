import express from "express";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { AppError } from "./errors.js";
import { LedgerRepository } from "./repository.js";
import { LedgerService } from "./service.js";
import {
  calendarToday,
  idSchema,
  monthSchema,
  nestedPaymentSchema,
  paymentSchema,
  studentSchema,
  updateStudentSchema,
} from "./domain.js";
import {
  apiErrorKeys,
  defaultLanguage,
  isLanguage,
  isMessageKey,
  languages,
  translate,
} from "../shared/i18n.js";
import type { MessageKey } from "../shared/i18n.js";

export interface AppOptions {
  db: DatabaseSync;
  staticDirectory?: string;
  timeZone?: string;
  logError?: (error: unknown) => void;
}

export function createApp(options: AppOptions) {
  const service = new LedgerService(new LedgerRepository(options.db));
  const timeZone = options.timeZone ?? "Asia/Tashkent";
  calendarToday(timeZone); // Validate startup configuration, rather than failing on the first request.
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.use((req, res, next) => {
    const accepted = req.acceptsLanguages([...languages]);
    res.locals["language"] = isLanguage(accepted) ? accepted : defaultLanguage;
    next();
  });
  app.use((_req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    });
    next();
  });
  app.use((req, _res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (origin) {
      let normalizedOrigin: string;
      try {
        normalizedOrigin = new URL(origin).origin;
      } catch {
        throw new AppError(403, "ORIGIN_REJECTED", "Ruxsat etilmagan manba.");
      }
      if (normalizedOrigin !== `${req.protocol}://${req.get("host")}`)
        throw new AppError(403, "ORIGIN_REJECTED", "Ruxsat etilmagan manba.");
    }
    if (req.method !== "DELETE" && !req.is("application/json")) {
      throw new AppError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type: application/json talab qilinadi.",
      );
    }
    next();
  });
  app.use(express.json({ limit: "16kb", strict: true }));

  app.get("/health", (_req, res) => {
    options.db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  });
  app.get("/config", (_req, res) =>
    res.json({
      today: calendarToday(timeZone),
      timeZone,
      currency: "UZS",
      languages,
      defaultLanguage,
    }),
  );
  app.get("/students", (_req, res) =>
    res.json({ students: service.listStudents() }),
  );
  app.post("/students", (req, res) => {
    const student = service.createStudent(studentSchema.parse(req.body));
    res.status(201).location(`/students/${student.id}`).json(student);
  });
  app.get("/students/:id", (req, res) =>
    res.json(service.getStudent(idSchema.parse(req.params.id))),
  );
  app.put("/students/:id", (req, res) =>
    res.json(
      service.updateStudent(
        idSchema.parse(req.params.id),
        studentSchema.parse(req.body),
      ),
    ),
  );
  app.patch("/students/:id", (req, res) =>
    res.json(
      service.updateStudent(
        idSchema.parse(req.params.id),
        updateStudentSchema.parse(req.body),
      ),
    ),
  );
  app.delete("/students/:id", (req, res) => {
    service.deleteStudent(idSchema.parse(req.params.id));
    res.status(204).end();
  });
  app.post("/payments", (req, res) =>
    res.status(201).json(service.createPayment(paymentSchema.parse(req.body))),
  );
  app.get("/payments", (req, res) => {
    const filter: { studentId?: number; month?: string } = {};
    if (req.query["studentId"] !== undefined)
      filter.studentId = idSchema.parse(req.query["studentId"]);
    if (req.query["month"] !== undefined)
      filter.month = monthSchema.parse(req.query["month"]);
    res.json({ payments: service.listPayments(filter) });
  });
  app.get("/students/:id/payments", (req, res) =>
    res.json({
      payments: service.studentPayments(idSchema.parse(req.params.id)),
    }),
  );
  app.post("/students/:id/payments", (req, res) => {
    res
      .status(201)
      .json(
        service.createPayment({
          ...nestedPaymentSchema.parse(req.body),
          studentId: idSchema.parse(req.params.id),
        }),
      );
  });
  app.get("/debtors", (req, res) => {
    const month = monthSchema.parse(req.query["month"]);
    const { balances, summary } = service.report(month);
    const debtors = balances.filter((row) => row.debt > 0);
    res.json({
      month,
      count: debtors.length,
      totalDebt: summary.outstanding,
      debtors,
    });
  });
  app.get("/summary", (req, res) =>
    res.json(service.report(monthSchema.parse(req.query["month"])).summary),
  );

  if (options.staticDirectory)
    app.use(
      express.static(options.staticDirectory, {
        index: "index.html",
        dotfiles: "deny",
        etag: false,
      }),
    );
  app.use((_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "Manzil topilmadi.")),
  );
  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    _next,
  ) => {
    const language = isLanguage(res.locals["language"])
      ? res.locals["language"]
      : defaultLanguage;
    res.set("Content-Language", language).vary("Accept-Language");
    const sendError = (status: number, code: string) => {
      const messageKey = apiErrorKeys[code] ?? "apiInternal";
      res
        .status(status)
        .json({
          error: { code, message: translate(language, messageKey), messageKey },
        });
    };
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: translate(language, "apiValidation"),
          messageKey: "apiValidation",
          details: error.issues.map((issue) => {
            const messageKey: MessageKey = isMessageKey(issue.message)
              ? issue.message
              : issue.code === "unrecognized_keys"
                ? "validationUnknownFields"
                : issue.code === "invalid_type" && issue.expected === "number"
                  ? "validationNumber"
                  : issue.code === "invalid_type" && issue.expected === "string"
                    ? "validationText"
                    : "validationValue";
            return {
              field: issue.path.join("."),
              message: translate(language, messageKey),
              messageKey,
            };
          }),
        },
      });
      return;
    }
    if (error instanceof AppError) {
      sendError(error.status, error.code);
      return;
    }
    const bodyError = error as { type?: string } | null;
    if (bodyError?.type === "entity.parse.failed") {
      sendError(400, "INVALID_JSON");
      return;
    }
    if (bodyError?.type === "entity.too.large") {
      sendError(413, "BODY_TOO_LARGE");
      return;
    }
    (options.logError ?? console.error)(error);
    sendError(500, "INTERNAL_ERROR");
  };
  app.use(errorHandler);
  return app;
}
