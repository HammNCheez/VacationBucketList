from database.connection import engine
from models.db import Base


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
