from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["Vender / Artículos"])


# ── CRUD ─────────────────────────────────────────────────────────────────────

def submit_articulo(db: Session, request: schemas.ArticuloSubmitRequest):
    empleado = db.query(models.Empleado).first()
    if not empleado:
        raise HTTPException(status_code=503, detail="No hay empleados configurados en el sistema")
    empleado_id = empleado.identificador

    duenio = db.query(models.Duenio).filter(models.Duenio.identificador == request.clienteId).first()
    if not duenio:
        duenio = models.Duenio(identificador=request.clienteId, numeroPais=None, verificador=empleado_id)
        db.add(duenio)
        db.flush()

    producto = models.Producto(
        descripcionCatalogo=request.titulo[:100],
        descripcionCompleta=request.descripcionCompleta,
        revisor=empleado_id,
        duenio=duenio.identificador,
        disponible="si",
    )
    db.add(producto)
    db.flush()

    presentacion = models.ProductoPresentacion(
        producto=producto.identificador,
        titulo=request.titulo,
        categoria=request.categoria,
        procedencia=request.procedencia,
        declaracionLegal="si" if request.declaracionLegal else "no",
        estado="borrador",
    )
    db.add(presentacion)
    db.flush()

    db.add(models.InspeccionProducto(
        producto=producto.identificador,
        estado="pendiente",
        fecha_ultima_actualizacion=datetime.now(),
    ))
    db.commit()

    return schemas.ArticuloSubmitResponse(
        productoId=producto.identificador,
        presentacionId=presentacion.identificador,
        mensaje="Artículo enviado exitosamente. Estará en revisión a la brevedad.",
    )


def get_condiciones_articulo(db: Session, producto_id: int):
    pp = db.query(models.ProductoPresentacion).filter(
        models.ProductoPresentacion.producto == producto_id
    ).first()
    titulo = pp.titulo if pp else "Artículo"

    item = db.query(models.ItemCatalogo).filter(models.ItemCatalogo.producto == producto_id).first()
    aceptacion = db.query(models.AceptacionArticulo).filter(
        models.AceptacionArticulo.producto == producto_id
    ).first()

    if not item:
        return schemas.ArticuloCondicionesResponse(
            productoId=producto_id,
            titulo=titulo,
            tieneCondiciones=False,
            aceptacion=aceptacion.estado if aceptacion else None,
        )

    catalogo = db.query(models.Catalogo).filter(models.Catalogo.identificador == item.catalogo).first()
    subasta = db.query(models.Subasta).filter(
        models.Subasta.identificador == catalogo.subasta
    ).first() if catalogo and catalogo.subasta else None

    return schemas.ArticuloCondicionesResponse(
        productoId=producto_id,
        titulo=titulo,
        tieneCondiciones=True,
        precioBase=float(item.precioBase),
        comision=float(item.comision),
        subastaFecha=subasta.fecha if subasta else None,
        subastaHora=subasta.hora if subasta else None,
        subastaUbicacion=subasta.ubicacion if subasta else None,
        aceptacion=aceptacion.estado,
    )


def _set_aceptacion(db: Session, producto_id: int, estado: str) -> schemas.MensajeResponse:
    obj = db.query(models.AceptacionArticulo).filter(
        models.AceptacionArticulo.producto == producto_id
    ).first()
    if not obj:
        obj = models.AceptacionArticulo(producto=producto_id)
        db.add(obj)
    obj.estado = estado
    obj.fecha = datetime.now()
    db.commit()
    if estado == "aceptado":
        return schemas.MensajeResponse(mensaje="Condiciones aceptadas correctamente.")
    return schemas.MensajeResponse(mensaje="Condiciones rechazadas. El artículo será devuelto.")


def get_articulos_cliente(db: Session, cliente_id: int):
    productos = db.query(models.Producto).filter(models.Producto.duenio == cliente_id).all()
    result = []
    for producto in productos:
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == producto.identificador
        ).first()
        inspeccion = db.query(models.InspeccionProducto).filter(
            models.InspeccionProducto.producto == producto.identificador
        ).first()
        # Si el producto no tiene registro de inspección no es un artículo
        # enviado por el usuario (es un producto de seed interno). Se omite.
        if not inspeccion:
            continue
        item_catalogo = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.producto == producto.identificador,
        ).first()
        aceptacion_ok = db.query(models.AceptacionArticulo).filter(
            models.AceptacionArticulo.producto == producto.identificador,
            models.AceptacionArticulo.estado == "aceptado",
        ).first()
        en_subasta = item_catalogo is not None and aceptacion_ok is not None
        result.append(schemas.ArticuloListItem(
            productoId=producto.identificador,
            presentacionId=pp.identificador if pp else 0,
            titulo=pp.titulo if pp else producto.descripcionCatalogo,
            categoria=pp.categoria if pp else "-",
            fechaEnvio=producto.fecha,
            estadoInspeccion=inspeccion.estado,
            observaciones=inspeccion.observaciones,
            costoDevolucion=float(inspeccion.costo_devolucion) if inspeccion.costo_devolucion else None,
            enSubasta=en_subasta,
        ))
    return result


def get_estadisticas_cliente(db: Session, cliente_id: int):
    subastas_totales = (
        db.query(models.HistorialPujos.subasta)
        .filter(models.HistorialPujos.cliente == cliente_id)
        .distinct()
        .count()
    )

    total_invertido_result = db.query(func.sum(models.RegistroSubasta.importe)).filter(
        models.RegistroSubasta.cliente == cliente_id
    ).scalar()
    total_invertido = float(total_invertido_result) if total_invertido_result else 0.0

    asistente_ids = [
        a.identificador
        for a in db.query(models.Asistente).filter(models.Asistente.cliente == cliente_id).all()
    ]
    pujas_ganadas = (
        db.query(models.Pujo)
        .filter(models.Pujo.asistente.in_(asistente_ids), models.Pujo.ganador == "si")
        .count()
    ) if asistente_ids else 0

    historial_rows = (
        db.query(models.HistorialPujos)
        .filter(models.HistorialPujos.cliente == cliente_id)
        .order_by(models.HistorialPujos.fechaHora.desc())
        .limit(10)
        .all()
    )
    historial = []
    for h in historial_rows:
        item = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.identificador == h.itemCatalogo
        ).first()
        if not item:
            continue
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == item.producto
        ).first()
        pujo = db.query(models.Pujo).filter(models.Pujo.identificador == h.pujo).first()
        historial.append(schemas.HistorialItemEstadisticas(
            titulo=pp.titulo if pp else "Producto desconocido",
            fecha=h.fechaHora,
            importe=float(h.importe),
            ganada=pujo.ganador == "si" if pujo else False,
        ))

    return schemas.EstadisticasCliente(
        subastasTotales=subastas_totales,
        pujasGanadas=pujas_ganadas,
        totalInvertido=total_invertido,
        historial=historial,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/articulos/", response_model=schemas.ArticuloSubmitResponse)
def ep_submit_articulo(request: schemas.ArticuloSubmitRequest, db: Session = Depends(get_db)):
    if not db.query(models.Cliente).filter(models.Cliente.identificador == request.clienteId).first():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return submit_articulo(db, request)


@router.get("/articulos/{producto_id}/condiciones", response_model=schemas.ArticuloCondicionesResponse)
def ep_get_condiciones_articulo(producto_id: int, db: Session = Depends(get_db)):
    return get_condiciones_articulo(db, producto_id)


@router.post("/articulos/{producto_id}/aceptar", response_model=schemas.MensajeResponse)
def ep_aceptar_condiciones(producto_id: int, db: Session = Depends(get_db)):
    return _set_aceptacion(db, producto_id, "aceptado")


@router.post("/articulos/{producto_id}/rechazar", response_model=schemas.MensajeResponse)
def ep_rechazar_condiciones(producto_id: int, db: Session = Depends(get_db)):
    return _set_aceptacion(db, producto_id, "rechazado")


@router.get("/clientes/{cliente_id}/articulos", response_model=list[schemas.ArticuloListItem])
def ep_get_articulos_cliente(cliente_id: int, db: Session = Depends(get_db)):
    return get_articulos_cliente(db, cliente_id)


@router.get("/clientes/{cliente_id}/estadisticas", response_model=schemas.EstadisticasCliente)
def ep_get_estadisticas_cliente(cliente_id: int, db: Session = Depends(get_db)):
    return get_estadisticas_cliente(db, cliente_id)
