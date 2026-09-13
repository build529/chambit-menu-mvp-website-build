from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app import models
from app.config import settings
from app.database import Base, engine
from app.routers import admin, api, public


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chambit Menu")

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=not settings.debug,
    same_site="lax",
)

app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static",
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(settings.upload_dir)),
    name="uploads",
)

app.include_router(public.router)
app.include_router(api.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
