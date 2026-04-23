// File: src/components/CampaignDashboard.jsx
// Componente para Braven OS que muestra métricas y botón de lanzar campaña

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

export function CampaignDashboard() {
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [summary, setSummary] = useState(null)
  const [engagement, setEngagement] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Refresca cada 30s
    return () => clearInterval(interval)
  }, [])

  async function fetchDashboardData() {
    try {
      // Obtener resumen
      const { data: summaryData } = await supabase
        .from('email_campaign_summary')
        .select('*')
        .single()
      setSummary(summaryData)

      // Obtener engagement rates
      const { data: engagementData } = await supabase
        .from('email_engagement_rates')
        .select('*')
      setEngagement(engagementData || [])

      // Obtener últimos logs
      const { data: logsData } = await supabase
        .from('campaign_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10)
      setLogs(logsData || [])

      setLoading(false)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  async function launchCampaign() {
    if (!window.confirm('¿Estás seguro de que querés lanzar la campaña? Se enviarán los 50 emails.')) {
      return
    }

    setLaunching(true)
    try {
      const response = await fetch('/.netlify/functions/campaign-launcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch-campaign' })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error lanzando campaña')
      }

      alert('✅ Campaña lanzada exitosamente!\n\nCampaign 1: Enviada ahora\nCampaign 2: En 3 días\nCampaign 3: En 7 días')
      
      // Refresca los datos
      setTimeout(fetchDashboardData, 2000)
    } catch (err) {
      console.error('Launch error:', err)
      alert('❌ Error: ' + err.message)
    } finally {
      setLaunching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin">⏳ Cargando métricas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">📧 Campañas Email</h2>
          <p className="text-gray-500">Automatización Braven Studio</p>
        </div>
        <button
          onClick={launchCampaign}
          disabled={launching}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-bold flex items-center gap-2"
        >
          {launching ? '🔄 Lanzando...' : '🚀 LANZAR CAMPAÑA'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {/* KPIs Principales */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Total Leads"
            value={summary.total_leads}
            color="blue"
          />
          <KPICard
            label="HOT 🔥"
            value={summary.hot_leads}
            color="red"
          />
          <KPICard
            label="CALIENTE 🟡"
            value={summary.caliente_leads}
            color="yellow"
          />
          <KPICard
            label="TIBIO 🔵"
            value={summary.tibio_leads}
            color="blue"
          />
        </div>
      )}

      {/* Campaign Breakdown */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CampaignCard
            title="Campaign 1: Presentación"
            sent={summary.campaign_1_sent}
            opened={summary.campaign_1_opened}
            clicked={summary.campaign_1_clicked}
          />
          <CampaignCard
            title="Campaign 2: Caso de Uso"
            sent={summary.campaign_2_sent}
            opened={summary.campaign_2_opened}
            clicked={summary.campaign_2_clicked}
          />
          <CampaignCard
            title="Campaign 3: Última Oportunidad"
            sent={summary.campaign_3_sent}
            opened={summary.campaign_3_opened}
            clicked={summary.campaign_3_clicked}
          />
        </div>
      )}

      {/* Engagement Rates Chart */}
      {engagement && engagement.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">📊 Engagement Rates por Campaña</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="campaign" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="open_rate" fill="#3b82f6" name="Open Rate %" />
              <Bar dataKey="click_rate" fill="#ef4444" name="Click Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Logs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">📝 Últimas Acciones</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map(log => (
              <div key={log.id} className="p-3 bg-gray-50 rounded text-sm border-l-4 border-blue-500">
                <div className="font-bold">{log.action}</div>
                <div className="text-gray-600">
                  {log.status === 'SUCCESS' ? '✅' : '❌'} {log.status}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(log.timestamp).toLocaleString('es-DO')}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No hay registros aún</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Componentes auxiliares
function KPICard({ label, value, color }) {
  const colorClasses = {
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700'
  }

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-3xl font-bold">{value || 0}</div>
    </div>
  )
}

function CampaignCard({ title, sent, opened, clicked }) {
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0

  return (
    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
      <h4 className="font-bold text-lg mb-3">{title}</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Enviados:</span>
          <span className="font-bold">{sent}</span>
        </div>
        <div className="flex justify-between">
          <span>Abiertos:</span>
          <span className="font-bold text-blue-600">{opened} ({openRate}%)</span>
        </div>
        <div className="flex justify-between">
          <span>Clics:</span>
          <span className="font-bold text-green-600">{clicked} ({clickRate}%)</span>
        </div>
        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${openRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}
