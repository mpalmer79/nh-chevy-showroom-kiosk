"""Add conversation_states table

Revision ID: 002_conv_states
Revises: 001_initial
Create Date: 2024-02-01

Adds a persistent conversation_states table for tracking AI conversation
state across sessions. Supports customer info, budget preferences,
conversation stage tracking, and full state JSON serialization.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_conv_states'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'conversation_states',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            server_default=sa.text('gen_random_uuid()'),
            primary_key=True,
        ),
        sa.Column('session_id', sa.String(50), unique=True, nullable=False),
        sa.Column('customer_name', sa.String(100), nullable=True),
        sa.Column('customer_phone', sa.String(15), nullable=True),
        sa.Column('customer_email', sa.String(254), nullable=True),
        sa.Column('budget_min', sa.Float, nullable=True),
        sa.Column('budget_max', sa.Float, nullable=True),
        sa.Column('monthly_payment_target', sa.Float, nullable=True),
        sa.Column('down_payment', sa.Float, nullable=True),
        sa.Column('stage', sa.String(30), server_default='greeting'),
        sa.Column('interest_level', sa.String(20), server_default='cold'),
        sa.Column('message_count', sa.Integer, server_default='0'),
        sa.Column(
            'state_json',
            postgresql.JSONB,
            server_default='{}',
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            'expires_at',
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW() + INTERVAL '24 hours'"),
        ),

        sa.PrimaryKeyConstraint('id')
    )

    # Index on session_id for fast lookups
    op.create_index(
        'idx_conv_state_session',
        'conversation_states',
        ['session_id'],
    )

    # Partial index on customer_phone (only where phone is set)
    op.create_index(
        'idx_conv_state_phone',
        'conversation_states',
        ['customer_phone'],
        postgresql_where=sa.text('customer_phone IS NOT NULL'),
    )

    # Index on stage for analytics queries
    op.create_index(
        'idx_conv_state_stage',
        'conversation_states',
        ['stage'],
    )


def downgrade() -> None:
    op.drop_index('idx_conv_state_stage', table_name='conversation_states')
    op.drop_index('idx_conv_state_phone', table_name='conversation_states')
    op.drop_index('idx_conv_state_session', table_name='conversation_states')
    op.drop_table('conversation_states')
