from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, patients, usuarios

app = FastAPI(
    title="Simulador IR — API",
    description="Pronóstico individual de progresión a DMT2 (modelo de dinámica de sistemas en tiempo discreto, Monte Carlo).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(usuarios.router)


@app.get("/salud")
def salud():
    return {"estado": "ok"}
