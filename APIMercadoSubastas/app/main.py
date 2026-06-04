from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .routers import auth, medios_pago, catalogo, subastas, compras, personas, lookup, dev, vender


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    try:
        from scripts.seed import (
            seed_paises, seed_empleados, seed_empresa,
            seed_subastas, seed_subastas_categorias,
            seed_usuario_prueba, seed_usuario_prueba_2,
            seed_historial_prueba, seed_configuracion,
        )
        seed_paises()
        seed_empleados()
        seed_empresa()
        seed_subastas()
        seed_subastas_categorias()
        seed_usuario_prueba()
        seed_usuario_prueba_2()
        seed_historial_prueba()
        seed_configuracion()
    except Exception as e:
        print(f"[seed] Error al cargar datos iniciales: {e}")
    yield


app = FastAPI(title="Mercado Subastas API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(medios_pago.router)
app.include_router(catalogo.router)
app.include_router(subastas.router)
app.include_router(compras.router)
app.include_router(personas.router)
app.include_router(lookup.router)
app.include_router(dev.router)
app.include_router(vender.router)


@app.get("/")
def hello_world():
    return {"message": "¡Bienvenido a la API del Mercado de Subastas!"}

