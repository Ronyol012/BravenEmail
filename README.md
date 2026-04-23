# 🤖 BRAVEN EMAIL AUTOMATION
## Sistema completamente automatizado para campañas email

---

## 📋 QUÉ INCLUYE

✅ **Netlify Functions:**
- `campaign-launcher.js` — Dispara TODO automáticamente
- `mailchimp-webhook.js` — Trackea opens/clicks en tiempo real
- `read-leads.js` — Lee el Excel de 50 leads

✅ **Supabase:**
- Tablas para tracking de leads y eventos
- Vistas para métricas y engagement rates
- Webhooks para actualizar scoring dinámicamente

✅ **Braven OS Dashboard:**
- Componente React con métricas en vivo
- Botón "🚀 LANZAR CAMPAÑA"
- Gráficos de engagement

---

## ⚡ SETUP (30 minutos)

### PASO 1: Preparar variables de entorno

En **Netlify → Settings → Build & Deploy → Environment**:

```
SUPABASE_URL=https://qkguauyaetqwxvomxjbh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (tu service key de Supabase)
MAILCHIMP_API_KEY=... (tu API key de Mailchimp)
MAILCHIMP_SERVER=us5 (o el que uses)
MAILCHIMP_AUDIENCE_ID=... (ID de tu audiencia)
SLACK_WEBHOOK_URL=... (opcional, para notificaciones)
DEPLOY_URL=https://tu-dominio.netlify.app
```

---

### PASO 2: Crear tablas en Supabase

1. Ve a **Supabase → SQL Editor**
2. Copia todo el contenido de `supabase/migrations/001-create-email-tables.sql`
3. Ejecuta

✅ Se crearán 5 tablas + índices + vistas

---

### PASO 3: Subir el Excel de 50 leads

1. Descarga: `BRAVEN_TOP_50_LEADS_READY_TO_LAUNCH.xlsx`
2. Coloca en: `/public/BRAVEN_TOP_50_LEADS_READY_TO_LAUNCH.xlsx`
3. Este archivo es leído automáticamente por `read-leads.js`

---

### PASO 4: Agregar componente a Braven OS

En **src/pages/Dashboard.jsx** (o donde tengas el dashboard):

```jsx
import { CampaignDashboard } from '@/components/CampaignDashboard'

export function Dashboard() {
  return (
    <div>
      {/* Otros componentes */}
      <CampaignDashboard />
    </div>
  )
}
```

---

### PASO 5: Desplegar a Netlify

```bash
npm install
npm run deploy
```

---

## 🎯 CÓMO USAR

### Opción A: Desde Braven OS (Recomendado)

1. Abre **Braven OS → Dashboard**
2. Busca **"Campañas Email"**
3. Haz clic en **"🚀 LANZAR CAMPAÑA"**
4. Confirma
5. **TODO sucede automáticamente:**
   - ✅ 50 leads importados a Mailchimp
   - ✅ 3 campañas creadas
   - ✅ Campaign 1 enviada YA
   - ✅ Campaign 2 programada para día 3
   - ✅ Campaign 3 programada para día 7
   - ✅ Dashboard actualizado con métricas

### Opción B: Desde HTTP call (Manual)

```bash
curl -X POST https://tu-dominio.netlify.app/.netlify/functions/campaign-launcher \
  -H "Content-Type: application/json" \
  -d '{"action": "launch-campaign"}'
```

---

## 📊 MÉTRICAS EN VIVO

El Dashboard muestra:

- **Total Leads:** 50
- **HOT/CALIENTE/TIBIO:** Distribución en tiempo real
- **Campaign 1-3:** Sent / Opened / Clicked
- **Open Rate:** % que abrieron cada email
- **Click Rate:** % que hicieron clic
- **Últimas Acciones:** Log de eventos

---

## 🔄 CÓMO FUNCIONA

### Flow automático:

```
1. Haces clic "LANZAR CAMPAÑA"
   ↓
2. Netlify Function se dispara
   ↓
3. Lee los 50 leads del Excel
   ↓
4. Los importa a Mailchimp
   ↓
5. Crea 3 campañas HTML
   ↓
6. Envía Campaign 1 AHORA
   ↓
7. Programa Campaign 2 (día 3)
   ↓
8. Programa Campaign 3 (día 7)
   ↓
9. Configura webhooks
   ↓
10. Guarda todo en Supabase
    ↓
11. Dashboard se actualiza automáticamente

MIENTRAS TANTO:
- Alguien abre un email → Mailchimp notifica via webhook
- Webhook actualiza Supabase
- Dashboard refleja el cambio EN VIVO
- Scoring se actualiza automáticamente (hot/tibio/frío)
```

---

## 🔧 ESTRUCTURA DE CARPETAS

```
braven-automation/
├── netlify/functions/
│   ├── campaign-launcher.js      (Main: dispara TODO)
│   ├── mailchimp-webhook.js      (Trackea events)
│   └── read-leads.js             (Lee Excel)
├── supabase/migrations/
│   └── 001-create-email-tables.sql
├── src/components/
│   └── CampaignDashboard.jsx     (React component)
├── public/
│   └── BRAVEN_TOP_50_LEADS_READY_TO_LAUNCH.xlsx
├── netlify.toml
├── package.json
└── README.md
```

---

## ⚠️ NOTAS IMPORTANTES

### Dependencias instaladas:
```bash
npm install @supabase/supabase-js node-fetch xlsx
```

### En Mailchimp:
- Audience debe estar creada
- AUDIENCE_ID es visible en: Settings → Audience name and defaults

### En Supabase:
- Service Key debe ser generada (no usar anon key)
- RLS debe estar deshabilitado en las tablas para este proyecto

### En Netlify:
- Usar node 18+
- Functions debe estar en carpeta `netlify/functions`
- Variables de entorno en Build & Deploy Settings

---

## 🚨 TROUBLESHOOTING

### "Error: Excel not found"
→ Verifica que `BRAVEN_TOP_50_LEADS_READY_TO_LAUNCH.xlsx` esté en `/public`

### "Error: Mailchimp API key invalid"
→ Genera nueva API key en Mailchimp Account Settings

### "Error: Webhook setup failed"
→ Verifica que `DEPLOY_URL` sea correcta (incluir https://)

### "Datos no aparecen en dashboard"
→ Verifica que SUPABASE_SERVICE_KEY sea la correcta (no anon key)

---

## 📞 CONTACTO

Si hay errores:
1. Verifica logs en **Netlify → Functions**
2. Verifica logs en **Supabase → Database → SQL Editor**
3. Revisa console de navegador (F12)

---

## ✅ CHECKLIST FINAL

Antes de "LANZAR CAMPAÑA":

- [ ] Variables de entorno configuradas en Netlify
- [ ] Tablas creadas en Supabase
- [ ] Excel subido a `/public`
- [ ] Componente agregado a Dashboard
- [ ] Deploy hecho a Netlify
- [ ] Mailchimp audience ID verificado
- [ ] Webhook URL es correcta

---

**Cuando esté TODO listo: ¡Dale al botón "🚀 LANZAR CAMPAÑA"!**

50 emails salen automáticamente. Métricas en vivo. Cero mano de obra.

🔥 Éxito.
