import os
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.engine import make_url

class Base(DeclarativeBase):
    pass

database_url = os.getenv("DATABASE_URL") or URL.create(
    "postgresql+psycopg", username="atelier", password=os.getenv("POSTGRES_PASSWORD"),
    host=os.getenv("DB_HOST", "localhost"), database="atelier"
)
# Transaction poolers cannot retain prepared statements between transactions,
# including when the persistent local server connects through that pooler.
transaction_pooler = make_url(database_url).port == 6543
engine = create_engine(database_url, pool_pre_ping=True,
    **({"poolclass":NullPool} if os.getenv("VERCEL") else {"pool_size":5,"max_overflow":5,"pool_timeout":10}),
    connect_args={"connect_timeout": 8, "options": "-c statement_timeout=20000",**({"prepare_threshold":None} if os.getenv("VERCEL") or transaction_pooler else {})})
Session = sessionmaker(engine, expire_on_commit=False)

def database():
    with Session() as session:
        yield session
