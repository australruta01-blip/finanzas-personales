# 💰 Finanzas Personales

App para registrar ingresos, egresos y visualizar gráficos de tu situación financiera.

## 🚀 Características

- ✅ Registro de ingresos y egresos
- ✅ Presupuesto mensual: previsto vs real por categoría
- ✅ Movimientos recurrentes (sueldo, arriendo, suscripciones) con generación automática
- ✅ Metas de ahorro con barra de progreso
- ✅ Alertas cuando te acercas o superas tu presupuesto por categoría
- ✅ Organización automática por mes y año
- ✅ Dashboard con gráficos (Recharts)
- ✅ Login seguro con Supabase
- ✅ Datos privados por usuario
- ✅ Navegación lateral (sidebar) con menú deslizable en móvil
- ✅ Totalmente responsive (Android, iPhone y desktop)

## 🛠️ Tech Stack

- **Frontend**: React + CSS
- **Base de datos**: PostgreSQL (Supabase)
- **Autenticación**: Supabase Auth
- **Gráficos**: Recharts
- **Hosting**: Vercel

---

## 📋 Instrucciones de Deploy

### Paso 1 — Clonar o descargar el código

Si ya descargaste los archivos, sáltate a Paso 2.

Si quieres clonar desde GitHub después de subirlo:
```bash
git clone https://github.com/TU_USUARIO/finanzas-personales.git
cd finanzas-personales
```

### Paso 2 — Subir el código a GitHub

1. En GitHub, crea un nuevo repositorio llamado `finanzas-personales` (sin inicializar README)
2. En tu terminal (en la carpeta `finanzas-app`):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/finanzas-personales.git
git push -u origin main
```

*(Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub)*

### Paso 3 — Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en "New Project"
3. Selecciona "Import Git Repository"
4. Busca y selecciona `finanzas-personales`
5. **Importante**: En "Environment Variables", agrega estas dos:
   - `REACT_APP_SUPABASE_URL` = `https://vfzsecznuhntiyumoyvx.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (tu clave)
6. Clic en "Deploy"

**En ~1-2 minutos tendrás tu URL pública** del tipo:
`https://finanzas-personales.vercel.app`

### Paso 4 — Configurar CORS en Supabase (si falla login)

Si el login no funciona:
1. Ve a Supabase → Settings → API → CORS
2. Agrega: `https://finanzas-personales.vercel.app`
3. Guarda

---

## 🧪 Desarrollar localmente

Si quieres trabajar en tu computador:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

La app abrirá en `http://localhost:3000`

---

## 📱 Uso

1. **Registrarse**: Crea cuenta con tu email
2. **Confirmar**: Revisa tu email y confirma
3. **Iniciar sesión**: Entra con tus credenciales
4. **Agregar movimientos**: Clic en el botón "+" flotante
5. **Ver gráficos**: En la pestaña "Inicio" ves todo resumido

---

## 📊 Estructura de carpetas

```
finanzas-app/
├── src/
│   ├── components/      # Componentes reutilizables
│   │   ├── DashboardHome.js    # Dashboard con gráficos y alertas de presupuesto
│   │   ├── Transacciones.js    # Lista de movimientos
│   │   ├── Presupuesto.js      # Previsto vs real por categoría
│   │   ├── Recurrentes.js      # Movimientos recurrentes
│   │   ├── Metas.js            # Metas de ahorro
│   │   ├── Deudas.js           # Módulo de deudas
│   │   ├── Perfil.js           # Perfil de usuario
│   │   └── NuevaTransaccion.js # Modal de registro
│   ├── pages/          # Páginas principales
│   │   ├── Dashboard.js
│   │   └── Login.js
│   ├── lib/
│   │   └── supabase.js # Configuración de BD
│   ├── App.js          # Componente raíz
│   ├── index.js        # Entry point
│   └── index.css       # Estilos globales
├── public/
│   └── index.html
├── package.json
└── README.md
```

---

## 🔐 Seguridad

- Las credenciales se guardan seguras en Supabase Auth
- Cada usuario solo ve sus propios datos (Row Level Security)
- Las contraseñas se hashean automáticamente

---

## 🐛 Troubleshooting

**Error: "Auth error"**
- Verifica que la URL y clave de Supabase sean correctas en `src/lib/supabase.js`
- Revisa que CORS esté configurado en Supabase

**Error: "Database error"**
- Asegúrate de que la tabla `transacciones` existe en Supabase
- Ejecuta nuevamente el SQL del setup

**No carga la app después de hacer push a Vercel**
- Espera 2-3 minutos, Vercel está haciendo build
- Revisa los logs en el dashboard de Vercel

---

## 📈 Próximas mejoras (ideas)

- [ ] Exportar a PDF
- [ ] Gráficos más avanzados
- [ ] Modo oscuro

---

**¿Preguntas?** Revisa la documentación de Supabase o Vercel.

¡Éxito con tu app! 🚀
