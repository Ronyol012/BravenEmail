-- File: supabase/migrations/001-create-email-tables.sql (VERSIÓN CORREGIDA)
-- Ejecutar esto en la consola SQL de Supabase

-- Tabla principal: Leads y su estado
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255),
  empresa VARCHAR(255),
  sector VARCHAR(100),
  temperatura VARCHAR(50) DEFAULT 'TIBIO', -- HOT, CALIENTE, TIBIO, FRIO
  
  -- Tracking por campaña
  campaign_1_sent BOOLEAN DEFAULT FALSE,
  campaign_1_opened BOOLEAN DEFAULT FALSE,
  campaign_1_clicked BOOLEAN DEFAULT FALSE,
  
  campaign_2_sent BOOLEAN DEFAULT FALSE,
  campaign_2_opened BOOLEAN DEFAULT FALSE,
  campaign_2_clicked BOOLEAN DEFAULT FALSE,
  
  campaign_3_sent BOOLEAN DEFAULT FALSE,
  campaign_3_opened BOOLEAN DEFAULT FALSE,
  campaign_3_clicked BOOLEAN DEFAULT FALSE,
  
  -- Scoring
  engagement_score INTEGER DEFAULT 0,
  last_activity TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Eventos (opens, clicks, bounces)
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255),
  event_type VARCHAR(50), -- 'open', 'click', 'bounce', 'unsubscribe'
  clicked_url TEXT,
  ip VARCHAR(15),
  user_agent TEXT,
  timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Referencias de campañas (IDs de Mailchimp)
CREATE TABLE IF NOT EXISTS email_campaign_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  mailchimp_id VARCHAR(255) UNIQUE,
  segment VARCHAR(100),
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SCHEDULED, SENT
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Logs de la campaña
CREATE TABLE IF NOT EXISTS campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100),
  campaign_1_id VARCHAR(255),
  campaign_2_id VARCHAR(255),
  campaign_3_id VARCHAR(255),
  status VARCHAR(50),
  leads_imported INTEGER,
  details JSONB,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Tabla: Activity log general
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100),
  email VARCHAR(255),
  event VARCHAR(100),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_email ON email_campaigns(email);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_temperatura ON email_campaigns(temperatura);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sector ON email_campaigns(sector);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_id ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_status ON campaign_logs(status);

-- Vista: Resumen de campañas (para el dashboard)
CREATE OR REPLACE VIEW email_campaign_summary AS
SELECT 
  COUNT(*) as total_leads,
  SUM(CASE WHEN campaign_1_sent THEN 1 ELSE 0 END) as campaign_1_sent,
  SUM(CASE WHEN campaign_1_opened THEN 1 ELSE 0 END) as campaign_1_opened,
  SUM(CASE WHEN campaign_1_clicked THEN 1 ELSE 0 END) as campaign_1_clicked,
  
  SUM(CASE WHEN campaign_2_sent THEN 1 ELSE 0 END) as campaign_2_sent,
  SUM(CASE WHEN campaign_2_opened THEN 1 ELSE 0 END) as campaign_2_opened,
  SUM(CASE WHEN campaign_2_clicked THEN 1 ELSE 0 END) as campaign_2_clicked,
  
  SUM(CASE WHEN campaign_3_sent THEN 1 ELSE 0 END) as campaign_3_sent,
  SUM(CASE WHEN campaign_3_opened THEN 1 ELSE 0 END) as campaign_3_opened,
  SUM(CASE WHEN campaign_3_clicked THEN 1 ELSE 0 END) as campaign_3_clicked,
  
  SUM(CASE WHEN temperatura = 'HOT' THEN 1 ELSE 0 END) as hot_leads,
  SUM(CASE WHEN temperatura = 'CALIENTE' THEN 1 ELSE 0 END) as caliente_leads,
  SUM(CASE WHEN temperatura = 'TIBIO' THEN 1 ELSE 0 END) as tibio_leads,
  SUM(CASE WHEN temperatura = 'FRIO' THEN 1 ELSE 0 END) as frio_leads
FROM email_campaigns;

-- Vista: Engagement rate por campaña (SIN ROUND - dejamos decimales)
CREATE OR REPLACE VIEW email_engagement_rates AS
SELECT 
  'Campaign 1' as campaign,
  COUNT(*) as sent,
  SUM(CASE WHEN campaign_1_opened THEN 1 ELSE 0 END) as opened,
  SUM(CASE WHEN campaign_1_clicked THEN 1 ELSE 0 END) as clicked,
  (SUM(CASE WHEN campaign_1_opened THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100 as open_rate,
  (SUM(CASE WHEN campaign_1_clicked THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100 as click_rate
FROM email_campaigns
WHERE campaign_1_sent = TRUE

UNION ALL

SELECT 
  'Campaign 2',
  COUNT(*),
  SUM(CASE WHEN campaign_2_opened THEN 1 ELSE 0 END),
  SUM(CASE WHEN campaign_2_clicked THEN 1 ELSE 0 END),
  (SUM(CASE WHEN campaign_2_opened THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100,
  (SUM(CASE WHEN campaign_2_clicked THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100
FROM email_campaigns
WHERE campaign_2_sent = TRUE

UNION ALL

SELECT 
  'Campaign 3',
  COUNT(*),
  SUM(CASE WHEN campaign_3_opened THEN 1 ELSE 0 END),
  SUM(CASE WHEN campaign_3_clicked THEN 1 ELSE 0 END),
  (SUM(CASE WHEN campaign_3_opened THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100,
  (SUM(CASE WHEN campaign_3_clicked THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100
FROM email_campaigns
WHERE campaign_3_sent = TRUE;
