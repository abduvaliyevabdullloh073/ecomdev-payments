import logging
import sqlite3
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Path, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import ROOT, Settings, local_today
from app.database import Database
from app.schemas import (
    DebtReport,
    PaymentCreate,
    PaymentRead,
    StudentCreate,
    StudentRead,
    StudentUpdate,
)
from app.service import PaymentService, StudentNotFound

logger = logging.getLogger(__name__)


def get_service(request: Request):
    with request.app.state.database.connect() as connection:
        yield PaymentService(connection)


Service = Annotated[PaymentService, Depends(get_service)]
StudentId = Annotated[int, Path(gt=0)]


def create_app(settings: Settings | None = None) -> FastAPI:
    database = Database((settings or Settings.from_env()).database_path)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        database.initialize()
        yield

    application = FastAPI(
        title="Учёт оплат учебного центра",
        description="Ecomdev: ученики, оплаты и должники за календарный месяц. Валюта — UZS.",
        version="1.0.0",
        lifespan=lifespan,
    )
    application.state.database = database

    @application.middleware("http")
    async def response_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        if request.url.path == "/" or request.url.path.startswith("/static/"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self'; style-src 'self'; "
                "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
                "base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
            )
        return response

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, error: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Проверьте поля запроса.",
                "errors": [
                    {
                        "field": ".".join(str(part) for part in item["loc"]),
                        "message": item["msg"],
                    }
                    for item in error.errors()
                ],
            },
        )

    @application.exception_handler(StudentNotFound)
    async def student_not_found(_request: Request, _error: StudentNotFound):
        return JSONResponse(status_code=404, content={"detail": "Ученик не найден."})

    @application.exception_handler(sqlite3.OperationalError)
    async def database_error(_request: Request, error: sqlite3.OperationalError):
        logger.exception("SQLite operation failed")
        if getattr(error, "sqlite_errorcode", None) in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED):
            return JSONResponse(
                status_code=503,
                content={"detail": "База занята. Попробуйте ещё раз."},
                headers={"Retry-After": "1"},
            )
        return JSONResponse(status_code=500, content={"detail": "Ошибка базы данных."})

    @application.get("/", include_in_schema=False)
    def index():
        return FileResponse(ROOT / "app" / "static" / "index.html")

    @application.get("/health", tags=["Сервис"])
    def health(service: Service):
        service.connection.execute("SELECT 1").fetchone()
        return {"status": "ok"}

    @application.get("/config", tags=["Сервис"])
    def config():
        today = local_today().isoformat()
        return {"today": today, "month": today[:7], "timezone": "Asia/Tashkent", "currency": "UZS"}

    @application.get("/students", response_model=list[StudentRead], tags=["Ученики"])
    def list_students(service: Service):
        return service.list_students()

    @application.post("/students", response_model=StudentRead, status_code=201, tags=["Ученики"])
    def create_student(payload: StudentCreate, service: Service):
        return service.create_student(payload)

    @application.get("/students/{student_id}", response_model=StudentRead, tags=["Ученики"])
    def get_student(student_id: StudentId, service: Service):
        return service.get_student(student_id)

    @application.put("/students/{student_id}", response_model=StudentRead, tags=["Ученики"])
    def replace_student(student_id: StudentId, payload: StudentCreate, service: Service):
        return service.update_student(student_id, payload)

    @application.patch("/students/{student_id}", response_model=StudentRead, tags=["Ученики"])
    def update_student(student_id: StudentId, payload: StudentUpdate, service: Service):
        return service.update_student(student_id, payload)

    @application.delete("/students/{student_id}", status_code=204, tags=["Ученики"])
    def delete_student(student_id: StudentId, service: Service):
        service.delete_student(student_id)
        return Response(status_code=204)

    @application.get(
        "/students/{student_id}/payments", response_model=list[PaymentRead], tags=["Оплаты"]
    )
    def list_payments(student_id: StudentId, service: Service):
        return service.list_payments(student_id)

    @application.post(
        "/students/{student_id}/payments",
        response_model=PaymentRead,
        status_code=201,
        tags=["Оплаты"],
    )
    def create_payment(student_id: StudentId, payload: PaymentCreate, service: Service):
        return service.create_payment(student_id, payload)

    @application.get("/debtors", response_model=DebtReport, tags=["Отчёт"])
    def debtors(
        service: Service, month: Annotated[str, Query(description="YYYY-MM, например 2026-10")]
    ):
        try:
            return service.debt_report(month)
        except ValueError as error:
            raise HTTPException(
                status_code=422, detail="Укажите существующий месяц: YYYY-MM."
            ) from error

    application.mount("/static", StaticFiles(directory=ROOT / "app" / "static"), name="static")
    return application
