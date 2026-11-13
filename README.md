# SDRIPDT2 — Simulador IR

Simulación del Desarrollo de Resistencia a la Insulina y Progresión a Diabetes Tipo 2:
pronóstico individual de progresión a DMT2.

Sistema de dos partes: backend en FastAPI (motor de simulación Monte Carlo) y
frontend en React.

## Backend (FastAPI + SQLite + SQLAlchemy)

```
cd backend
python -m venv .venv
.venv\Scripts\activate          # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head             # crea las tablas
python -m app.seed                # usuario y pacientes de ejemplo
uvicorn app.main:app --reload --port 8000
```

Usuario demo: `marina.choque@umsa.bo` / `demo1234`
Docs interactivas: http://localhost:8000/docs

## Frontend (React + Vite + Tailwind)

```
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173 — el proxy de Vite reenvía `/api/*` al backend en
el puerto 8000, así que ambos deben estar corriendo.

## Qué está implementado

- Login / registro con JWT real, pacientes y escenarios persistidos en base
  de datos real (SQLite vía SQLAlchemy + Alembic).
- Motor de simulación (`backend/app/engine.py`): modelo de dinámica de
  sistemas en tiempo discreto (Δt = 1 semana) con las reglas R1–R7 del
  documento `docs/Modelo_Simulacion_DMT2_LaPaz_Calibrado.pdf` — componentes
  A (estilo de vida), B (tejido periférico), C (páncreas endocrino) y D
  (homeostasis clínica), ancladas al estado inicial de cada paciente real
  (no una cohorte sintética).
- Comparación de hasta 4 escenarios de intervención (nula/moderada/intensiva)
  por paciente, con bandas de incertidumbre (percentil 10–90) sobre glucosa,
  insulina, HOMA-IR y reserva pancreática.

## Qué falta (fuera de alcance de esta vuelta)

- Páginas de "Proyectos/Laboratorios", administración de "Usuarios" y
  "Perfil" (existían como fachada en el prototipo HTML anterior; no se
  migraron todavía a React).
- Calibración numérica de las reglas R1–R7: los valores de k2, k5, k6, k7,
  etc. son un primer ajuste razonable, no una calibración validada contra
  datos reales de SNIS-VE/SEDES La Paz/IDF — algunos perfiles clínicos
  (ej. pacientes ya en resistencia/prediabetes) todavía muestran poca
  diferencia entre "sin cambios" e "intervención intensiva"; el documento
  mismo deja esta calibración como trabajo pendiente.
