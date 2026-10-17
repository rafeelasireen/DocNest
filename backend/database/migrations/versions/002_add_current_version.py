"""Add current_version_number to documents

Revision ID: 002
Revises: 001
Create Date: 2026-07-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("current_version_number", sa.Integer(), nullable=False, server_default="1"),
    )
    op.alter_column("documents", "current_version_number", server_default=None)


def downgrade() -> None:
    op.drop_column("documents", "current_version_number")
