import React from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, BarChart, LineChart,
  Legend,
} from 'recharts'
import { TrendingUp, Percent, ShoppingCart, Info } from 'lucide-react'
import KPICard from './KPICard'
import { formatearMoneda, formatearPct, nombreMes, nombreMesCorto } from '../data/sampleData'

// ---------------------------------------------------------------------------
// Tooltip personalizado reutilizable
// ---------------------------------------------------------------------------
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c2129] border border-[#30363d] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-400 mb-1 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color || entry.fill }} />
          {entry.name}: {formatter ? formatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function MargenComercial({ datos, todosLosDatos, periodoActual }) {
  if (!datos) return null

  const { compras, ventas } = datos
  const prev = todosLosDatos.find(d => {
    const [y, m] = periodoActual.split('-')
    const prevP = `${parseInt(y, 10) - 1}-${m}`
    return d.periodo === prevP
  })

  // Variaciones interanuales
  const varMargen = prev ? ((compras.margenBruto - prev.compras.margenBruto) / Math.abs(prev.compras.margenBruto)) * 100 : null
  const varPct = prev ? compras.margenBrutoPct - prev.compras.margenBrutoPct : null
  const varCoste = prev ? ((compras.costeMercancia - prev.compras.costeMercancia) / Math.abs(prev.compras.costeMercancia)) * 100 : null

  // Color dinamic para el margen %
  const margenColor = compras.margenBrutoPct >= 22 ? 'green' : compras.margenBrutoPct >= 20 ? 'amber' : 'red'

  // --- Datos para evolucion 24 meses ---
  const last24 = todosLosDatos.slice(-24)
  const evolucionData = last24.map(d => ({
    periodo: nombreMesCorto(d.periodo),
    margenBruto: d.compras.margenBruto,
    margenPct: d.compras.margenBrutoPct,
  }))

  // --- Year-over-year comparison ---
  const yearsSet = new Set(todosLosDatos.map(d => d.periodo.split('-')[0]))
  const years = [...yearsSet].sort()
  const meses = ['01','02','03','04','05','06','07','08','09','10','11','12']
  const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const yoyData = meses.map((mm, idx) => {
    const row = { mes: MESES_CORTO[idx] }
    years.forEach(y => {
      const d = todosLosDatos.find(d => d.periodo === `${y}-${mm}`)
      row[y] = d ? d.compras.margenBrutoPct : null
    })
    return row
  })
  const yoyColors = ['#00c853', '#40c4ff', '#ffab00']

  // --- Coste mercancia evolucion ---
  const costeData = last24.map(d => ({
    periodo: nombreMesCorto(d.periodo),
    costeMercancia: d.compras.costeMercancia,
  }))

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Titulo seccion */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00c853]" />
          Margen Comercial
        </h2>
        <p className="text-sm text-gray-500 mt-1">{nombreMes(periodoActual)}</p>
      </div>

      {/* ---- 1. KPI Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          titulo="Margen Bruto"
          valor={compras.margenBruto}
          formato="moneda"
          icono={TrendingUp}
          color="green"
          variacion={varMargen}
          subtitulo="Ventas - Coste de Mercancia"
          tooltip="Diferencia entre ingresos por ventas y coste de la mercancia vendida"
        />
        <KPICard
          titulo="Margen Bruto %"
          valor={compras.margenBrutoPct}
          formato="porcentaje"
          icono={Percent}
          color={margenColor}
          variacion={varPct}
          subtitulo="Rango saludable: 22-28%"
          tooltip="Porcentaje de cada euro de venta que queda tras cubrir el coste del producto"
        />
        <KPICard
          titulo="Coste de Mercancia"
          valor={compras.costeMercancia}
          formato="moneda"
          icono={ShoppingCart}
          color="red"
          variacion={varCoste}
          subtitulo={`${formatearPct(100 - compras.margenBrutoPct)} de las ventas`}
          tooltip="Total pagado a proveedores por la mercancia vendida este mes"
        />
      </div>

      {/* ---- 2. Evolucion Margen (ComposedChart) ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Evolucion del Margen (24 meses)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={evolucionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="periodo" tick={{ fill: '#8b949e', fontSize: 11 }} interval={2} />
            <YAxis yAxisId="left" tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" domain={[18, 30]} tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip formatter={(v, name) => name.includes('%') || name.includes('Pct') ? formatearPct(v) : formatearMoneda(v)} />} />
            <ReferenceArea yAxisId="right" y1={22} y2={28} fill="#00c853" fillOpacity={0.06} />
            <ReferenceLine yAxisId="right" y={22} stroke="#ff1744" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Bar yAxisId="left" dataKey="margenBruto" name="Margen Bruto" fill="#00c853" fillOpacity={0.6} radius={[3,3,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="margenPct" name="Margen %" stroke="#40c4ff" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 3. Comparativa interanual ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Comparativa Interanual del Margen (%)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={yoyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="mes" tick={{ fill: '#8b949e', fontSize: 11 }} />
            <YAxis domain={[18, 30]} tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip formatter={v => v != null ? formatearPct(v) : '—'} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
            {years.map((y, i) => (
              <Bar key={y} dataKey={y} name={y} fill={yoyColors[i % yoyColors.length]} fillOpacity={0.75} radius={[3,3,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 4. Evolucion Coste Mercancia ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Evolucion del Coste de Mercancia</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={costeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="periodo" tick={{ fill: '#8b949e', fontSize: 11 }} interval={2} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip formatter={v => formatearMoneda(v)} />} />
            <Line type="monotone" dataKey="costeMercancia" name="Coste Mercancia" stroke="#ff1744" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 5. Card explicativa ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex gap-3">
        <Info className="w-5 h-5 text-[#00c853] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-400 leading-relaxed">
          El margen bruto comercial es la diferencia entre el precio de venta y el coste de compra
          de la mercancia. Es el KPI mas importante en distribucion alimentaria. Un margen del 24%
          significa que de cada 100&#8364; de venta, 24&#8364; quedan para cubrir gastos operativos y generar beneficio.
        </p>
      </div>
    </div>
  )
}
