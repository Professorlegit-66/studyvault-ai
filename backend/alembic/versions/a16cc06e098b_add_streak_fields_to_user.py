"""add streak fields to user

Revision ID: a16cc06e098b
Revises: 27e18719794f
Create Date: 2026-09-12 18:30:13.238937

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a16cc06e098b'
down_revision: Union[str, Sequence[str], None] = '27e18719794f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('last_login_date', sa.Date(), nullable=True))
    op.add_column('users', sa.Column('current_streak', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'current_streak')
    op.drop_column('users', 'last_login_date')