"""
Endpoints de administración para gestionar pagos y multas.
Solo para uso interno (empleados / sistema backend).
"""
import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..email_service import send_payment_confirmed_notification, send_multa_notification

router = APIRouter(prefix="/admin", tags=["Admin"])

DEADLINE_PAGO_HORAS = 72


def _get_mail_nombre(db: Session, cliente_id: int) -> tuple[str, str]:
    detalle = db.query(models.PersonaDetalle).filter(
        models.PersonaDetalle.persona == cliente_id
    ).first()
    persona = db.query(models.Persona).filter(
        models.Persona.identificador == cliente_id
    ).first()
    return (detalle.mail if detalle else ""), (persona.nombre if persona else "Usuario")


# ── Pagos ─────────────────────────────────────────────────────────────────────

@router.get("/pagos/pendientes", response_model=list[schemas.AdminPagoPendienteResponse])
def ep_pagos_pendientes(db: Session = Depends(get_db)):
    """Lista todos los registros con pagado='pendiente'."""
    registros = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.pagado == "pendiente"
    ).all()

    result = []
    for r in registros:
        persona = db.query(models.Persona).filter(
            models.Persona.identificador == r.cliente
        ).first()
        detalle = db.query(models.PersonaDetalle).filter(
            models.PersonaDetalle.persona == r.cliente
        ).first()
        subasta = db.query(models.Subasta).filter(
            models.Subasta.identificador == r.subasta
        ).first()
        medio = db.query(models.MedioPago).filter(
            models.MedioPago.identificador == r.medio_pago
        ).first() if r.medio_pago else None

        costo_envio = float(r.costo_envio) if r.costo_envio else 0.0
        total = round(float(r.importe) + float(r.comision) + costo_envio, 2)

        result.append(schemas.AdminPagoPendienteResponse(
            registroId=r.identificador,
            clienteId=r.cliente,
            nombreCliente=persona.nombre if persona else "—",
            mailCliente=detalle.mail if detalle else "—",
            subastaId=r.subasta,
            importe=float(r.importe),
            comision=float(r.comision),
            envio=costo_envio,
            total=total,
            moneda=subasta.moneda if subasta else "ARS",
            metodoPago=medio.tipo if medio else None,
            fechaLimitePago=r.fecha_limite_pago,
        ))
    return result


@router.post("/pagos/{registro_id}/confirmar")
async def ep_confirmar_pago(registro_id: int, db: Session = Depends(get_db)):
    """Marca un registro de compra como pagado (pago recibido)."""
    registro = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.identificador == registro_id
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if registro.pagado == "si":
        raise HTTPException(status_code=409, detail="Este pago ya fue confirmado")
    if registro.pagado == "vencido":
        raise HTTPException(status_code=409, detail="Este pago ya fue marcado como vencido")

    registro.pagado = "si"
    db.commit()

    # Email de confirmación al cliente
    mail, nombre = _get_mail_nombre(db, registro.cliente)
    pp = db.query(models.ProductoPresentacion).filter(
        models.ProductoPresentacion.producto == registro.producto
    ).first()
    titulo = pp.titulo if pp else f"Artículo #{registro.producto}"
    subasta = db.query(models.Subasta).filter(
        models.Subasta.identificador == registro.subasta
    ).first()
    moneda = subasta.moneda if subasta else "ARS"
    costo_envio = float(registro.costo_envio) if registro.costo_envio else 0.0
    total = round(float(registro.importe) + float(registro.comision) + costo_envio, 2)

    asyncio.create_task(send_payment_confirmed_notification(
        to_email=mail,
        nombre=nombre,
        items_titulos=[titulo],
        total=total,
        moneda=moneda,
    ))

    return {"mensaje": f"Pago del registro #{registro_id} confirmado. Email enviado a {mail}."}


@router.post("/pagos/{registro_id}/rechazar")
async def ep_rechazar_pago(registro_id: int, db: Session = Depends(get_db)):
    """
    Marca el pago como vencido (no se recibieron fondos en 72hs).
    Genera multa del 10% y notifica al cliente.
    """
    registro = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.identificador == registro_id
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if registro.pagado in ("si", "vencido"):
        raise HTTPException(status_code=409, detail=f"El pago ya tiene estado '{registro.pagado}'")

    registro.pagado = "vencido"

    # Multa: 10% del importe pujado
    monto_multa = round(float(registro.importe) * 0.10, 2)
    multa_existente = db.query(models.Multa).filter(
        models.Multa.cliente == registro.cliente,
        models.Multa.subasta == registro.subasta,
        models.Multa.pagado == "no",
    ).first()
    deadline = datetime.now() + timedelta(hours=DEADLINE_PAGO_HORAS)
    if not multa_existente:
        db.add(models.Multa(
            cliente=registro.cliente,
            subasta=registro.subasta,
            monto=monto_multa,
            pagado="no",
            fecha_limite=deadline,
        ))

    db.commit()

    mail, nombre = _get_mail_nombre(db, registro.cliente)
    subasta = db.query(models.Subasta).filter(
        models.Subasta.identificador == registro.subasta
    ).first()
    moneda = subasta.moneda if subasta else "ARS"

    asyncio.create_task(send_multa_notification(
        to_email=mail,
        nombre=nombre,
        monto_multa=monto_multa,
        importe_original=float(registro.importe),
        moneda=moneda,
        deadline=deadline,
    ))

    return {
        "mensaje": f"Pago rechazado. Multa de {monto_multa} generada. Email enviado a {mail}.",
        "multaMonto": monto_multa,
        "deadlinePago": deadline.isoformat(),
    }


# ── Multas ────────────────────────────────────────────────────────────────────

@router.get("/multas/pendientes", response_model=list[schemas.MultaResponse])
def ep_multas_pendientes(db: Session = Depends(get_db)):
    """Lista todas las multas sin pagar."""
    return db.query(models.Multa).filter(models.Multa.pagado == "no").all()


# ── Inspección de artículos ───────────────────────────────────────────────────

@router.get("/subastas/", response_model=list[schemas.AdminSubastaItem])
def ep_admin_subastas(db: Session = Depends(get_db)):
    """Lista todas las subastas con su nombre (tomado del catálogo) e ID."""
    subastas = db.query(models.Subasta).filter(models.Subasta.estado == "abierta").all()
    result = []
    for s in subastas:
        catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == s.identificador).first()
        result.append(schemas.AdminSubastaItem(
            subastaId=s.identificador,
            nombre=catalogo.descripcion if catalogo else f"Subasta #{s.identificador}",
            fecha=s.fecha,
            hora=s.hora,
            categoria=s.categoria,
            ubicacion=s.ubicacion,
        ))
    return result


@router.get("/articulos/pendientes", response_model=list[schemas.AdminArticuloPendiente])
def ep_articulos_pendientes(db: Session = Depends(get_db)):
    """Lista todos los artículos con inspección pendiente con sus datos completos."""
    inspecciones = db.query(models.InspeccionProducto).filter(
        models.InspeccionProducto.estado == "pendiente"
    ).all()
    result = []
    for insp in inspecciones:
        producto = db.query(models.Producto).filter(
            models.Producto.identificador == insp.producto
        ).first()
        if not producto:
            continue
        pp = db.query(models.ProductoPresentacion).filter(
            models.ProductoPresentacion.producto == insp.producto
        ).first()
        duenio_persona = db.query(models.Persona).filter(
            models.Persona.identificador == producto.duenio
        ).first()
        result.append(schemas.AdminArticuloPendiente(
            productoId=insp.producto,
            titulo=pp.titulo if pp else f"Producto #{insp.producto}",
            descripcionCompleta=producto.descripcionCompleta,
            categoria=pp.categoria if pp else "—",
            procedencia=pp.procedencia if pp else None,
            duenioId=producto.duenio,
            duenioNombre=duenio_persona.nombre if duenio_persona else "Desconocido",
            estadoInspeccion=insp.estado,
            fechaUltimaActualizacion=insp.fecha_ultima_actualizacion,
        ))
    return result


@router.put("/articulos/{producto_id}/inspeccion", response_model=schemas.MensajeResponse)
def ep_actualizar_inspeccion(
    producto_id: int,
    request: schemas.InspeccionUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Aprueba o rechaza un artículo enviado por un usuario.
    - Al aprobar: requiere subastaId, precioBase y comision. Estas condiciones
      quedan PROPUESTAS para que el dueño las acepte o rechace; el artículo
      recién se incorpora al catálogo de la subasta cuando el dueño las acepta
      mediante POST /articulos/{producto_id}/aceptar (no en este endpoint).
    - Al rechazar: requiere costo_devolucion.
    """
    estados_validos = {"aprobado", "rechazado"}
    if request.estado not in estados_validos:
        raise HTTPException(status_code=422, detail=f"Estado inválido. Usá: {estados_validos}")

    if request.estado == "rechazado" and request.costo_devolucion is None:
        raise HTTPException(status_code=422, detail="costo_devolucion es requerido al rechazar")

    if request.estado == "aprobado":
        if request.subastaId is None or request.precioBase is None or request.comision is None:
            raise HTTPException(status_code=422, detail="subastaId, precioBase y comision son requeridos al aprobar")

    insp = db.query(models.InspeccionProducto).filter(
        models.InspeccionProducto.producto == producto_id
    ).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspección no encontrada para este producto")

    insp.estado = request.estado
    insp.observaciones = request.observaciones
    insp.costo_devolucion = request.costo_devolucion

    if request.estado == "aprobado":
        catalogo = db.query(models.Catalogo).filter(
            models.Catalogo.subasta == request.subastaId
        ).first()
        if not catalogo:
            raise HTTPException(status_code=404, detail=f"No existe catálogo para la subasta #{request.subastaId}")

        ya_en_catalogo = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.catalogo == catalogo.identificador,
            models.ItemCatalogo.producto == producto_id,
        ).first()
        if ya_en_catalogo:
            raise HTTPException(status_code=409, detail="El artículo ya está asignado a esa subasta")

        # No insertamos el ItemCatalogo todavía: solo registramos las
        # condiciones PROPUESTAS. El artículo se incorpora al catálogo recién
        # cuando el dueño las acepta vía POST /articulos/{producto_id}/aceptar.
        aceptacion = db.query(models.AceptacionArticulo).filter(
            models.AceptacionArticulo.producto == producto_id
        ).first()
        if not aceptacion:
            aceptacion = models.AceptacionArticulo(producto=producto_id)
            db.add(aceptacion)
        aceptacion.estado = "pendiente"
        aceptacion.fecha = None
        aceptacion.subastaPropuesta = request.subastaId
        aceptacion.precioBasePropuesto = request.precioBase
        aceptacion.comisionPropuesta = request.comision

    db.commit()
    accion = "aprobado: condiciones propuestas al dueño" if request.estado == "aprobado" else "rechazado"
    return schemas.MensajeResponse(mensaje=f"Artículo #{producto_id} {accion} correctamente.")


@router.post("/pagos/procesar-vencidos")
def ep_procesar_vencidos(db: Session = Depends(get_db)):
    """
    Marca como 'vencido' todos los registros de compra cuyo fecha_limite_pago
    ya pasó y genera la multa del 10% correspondiente. Ejecutar manualmente.
    """
    ahora = datetime.now()
    vencidos = db.query(models.RegistroSubasta).filter(
        models.RegistroSubasta.pagado.in_(["no", "pendiente"]),
        models.RegistroSubasta.fecha_limite_pago != None,
        models.RegistroSubasta.fecha_limite_pago < ahora,
    ).all()

    procesados = []
    for r in vencidos:
        r.pagado = "vencido"
        monto_multa = round(float(r.importe) * 0.10, 2)
        ya_tiene_multa = db.query(models.Multa).filter(
            models.Multa.cliente == r.cliente,
            models.Multa.subasta == r.subasta,
            models.Multa.pagado == "no",
        ).first()
        if not ya_tiene_multa:
            db.add(models.Multa(
                cliente=r.cliente,
                subasta=r.subasta,
                monto=monto_multa,
                pagado="no",
                fecha_limite=ahora + timedelta(hours=DEADLINE_PAGO_HORAS),
            ))
        procesados.append({
            "registroId": r.identificador,
            "clienteId": r.cliente,
            "multaGenerada": not ya_tiene_multa,
            "multaMonto": monto_multa,
        })

    db.commit()
    return {
        "mensaje": f"{len(procesados)} registro(s) marcados como vencidos.",
        "procesados": procesados,
    }


@router.put("/medios-pago/{medio_pago_id}/estado")
def ep_admin_update_estado_medio_pago(
    medio_pago_id: int,
    estado: str,
    db: Session = Depends(get_db),
):
    """Solo admin puede verificar o rechazar medios de pago de clientes."""
    if estado not in ("verificado", "rechazado", "pendiente"):
        raise HTTPException(status_code=422, detail="Estado inválido. Opciones: verificado, rechazado, pendiente")
    medio = db.query(models.MedioPago).filter(
        models.MedioPago.identificador == medio_pago_id
    ).first()
    if not medio:
        raise HTTPException(status_code=404, detail="Medio de pago no encontrado")
    medio.estado = estado
    db.commit()
    db.refresh(medio)
    return {"id": medio.identificador, "tipo": medio.tipo, "estado": medio.estado, "mensaje": f"Estado actualizado a '{estado}'"}


@router.post("/multas/{multa_id}/confirmar-pago")
def ep_confirmar_pago_multa(multa_id: int, db: Session = Depends(get_db)):
    """Marca una multa como pagada (admin confirma recepción de fondos)."""
    multa = db.query(models.Multa).filter(models.Multa.identificador == multa_id).first()
    if not multa:
        raise HTTPException(status_code=404, detail="Multa no encontrada")
    if multa.pagado == "si":
        raise HTTPException(status_code=409, detail="La multa ya fue pagada")
    multa.pagado = "si"
    db.commit()
    return {"mensaje": f"Multa #{multa_id} marcada como pagada. El usuario puede participar en subastas nuevamente."}
