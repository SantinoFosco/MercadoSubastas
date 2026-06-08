from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from .. import models, schemas

# Argentina is UTC-3 year-round (no DST). Using a fixed offset avoids the
# mismatch that occurs when Docker runs in UTC but the auction times stored in
# the DB are expressed in local Argentine time.
_AR_TZ = timezone(timedelta(hours=-3))
from ..database import get_db
from ..utils import get_foto_b64, CATEGORIA_ORDER

router = APIRouter(tags=["Catálogo y Productos"])


def _en_vivo(subasta, db: Session) -> bool:
    """True si la subasta está activa ahora (fecha+hora en UTC) y tiene ítems sin subastar."""
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    inicio = datetime.combine(subasta.fecha, subasta.hora)
    if subasta.estado != "abierta" or inicio > ahora:
        return False
    cat = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta.identificador).first()
    if not cat:
        return False
    return db.query(models.ItemCatalogo).filter(
        models.ItemCatalogo.catalogo == cat.identificador,
        models.ItemCatalogo.subastado == "no",
    ).count() > 0


def get_home(db: Session) -> schemas.HomeResponse:
    # Los catálogos son públicos; el acceso a la sala en vivo se restringe por
    # categoría en el endpoint registrarAsistente. Aquí se devuelven todas las
    # subastas abiertas para que el usuario pueda ver el catálogo de cualquiera.
    subastas = db.query(models.Subasta).filter(
        models.Subasta.estado == "abierta",
    ).order_by(models.Subasta.fecha, models.Subasta.hora).all()

    if not subastas:
        return schemas.HomeResponse(subastaDestacada=None, subastasGenerales=[])

    def _titulo(subasta_id: int) -> str:
        cat = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
        return cat.descripcion if cat else f"Subasta #{subasta_id}"

    def _primer_producto_id(subasta_id: int) -> int | None:
        cat = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
        if not cat:
            return None
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.catalogo == cat.identificador).first()
        return item.producto if item else None

    # Priorizar subasta en vivo como destacada; si no hay ninguna, usar la próxima por fecha.
    dest_idx = next((i for i, s in enumerate(subastas) if _en_vivo(s, db)), 0)
    dest = subastas[dest_idx]

    postores = db.query(models.Asistente).filter(models.Asistente.subasta == dest.identificador).count()
    historial = (
        db.query(models.HistorialPujos)
        .order_by(models.HistorialPujos.fechaHora.desc())
        .limit(5)
        .all()
    )
    # Cargar personas, items y presentaciones en bloque para evitar N+1
    cliente_ids = [h.cliente for h in historial]
    item_ids = [h.itemCatalogo for h in historial]
    personas_map = {
        p.identificador: p
        for p in db.query(models.Persona).filter(models.Persona.identificador.in_(cliente_ids)).all()
    } if cliente_ids else {}
    items_map = {
        it.identificador: it
        for it in db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador.in_(item_ids)).all()
    } if item_ids else {}
    producto_ids = [it.producto for it in items_map.values()]
    pp_map = {
        pp.producto: pp
        for pp in db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto.in_(producto_ids)
        ).all()
    } if producto_ids else {}

    actividad = []
    for h in historial:
        persona = personas_map.get(h.cliente)
        item = items_map.get(h.itemCatalogo)
        if not item:
            continue
        pp = pp_map.get(item.producto)
        actividad.append(schemas.ActividadReciente(
            pujaId=h.identificador,
            nombreComprador=persona.nombre if persona else "Desconocido",
            nombreProducto=pp.titulo if pp else "Desconocido",
            fecha=h.fechaHora.replace(tzinfo=timezone.utc),
            valor=f"${h.importe:,.2f}",
        ))

    primer_prod = _primer_producto_id(dest.identificador)
    destacada = schemas.SubastaDestacada(
        subastaId=dest.identificador,
        titulo=_titulo(dest.identificador),
        fecha=datetime.combine(dest.fecha, dest.hora).replace(tzinfo=timezone.utc),
        imagen=get_foto_b64(db, primer_prod) if primer_prod else None,
        postoresRegistrados=postores,
        categoria=dest.categoria,
        enVivo=_en_vivo(dest, db),
        actividadReciente=actividad,
    )

    generales = []
    for s in (s for i, s in enumerate(subastas) if i != dest_idx):
        prod_id = _primer_producto_id(s.identificador)
        generales.append(schemas.SubastaGeneral(
            subastaId=s.identificador,
            titulo=_titulo(s.identificador),
            fecha=datetime.combine(s.fecha, s.hora).replace(tzinfo=timezone.utc),
            categoria=s.categoria,
            enVivo=_en_vivo(s, db),
            imagen=get_foto_b64(db, prod_id) if prod_id else None,
        ))

    return schemas.HomeResponse(subastaDestacada=destacada, subastasGenerales=generales)


def get_catalogo_subasta(db: Session, subasta_id: int):
    if not db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first():
        return None
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if not catalogo:
        return []
    items = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.catalogo == catalogo.identificador).all()
    result = []
    for item in items:
        pp = db.query(models.ProductoPresentacion).filter(models.ProductoPresentacion.producto == item.producto).first()
        producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
        result.append(schemas.ProductoCatalogo(
            productoId=item.producto,
            titulo=pp.titulo if pp else "Sin título",
            descripcionCorta=producto.descripcionCatalogo if producto else "",
            precioBase=item.precioBase,
            subastado=item.subastado,
            imagen=get_foto_b64(db, item.producto),
        ))
    return result


def get_detalle_producto_catalogo(db: Session, subasta_id: int, producto_id: int):
    if not db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first():
        return None
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta_id).first()
    if not catalogo:
        return None
    item = db.query(models.ItemCatalogo).filter(
        models.ItemCatalogo.catalogo == catalogo.identificador,
        models.ItemCatalogo.producto == producto_id,
    ).first()
    if not item:
        return None
    producto = db.query(models.Producto).filter(models.Producto.identificador == producto_id).first()
    pp = db.query(models.ProductoPresentacion).filter(models.ProductoPresentacion.producto == producto_id).first()
    return schemas.DetalleProducto(
        productoId=producto_id,
        titulo=pp.titulo if pp else "Sin título",
        descripcion=producto.descripcionCompleta if producto else "",
        precioBase=item.precioBase,
        subastado=item.subastado,
        imagen=get_foto_b64(db, producto_id),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/productos/", response_model=schemas.ProductoResponse, status_code=201)
def ep_create_producto(request: schemas.ProductoCreate, db: Session = Depends(get_db)):
    nuevo = models.Producto(
        descripcionCatalogo=request.descripcionCatalogo,
        descripcionCompleta=request.descripcionCompleta,
        revisor=request.revisor, duenio=request.duenio,
        fecha=request.fecha, disponible="si",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/productos/{producto_id}")
def ep_delete_producto(producto_id: int, db: Session = Depends(get_db)):
    try:
        obj = db.query(models.Producto).filter(models.Producto.identificador == producto_id).first()
        if obj:
            db.delete(obj)
            db.commit()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay fotos, presentaciones o items que dependen de este producto")
    if obj is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": f"Producto {producto_id} eliminado con éxito"}

@router.post("/fotos/", response_model=schemas.FotoResponse, status_code=201)
def ep_create_foto(request: schemas.FotoCreate, db: Session = Depends(get_db)):
    import base64
    foto_bytes = None
    if request.imagen:
        try:
            foto_bytes = base64.b64decode(request.imagen)
        except Exception:
            raise HTTPException(status_code=422, detail="La imagen no es un base64 válido")
    nueva = models.Foto(producto=request.producto, foto=foto_bytes)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.delete("/fotos/{foto_id}")
def ep_delete_foto(foto_id: int, db: Session = Depends(get_db)):
    try:
        obj = db.query(models.Foto).filter(models.Foto.identificador == foto_id).first()
        if obj:
            db.delete(obj)
            db.commit()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay presentaciones que dependen de esta foto")
    if obj is None:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return {"message": f"Foto {foto_id} eliminada con éxito"}

@router.post("/productos-presentacion/", response_model=schemas.ProductoPresentacionResponse, status_code=201)
def ep_create_producto_presentacion(request: schemas.ProductoPresentacionCreate, db: Session = Depends(get_db)):
    nuevo = models.ProductoPresentacion(
        producto=request.producto, titulo=request.titulo, categoria=request.categoria,
        procedencia=request.procedencia, declaracionLegal=request.declaracionLegal,
        estado=request.estado, imagenPrincipal=request.imagenPrincipal,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/productos-presentacion/{pp_id}")
def ep_delete_producto_presentacion(pp_id: int, db: Session = Depends(get_db)):
    try:
        obj = db.query(models.ProductoPresentacion).filter(models.ProductoPresentacion.identificador == pp_id).first()
        if obj:
            db.delete(obj)
            db.commit()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay registros que dependen de esta presentación")
    if obj is None:
        raise HTTPException(status_code=404, detail="Presentación no encontrada")
    return {"message": f"Presentación {pp_id} eliminada con éxito"}

@router.post("/catalogos/", response_model=schemas.CatalogoResponse, status_code=201)
def ep_create_catalogo(request: schemas.CatalogoCreate, db: Session = Depends(get_db)):
    nuevo = models.Catalogo(descripcion=request.descripcion, subasta=request.subasta, responsable=request.responsable)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/catalogos/{catalogo_id}")
def ep_delete_catalogo(catalogo_id: int, db: Session = Depends(get_db)):
    try:
        obj = db.query(models.Catalogo).filter(models.Catalogo.identificador == catalogo_id).first()
        if obj:
            db.delete(obj)
            db.commit()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay items de catálogo que dependen de este catálogo")
    if obj is None:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    return {"message": f"Catálogo {catalogo_id} eliminado con éxito"}

@router.post("/items-catalogo/", response_model=schemas.ItemCatalogoResponse, status_code=201)
def ep_create_item_catalogo(request: schemas.ItemCatalogoCreate, db: Session = Depends(get_db)):
    nuevo = models.ItemCatalogo(
        catalogo=request.catalogo, producto=request.producto,
        precioBase=request.precioBase, comision=request.comision, subastado="no",
    )
    db.add(nuevo)
    db.flush()

    # Al asignar un artículo a catálogo, se crea el registro de aceptación pendiente
    # para que el dueño pueda ver las condiciones y aceptar/rechazar
    existe = db.query(models.AceptacionArticulo).filter(
        models.AceptacionArticulo.producto == request.producto
    ).first()
    if not existe:
        db.add(models.AceptacionArticulo(producto=request.producto, estado="pendiente"))

    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/items-catalogo/{item_id}")
def ep_delete_item_catalogo(item_id: int, db: Session = Depends(get_db)):
    try:
        obj = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == item_id).first()
        if obj:
            db.delete(obj)
            db.commit()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay pujos que dependen de este item")
    if obj is None:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return {"message": f"Item {item_id} eliminado con éxito"}

@router.get("/home", response_model=schemas.HomeResponse)
def ep_get_home(db: Session = Depends(get_db)):
    return get_home(db)


@router.get("/subastas/{subasta_id}/info")
def ep_get_subasta_info(subasta_id: int, db: Session = Depends(get_db)):
    subasta = db.query(models.Subasta).filter(models.Subasta.identificador == subasta_id).first()
    if not subasta:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")
    # Devolver la hora con offset explícito -03:00 (Argentina).
    # Sin offset, JavaScript interpreta la cadena como hora local del dispositivo,
    # lo que da resultados incorrectos si el dispositivo no está en UTC-3.
    return {
        "subastaId": subasta_id,
        "fecha": datetime.combine(subasta.fecha, subasta.hora).replace(tzinfo=timezone.utc).isoformat(),
        "categoria": subasta.categoria,
        "enVivo": _en_vivo(subasta, db),
    }

@router.get("/subastas/{subasta_id}/catalogo", response_model=list[schemas.ProductoCatalogo])
def ep_get_catalogo_subasta(subasta_id: int, db: Session = Depends(get_db)):
    result = get_catalogo_subasta(db, subasta_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Subasta no encontrada")
    return result

@router.get("/subastas/{subasta_id}/catalogo/{producto_id}", response_model=schemas.DetalleProducto)
def ep_get_detalle_producto_catalogo(subasta_id: int, producto_id: int, db: Session = Depends(get_db)):
    result = get_detalle_producto_catalogo(db, subasta_id, producto_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado en el catálogo")
    return result
