"""Initial schema - traffic sessions and admin users

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-15

This migration creates the initial database schema for the Quirk AI Kiosk.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    #
    # TRAFFIC SESSIONS TABLE
    #
    op.create_table(
        'traffic_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        
        # Customer info
        sa.Column('customer_name', sa.String(100), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True, index=True),
        sa.Column('email', sa.String(254), nullable=True),
        
        # Session tracking
        sa.Column('path', sa.String(50), nullable=True),
        sa.Column('current_step', sa.String(100), nullable=True),
        sa.Column('vehicle_requested', sa.Boolean(), default=False, nullable=False),
        
        # JSON data fields
        sa.Column('vehicle', postgresql.JSONB(), nullable=True),
        sa.Column('vehicle_interest', postgresql.JSONB(), nullable=True),
        sa.Column('budget', postgresql.JSONB(), nullable=True),
        sa.Column('trade_in', postgresql.JSONB(), nullable=True),
        sa.Column('payment', postgresql.JSONB(), nullable=True),
        sa.Column('actions', postgresql.JSONB(), default=[], nullable=False),
        sa.Column('chat_history', postgresql.JSONB(), default=[], nullable=True),
        
        # AI conversation state
        sa.Column('conversation_state', postgresql.JSONB(), nullable=True),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for common queries
    op.create_index('ix_traffic_sessions_created_at', 'traffic_sessions', ['created_at'])
    op.create_index('ix_traffic_sessions_updated_at', 'traffic_sessions', ['updated_at'])
    
    #
    # ADMIN USERS TABLE
    #
    op.create_table(
        'admin_users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(50), nullable=False, unique=True),
        sa.Column('email', sa.String(254), nullable=True, unique=True),
        sa.Column('password_hash', sa.String(128), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, default='admin'),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_admin_users_username', 'admin_users', ['username'])
    
    #
    # AI CONVERSATION OUTCOMES TABLE (for learning/analytics)
    #
    op.create_table(
        'ai_conversation_outcomes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.String(50), nullable=False, index=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        
        # Outcome tracking
        sa.Column('outcome', sa.String(30), nullable=True),  # test_drive, purchase, left, etc.
        sa.Column('message_count', sa.Integer(), default=0, nullable=False),
        sa.Column('vehicles_discussed', sa.Integer(), default=0, nullable=False),
        sa.Column('staff_notified', sa.Boolean(), default=False, nullable=False),
        
        # Quality signals
        sa.Column('positive_signals', sa.Integer(), default=0, nullable=False),
        sa.Column('negative_signals', sa.Integer(), default=0, nullable=False),
        sa.Column('frustration_score', sa.Float(), default=0.0, nullable=False),
        
        # Metadata
        sa.Column('prompt_version', sa.String(20), nullable=True),
        sa.Column('model_used', sa.String(50), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_ai_outcomes_started_at', 'ai_conversation_outcomes', ['started_at'])
    op.create_index('ix_ai_outcomes_outcome', 'ai_conversation_outcomes', ['outcome'])
    
    #
    # LEAD SUBMISSIONS TABLE
    #
    op.create_table(
        'lead_submissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.String(50), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        
        # Customer info
        sa.Column('customer_name', sa.String(100), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False, index=True),
        sa.Column('email', sa.String(254), nullable=True),
        
        # Lead details
        sa.Column('lead_type', sa.String(30), nullable=False),  # test_drive, appraisal, finance, general
        sa.Column('vehicle_stock', sa.String(20), nullable=True),
        sa.Column('vehicle_info', postgresql.JSONB(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        
        # Status tracking
        sa.Column('status', sa.String(20), default='new', nullable=False),
        sa.Column('assigned_to', sa.String(100), nullable=True),
        sa.Column('followed_up_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_leads_created_at', 'lead_submissions', ['created_at'])
    op.create_index('ix_leads_status', 'lead_submissions', ['status'])


def downgrade() -> None:
    op.drop_table('lead_submissions')
    op.drop_table('ai_conversation_outcomes')
    op.drop_table('admin_users')
    op.drop_table('traffic_sessions')
