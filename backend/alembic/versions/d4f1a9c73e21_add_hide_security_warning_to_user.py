"""add hide_security_warning to user

Revision ID: d4f1a9c73e21
Revises: 9a39b7a22455
Create Date: 2026-09-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4f1a9c73e21'
down_revision: Union[str, Sequence[str], None] = '9a39b7a22455'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default is required here, not just a Python-side default -
    # without it, adding a NOT NULL column to a table with existing rows
    # fails outright (bug #15 from earlier in this project). The server
    # default only matters for this migration's backfill; the model's
    # Python-side default=False is what actually applies for new rows
    # inserted by the app afterward.
    op.add_column(
        'users',
        sa.Column('hide_security_warning', sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'hide_security_warning')