from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models, schemas
from ..database import get_db
from ..utils import get_foto_b64, CATEGORIA_ORDER

router = APIRouter(tags=["Catálogo y Productos"])


def get_home(db: Session, categoria: str) -> schemas.HomeResponse:
    nivel_usuario = CATEGORIA_ORDER.get(categoria.lower(), 0)
    cats_accesibles = [k for k, v in CATEGORIA_ORDER.items() if v <= nivel_usuario]
    subastas = db.query(models.Subasta).filter(
        models.Subasta.estado == "abierta",
        models.Subasta.categoria.in_(cats_accesibles),
    ).order_by(models.Subasta.fecha).all()

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

    def _en_vivo(subasta) -> bool:
        return subasta.estado == "abierta"

    dest = subastas[0]
    postores = db.query(models.Asistente).filter(models.Asistente.subasta == dest.identificador).count()
    historial = (
        db.query(models.HistorialPujos)
        .filter(models.HistorialPujos.subasta == dest.identificador)
        .order_by(models.HistorialPujos.fechaHora.desc())
        .limit(5)
        .all()
    )
    actividad = []
    for h in historial:
        persona = db.query(models.Persona).filter(models.Persona.identificador == h.cliente).first()
        item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.identificador == h.itemCatalogo).first()
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == item.producto
        ).first() if item else None
        actividad.append(schemas.ActividadReciente(
            pujaId=h.identificador,
            nombreComprador=persona.nombre if persona else "Desconocido",
            nombreProducto=pp.titulo if pp else "Desconocido",
            fecha=h.fechaHora,
            valor=f"${h.importe:,.2f}",
        ))

    primer_prod = _primer_producto_id(dest.identificador)
    imagen_url = (
        f"/productos/{primer_prod}/imagen-principal"
        if primer_prod else f"/subastas/{dest.identificador}/imagen-principal"
    )
    destacada = schemas.SubastaDestacada(
        subastaId=dest.identificador,
        titulo=_titulo(dest.identificador),
        fecha=datetime.combine(dest.fecha, dest.hora),
        imagenUrl=imagen_url,
        postoresRegistrados=postores,
        categoria=dest.categoria,
        enVivo=_en_vivo(dest),
        actividadReciente=actividad,
    )

    generales = []
    for s in subastas[1:]:
        prod_id = _primer_producto_id(s.identificador)
        generales.append(schemas.SubastaGeneral(
            subastaId=s.identificador,
            titulo=_titulo(s.identificador),
            fecha=datetime.combine(s.fecha, s.hora),
            categoria=s.categoria,
            enVivo=_en_vivo(s),
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
    nueva = models.Foto(producto=request.producto, foto=None)
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
def ep_get_home(categoria: str = Query(...), db: Session = Depends(get_db)):
    return get_home(db, categoria)

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
