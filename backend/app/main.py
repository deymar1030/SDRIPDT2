from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .nucleo.configuracion import settings
from .api import autenticacion, pacientes, usuarios

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

app.include_router(autenticacion.router)
app.include_router(pacientes.router)
app.include_router(usuarios.router)


@app.get("/salud")
def salud():
    return {"estado": "ok"}
