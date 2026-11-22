# Migraciones de la base de datos

Esta carpeta contiene **Alembic**, la herramienta que lleva el historial de cambios de las
tablas, como un git pero para la base de datos.

Cada archivo de `versiones/` es un cambio (crear una tabla, agregar o quitar una columna…) y
se aplica en orden numérico:

| Archivo | Qué hizo |
|---|---|
| `0001_inicial` | Crea usuarios, pacientes y escenarios |
| `0002_corridas_de_simulacion` | Guarda el historial de simulaciones |
| `0003_escenarios_configurables` | Parámetros propios por escenario |
| `0004_roles_y_estado_de_cuenta` | Roles admin y médico, y cuentas activas/inactivas |
| `0005_motor_topp_entradas_del_informe` | Paciente con las entradas del informe |

## Cómo se usa

- Al desplegar, `docker-entrypoint.sh` ejecuta `alembic upgrade head`: aplica solo los cambios que
  falten, así la base de datos del servidor se actualiza sin borrar datos a mano.
- Para cambiar una tabla: edita `app/modelos.py`, crea un archivo nuevo en `versiones/` con el
  siguiente número y ejecuta `alembic upgrade head`.
- `env.py` conecta Alembic con la configuración y los modelos de `app/`; normalmente no se toca.
