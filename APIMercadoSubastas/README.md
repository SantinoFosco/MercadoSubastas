# Proyecto de Facultad: Mercado Subastas

Este proyecto sigue una arquitectura modular para facilitar el mantenimiento y la escalabilidad de la API.

## 📂 Estructura del Proyecto

### `app/` (Carpeta principal del código)
* **`main.py`**: Es el punto de entrada de la aplicación. Aquí se configura FastAPI y se definen las rutas (endpoints).
* **`database.py`**: Configuración de la conexión a la base de datos mediante SQLAlchemy. Contiene la lógica para abrir y cerrar sesiones de BD.
* **`models.py`**: Contiene los modelos de SQLAlchemy que representan las tablas reales en la base de datos de Supabase.
* **`schemas.py`**: Define los modelos de Pydantic. Se utilizan para validar los datos de entrada (lo que envía el usuario) y de salida (lo que responde la API).
* **`crud.py`**: Aquí se escribe la lógica de "Create, Read, Update, Delete". Son las funciones que interactúan directamente con la base de datos.

### Archivos de Configuración
* **`.env`**: Archivo para guardar credenciales sensibles (URL de conexión, Keys). **Nunca debe subirse al repositorio.**
* **`.gitignore`**: Indica a Git qué archivos debe ignorar (como el entorno virtual `venv/` y el `.env`).
* **`requirements.txt`**: Listado de todas las dependencias necesarias para que el proyecto funcione.

## 🚀 Cómo empezar

1. **Crear entorno virtual:** `python -m venv venv`
2. **Activar entorno:** `.\venv\Scripts\activate` (Windows) o `source venv/bin/activate` (Linux/Mac)
3. **Instalar dependencias:** `pip install -r requirements.txt`
4. **Ejecutar servidor:** `uvicorn app.main:app --reload`