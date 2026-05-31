# 🔄 Actualización v1.1 — Deudas, Editar y Mejores Categorías

## Cambios realizados:

### 1. ✅ Categorías específicas por tipo
- **Ingresos**: Sueldo, Bono, Quincena, Freelance, Venta, Préstamo, Inversión, Otros
- **Egresos**: Vivienda, Alimentación, Transporte, Salud, Entretenimiento, Educación, Ropa, Servicios, Otros

### 2. ✅ Módulo completo de Deudas
- Nueva pestaña "Deudas" en la navegación
- Registrar deudas: "Debo a X" o "Me debe X"
- Estado: Pendiente / Pagado
- Totales por tipo en KPIs

### 3. ✅ Editar movimientos (en desarrollo)
- Falta integrar botón de editar en la lista

---

## 🛠️ Instalación en tu app local

### Paso 1: Crear tabla de deudas en Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. SQL Editor → New query
3. Copia todo el contenido de `SQL_CREAR_DEUDAS.sql` (archivo incluido)
4. Ejecuta: presiona "Run"

### Paso 2: Reemplazar archivos

Descarga estos 3 archivos actualizado y cópialos a tu carpeta `finanzas-app/src`:

1. **src/components/NuevaTransaccion.js** — Categorías dinámicas + editar
2. **src/components/Deudas.js** — NUEVO: Módulo completo de deudas
3. **src/pages/Dashboard.js** — Agrega pestaña de Deudas
4. **src/components/Transacciones.js** — Botón de editar (en proceso)

### Paso 3: Guardar cambios

```bash
git add .
git commit -m "feat: agregar deudas, categorías por tipo, editar transacciones"
git push
```

Vercel detectará los cambios automáticamente y hará deploy en ~1 minuto.

---

## 🎯 Lo que ves después de actualizar:

✅ Al crear un **ingreso**, ves: Sueldo, Bono, Quincena, etc.
✅ Al crear un **egreso**, ves: Vivienda, Alimentación, etc.
✅ Nueva pestaña **"Deudas"** en la navegación
✅ Registrar deudas con: Nombre, Monto, Tipo (Debo/Me deben), Estado
✅ KPIs mostrando cuánto debes y cuánto te deben

---

## 📝 Próxima mejora (que falta):

- Botón "Editar" en cada transacción (código está listo, solo falta agregar el botón en la lista)
- Esto se agregará en la próxima actualización

---

**¿Problemas?** Avísame y lo arreglamos en vivo.
