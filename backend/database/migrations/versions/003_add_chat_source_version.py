"""Add source_version to chat_history

Revision ID: 003
Revises: 002
Create Date: 2026-07-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chat_history", sa.Column("source_version", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_history", "source_version")
