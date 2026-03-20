"""Baseline schema

Revision ID: 0001_baseline_schema
Revises: None
Create Date: 2026-03-18 00:00:00

"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_baseline_schema"
down_revision = None
branch_labels = None
depends_on = None

TRIPS_ID_FK = "trips.id"


def upgrade() -> None:
    op.create_table(
        "people",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_people_id"), "people", ["id"], unique=False)

    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("home_city", sa.String(length=255), nullable=True),
        sa.Column("home_zip", sa.String(length=32), nullable=True),
        sa.Column("ors_api_key", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("origin", sa.String(length=255), nullable=True),
        sa.Column("origin_lat", sa.Float(), nullable=True),
        sa.Column("origin_lng", sa.Float(), nullable=True),
        sa.Column("distance_miles", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("priority", sa.String(length=64), nullable=False),
        sa.Column("trip_types", sa.Text(), nullable=False),
        sa.Column("activity_level", sa.Integer(), nullable=False),
        sa.Column("travel_time_hours", sa.Float(), nullable=False),
        sa.Column("duration_days", sa.Float(), nullable=False),
        sa.Column("target_date_start", sa.Date(), nullable=True),
        sa.Column("target_date_end", sa.Date(), nullable=True),
        sa.Column("target_date_range", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trips_id"), "trips", ["id"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], [TRIPS_ID_FK], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_comments_id"), "comments", ["id"], unique=False)

    op.create_table(
        "cost_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.ForeignKeyConstraint(["trip_id"], [TRIPS_ID_FK], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cost_items_id"), "cost_items", ["id"], unique=False)

    op.create_table(
        "trip_people",
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trip_id"], [TRIPS_ID_FK], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("trip_id", "person_id"),
    )


def downgrade() -> None:
    raise NotImplementedError("Forward-only migrations are enforced")
