"""drop unused student_memories table

Revision ID: a3b7f025ae69
Revises: a16cc06e098b
Create Date: 2026-09-12 19:22:20.269420

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a3b7f025ae69'
down_revision: Union[str, Sequence[str], None] = 'a16cc06e098b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index(op.f('ix_student_memories_id'), table_name='student_memories')
    op.drop_index(op.f('ix_student_memories_user_id'), table_name='student_memories')
    op.drop_table('student_memories')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table('student_memories',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('content', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('category', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('importance', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('student_memories_pkey'))
    )
    op.create_index(op.f('ix_student_memories_user_id'), 'student_memories', ['user_id'], unique=False)
    op.create_index(op.f('ix_student_memories_id'), 'student_memories', ['id'], unique=False)