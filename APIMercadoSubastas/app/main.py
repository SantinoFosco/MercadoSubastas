import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine, SessionLocal
from .routers import auth, medios_pago, catalogo, subastas, compras, personas, lookup, dev, vender, admin


async def _procesar_vencidos_loop():
    """Marca como vencidos los pagos expirados y genera multas. Corre cada hora."""
    while True:
        await asyncio.sleep(3600)
        db = SessionLocal()
        try:
            ahora = datetime.now()
            vencidos = db.query(models.RegistroSubasta).filter(
                models.RegistroSubasta.pagado.in_(["no", "pendiente"]),
                models.RegistroSubasta.fecha_limite_pago != None,
                models.RegistroSubasta.fecha_limite_pago < ahora,
            ).all()
            for r in vencidos:
                r.pagado = "vencido"
                monto_multa = round(float(r.importe) * 0.10, 2)
                ya_tiene = db.query(models.Multa).filter(
                    models.Multa.cliente == r.cliente,
                    models.Multa.subasta == r.subasta,
                    models.Multa.pagado == "no",
                ).first()
                if not ya_tiene:
                    db.add(models.Multa(
                        cliente=r.cliente, subasta=r.subasta,
                        monto=monto_multa, pagado="no",
                        fecha_limite=ahora + timedelta(hours=72),
                    ))
            db.commit()
            if vencidos:
                print(f"[vencidos] {len(vencidos)} pago(s) marcados como vencidos y multas generadas.")
        except Exception as e:
            db.rollback()
            print(f"[vencidos] Error al procesar vencidos: {e}")
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    try:
        from scripts.seed import (
            seed_paises, seed_empleados, seed_empresa,
            seed_subastas, seed_subastas_categorias,
            seed_usuario_prueba, seed_usuario_prueba_2,
            seed_usuario_cheque, seed_usuario_especial,
            seed_subasta_usd, seed_subasta_en_vivo,
            seed_historial_prueba,
            seed_articulos_vendedor, seed_configuracion,
        )
        seed_paises()
        seed_empleados()
        seed_empresa()
        seed_subastas()
        seed_subastas_categorias()
        seed_usuario_prueba()
        seed_usuario_prueba_2()
        seed_usuario_cheque()
        seed_usuario_especial()
        seed_subasta_usd()
        seed_subasta_en_vivo()
        seed_historial_prueba()
        seed_articulos_vendedor()
        seed_configuracion()
    except Exception as e:
        print(f"[seed] Error al cargar datos iniciales: {e}")

    # Restaurar timers para subastas que estaban en curso al momento del restart.
    # La subasta de prueba (seed) se excluye: su timer arranca solo desde WS.
    # fecha+hora en subastas se almacenan en UTC.
    try:
        from .routers.subastas import (
            _item_timers, _cerrar_item, get_subasta_en_vivo, _SEED_UBICACION_VIVO,
        )
        _db = SessionLocal()
        try:
            _subastas = _db.query(models.Subasta).filter(models.Subasta.estado == "abierta").all()
            for _s in _subastas:
                if _s.ubicacion == _SEED_UBICACION_VIVO:
                    continue  # Subasta de prueba: espera conexión WS
                _ahora = datetime.now(timezone.utc).replace(tzinfo=None)
                _inicio = datetime.combine(_s.fecha, _s.hora)
                if _ahora >= _inicio:
                    _vivo = get_subasta_en_vivo(_db, _s.identificador)
                    if _vivo and _vivo.itemCatalogoId not in _item_timers:
                        _item_timers[_vivo.itemCatalogoId] = asyncio.create_task(
                            _cerrar_item(_vivo.itemCatalogoId, _s.identificador)
                        )
                        print(f"[startup] Timer restaurado para ítem {_vivo.itemCatalogoId} (subasta {_s.identificador})")
        finally:
            _db.close()

    except Exception as e:
        print(f"[startup] Error en inicialización de timers: {e}")

    # Arrancar tarea periódica de procesamiento de pagos vencidos
    asyncio.create_task(_procesar_vencidos_loop())

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
app.include_router(admin.router)


@app.get("/")
def hello_world():
    return {"message": "¡Bienvenido a la API del Mercado de Subastas!"}
