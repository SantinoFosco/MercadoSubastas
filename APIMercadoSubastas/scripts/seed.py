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
            fecha=hoy + timedelta(days=30), hora=time(15, 0), estado="abierta",
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
                db.add(models.RegistroSubasta(
                    subasta=subasta.identificador, duenio=prod.duenio,
                    producto=item.producto, cliente=cliente_id,
                    importe=pujo_ganador.importe, comision=item.comision,
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


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "compras":
        seed_compras_prueba()
    else:
        seed_paises()
        seed_empleados()
        seed_empresa()
        seed_subastas()
        seed_usuario_prueba()
        seed_usuario_prueba_2()
        print("\nSeed completo. Para agregar compras de prueba: python -m scripts.seed compras")
