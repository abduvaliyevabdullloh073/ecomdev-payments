import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Annotated

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    PlainSerializer,
    StringConstraints,
    model_validator,
)

MAX_MONEY = Decimal("1000000000.00")


def parse_money(value):
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise ValueError("Сумма должна быть числом или строкой с числом.")
    if len(str(value)) > 60:
        raise ValueError("Слишком длинная запись суммы.")
    try:
        result = Decimal(str(value))
        if not result.is_finite() or result < 0 or result > MAX_MONEY:
            raise ValueError("Сумма должна быть от 0 до 1 000 000 000.")
        rounded = result.quantize(Decimal("0.01"))
        if result != rounded:
            raise ValueError("Допустимо не более двух знаков после точки.")
        return rounded
    except InvalidOperation as error:
        raise ValueError("Некорректная сумма.") from error


def parse_phone(value):
    if not isinstance(value, str):
        raise ValueError("Телефон должен быть строкой.")
    value = value.strip()
    if not re.fullmatch(r"\+?[0-9() -]+", value):
        raise ValueError("Допустимы цифры, + в начале, пробелы, скобки и дефисы.")
    if not 7 <= len(re.sub(r"\D", "", value)) <= 15:
        raise ValueError("В телефоне должно быть от 7 до 15 цифр.")
    return value


def parse_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("Дата должна быть в формате YYYY-MM-DD.")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError("Такой даты не существует.") from error


Money = Annotated[
    Decimal,
    BeforeValidator(parse_money),
    Field(ge=0, le=MAX_MONEY),
    PlainSerializer(lambda value: format(value, ".2f"), return_type=str, when_used="json"),
]
ExactAmount = Annotated[
    Decimal,
    PlainSerializer(lambda value: format(value, ".2f"), return_type=str, when_used="json"),
]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Group = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Phone = Annotated[str, BeforeValidator(parse_phone), Field(max_length=30)]
PaymentDate = Annotated[date, BeforeValidator(parse_date)]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StudentCreate(InputModel):
    name: Name
    phone: Phone
    group: Group
    monthly_fee: Money


class StudentUpdate(InputModel):
    name: Name | None = None
    phone: Phone | None = None
    group: Group | None = None
    monthly_fee: Money | None = None

    @model_validator(mode="before")
    @classmethod
    def require_non_null_changes(cls, value):
        if isinstance(value, dict):
            if not value:
                raise ValueError("Укажите хотя бы одно поле для изменения.")
            if any(item is None for item in value.values()):
                raise ValueError("Поля ученика не могут быть null.")
        return value


class StudentRead(BaseModel):
    id: int
    name: str
    phone: str
    group: str
    monthly_fee: Money


class PaymentCreate(InputModel):
    amount: Annotated[Money, Field(gt=0)]
    date: PaymentDate


class PaymentRead(BaseModel):
    id: int
    student_id: int
    amount: Money
    date: date


class DebtorRead(BaseModel):
    student_id: int
    name: str
    phone: str
    group: str
    monthly_fee: Money
    paid: ExactAmount
    debt: Money


class DebtReport(BaseModel):
    month: str
    student_count: int
    debtor_count: int
    total_expected: ExactAmount
    total_paid: ExactAmount
    total_debt: ExactAmount
    debtors: list[DebtorRead]
