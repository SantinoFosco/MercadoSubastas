from datetime import date, time, timedelta
from . import crud, models
from .database import SessionLocal


def seed_paises():
    db = SessionLocal()
    try:
        paises_iniciales = [
            models.Pais(numero=1, nombre="Argentina", nombreCorto="ARG", capital="Buenos Aires",  nacionalidad="Argentina",  idiomas="Español"),
            models.Pais(numero=2, nombre="Uruguay",   nombreCorto="URY", capital="Montevideo",    nacionalidad="Uruguaya",   idiomas="Español"),
            models.Pais(numero=3, nombre="Paraguay",  nombreCorto="PRY", capital="Asunción",      nacionalidad="Paraguaya",  idiomas="Español, Guaraní"),
            models.Pais(numero=4, nombre="Chile",     nombreCorto="CHL", capital="Santiago",      nacionalidad="Chilena",    idiomas="Español"),
        ]
        for pais in paises_iniciales:
            if not db.get(models.Pais, pais.numero):
                db.add(pais)
        db.commit()
    finally:
        db.close()


def seed_empleados():
    db = SessionLocal()
    try:
        empleados_iniciales = [
            models.Empleado(identificador=1, cargo="Verificador", sector=None),
            models.Empleado(identificador=2, cargo="Verificador", sector=None),
            models.Empleado(identificador=3, cargo="Verificador", sector=None),
        ]
        for empleado in empleados_iniciales:
            if not db.get(models.Empleado, empleado.identificador):
                db.add(empleado)
        db.commit()
    finally:
        db.close()


def seed_subastas():
    db = SessionLocal()
    try:
        if db.query(models.Persona).filter(models.Persona.documento == "00000001").first():
            return

        # --- Subastador ---
        p_sub = models.Persona(nombre="Subastador Prueba", documento="00000001", direccion="Av. Corrientes 1234, CABA", estado="activo")
        db.add(p_sub)
        db.flush()

        subastador = models.Subastador(identificador=p_sub.identificador, matricula="MAT-001", region="Buenos Aires")
        db.add(subastador)
        db.flush()

        # --- Dueño ---
        p_due = models.Persona(nombre="Duenio Prueba", documento="00000002", direccion="Av. Santa Fe 2000, CABA", estado="activo")
        db.add(p_due)
        db.flush()

        duenio = models.Duenio(identificador=p_due.identificador, numeroPais=1, verificador=1)
        db.add(duenio)
        db.flush()

        # --- Productos ---
        articulos = [
            models.Producto(descripcionCatalogo="Reloj suizo siglo XIX",      descripcionCompleta="Reloj de bolsillo suizo, circa 1890, caja de plata maciza, movimiento de 17 rubíes, en perfecto estado de funcionamiento.", revisor=1, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Jarrón Ming original",        descripcionCompleta="Jarrón de porcelana china de la dinastía Ming, circa 1400, decoración floral en azul y blanco, altura 42 cm.", revisor=1, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Pintura flamenca siglo XVII", descripcionCompleta="Pintura al óleo sobre lienzo, escuela flamenca, siglo XVII, representación de bodegón con frutas y animales, 80x60 cm.", revisor=2, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Colección monedas romanas",   descripcionCompleta="Colección de 12 monedas romanas del período imperial, siglos I a III d.C., incluye denarios y sestercios en buen estado de conservación.", revisor=2, duenio=duenio.identificador, disponible="si"),
            models.Producto(descripcionCatalogo="Silla estilo Luis XV",        descripcionCompleta="Silla tapizada en seda bordada, estilo Luis XV, Francia circa 1750, estructura en madera de nogal tallada, excelente estado.", revisor=3, duenio=duenio.identificador, disponible="si"),
        ]
        for a in articulos:
            db.add(a)
        db.flush()

        # --- Presentaciones ---
        presentaciones = [
            ("Reloj de Bolsillo Suizo — Siglo XIX",       "Relojes y Joyería", "Suiza"),
            ("Jarrón de Porcelana China — Dinastía Ming",  "Arte Oriental",     "China"),
            ("Bodegón Flamenco — Escuela del XVII",        "Pintura y Arte",    "Países Bajos"),
            ("Colección Numismática Romana",                "Numismática",       "Italia"),
            ("Silla Luis XV — Francia 1750",               "Muebles Antiguos",  "Francia"),
        ]
        for articulo, (titulo, categoria_pp, procedencia) in zip(articulos, presentaciones):
            db.add(models.ProductoPresentacion(
                producto=articulo.identificador,
                titulo=titulo,
                categoria=categoria_pp,
                procedencia=procedencia,
                declaracionLegal="si",
                estado="publicado"
            ))
        db.flush()

        # --- Subastas ---
        hoy = date.today()
        subasta_1 = models.Subasta(
            fecha=hoy + timedelta(days=30),
            hora=time(15, 0),
            estado="abierta",
            subastador=subastador.identificador,
            ubicacion="Salón Principal, Av. Alvear 1440, CABA",
            capacidadAsistentes=100,
            tieneDeposito="si",
            seguridadPropia="si",
            categoria="comun"
        )
        subasta_2 = models.Subasta(
            fecha=hoy + timedelta(days=45),
            hora=time(10, 0),
            estado="abierta",
            subastador=subastador.identificador,
            ubicacion="Sala VIP, Av. del Libertador 750, CABA",
            capacidadAsistentes=50,
            tieneDeposito="si",
            seguridadPropia="si",
            categoria="comun"
        )
        db.add(subasta_1)
        db.add(subasta_2)
        db.flush()

        # --- Catálogos ---
        catalogo_1 = models.Catalogo(descripcion="Subasta de Antigüedades — Lote 1",        subasta=subasta_1.identificador, responsable=1)
        catalogo_2 = models.Catalogo(descripcion="Subasta de Arte y Numismática — Lote 2",  subasta=subasta_2.identificador, responsable=2)
        db.add(catalogo_1)
        db.add(catalogo_2)
        db.flush()

        # --- Ítems de catálogo ---
        items = [
            models.ItemCatalogo(catalogo=catalogo_1.identificador, producto=articulos[0].identificador, precioBase=150000, comision=10, subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_1.identificador, producto=articulos[1].identificador, precioBase=320000, comision=10, subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_1.identificador, producto=articulos[2].identificador, precioBase=280000, comision=12, subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_2.identificador, producto=articulos[3].identificador, precioBase=85000,  comision=8,  subastado="no"),
            models.ItemCatalogo(catalogo=catalogo_2.identificador, producto=articulos[4].identificador, precioBase=195000, comision=10, subastado="no"),
        ]
        for item in items:
            db.add(item)

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_usuario_prueba_2():
    """Segundo usuario para testear pujas de múltiples postores."""
    db = SessionLocal()
    try:
        if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "prueba2@test.com").first():
            return

        persona = models.Persona(
            nombre="Segundo Postor",
            documento="88888888",
            direccion="Av. Corrientes 1234, CABA",
            estado="activo"
        )
        db.add(persona)
        db.flush()

        db.add(models.PersonaDetalle(
            persona=persona.identificador,
            pais=1,
            mail="prueba2@test.com",
            contrasenia=crud.pwd_context.hash("Prueba2."),
            claveTemporal=False
        ))

        db.add(models.Cliente(
            identificador=persona.identificador,
            numeroPais=1,
            admitido="si",
            categoria="comun",
            verificador=1
        ))
        db.flush()

        medio = models.MedioPago(
            cliente=persona.identificador,
            tipo="tarjeta",
            estado="verificado",
            moneda="ARS",
            es_internacional="no",
            descripcion="Tarjeta de prueba"
        )
        db.add(medio)
        db.flush()

        db.add(models.mpTarjeta(
            medio_pago=medio.identificador,
            titular="Segundo Postor",
            ultimos_4_digitos="4321",
            vencimiento=date(2027, 12, 31),
            marca="VISA",
            tipo_tarjeta="credito"
        ))

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_empresa():
    """Crea el cliente 'Casa de Subastas' usado cuando nadie puja por un artículo."""
    db = SessionLocal()
    try:
        if db.query(models.Persona).filter(models.Persona.documento == "00000000").first():
            return
        persona = models.Persona(
            nombre="Casa de Subastas",
            documento="00000000",
            direccion="Sede Central",
            estado="activo"
        )
        db.add(persona)
        db.flush()
        db.add(models.Cliente(
            identificador=persona.identificador,
            numeroPais=1,
            admitido="si",
            categoria="platino",
            verificador=1
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def seed_usuario_prueba():
    db = SessionLocal()
    try:
        if db.query(models.PersonaDetalle).filter(models.PersonaDetalle.mail == "prueba@test.com").first():
            return

        persona = models.Persona(
            nombre="Usuario Prueba",
            documento="99999999",
            direccion="Av. Siempreviva 742, Springfield",
            estado="activo"
        )
        db.add(persona)
        db.flush()

        db.add(models.PersonaDetalle(
            persona=persona.identificador,
            pais=1,
            mail="prueba@test.com",
            contrasenia=crud.pwd_context.hash("Prueba1."),
            claveTemporal=False
        ))

        db.add(models.Cliente(
            identificador=persona.identificador,
            numeroPais=1,
            admitido="si",
            categoria="comun",
            verificador=1
        ))
        db.flush()

        # Medio de pago verificado — necesario para poder pujar (F2)
        medio = models.MedioPago(
            cliente=persona.identificador,
            tipo="cuenta_bancaria",
            estado="verificado",
            moneda="ARS",
            es_internacional="no",
            descripcion="Cuenta de prueba"
        )
        db.add(medio)
        db.flush()

        db.add(models.mpCuentaBancaria(
            medio_pago=medio.identificador,
            titular="Usuario Prueba",
            banco="Banco Nación",
            cbu="0110012340012345678901",
            alias="usuario.prueba",
            pais_banco=1
        ))

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
