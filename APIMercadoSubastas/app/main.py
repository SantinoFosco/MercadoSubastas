from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .routers import auth, medios_pago, catalogo, subastas, compras, personas, lookup, dev

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mercado Subastas API")

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


@app.get("/")
def hello_world():
    return {"message": "¡Bienvenido a la API del Mercado de Subastas!"}
