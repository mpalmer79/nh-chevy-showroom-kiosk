"""
Database configuration and connection management for PostgreSQL.
Uses SQLAlchemy async with asyncpg driver.
"""
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

logger = logging.getLogger("showroom_kiosk.database")

# Create async engine
engine = None
async_session_factory = None
Base = declarative_base()


def get_database_url() -> str:
    """Get and convert DATABASE_URL at runtime."""
    url = os.getenv("DATABASE_URL", "")
    
    # Convert postgres:// to postgresql+asyncpg:// for SQLAlchemy async
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    return url


def is_database_configured() -> bool:
    """Check if database is configured."""
    url = get_database_url()
    return bool(url and "postgresql" in url)


async def init_database():
    """Initialize database connection and create tables."""
    global engine, async_session_factory
    
    database_url = get_database_url()
    
    if not database_url or "postgresql" not in database_url:
        logger.warning("DATABASE_URL not configured - using fallback JSON storage")
        return False
    
    logger.info(f"Attempting to connect to PostgreSQL...")
    
    try:
        engine = create_async_engine(
            database_url,
            echo=os.getenv("SQL_ECHO", "false").lower() == "true",
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
        
        async_session_factory = async_sessionmaker(
            engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        # Import Base from models to ensure tables are registered
        from app.models.traffic_session import TrafficSession
        
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Test connection
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        
        logger.info("PostgreSQL database connected and tables created")
        return True
        
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        engine = None
        async_session_factory = None
        return False


async def close_database():
    """Close database connection."""
    global engine
    if engine:
        await engine.dispose()
        logger.info("Database connection closed")


async def get_session() -> AsyncSession:
    """Get a database session."""
    if async_session_factory is None:
        raise RuntimeError("Database not initialized")
    async with async_session_factory() as session:
        yield session


async def test_connection() -> bool:
    """Test database connection."""
    if not engine:
        return False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
