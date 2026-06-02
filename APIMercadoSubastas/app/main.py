from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from . import crud, models, schemas
from .database import SessionLocal, engine
from .dev_router import router as dev_router
from .seeds import seed_paises, seed_empleados, seed_subastas, seed_subastas_categorias, seed_usuario_prueba, seed_historial_prueba, seed_configuracion

# Crea las tablas si no existen
models.Base.metadata.create_all(bind=engine)

# Carga de datos iniciales
seed_paises()
seed_empleados()
seed_subastas()
seed_subastas_categorias()
seed_usuario_prueba()
seed_historial_prueba()
seed_configuracion()

app = FastAPI()

app.include_router(dev_router)

# Dependencia para obtener la DB en cada request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def hello_world():
    return {"message": "¡Bienvenido a la API del Mercado de Ari!"}

#------------------ Auth y Registro ------------------------#

@app.post("/auth/registro/iniciar", response_model=schemas.RegistroIniciarResponse)
def iniciar_registro(request: schemas.RegistroIniciarRequest, db: Session = Depends(get_db)):
    return crud.iniciar_registro(db=db, request=request)

@app.post("/auth/registro/aprobar", response_model=schemas.MensajeResponse)
def aprobar_registro(request: schemas.RegistroVerificacionRequest, db: Session = Depends(get_db)):
    return crud.aprobar_registro(db=db, request=request)

@app.post("/auth/registro/desaprobar", response_model=schemas.MensajeResponse)
def desaprobar_registro(request: schemas.RegistroVerificacionRequest, db: Session = Depends(get_db)):
    return crud.desaprobar_registro(db=db, request=request)

@app.post("/auth/login", response_model=schemas.Usuario)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    return crud.login(db=db, request=request)

@app.put("/auth/cambiar-clave", response_model=schemas.MensajeResponse)
def cambiar_clave(request: schemas.CambiarClaveRequest, db: Session = Depends(get_db)):
    return crud.cambiar_clave(db=db, request=request)

#------------------ Medios de pago -------------------------#

@app.get("/mediosPago", response_model=schemas.MedioPagoListResponse)
def get_medios_pago_cliente(cliente_id: int = Query(...), db: Session = Depends(get_db)):
    return crud.get_medios_pago_cliente(db=db, cliente_id=cliente_id)

@app.post("/mediosPago/cuenta-bancaria", response_model=schemas.CuentaBancariaResponse)
def create_cuenta_bancaria(request: schemas.CuentaBancariaCreate, db: Session = Depends(get_db)):
    return crud.create_cuenta_bancaria(db=db, request=request)

@app.get("/mediosPago/cuenta-bancaria/{medio_pago_id}", response_model=schemas.CuentaBancariaResponse)
def get_cuenta_bancaria(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_cuenta_bancaria(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada")
    return result

@app.post("/mediosPago/tarjeta", response_model=schemas.TarjetaResponse)
def create_tarjeta(request: schemas.TarjetaCreate, db: Session = Depends(get_db)):
    return crud.create_tarjeta(db=db, request=request)

@app.get("/mediosPago/tarjeta/{medio_pago_id}", response_model=schemas.TarjetaResponse)
def get_tarjeta(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_tarjeta(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
    return result

@app.post("/mediosPago/cheque", response_model=schemas.ChequeCertificadoResponse)
def create_cheque_certificado(request: schemas.ChequeCertificadoCreate, db: Session = Depends(get_db)):
    return crud.create_cheque_certificado(db=db, request=request)

@app.get("/mediosPago/cheque/{medio_pago_id}", response_model=schemas.ChequeCertificadoResponse)
def get_cheque_certificado(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_cheque_certificado(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cheque certificado no encontrado")
    return result

@app.get("/mediosPago/{medio_pago_id}", response_model=schemas.MedioPagoItem)
def get_medio_pago(medio_pago_id: int, db: Session = Depends(get_db)):
    result = crud.get_medio_pago_detalle(db=db, medio_pago_id=medio_pago_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return result

@app.put("/mediosPago/{medio_pago_id}", response_model=schemas.MedioPagoItem)
def update_medio_pago(medio_pago_id: int, request: schemas.DescripcionUpdate, db: Session = Depends(get_db)):
    result = crud.update_medio_pago_descripcion(db=db, medio_pago_id=medio_pago_id, descripcion=request.descripcion)
    if result is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return result

@app.delete("/mediosPago/{medio_pago_id}")
def delete_medio_pago(medio_pago_id: int, db: Session = Depends(get_db)):
    db_medio = crud.delete_medio_pago(db=db, medio_pago_id=medio_pago_id)
    if db_medio is None:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    return {"message": f"Medio de pago {medio_pago_id} eliminado con éxito"}

#------------------ Home y Catalogo ------------------------#

@app.post("/productos/", response_model=schemas.ProductoResponse, status_code=201)
def create_producto(request: schemas.ProductoCreate, db: Session = Depends(get_db)):
    return crud.create_producto(db=db, request=request)

@app.delete("/productos/{producto_id}")
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_producto(db=db, producto_id=producto_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay fotos, presentaciones o items de catálogo que dependen de este producto")
    if result is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": f"Producto {producto_id} eliminado con éxito"}

@app.post("/fotos/", response_model=schemas.FotoResponse, status_code=201)
def create_foto(request: schemas.FotoCreate, db: Session = Depends(get_db)):
    return crud.create_foto(db=db, request=request)

@app.delete("/fotos/{foto_id}")
def delete_foto(foto_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_foto(db=db, foto_id=foto_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay presentaciones que dependen de esta foto")
    if result is None:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return {"message": f"Foto {foto_id} eliminada con éxito"}

@app.post("/productos-presentacion/", response_model=schemas.ProductoPresentacionResponse, status_code=201)
def create_producto_presentacion(request: schemas.ProductoPresentacionCreate, db: Session = Depends(get_db)):
    return crud.create_producto_presentacion(db=db, request=request)

@app.delete("/productos-presentacion/{pp_id}")
def delete_producto_presentacion(pp_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_producto_presentacion(db=db, pp_id=pp_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay registros que dependen de esta presentación")
    if result is None:
        raise HTTPException(status_code=404, detail="Presentación no encontrada")
    return {"message": f"Presentación {pp_id} eliminada con éxito"}

@app.post("/catalogos/", response_model=schemas.CatalogoResponse, status_code=201)
def create_catalogo(request: schemas.CatalogoCreate, db: Session = Depends(get_db)):
    return crud.create_catalogo(db=db, request=request)

@app.delete("/catalogos/{catalogo_id}")
def delete_catalogo(catalogo_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_catalogo(db=db, catalogo_id=catalogo_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay items de catálogo que dependen de este catálogo")
    if result is None:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    return {"message": f"Catálogo {catalogo_id} eliminado con éxito"}

@app.post("/items-catalogo/", response_model=schemas.ItemCatalogoResponse, status_code=201)
def create_item_catalogo(request: schemas.ItemCatalogoCreate, db: Session = Depends(get_db)):
    return crud.create_item_catalogo(db=db, request=request)

@app.delete("/items-catalogo/{item_id}")
def delete_item_catalogo(item_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_item_catalogo(db=db, item_id=item_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay pujos que dependen de este item")
    if result is None:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return {"message": f"Item {item_id} eliminado con éxito"}

@app.get("/home", response_model=schemas.HomeResponse)
def get_home(categoria: str = Query(...), db: Session = Depends(get_db)):
    return crud.get_home(db=db, categoria=categoria)

@app.get("/subastas/{subasta_id}/catalogo", response_model=list[schemas.ProductoCatalogo])
def get_catalogo_subasta(subasta_id: int, db: Session = Depends(get_db)):
    result = crud.get_catalogo_subasta(db=db, subasta_id=subasta_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")
    return result

@app.get("/subastas/{subasta_id}/catalogo/{producto_id}", response_model=schemas.DetalleProducto)
def get_detalle_producto_catalogo(subasta_id: int, producto_id: int, db: Session = Depends(get_db)):
    result = crud.get_detalle_producto_catalogo(db=db, subasta_id=subasta_id, producto_id=producto_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado en el catálogo")
    return result

#------------------ Sala de Subastas -----------------------#

@app.get("/subastas/", response_model=list[schemas.SubastaResponse])
def get_subastas(db: Session = Depends(get_db)):
    return crud.get_subastas(db=db)

@app.post("/subastas/", response_model=schemas.SubastaResponse, status_code=201)
def create_subasta(request: schemas.SubastaCreate, db: Session = Depends(get_db)):
    return crud.create_subasta(db=db, request=request)

@app.delete("/subastas/{subasta_id}")
def delete_subasta(subasta_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_subasta(db=db, subasta_id=subasta_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay asistentes, catálogos u otros registros que dependen de esta subasta")
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")
    return {"message": f"Subasta {subasta_id} eliminada con éxito"}

@app.post("/asistentes/", response_model=schemas.AsistenteResponse, status_code=201)
def create_asistente(request: schemas.AsistenteCreate, db: Session = Depends(get_db)):
    return crud.create_asistente(db=db, request=request)

@app.delete("/asistentes/{asistente_id}")
def delete_asistente(asistente_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_asistente(db=db, asistente_id=asistente_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay registros que dependen de este asistente")
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    return {"message": f"Asistente {asistente_id} eliminado con éxito"}

@app.get("/subasta/{subasta_id}/vivo", response_model=schemas.VivoSubasta)
def get_subasta_en_vivo(subasta_id: int, db: Session = Depends(get_db)):
    result = crud.get_subasta_en_vivo(db=db, subasta_id=subasta_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada o sin items activos")
    return result

@app.post("/pujar", response_model=schemas.PujoResponse, status_code=201)
def pujar(request: schemas.PujoRequest, db: Session = Depends(get_db)):
    result, error = crud.create_pujo(db=db, request=request)
    if error == "asistente":
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    if error == "item":
        raise HTTPException(status_code=404, detail="Item de catálogo no encontrado")
    return result

#------------------ Compras --------------------------------#

@app.get("/subasta/{subasta_id}/{usuario_id}/compras", response_model=list[schemas.ProductoComprado])
def get_compras(subasta_id: int, usuario_id: int, db: Session = Depends(get_db)):
    result = crud.get_compras(db=db, subasta_id=subasta_id, usuario_id=usuario_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return result

@app.get("/subasta/{subasta_id}/{usuario_id}/compras/precio", response_model=schemas.PrecioFinal)
def get_precio_total(subasta_id: int, usuario_id: int, db: Session = Depends(get_db)):
    result = crud.get_precio_total(db=db, subasta_id=subasta_id, usuario_id=usuario_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return result

@app.post("/subasta/{subasta_id}/{usuario_id}/compras/envio")
def confirmar_envio(subasta_id: int, usuario_id: int, metodoEnvio: str = Query(...), db: Session = Depends(get_db)):
    result = crud.confirmar_envio(db=db, subasta_id=subasta_id, usuario_id=usuario_id, metodo_envio=metodoEnvio)
    if result is None:
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    return {"mensaje": result}

@app.post("/subasta/{subasta_id}/{usuario_id}/compras/pagar")
def confirmar_pago(subasta_id: int, usuario_id: int, metodoPagoId: int = Query(...), db: Session = Depends(get_db)):
    result, error = crud.confirmar_pago(db=db, subasta_id=subasta_id, usuario_id=usuario_id, metodo_pago_id=metodoPagoId)
    if error == "asistente":
        raise HTTPException(status_code=404, detail="Asistente no encontrado en esta subasta")
    if error == "medio_pago":
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado o no pertenece al usuario")
    return {"mensaje": result}

#------------------ Personas -------------------------------#

@app.get("/sectores/", response_model=list[schemas.SectorResponse])
def get_sectores(db: Session = Depends(get_db)):
    return crud.get_sectores(db=db)

@app.post("/duenios/", response_model=schemas.DuenioResponse, status_code=201)
def create_duenio(request: schemas.DuenioCreate, db: Session = Depends(get_db)):
    return crud.create_duenio(db=db, request=request)

@app.delete("/duenios/{duenio_id}")
def delete_duenio(duenio_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_duenio(db=db, duenio_id=duenio_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay productos que dependen de este dueño")
    if result is None:
        raise HTTPException(status_code=404, detail="Dueño no encontrado")
    return {"message": f"Dueño {duenio_id} eliminado con éxito"}

@app.post("/subastadores/", response_model=schemas.SubastadorResponse, status_code=201)
def create_subastador(request: schemas.SubastadorCreate, db: Session = Depends(get_db)):
    return crud.create_subastador(db=db, request=request)

@app.delete("/subastadores/{subastador_id}")
def delete_subastador(subastador_id: int, db: Session = Depends(get_db)):
    try:
        result = crud.delete_subastador(db=db, subastador_id=subastador_id)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay subastas que dependen de este subastador")
    if result is None:
        raise HTTPException(status_code=404, detail="Subastador no encontrado")
    return {"message": f"Subastador {subastador_id} eliminado con éxito"}

@app.post("/sectores/", response_model=schemas.SectorResponse)
def create_sector(request: schemas.SectorCreate, db: Session = Depends(get_db)):
    return crud.create_sector(db=db, request=request)

@app.get("/sectores/{sector_id}", response_model=schemas.SectorResponse)
def get_sector(sector_id: int, db: Session = Depends(get_db)):
    result = crud.get_sector(db=db, sector_id=sector_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return result

@app.delete("/sectores/{sector_id}")
def delete_sector(sector_id: int, db: Session = Depends(get_db)):
    result = crud.delete_sector(db=db, sector_id=sector_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return {"message": f"Sector {sector_id} eliminado con éxito"}

@app.get("/empleados/", response_model=list[schemas.EmpleadoResponse])
def get_empleados(db: Session = Depends(get_db)):
    return crud.get_empleados(db=db)

@app.post("/empleados/", response_model=schemas.EmpleadoResponse)
def create_empleado(request: schemas.EmpleadoCreate, db: Session = Depends(get_db)):
    return crud.create_empleado(db=db, request=request)

@app.get("/empleados/{empleado_id}", response_model=schemas.EmpleadoResponse)
def get_empleado(empleado_id: int, db: Session = Depends(get_db)):
    result = crud.get_empleado(db=db, empleado_id=empleado_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return result

@app.delete("/empleados/{empleado_id}")
def delete_empleado(empleado_id: int, db: Session = Depends(get_db)):
    result = crud.delete_empleado(db=db, empleado_id=empleado_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"message": f"Empleado {empleado_id} eliminado con éxito"}

@app.get("/clientes/", response_model=list[schemas.ClienteResponse])
def get_clientes(db: Session = Depends(get_db)):
    return crud.get_clientes(db=db)

@app.post("/clientes/", response_model=schemas.ClienteResponse)
def create_cliente(request: schemas.ClienteCreate, db: Session = Depends(get_db)):
    return crud.create_cliente(db=db, request=request)

@app.get("/config/{clave}", response_model=schemas.ConfiguracionResponse)
def get_configuracion(clave: str, db: Session = Depends(get_db)):
    obj = db.query(models.ConfiguracionEmpresa).filter(models.ConfiguracionEmpresa.clave == clave).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return obj

@app.get("/articulos/{producto_id}/condiciones", response_model=schemas.ArticuloCondicionesResponse)
def get_condiciones_articulo(producto_id: int, db: Session = Depends(get_db)):
    return crud.get_condiciones_articulo(db=db, producto_id=producto_id)

@app.post("/articulos/{producto_id}/aceptar", response_model=schemas.MensajeResponse)
def aceptar_condiciones(producto_id: int, db: Session = Depends(get_db)):
    return crud.aceptar_condiciones(db=db, producto_id=producto_id)

@app.post("/articulos/{producto_id}/rechazar", response_model=schemas.MensajeResponse)
def rechazar_condiciones(producto_id: int, db: Session = Depends(get_db)):
    return crud.rechazar_condiciones(db=db, producto_id=producto_id)

@app.post("/articulos/", response_model=schemas.ArticuloSubmitResponse)
def submit_articulo(request: schemas.ArticuloSubmitRequest, db: Session = Depends(get_db)):
    cliente = crud.get_cliente(db=db, cliente_id=request.clienteId)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return crud.submit_articulo(db=db, request=request)

@app.get("/clientes/{cliente_id}/articulos", response_model=list[schemas.ArticuloListItem])
def get_articulos_cliente(cliente_id: int, db: Session = Depends(get_db)):
    return crud.get_articulos_cliente(db=db, cliente_id=cliente_id)

@app.get("/clientes/{cliente_id}/estadisticas", response_model=schemas.EstadisticasCliente)
def get_estadisticas_cliente(cliente_id: int, db: Session = Depends(get_db)):
    return crud.get_estadisticas_cliente(db=db, cliente_id=cliente_id)

@app.get("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def get_cliente(cliente_id: int, db: Session = Depends(get_db)):
    result = crud.get_cliente(db=db, cliente_id=cliente_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return result

@app.delete("/clientes/{cliente_id}")
def delete_cliente(cliente_id: int, db: Session = Depends(get_db)):
    result = crud.delete_cliente(db=db, cliente_id=cliente_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": f"Cliente {cliente_id} eliminado con éxito"}

#------------------ Ventas ---------------------------------#

#------------------ Informacion Necesaria ------------------#

@app.post("/paises/", response_model=schemas.Pais)
def create_pais(pais: schemas.PaisCreate, db: Session = Depends(get_db)):
    return crud.create_pais(db=db, pais=pais)

@app.get("/paises/", response_model=list[schemas.Pais])
def read_paises(db: Session = Depends(get_db)):
    paises = crud.get_paises(db)
    return paises

@app.get("/paises/{numero}", response_model=schemas.Pais)
def read_pais(numero: int, db: Session = Depends(get_db)):
    pais = crud.get_pais(db, numero=numero)
    if not pais:
        raise HTTPException(status_code=404, detail="País no encontrado")
    return pais

@app.delete("/paises/{numero}")
def delete_pais(numero: int, db: Session = Depends(get_db)):
    pais = crud.delete_pais(db, numero=numero)
    if not pais:
        raise HTTPException(status_code=404, detail="País no encontrado")
    return pais