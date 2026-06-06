"""
Script de datos iniciales y de prueba.

Uso (desde la raíz del proyecto APIMercadoSubastas/):
    python -m scripts.seed              # carga todos los seeds
    python -m scripts.seed compras      # solo el seed de compras de prueba
"""
import sys
import os

# Permite importar el paquete app desde la raíz del proyecto
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, time, timedelta
from passlib.context import CryptContext
from app import models
from app.database import SessionLocal

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_paises():
    db = SessionLocal()
    try:
        paises = [
            models.Pais(numero=1, nombre="Argentina", nombreCorto="ARG", capital="Buenos Aires",  nacionalidad="Argentina",  idiomas="Español"),
            models.Pais(numero=2, nombre="Uruguay",   nombreCorto="URY", capital="Montevideo",    nacionalidad="Uruguaya",   idiomas="Español"),
            models.Pais(numero=3, nombre="Paraguay",  nombreCorto="PRY", capital="Asunción",      nacionalidad="Paraguaya",  idiomas="Español, Guaraní"),
            models.Pais(numero=4, nombre="Chile",     nombreCorto="CHL", capital="Santiago",      nacionalidad="Chilena",    idiomas="Español"),
        ]
        for p in paises:
            if not db.get(models.Pais, p.numero):
                db.add(p)
        db.commit()
        print("✓ Países cargados")
    finally:
        db.close()


def seed_empleados():
    db = SessionLocal()
    try:
        for eid in (1, 2, 3):
            if not db.get(models.Empleado, eid):
                db.add(models.Empleado(identificador=eid, cargo="Verificador", sector=None))
        db.commit()
        print("✓ Empleados cargados")
    finally:
        db.close()


def seed_empresa():
    """Crea el cliente 'Casa de Subastas' usado cuando nadie puja por un artículo."""
    db = SessionLocal()
    try:
        if db.query(models.Persona).filter(models.Persona.documento == "00000000").first():
            return
        persona = models.Persona(nombre="Casa de Subastas", documento="00000000", direccion="Sede Central", estado="activo")
        db.add(persona)
        db.flush()
        db.add(models.Cliente(identificador=persona.identificador, numeroPais=1, admitido="si", categoria="platino", verificador=1))
        db.commit()
        print("✓ Casa de Subastas creada")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_subastas():
    """Crea subastador, dueño, 5 productos y 2 subastas con sus catálogos."""
    db = SessionLocal()
    try:
        if db.query(models.Persona).filter(models.Persona.documento == "00000001").first():
            print("✓ Subastas ya existen, se omite")
            return

        # Subastador
        p_sub = models.Persona(nombre="Subastador Prueba", documento="00000001", direccion="Av. Corrientes 1234, CABA", estado="activo")
        db.add(p_sub)
        db.flush()
        subastador = models.Subastador(identificador=p_sub.identificador, matricula="MAT-001", region="Buenos Aires")
        db.add(subastador)
        db.flush()

        # Dueño
        p_due = models.Persona(nombre="Duenio Prueba", documento="00000002", direccion="Av. Santa Fe 2000, CABA", estado="activo")
        db.add(p_due)
        db.flush()
        duenio = models.Duenio(identificador=p_due.identificador, numeroPais=1, verificador=1)
        db.add(duenio)
        db.flush()

        # Productos
        articulos = [
            models.Producto(descripcionCatalogo="Reloj suizo siglo XIX",      descripcionCompleta="Reloj de bolsillo suizo, circa 1890, caja de plata maciza, movimiento de 17 rubíes.", revisor=1, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Jarrón Ming original",        descripcionCompleta="Jarrón de porcelana china de la dinastía Ming, circa 1400, decoración floral en azul y blanco, 42 cm.", revisor=1, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Pintura flamenca siglo XVII", descripcionCompleta="Pintura al óleo sobre lienzo, escuela flamenca, siglo XVII, bodegón con frutas y animales, 80x60 cm.", revisor=2, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Colección monedas romanas",   descripcionCompleta="12 monedas romanas del período imperial, siglos I a III d.C., denarios y sestercios.", revisor=2, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Silla estilo Luis XV",        descripcionCompleta="Silla tapizada en seda bordada, estilo Luis XV, Francia circa 1750, madera de nogal tallada.", revisor=3, duenio=duenio.identificador, disponible="si"),
        ]
        for a in articulos:
            db.add(a)
        db.flush()

        # Presentaciones
        datos_pp = [
            ("Reloj de Bolsillo Suizo — Siglo XIX",       "Relojes y Joyería", "Suiza"),
            ("Jarrón de Porcelana China — Dinastía Ming",  "Arte Oriental",     "China"),
            ("Bodegón Flamenco — Escuela del XVII",        "Pintura y Arte",    "Países Bajos"),
            ("Colección Numismática Romana",                "Numismática",       "Italia"),
            ("Silla Luis XV — Francia 1750",               "Muebles Antiguos",  "Francia"),
        ]
        for articulo, (titulo, cat, procedencia) in zip(articulos, datos_pp):
            db.add(models.ProductoPresentacion(
                producto=articulo.identificador, titulo=titulo, categoria=cat,
                procedencia=procedencia, declaracionLegal="si", estado="publicado",
            ))
        db.flush()

        # Subastas
        hoy = date.today()
        subasta_1 = models.Subasta(
            fecha=hoy, hora=time(20, 0), estado="abierta",
            subastador=subastador.identificador, ubicacion="Salón Principal, Av. Alvear 1440, CABA",
            capacidadAsistentes=100, tieneDeposito="si", seguridadPropia="si", categoria="comun",
        )
        subasta_2 = models.Subasta(
            fecha=hoy + timedelta(days=45), hora=time(10, 0), estado="abierta",
            subastador=subastador.identificador, ubicacion="Sala VIP, Av. del Libertador 750, CABA",
            capacidadAsistentes=50, tieneDeposito="si", seguridadPropia="si", categoria="comun",
        )
        db.add(subasta_1)
        db.add(subasta_2)
        db.flush()

        # Catálogos e ítems
        cat_1 = models.Catalogo(descripcion="Subasta de Antigüedades — Lote 1", subasta=subasta_1.identificador, responsable=1)
        cat_2 = models.Catalogo(descripcion="Subasta de Arte y Numismática — Lote 2", subasta=subasta_2.identificador, responsable=2)
        db.add(cat_1)
        db.add(cat_2)
        db.flush()

        items = [
            models.ItemCatalogo(catalogo=cat_1.identificador, producto=articulos[0].identificador, precioBase=150000, comision=10, subastado="no"),
            models.ItemCatalogo(catalogo=cat_1.identificador, producto=articulos[1].identificador, precioBase=320000, comision=10, subastado="no"),
            models.ItemCatalogo(catalogo=cat_1.identificador, producto=articulos[2].identificador, precioBase=280000, comision=12, subastado="no"),
            models.ItemCatalogo(catalogo=cat_2.identificador, producto=articulos[3].identificador, precioBase=85000,  comision=8,  subastado="no"),
            models.ItemCatalogo(catalogo=cat_2.identificador, producto=articulos[4].identificador, precioBase=195000, comision=10, subastado="no"),
        ]
        for item in items:
            db.add(item)
        db.flush()

        # AceptacionArticulo: para que los dueños puedan ver y aceptar las condiciones
        for item in items:
            db.add(models.AceptacionArticulo(producto=item.producto, estado="pendiente"))

        db.commit()
        print("✓ Subastas y catálogos creados")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_usuario_prueba():
    """Usuario principal de prueba con cuenta bancaria verificada."""
    db = SessionLocal()
    try:
        if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "prueba@test.com").first():
            print("✓ Usuario prueba@test.com ya existe, se omite")
            return
        persona = models.Persona(nombre="Usuario Prueba", documento="99999999", direccion="Av. Siempreviva 742, Springfield", estado="activo")
        db.add(persona)
        db.flush()
        db.add(models.PersonaDetalle(persona=persona.identificador, pais=1, mail="prueba@test.com", contrasenia=pwd_context.hash("Prueba1."), claveTemporal=False))
        db.add(models.Cliente(identificador=persona.identificador, numeroPais=1, admitido="si", categoria="comun", verificador=1))
        db.flush()
        medio = models.MedioPago(cliente=persona.identificador, tipo="cuenta_bancaria", estado="verificado", moneda="ARS", es_internacional="no", descripcion="Cuenta de prueba")
        db.add(medio)
        db.flush()
        db.add(models.mpCuentaBancaria(medio_pago=medio.identificador, titular="Usuario Prueba", banco="Banco Nación", cbu="0110012340012345678901", alias="usuario.prueba", pais_banco=1))
        db.commit()
        print("✓ Usuario prueba@test.com creado (cuenta bancaria verificada)")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_usuario_prueba_2():
    """Segundo postor para testear pujas de múltiples usuarios."""
    db = SessionLocal()
    try:
        if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "prueba2@test.com").first():
            print("✓ Usuario prueba2@test.com ya existe, se omite")
            return
        persona = models.Persona(nombre="Segundo Postor", documento="88888888", direccion="Av. Corrientes 1234, CABA", estado="activo")
        db.add(persona)
        db.flush()
        db.add(models.PersonaDetalle(persona=persona.identificador, pais=1, mail="prueba2@test.com", contrasenia=pwd_context.hash("Prueba2."), claveTemporal=False))
        db.add(models.Cliente(identificador=persona.identificador, numeroPais=1, admitido="si", categoria="comun", verificador=1))
        db.flush()
        medio = models.MedioPago(cliente=persona.identificador, tipo="tarjeta", estado="verificado", moneda="ARS", es_internacional="no", descripcion="Tarjeta de prueba")
        db.add(medio)
        db.flush()
        db.add(models.mpTarjeta(medio_pago=medio.identificador, titular="Segundo Postor", ultimos_4_digitos="4321", vencimiento=date(2027, 12, 31), marca="VISA", tipo_tarjeta="credito"))
        db.commit()
        print("✓ Usuario prueba2@test.com creado (tarjeta VISA verificada)")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_subastas_categorias():
    """Crea subastas de categorías especial, plata, oro y platino con productos de alta gama."""
    db = SessionLocal()
    try:
        if db.query(models.Persona).filter(models.Persona.documento == "00000003").first():
            print("✓ Subastas por categoría ya existen, se omite")
            return

        p_due = db.query(models.Persona).filter(models.Persona.documento == "00000002").first()
        if not p_due:
            p_due = models.Persona(nombre="Duenio Prueba 2", documento="00000003", direccion="Av. Rivadavia 3000, CABA", estado="activo")
            db.add(p_due)
            db.flush()
            db.add(models.Duenio(identificador=p_due.identificador, numeroPais=1, verificador=1))
            db.flush()
        duenio_id = p_due.identificador

        p_sub = db.query(models.Persona).filter(models.Persona.documento == "00000001").first()
        subastador_id = db.query(models.Subastador).filter(
            models.Subastador.identificador == p_sub.identificador
        ).first().identificador

        from datetime import date as _date, time as _time, timedelta as _td
        hoy = _date.today()

        datos_categorias = [
            ("especial", [
                {
                    "subasta": {"fecha": hoy + _td(days=10), "hora": _time(14, 0), "ubicacion": "Sala Especial A, Av. Cabildo 100, CABA", "capacidad": 80},
                    "catalogo": "Subasta Especial — Lote A",
                    "productos": [
                        ("Broche victoriano en oro", "Broche victoriano en oro 18k con diamantes de corte antiguo, circa 1880.", "Joyería", "Reino Unido", 200000, 12),
                        ("Telescopio refractor siglo XIX", "Telescopio refractor de latón, circa 1870, fabricante inglés, longitud 90 cm.", "Instrumentos", "Reino Unido", 175000, 10),
                    ]
                },
            ]),
            ("plata", [
                {
                    "subasta": {"fecha": hoy + _td(days=12), "hora": _time(11, 0), "ubicacion": "Salón Plata, Posadas 1200, CABA", "capacidad": 50},
                    "catalogo": "Subasta Plata — Lote A",
                    "productos": [
                        ("Escultura bronce Art Déco", "Escultura en bronce patinado, estilo Art Déco, figura femenina danzante, circa 1925, 55 cm.", "Escultura", "Francia", 450000, 14),
                        ("Piano de cola Bösendorfer 1910", "Piano de cola Bösendorfer, modelo 170, Viena circa 1910, restaurado profesionalmente.", "Instrumentos Musicales", "Austria", 1800000, 15),
                    ]
                },
            ]),
            ("oro", [
                {
                    "subasta": {"fecha": hoy + _td(days=15), "hora": _time(15, 0), "ubicacion": "Suite Oro, Alvear Palace Hotel, CABA", "capacidad": 30},
                    "catalogo": "Subasta Oro — Lote A",
                    "productos": [
                        ("Collar diamantes Belle Époque", "Collar en platino con 48 diamantes talla brillante, peso total 12 ct, circa 1905, certificado GIA.", "Alta Joyería", "Francia", 3500000, 18),
                        ("Reloj Patek Philippe ref. 2499", "Patek Philippe ref. 2499, calendario perpetuo cronógrafo, oro rosa 18k, circa 1960.", "Relojería", "Suiza", 9500000, 18),
                    ]
                },
            ]),
            ("platino", [
                {
                    "subasta": {"fecha": hoy + _td(days=8), "hora": _time(20, 0), "ubicacion": "Penthouse Exclusivo, Puerto Madero, CABA", "capacidad": 15},
                    "catalogo": "Subasta Platino — Lote A",
                    "productos": [
                        ("Obra Picasso — Período Azul", "Óleo sobre lienzo, Pablo Picasso, circa 1903, período azul, autenticado por el Musée Picasso París, 95x75 cm.", "Pintura Moderna", "España", 85000000, 25),
                        ("Diamante azul — 18 quilates", "Diamante azul fancy vivid, talla cojín, 18.02 ct, certificado GIA FL.", "Gemas", "Sudáfrica", 120000000, 22),
                    ]
                },
            ]),
        ]

        for categoria, lotes in datos_categorias:
            for lote in lotes:
                sd = lote["subasta"]
                subasta = models.Subasta(
                    fecha=sd["fecha"], hora=sd["hora"], estado="abierta",
                    subastador=subastador_id, ubicacion=sd["ubicacion"],
                    capacidadAsistentes=sd["capacidad"], tieneDeposito="si",
                    seguridadPropia="si", categoria=categoria,
                )
                db.add(subasta)
                db.flush()
                catalogo = models.Catalogo(descripcion=lote["catalogo"], subasta=subasta.identificador, responsable=1)
                db.add(catalogo)
                db.flush()
                for desc_corta, desc_larga, cat_pp, procedencia, precio, comision in lote["productos"]:
                    producto = models.Producto(
                        descripcionCatalogo=desc_corta, descripcionCompleta=desc_larga,
                        revisor=1, duenio=duenio_id, disponible="si",
                    )
                    db.add(producto)
                    db.flush()
                    db.add(models.ProductoPresentacion(
                        producto=producto.identificador, titulo=desc_corta, categoria=cat_pp,
                        procedencia=procedencia, declaracionLegal="si", estado="publicado",
                    ))
                    db.add(models.ItemCatalogo(
                        catalogo=catalogo.identificador, producto=producto.identificador,
                        precioBase=precio, comision=comision, subastado="no",
                    ))
                    db.flush()
                    db.add(models.AceptacionArticulo(producto=producto.identificador, estado="pendiente"))
                db.flush()

        db.commit()
        print("✓ Subastas por categoría creadas (especial / plata / oro / platino)")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_historial_prueba():
    """Crea historial de pujas para el usuario de prueba (para testear estadísticas)."""
    db = SessionLocal()
    try:
        usuario = db.query(models.PersonaDetalle).filter(
            models.PersonaDetalle.mail == "prueba@test.com"
        ).first()
        if not usuario:
            return

        cliente_id = usuario.persona
        if db.query(models.Asistente).filter(models.Asistente.cliente == cliente_id).first():
            print("✓ Historial de prueba ya existe, se omite")
            return

        subastas = db.query(models.Subasta).order_by(models.Subasta.identificador).all()
        if len(subastas) < 2:
            return

        subasta_1, subasta_2 = subastas[0], subastas[1]

        def items_de_subasta(subasta_id):
            return (
                db.query(models.ItemCatalogo)
                .join(models.Catalogo, models.ItemCatalogo.catalogo == models.Catalogo.identificador)
                .filter(models.Catalogo.subasta == subasta_id)
                .all()
            )

        from datetime import datetime as _dt, timedelta as _td
        items_s1 = items_de_subasta(subasta_1.identificador)
        items_s2 = items_de_subasta(subasta_2.identificador)

        asistente_1 = models.Asistente(numeroPostor=10, cliente=cliente_id, subasta=subasta_1.identificador)
        asistente_2 = models.Asistente(numeroPostor=5,  cliente=cliente_id, subasta=subasta_2.identificador)
        db.add(asistente_1)
        db.add(asistente_2)
        db.flush()

        for i, item in enumerate(items_s1):
            ganador = "si" if i == 0 else "no"
            importe = round(float(item.precioBase) * 1.2, 2)
            pujo = models.Pujo(asistente=asistente_1.identificador, item=item.identificador, importe=importe, ganador=ganador)
            db.add(pujo)
            db.flush()
            db.add(models.HistorialPujos(
                pujo=pujo.identificador, asistente=asistente_1.identificador,
                itemCatalogo=item.identificador, cliente=cliente_id,
                subasta=subasta_1.identificador, importe=importe,
                fechaHora=_dt.now() - _td(days=20 - i),
            ))
            if ganador == "si":
                producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
                db.add(models.RegistroSubasta(
                    subasta=subasta_1.identificador, duenio=producto.duenio,
                    producto=item.producto, cliente=cliente_id,
                    importe=importe, comision=float(item.comision),
                ))

        for i, item in enumerate(items_s2):
            ganador = "si" if i == 1 else "no"
            importe = round(float(item.precioBase) * 1.15, 2)
            pujo = models.Pujo(asistente=asistente_2.identificador, item=item.identificador, importe=importe, ganador=ganador)
            db.add(pujo)
            db.flush()
            db.add(models.HistorialPujos(
                pujo=pujo.identificador, asistente=asistente_2.identificador,
                itemCatalogo=item.identificador, cliente=cliente_id,
                subasta=subasta_2.identificador, importe=importe,
                fechaHora=_dt.now() - _td(days=5 - i),
            ))
            if ganador == "si":
                producto = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
                db.add(models.RegistroSubasta(
                    subasta=subasta_2.identificador, duenio=producto.duenio,
                    producto=item.producto, cliente=cliente_id,
                    importe=importe, comision=float(item.comision),
                ))

        db.commit()
        print("✓ Historial de pujas de prueba creado")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_configuracion():
    """Carga la configuración inicial de la empresa."""
    db = SessionLocal()
    try:
        configs = {
            "direccion_inspeccion": "Av. Corrientes 1234, Piso 3, CABA — Lunes a Viernes 9-17hs",
            "direccion_deposito": "Av. Corrientes 1234, Depósito Subsuelo, CABA",
            "costo_envio_domicilio": "5000",
            "compania_seguro": "Seguros del Sur S.A.",
        }
        for clave, valor in configs.items():
            if not db.get(models.ConfiguracionEmpresa, clave):
                db.add(models.ConfiguracionEmpresa(clave=clave, valor=valor))
        db.commit()
        print("✓ Configuración de empresa cargada")
    finally:
        db.close()


def seed_compras_prueba():
    """
    Simula que el usuario de prueba ganó 2 ítems en subasta_1.
    Permite testear directamente el flujo winner → entrega → pago
    sin necesidad de correr la subasta completa via WebSocket.

    Requiere que seed_subastas() y seed_usuario_prueba() ya hayan corrido.
    """
    db = SessionLocal()
    try:
        persona_detalle = db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "prueba@test.com").first()
        if not persona_detalle:
            print("✗ Usuario prueba@test.com no encontrado. Corré seed_usuario_prueba() primero.")
            return

        cliente_id = persona_detalle.persona

        # Buscar subasta_1 (la que tiene 3 ítems, categoría comun)
        subasta = db.query(models.Subasta).filter(models.Subasta.categoria == "comun").order_by(models.Subasta.identificador).first()
        if not subasta:
            print("✗ No se encontró una subasta de categoría comun. Corré seed_subastas() primero.")
            return

        catalogo = db.query(models.Catalogo).filter(models.Catalogo.subasta == subasta.identificador).first()
        if not catalogo:
            print("✗ No se encontró catálogo para la subasta.")
            return

        items = db.query(models.ItemCatalogo).filter(
            models.ItemCatalogo.catalogo == catalogo.identificador,
            models.ItemCatalogo.subastado == "no",
        ).order_by(models.ItemCatalogo.identificador).limit(2).all()

        if not items:
            print("✓ Ya no hay ítems disponibles en subasta_1 (posiblemente ya subastados).")
            return

        # Crear o recuperar asistente
        asistente = db.query(models.Asistente).filter(
            models.Asistente.cliente == cliente_id,
            models.Asistente.subasta == subasta.identificador,
        ).first()
        if not asistente:
            asistente = models.Asistente(numeroPostor=1, cliente=cliente_id, subasta=subasta.identificador)
            db.add(asistente)
            db.flush()

        # Crear pujos ganadores para los 2 primeros ítems
        producto = db.query(models.Producto).filter(models.Producto.identificador == items[0].producto).first()
        for item in items:
            pujo_ganador = models.Pujo(
                asistente=asistente.identificador,
                item=item.identificador,
                importe=float(item.precioBase) * 1.10,  # 10% sobre el precio base
                ganador="si",
            )
            db.add(pujo_ganador)
            db.flush()

            # Registrar historial
            db.add(models.HistorialPujos(
                pujo=pujo_ganador.identificador, asistente=asistente.identificador,
                itemCatalogo=item.identificador, cliente=cliente_id,
                subasta=subasta.identificador, importe=pujo_ganador.importe,
                fechaHora=__import__("datetime").datetime.now(),
            ))

            # Registrar venta
            prod = db.query(models.Producto).filter(models.Producto.identificador == item.producto).first()
            if prod:
                comision_monto = round(float(pujo_ganador.importe) * float(item.comision) / 100, 2)
                db.add(models.RegistroSubasta(
                    subasta=subasta.identificador, duenio=prod.duenio,
                    producto=item.producto, cliente=cliente_id,
                    importe=pujo_ganador.importe, comision=comision_monto,
                ))

            # Marcar ítem como subastado
            item.subastado = "si"

        db.commit()
        print(f"✓ Compras de prueba creadas: usuario {cliente_id} ganó {len(items)} ítem(s) en subasta {subasta.identificador}")
        print(f"  → Para testear: GET /subasta/{subasta.identificador}/{cliente_id}/compras")
        print(f"  → Para testear: GET /subasta/{subasta.identificador}/{cliente_id}/compras/precio")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_usuario_cheque():
    """Usuario con cheque certificado verificado para testear F5 (límite de saldo) y multas."""
    db = SessionLocal()
    try:
        if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "cheque@test.com").first():
            print("✓ Usuario cheque@test.com ya existe, se omite")
            return
        persona = models.Persona(nombre="Comprador Cheque", documento="77777777", direccion="Av. Rivadavia 500, CABA", estado="activo")
        db.add(persona)
        db.flush()
        db.add(models.PersonaDetalle(
            persona=persona.identificador, pais=1, mail="cheque@test.com",
            contrasenia=pwd_context.hash("Cheque1."), claveTemporal=False,
        ))
        db.add(models.Cliente(identificador=persona.identificador, numeroPais=1, admitido="si", categoria="comun", verificador=1))
        db.flush()
        # Cheque con saldo limitado: $50.000 (para testear rechazo por fondos insuficientes en items caros)
        medio = models.MedioPago(
            cliente=persona.identificador, tipo="cheque_certificado", estado="verificado",
            moneda="ARS", es_internacional="no", descripcion="Cheque de prueba",
        )
        db.add(medio)
        db.flush()
        db.add(models.mpChequeCertificado(
            medio_pago=medio.identificador, banco="Banco Provincia",
            numero_cheque="00099999", monto=50000, monto_disponible=50000,
        ))
        db.commit()
        print("✓ Usuario cheque@test.com creado (cheque certificado $50.000 verificado)")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_usuario_especial():
    """Usuario con categoría 'especial' para testear acceso a subastas de mayor categoría."""
    db = SessionLocal()
    try:
        if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "especial@test.com").first():
            print("✓ Usuario especial@test.com ya existe, se omite")
            return
        persona = models.Persona(nombre="Postor Especial", documento="66666666", direccion="Av. Santa Fe 3000, CABA", estado="activo")
        db.add(persona)
        db.flush()
        db.add(models.PersonaDetalle(
            persona=persona.identificador, pais=1, mail="especial@test.com",
            contrasenia=pwd_context.hash("Especial1."), claveTemporal=False,
        ))
        db.add(models.Cliente(identificador=persona.identificador, numeroPais=1, admitido="si", categoria="especial", verificador=1))
        db.flush()
        medio = models.MedioPago(
            cliente=persona.identificador, tipo="tarjeta", estado="verificado",
            moneda="ARS", es_internacional="no", descripcion="Tarjeta especial",
        )
        db.add(medio)
        db.flush()
        db.add(models.mpTarjeta(
            medio_pago=medio.identificador, titular="Postor Especial",
            ultimos_4_digitos="5678", vencimiento=date(2028, 6, 30),
            marca="MASTERCARD", tipo_tarjeta="credito",
        ))
        db.commit()
        print("✓ Usuario especial@test.com creado (categoría: especial, tarjeta MASTERCARD verificada)")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_subasta_usd():
    """Crea una subasta en dólares para testear el flujo de pago en USD."""
    db = SessionLocal()
    try:
        if db.query(models.Subasta).filter(models.Subasta.moneda == "USD").first():
            print("✓ Subasta USD ya existe, se omite")
            return

        p_sub = db.query(models.Persona).filter(models.Persona.documento == "00000001").first()
        if not p_sub:
            print("✗ Subastador no encontrado. Corré seed_subastas() primero.")
            return
        subastador_id = db.query(models.Subastador).filter(
            models.Subastador.identificador == p_sub.identificador
        ).first().identificador

        p_due = db.query(models.Persona).filter(models.Persona.documento == "00000002").first()
        duenio_id = p_due.identificador

        hoy = date.today()
        subasta = models.Subasta(
            fecha=hoy + timedelta(days=20), hora=time(18, 0), estado="abierta",
            subastador=subastador_id, ubicacion="Sala Dólar, Av. Alvear 1440, CABA",
            capacidadAsistentes=40, tieneDeposito="si", seguridadPropia="si",
            categoria="comun", moneda="USD",
        )
        db.add(subasta)
        db.flush()

        catalogo = models.Catalogo(descripcion="Subasta Internacional — USD", subasta=subasta.identificador, responsable=1)
        db.add(catalogo)
        db.flush()

        producto = models.Producto(
            descripcionCatalogo="Moneda de oro americana",
            descripcionCompleta="Moneda de oro American Eagle 1 oz, acuñación 2020, sin circular.",
            revisor=1, duenio=duenio_id, disponible="si",
        )
        db.add(producto)
        db.flush()
        db.add(models.ProductoPresentacion(
            producto=producto.identificador, titulo="American Eagle — 1 oz oro",
            categoria="Numismática", procedencia="Estados Unidos",
            declaracionLegal="si", estado="publicado",
        ))
        item = models.ItemCatalogo(
            catalogo=catalogo.identificador, producto=producto.identificador,
            precioBase=1800, comision=5, subastado="no",
        )
        db.add(item)
        db.flush()
        db.add(models.AceptacionArticulo(producto=producto.identificador, estado="pendiente"))

        db.commit()
        print("✓ Subasta USD creada (American Eagle, precio base $1.800 USD)")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_articulos_vendedor():
    """Crea artículos en distintos estados para testear la pantalla 'Mis Artículos' del vendedor."""
    db = SessionLocal()
    try:
        usuario = db.query(models.PersonaDetalle).filter(
            models.PersonaDetalle.mail == "prueba@test.com"
        ).first()
        if not usuario:
            print("✗ Usuario prueba@test.com no encontrado.")
            return

        cliente_id = usuario.persona

        # Verificar si ya existe como Duenio
        if not db.query(models.Duenio).filter(models.Duenio.identificador == cliente_id).first():
            db.add(models.Duenio(identificador=cliente_id, numeroPais=1, verificador=1))
            db.flush()

        # Verificar si ya tiene artículos de prueba
        if db.query(models.InspeccionProducto).join(
            models.Producto, models.InspeccionProducto.producto == models.Producto.identificador
        ).filter(models.Producto.duenio == cliente_id).first():
            print("✓ Artículos del vendedor ya existen, se omite")
            return

        articulos_seed = [
            {
                "descripcionCatalogo": "Cámara fotográfica vintage",
                "descripcionCompleta": "Leica M3, 1954, excelente estado, con funda original.",
                "titulo": "Leica M3 — 1954",
                "categoria": "Fotografía",
                "procedencia": "Alemania",
                "estado_inspeccion": "pendiente",
                "observaciones": None,
                "costo_devolucion": None,
            },
            {
                "descripcionCatalogo": "Violín italiano siglo XVIII",
                "descripcionCompleta": "Violín atribuido a escuela italiana, circa 1760, arco incluido.",
                "titulo": "Violín Italiano — Siglo XVIII",
                "categoria": "Instrumentos Musicales",
                "procedencia": "Italia",
                "estado_inspeccion": "aprobado",
                "observaciones": None,
                "costo_devolucion": None,
            },
            {
                "descripcionCatalogo": "Reloj de pared Art Nouveau",
                "descripcionCompleta": "Reloj de pared de hierro forjado, estilo Art Nouveau, circa 1900.",
                "titulo": "Reloj Art Nouveau — 1900",
                "categoria": "Relojes",
                "procedencia": "Francia",
                "estado_inspeccion": "rechazado",
                "observaciones": "El mecanismo presenta daños irreparables. No cumple estándares de venta.",
                "costo_devolucion": 3500.00,
            },
        ]

        for art in articulos_seed:
            producto = models.Producto(
                descripcionCatalogo=art["descripcionCatalogo"],
                descripcionCompleta=art["descripcionCompleta"],
                revisor=1, duenio=cliente_id, disponible="si",
            )
            db.add(producto)
            db.flush()
            db.add(models.ProductoPresentacion(
                producto=producto.identificador, titulo=art["titulo"],
                categoria=art["categoria"], procedencia=art["procedencia"],
                declaracionLegal="si", estado="publicado",
            ))
            from datetime import datetime as _dt
            db.add(models.InspeccionProducto(
                producto=producto.identificador,
                estado=art["estado_inspeccion"],
                observaciones=art["observaciones"],
                costo_devolucion=art["costo_devolucion"],
                fecha_ultima_actualizacion=_dt.now(),
            ))

        db.commit()
        print("✓ Artículos del vendedor creados (pendiente, aprobado, rechazado)")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "compras":
        seed_compras_prueba()
    elif target == "historial":
        seed_historial_prueba()
    else:
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
        seed_historial_prueba()
        seed_articulos_vendedor()
        seed_configuracion()
        print("\nSeed completo. Para agregar compras de prueba: python -m scripts.seed compras")
