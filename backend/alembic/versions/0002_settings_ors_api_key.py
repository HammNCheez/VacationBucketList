"""Ensure settings.ors_api_key exists

Revision ID: 0002_settings_ors_api_key
Revises: 0001_baseline_schema
Create Date: 2026-03-18 00:05:00

"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_settings_ors_api_key"
down_revision = "0001_baseline_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("settings")}
    if "ors_api_key" not in columns:
        op.add_column("settings", sa.Column("ors_api_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    raise NotImplementedError("Forward-only migrations are enforced")
