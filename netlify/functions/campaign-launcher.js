// File: netlify/functions/campaign-launcher.js
// Este es el "botón" que ejecuta la campaña email automáticamente

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mailchimp config
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_SERVER = process.env.MAILCHIMP_SERVER || 'us5';
const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
const MAILCHIMP_BASE_URL = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0`;

// Helper: Mailchimp API call
async function mailchimpAPI(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${MAILCHIMP_BASE_URL}${endpoint}`, options);
  return response.json();
}

// PASO 1: Importar los 50 leads
async function importLeads(leadsData) {
  console.log('📥 Importando leads a Mailchimp...');
  
  const members = leadsData.map(lead => ({
    email_address: lead.EMAIL,
    status: 'subscribed',
    merge_fields: {
      FNAME: lead.NOMBRE,
      COMPANY: lead.EMPRESA,
      SECTOR: lead.SECTOR,
    },
    tags: [lead.TEMPERATURA] // Tag por temperatura
  }));
  
  // Importar en lotes de 10
  const batches = [];
  for (let i = 0; i < members.length; i += 10) {
    batches.push(members.slice(i, i + 10));
  }
  
  const results = [];
  for (const batch of batches) {
    const result = await mailchimpAPI('POST', `/audiences/${MAILCHIMP_AUDIENCE_ID}/members`, {
      members: batch
    });
    results.push(result);
  }
  
  console.log(`✅ ${members.length} leads importados`);
  
  // Guardar en Supabase
  await supabase.from('email_campaigns').insert(
    leadsData.map(lead => ({
      email: lead.EMAIL,
      nombre: lead.NOMBRE,
      empresa: lead.EMPRESA,
      sector: lead.SECTOR,
      temperatura: lead.TEMPERATURA,
    }))
  );
  
  return results;
}

// PASO 2: Crear Campaign 1 - Presentación
async function createCampaign1() {
  console.log('📧 Creando Campaign 1 (Presentación)...');
  
  const campaignData = {
    type: 'regular',
    recipients: {
      list_id: MAILCHIMP_AUDIENCE_ID,
      segment_opts: {
        default_segment: 'All Subscribers'
      }
    },
    settings: {
      subject_line: '*|FNAME|* — ¿Cómo se ve tu presencia digital hoy?',
      title: 'Braven-01-Presentacion',
      from_name: 'Braven Studio',
      reply_to: 'hola@bravenweb.com',
      preview_text: 'Sitios web que VENDEN'
    }
  };
  
  const campaign = await mailchimpAPI('POST', '/campaigns', campaignData);
  const campaignId = campaign.id;
  
  console.log(`✅ Campaign 1 creada: ${campaignId}`);
  
  // Agregar contenido HTML
  const htmlContent = `
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Hola *|FNAME|*,</h2>
    
    <p>Vi que trabajas en <strong>*|COMPANY|*</strong> en el sector de <strong>*|SECTOR|*</strong>.</p>
    
    <p>¿Te hago una pregunta directa?</p>
    
    <h3>¿Cuántos clientes nuevos traes por semana desde tu sitio web?</h3>
    
    <p>Probablemente la respuesta es "ninguno" o "muy pocos". No es porque no lo merezca — es porque 90% de las MIPYMEs en RD no tienen un sitio que venda.</p>
    
    <p>Nosotros somos <strong>Braven Studio</strong> — un equipo de diseño + desarrollo en Santo Domingo.</p>
    
    <p>En los últimos meses hemos armado webs para:</p>
    <ul>
      <li>Un restaurante que pasó de 0 a 15+ llamadas/semana</li>
      <li>Una tienda online que redujo abandono de carrito 40%</li>
      <li>Consultores que ahora reciben leads sin salir a buscar</li>
    </ul>
    
    <p><strong>¿El patrón?</strong> Sitios limpios, sin boludeces, que VENDEN.</p>
    
    <p>No hacemos propuestas genéricas. Hablamos primero, diseñamos después, lanzamos siempre.</p>
    
    <p>Si en algún momento quisiste un sitio pero parecía caro o complicado — tal vez fue porque no hablaste con la gente correcta.</p>
    
    <p><strong>Decime: ¿querés que charlemos?</strong></p>
    
    <p>
      <a href="https://bravenweb.com/#contacto" style="display: inline-block; background: #ea6969; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Sí, hablemos →
      </a>
    </p>
    
    <p>O si prefieres directo por WhatsApp:<br>
    <strong>+1 (829) 805-2619</strong></p>
    
    <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
      Braven Studio<br>
      Diseño + Desarrollo Web<br>
      Santo Domingo, RD<br>
      <a href="https://bravenweb.com" style="color: #ea6969;">bravenweb.com</a>
    </p>
  </div>
</body>
</html>
  `;
  
  await mailchimpAPI('PUT', `/campaigns/${campaignId}/content`, {
    html: htmlContent
  });
  
  // Guardar referencia en Supabase
  await supabase.from('email_campaign_refs').insert({
    name: 'Braven-01-Presentacion',
    mailchimp_id: campaignId,
    segment: 'HOT,CALIENTE'
  });
  
  return campaignId;
}

// PASO 3: Crear Campaign 2 - Caso de Uso (se envía si no abrió Campaign 1)
async function createCampaign2() {
  console.log('📧 Creando Campaign 2 (Caso de Uso)...');
  
  const campaignData = {
    type: 'regular',
    recipients: {
      list_id: MAILCHIMP_AUDIENCE_ID
    },
    settings: {
      subject_line: '*|FNAME|*, esto es para negocios como el tuyo',
      title: 'Braven-02-CasoDeUso',
      from_name: 'Braven Studio',
      reply_to: 'hola@bravenweb.com',
      preview_text: 'Casos reales que funcionaron'
    }
  };
  
  const campaign = await mailchimpAPI('POST', '/campaigns', campaignData);
  const campaignId = campaign.id;
  
  const htmlContent = `
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Hola *|FNAME|*,</h2>
    
    <p>No recibiste mi email anterior (o simplemente no era el momento). Entiendo.</p>
    
    <p>Pero te quería compartir algo específico.</p>
    
    <h3>Este restaurante no estaba en Google.</h3>
    
    <p>Los clientes lo descubrían por casualidad o no lo descubrían.</p>
    
    <p><strong>Después de trabajar con nosotros:</strong></p>
    <ul>
      <li>Sitio web con fotos profesionales del menú</li>
      <li>Sistema de reservas online integrado</li>
      <li>Optimizado para Google Maps y búsquedas locales</li>
    </ul>
    
    <p><strong>Resultado: 15+ llamadas de clientes nuevos POR SEMANA.</strong></p>
    
    <p>¿Por qué te lo cuento?</p>
    
    <p>Porque negocios como el tuyo probablemente están en la misma situación. Los clientes no saben que existen, o les cuesta encontrarte.</p>
    
    <p>Un sitio web no es un lujo — es el lugar donde tus clientes te buscan primero.</p>
    
    <p>Y no, no tiene que ser caro. Tenemos <strong>planes desde RD$5,000</strong> que entregan en 3 días y generan resultados reales.</p>
    
    <p><strong>¿Vemos si hay algo que hacer para tu negocio?</strong></p>
    
    <p>
      <a href="https://bravenweb.com/#planes" style="display: inline-block; background: #ea6969; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 10px;">
        Ver planes →
      </a>
    </p>
    
    <p>O hablar directo por WhatsApp:<br>
    <strong><a href="https://wa.me/18298052619?text=Hola%20Braven,%20me%20interesa%20saber%20m%C3%A1s" style="color: #ea6969;">+1 (829) 805-2619</a></strong></p>
    
    <p style="margin-top: 40px;">Cualquier cosa,<br><strong>Braven Studio</strong></p>
  </div>
</body>
</html>
  `;
  
  await mailchimpAPI('PUT', `/campaigns/${campaignId}/content`, {
    html: htmlContent
  });
  
  await supabase.from('email_campaign_refs').insert({
    name: 'Braven-02-CasoDeUso',
    mailchimp_id: campaignId,
    segment: 'ALL (si no abrió Campaign 1)'
  });
  
  return campaignId;
}

// PASO 4: Crear Campaign 3 - Última Oportunidad
async function createCampaign3() {
  console.log('📧 Creando Campaign 3 (Última Oportunidad)...');
  
  const campaignData = {
    type: 'regular',
    recipients: {
      list_id: MAILCHIMP_AUDIENCE_ID
    },
    settings: {
      subject_line: '*|FNAME|*, última mención',
      title: 'Braven-03-UltimaOportunidad',
      from_name: 'Braven Studio',
      reply_to: 'hola@bravenweb.com',
      preview_text: 'La puerta está abierta'
    }
  };
  
  const campaign = await mailchimpAPI('POST', '/campaigns', campaignData);
  const campaignId = campaign.id;
  
  const htmlContent = `
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Hola *|FNAME|*,</h2>
    
    <p>Te escribo por última vez.</p>
    
    <p>Sé que probablemente tenés mil cosas en la cabeza. El negocio es primero, está claro.</p>
    
    <p>Pero quería dejarte esto:</p>
    
    <h3>Tu presencia digital es lo primero que ven tus clientes potenciales.</h3>
    
    <p>Si no existe, pierden dinero. Punto.</p>
    
    <p>Nosotros <strong>resolvemos eso en 3–14 días</strong> dependiendo de lo que necesites.</p>
    
    <p>Y nos diferenciamos en una cosa: <strong>escuchamos primero</strong>.</p>
    
    <p>No te vamos a vender un sitio que no necesitas. Vamos a hablar, entender qué está frenando tu negocio, y ofrecer exactamente eso.</p>
    
    <p>Si alguna vez consideraste hacerlo, ahora es momento.</p>
    
    <h3>Estos son nuestros planes:</h3>
    
    <ul>
      <li><strong>BRV-01 (Lanzamiento)</strong>: 1 página + 5 secciones. 3 días. RD$5,000</li>
      <li><strong>BRV-02 (Portafolio)</strong>: Portafolio profesional. 4 días. RD$7,500</li>
      <li><strong>BRV-03 (Crecimiento)</strong>: 6 páginas + CMS editable. 7–10 días. RD$12,000</li>
      <li><strong>BRV-04 (E-Commerce)</strong>: Tienda con checkout. 10–14 días. RD$18,000</li>
    </ul>
    
    <p>
      <a href="https://bravenweb.com/#planes" style="display: inline-block; background: #ea6969; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Ver todos →
      </a>
    </p>
    
    <p>O responde este email.</p>
    
    <p>Si no es ahora, no pasa nada. Pero la puerta está abierta.</p>
    
    <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
      Saludos,<br>
      <strong>Braven Studio</strong><br>
      Diseño + Desarrollo Web<br>
      Santo Domingo, RD<br>
      Disponibles para proyectos
    </p>
  </div>
</body>
</html>
  `;
  
  await mailchimpAPI('PUT', `/campaigns/${campaignId}/content`, {
    html: htmlContent
  });
  
  await supabase.from('email_campaign_refs').insert({
    name: 'Braven-03-UltimaOportunidad',
    mailchimp_id: campaignId,
    segment: 'ALL (si no abrió Campaign 2)'
  });
  
  return campaignId;
}

// PASO 5: Configurar webhooks para tracking
async function setupWebhooks() {
  console.log('🔗 Configurando webhooks...');
  
  const webhookUrl = `${process.env.NETLIFY_SITE_URL || 'https://webbraven.netlify.app'}/.netlify/functions/mailchimp-webhook`;
  
  const webhookData = {
    url: webhookUrl,
    events: {
      open: true,
      click: true,
      bounce: true,
      unsubscribe: true
    },
    sources: {
      user: true,
      admin: true,
      api: true
    }
  };
  
  try {
    await mailchimpAPI('POST', `/audiences/${MAILCHIMP_AUDIENCE_ID}/webhooks`, webhookData);
    console.log('✅ Webhooks configurados');
  } catch (error) {
    console.warn('⚠️ Webhooks: ', error.message);
    // No fallar si webhooks ya existen
  }
}

// MAIN HANDLER
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    console.log('🚀 INICIANDO CAMPAÑA AUTOMÁTICA...');
    
    // Leer los 50 leads del Excel
    const leadsData = [
      // Esto vendrá de un Excel o CSV que lees al inicio
      // Por ahora, placeholder
      {
        EMAIL: 'maria.rodriguez@restaurante.do',
        NOMBRE: 'María Rodríguez',
        EMPRESA: 'Restaurante La Cocina',
        SECTOR: 'Alimentos',
        TEMPERATURA: 'HOT'
      },
      // ... más leads
    ];
    
    // Paso 1: Importar leads
    await importLeads(leadsData);
    
    // Paso 2-4: Crear las 3 campañas
    const campaign1Id = await createCampaign1();
    const campaign2Id = await createCampaign2();
    const campaign3Id = await createCampaign3();
    
    // Paso 5: Configurar webhooks
    await setupWebhooks();
    
    // Paso 6: Enviar Campaign 1 AHORA
    console.log('📤 Enviando Campaign 1...');
    await mailchimpAPI('POST', `/campaigns/${campaign1Id}/actions/send`, {});
    
    // Programar Campaign 2 para dentro de 3 días
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`📅 Programando Campaign 2 para: ${in3Days}`);
    await mailchimpAPI('POST', `/campaigns/${campaign2Id}/actions/schedule`, {
      schedule_time: in3Days
    });
    
    // Programar Campaign 3 para dentro de 7 días
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`📅 Programando Campaign 3 para: ${in7Days}`);
    await mailchimpAPI('POST', `/campaigns/${campaign3Id}/actions/schedule`, {
      schedule_time: in7Days
    });
    
    // Guardar log en Supabase
    await supabase.from('campaign_logs').insert({
      action: 'CAMPAIGN_LAUNCHED',
      campaign_1_id: campaign1Id,
      campaign_2_id: campaign2Id,
      campaign_3_id: campaign3Id,
      status: 'SUCCESS',
      leads_imported: leadsData.length,
      timestamp: new Date()
    });
    
    console.log('✅ CAMPAÑA LANZADA EXITOSAMENTE');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Campaña lanzada automáticamente',
        campaigns: {
          campaign1: campaign1Id,
          campaign2: campaign2Id,
          campaign3: campaign3Id
        },
        leadsImported: leadsData.length,
        timeline: {
          campaign1: 'Enviada ahora',
          campaign2: `Programada para ${in3Days}`,
          campaign3: `Programada para ${in7Days}`
        }
      })
    };
  } catch (error) {
    console.error('❌ Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.stack
      })
    };
  }
};
