from fastapi import FastAPI

from .database import Base, engine
from . import models


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chambit Menu")


@app.get("/health")
def health():
    return {"status": "ok"}
