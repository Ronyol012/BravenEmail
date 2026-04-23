// File: netlify/functions/mailchimp-webhook.js
// Mailchimp llama esto cuando alguien abre/clickea un email
// Nosotros guardamos el evento y actualizamos scoring

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  // Mailchimp envía como POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  
  try {
    const data = JSON.parse(event.body);
    
    console.log(`📨 Webhook recibido: ${data.type}`);
    console.log(`   Email: ${data.data.email}`);
    console.log(`   Campaign: ${data.data.campaign_id}`);
    
    // Tipos de eventos que Mailchimp manda:
    // - open: alguien abrió el email
    // - click: alguien hizo clic en un link
    // - bounce: email rebotó (inválido)
    // - unsubscribe: se desuscribió
    
    const eventType = data.type;
    const email = data.data.email;
    const campaignId = data.data.campaign_id;
    const timestamp = new Date(data.data.timestamp);
    
    // PASO 1: Guardar evento en Supabase
    await supabase.from('email_events').insert({
      email,
      campaign_id: campaignId,
      event_type: eventType,
      clicked_url: data.data.url || null,
      timestamp,
      ip: data.data.ip || null,
      user_agent: data.data.user_agent || null,
      created_at: new Date()
    });
    
    console.log(`✅ Evento guardado en Supabase`);
    
    // PASO 2: Actualizar scoring del lead basado en el evento
    const { data: lead, error: fetchError } = await supabase
      .from('email_campaigns')
      .select('id, temperatura')
      .eq('email', email)
      .single();
    
    if (lead) {
      let newTemperatura = lead.temperatura;
      let newMetrica = {};
      
      // Lógica de scoring
      if (eventType === 'click') {
        newTemperatura = 'HOT'; // Hizo clic = muy caliente
        newMetrica = { action: 'CLICKED', score_increase: 5 };
      } else if (eventType === 'open') {
        if (lead.temperatura !== 'HOT') {
          newTemperatura = 'CALIENTE'; // Abrió = caliente
        }
        newMetrica = { action: 'OPENED', score_increase: 2 };
      } else if (eventType === 'bounce') {
        newTemperatura = 'FRIO'; // Rebotó = frío
        newMetrica = { action: 'BOUNCED', score_decrease: 10 };
      } else if (eventType === 'unsubscribe') {
        newTemperatura = 'FRIO'; // Se desuscribió = frío
        newMetrica = { action: 'UNSUBSCRIBED', score_decrease: 10 };
      }
      
      // Actualizar temperatura y last_activity
      await supabase
        .from('email_campaigns')
        .update({
          temperatura: newTemperatura,
          last_activity: new Date(),
          // Actualizar campos por campaña
          campaign_1_opened: eventType === 'open' && campaignId.includes('1'),
          campaign_2_opened: eventType === 'open' && campaignId.includes('2'),
          campaign_3_opened: eventType === 'open' && campaignId.includes('3'),
        })
        .eq('email', email);
      
      console.log(`🔥 Temperatura actualizada: ${lead.temperatura} → ${newTemperatura}`);
    }
    
    // PASO 3: Log de actividad
    await supabase.from('activity_log').insert({
      type: 'EMAIL_EVENT',
      email,
      event: eventType,
      details: JSON.stringify(data),
      created_at: new Date()
    });
    
    // PASO 4: Si es un clic, notificar por Slack (opcional)
    if (eventType === 'click' && process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔥 **CLIC EN EMAIL** 🔥\nEmail: ${email}\nCampaign: ${campaignId}\nLink: ${data.data.url}`
          })
        });
      } catch (slackError) {
        console.warn('Slack notification error:', slackError.message);
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Evento procesado correctamente',
        event: eventType,
        email,
        newTemperatura: lead?.temperatura
      })
    };
  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
