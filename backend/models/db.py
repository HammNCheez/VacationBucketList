from datetime import date, datetime, timezone

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


trip_people = Table(
    "trip_people",
    Base.metadata,
    Column("trip_id", ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True),
    Column("person_id", ForeignKey("people.id", ondelete="CASCADE"), primary_key=True),
)


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    location_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    origin: Mapped[str | None] = mapped_column(String(255), nullable=True)
    origin_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    origin_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_miles: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[str] = mapped_column(String(64), nullable=False)
    trip_types: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    travel_time_hours: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    duration_days: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    target_date_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_date_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_date_range: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    cost_items: Mapped[list["CostItem"]] = relationship(
        "CostItem", cascade="all, delete-orphan", back_populates="trip"
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", cascade="all, delete-orphan", back_populates="trip"
    )
    people: Mapped[list["Person"]] = relationship("Person", secondary=trip_people, back_populates="trips")


class CostItem(Base):
    __tablename__ = "cost_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)

    trip: Mapped[Trip] = relationship("Trip", back_populates="cost_items")


class Person(Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trips: Mapped[list[Trip]] = relationship("Trip", secondary=trip_people, back_populates="people")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    trip: Mapped[Trip] = relationship("Trip", back_populates="comments")


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    home_city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    home_zip: Mapped[str | None] = mapped_column(String(32), nullable=True)
