"""add_review_logs_table

Revision ID: 40d808e1abf5
Revises: 9b79233e4858
Create Date: 2026-09-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '40d808e1abf5'
down_revision: Union[str, None] = '9b79233e4858'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create review_logs table first if it doesn't exist
    op.create_table(
        'review_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('flashcard_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.String(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['flashcard_id'], ['flashcards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_review_logs_id'), 'review_logs', ['id'], unique=False)
    op.create_index(op.f('ix_review_logs_user_id'), 'review_logs', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_review_logs_user_id'), table_name='review_logs')
    op.drop_index(op.f('ix_review_logs_id'), table_name='review_logs')
    op.drop_table('review_logs')