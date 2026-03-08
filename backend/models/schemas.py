from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TripStatus = Literal["Wishlist", "Actively Planning", "Booked", "Completed", "Cancelled"]
TripPriority = Literal["Must-do", "Want-to", "Nice-to-have"]
DATE_RANGE_ERROR_MESSAGE = "target_date_start must be less than or equal to target_date_end"


class WarningMessage(BaseModel):
    code: str
    message: str


class CostItemBase(BaseModel):
    category: str = Field(min_length=1, max_length=255)
    amount: float = Field(ge=0)
    currency: str | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        currency = value.upper()
        if len(currency) != 3 or not currency.isalpha():
            raise ValueError("currency must be a 3-letter uppercase code")
        return currency


class CostItemCreate(CostItemBase):
    pass


class CostItemRead(CostItemBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class CommentBase(BaseModel):
    body: str = Field(min_length=1)
    url: str | None = None


class CommentCreate(CommentBase):
    pass


class CommentRead(CommentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PersonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class PersonRead(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class SettingsUpdate(BaseModel):
    home_city: str | None = None
    home_zip: str | None = None


class SettingsRead(BaseModel):
    home_city: str | None = None
    home_zip: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TripBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    location: str = Field(min_length=1, max_length=255)
    origin: str | None = None
    status: TripStatus
    priority: TripPriority
    trip_types: list[str] = Field(default_factory=list)
    activity_level: int = Field(ge=1, le=5)
    travel_time_hours: float = Field(default=0, ge=0)
    duration_days: float = Field(default=0, ge=0)
    target_date_start: date | None = None
    target_date_end: date | None = None
    target_date_range: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "TripBase":
        if (
            self.target_date_start
            and self.target_date_end
            and self.target_date_start > self.target_date_end
        ):
            raise ValueError(DATE_RANGE_ERROR_MESSAGE)
        return self


class TripCreate(TripBase):
    cost_items: list[CostItemCreate] = Field(default_factory=list)
    comments: list[CommentCreate] = Field(default_factory=list)
    person_ids: list[int] = Field(default_factory=list)


class TripUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    location: str | None = Field(default=None, min_length=1, max_length=255)
    origin: str | None = None
    status: TripStatus | None = None
    priority: TripPriority | None = None
    trip_types: list[str] | None = None
    activity_level: int | None = Field(default=None, ge=1, le=5)
    travel_time_hours: float | None = Field(default=None, ge=0)
    duration_days: float | None = Field(default=None, ge=0)
    target_date_start: date | None = None
    target_date_end: date | None = None
    target_date_range: str | None = None
    notes: str | None = None
    cost_items: list[CostItemCreate] | None = None
    comments: list[CommentCreate] | None = None
    person_ids: list[int] | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "TripUpdate":
        if (
            self.target_date_start
            and self.target_date_end
            and self.target_date_start > self.target_date_end
        ):
            raise ValueError(DATE_RANGE_ERROR_MESSAGE)
        return self


class TripRead(BaseModel):
    id: int
    title: str
    location: str
    location_lat: float | None = None
    location_lng: float | None = None
    origin: str | None = None
    origin_lat: float | None = None
    origin_lng: float | None = None
    distance_miles: float | None = None
    status: TripStatus
    priority: TripPriority
    trip_types: list[str]
    activity_level: int
    travel_time_hours: float
    duration_days: float
    total_trip_length: str
    target_date_start: date | None = None
    target_date_end: date | None = None
    target_date_range: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    cost_items: list[CostItemRead]
    comments: list[CommentRead]
    people: list[PersonRead]
    per_person_cost: float | None = None
    per_person_currency: str | None = None


class TripMutationResponse(TripRead):
    warnings: list[WarningMessage] = Field(default_factory=list)


class TripListResponse(BaseModel):
    trips: list[TripRead]


class ExportResponse(BaseModel):
    schema_version: str
    exported_at: datetime
    trips: list[TripRead]
    people: list[PersonRead]
    settings: SettingsRead


class CostItemRestore(CostItemBase):
    id: int


class CommentRestore(CommentBase):
    id: int
    created_at: datetime


class TripRestore(BaseModel):
    id: int
    title: str = Field(min_length=1, max_length=255)
    location: str = Field(min_length=1, max_length=255)
    location_lat: float | None = None
    location_lng: float | None = None
    origin: str | None = None
    origin_lat: float | None = None
    origin_lng: float | None = None
    distance_miles: float | None = None
    status: TripStatus
    priority: TripPriority
    trip_types: list[str] = Field(default_factory=list)
    activity_level: int = Field(ge=1, le=5)
    travel_time_hours: float = Field(default=0, ge=0)
    duration_days: float = Field(default=0, ge=0)
    target_date_start: date | None = None
    target_date_end: date | None = None
    target_date_range: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    cost_items: list[CostItemRestore] = Field(default_factory=list)
    comments: list[CommentRestore] = Field(default_factory=list)
    people: list[PersonRead] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_date_range(self) -> "TripRestore":
        if (
            self.target_date_start
            and self.target_date_end
            and self.target_date_start > self.target_date_end
        ):
            raise ValueError(DATE_RANGE_ERROR_MESSAGE)
        return self


class RestorePayload(BaseModel):
    schema_version: str = Field(min_length=1)
    exported_at: datetime
    trips: list[TripRestore]
    people: list[PersonRead]
    settings: SettingsRead


class RestoreResponse(BaseModel):
    schema_version: str
    restored_at: datetime
    restored_trips: int
    restored_people: int
