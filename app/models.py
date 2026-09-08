from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BillItem(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True
    )

    name: str
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)
    total_price: float = Field(ge=0)

    name_confidence: float = Field(ge=0, le=1)
    quantity_confidence: float = Field(ge=0, le=1)
    price_confidence: float = Field(ge=0, le=1)

    @field_validator("total_price")
    @classmethod
    def validate_item_total(cls, value, info):
        data = info.data

        if "quantity" in data and "unit_price" in data:
            expected = Decimal(str(data["quantity"])) * Decimal(
                str(data["unit_price"])
            )
            actual = Decimal(str(value))

            if abs(expected - actual) > Decimal("0.05"):
                raise ValueError(
                    f"Item total mismatch: expected approximately "
                    f"{expected}, got {actual}"
                )

        return value


class Bill(BaseModel):
    items: List[BillItem]

    subtotal: float = Field(ge=0)
    discount: float = Field(ge=0)
    tax: float = Field(ge=0)
    service_charge: float = Field(ge=0)
    total: float = Field(ge=0)


class ExtractionResponse(BaseModel):
    success: bool
    bill: Optional[Bill] = None
    message: str