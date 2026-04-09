import React from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart, ReferenceLine,
} from 'recharts'
import { Receipt, Percent, Zap, Info, AlertTriangle } from 'lucide-react'
import KPICard from './KPICard'
import { formatearMoneda, formatearPct, nombreMes, nombreMesCorto } from '../data/sampleData'

// ---------------------------------------------------------------------------
const CATEGORIAS = [
  { key: 'suministros', label: 'Suministros', color: '#40c4ff' },
  { key: 'alquiler', label: 'Alquiler', color: '#7c4dff' },
  { key: 'seguros', label: 'Seguros', color: '#ff6e40' },
  { key: 'gestoria', label: 'Gestoria', color: '#00c853' },
  { key: 'otros', label: 'Otros', color: '#ffab00' },
]

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c2129] border border-[#30363d] rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-gray-400 mb-1 font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill || entry.stroke }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color || entry.fill || entry.stroke }} />
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  )
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value, payload: inner } = payload[0]
  return (
    <div className="bg-[#1c2129] border border-[#30363d] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-300 font-medium">{name}</p>
      <p style={{ color: inner.fill }}>{formatearMoneda(value)}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
export default function Gastos({ datos, todosLosDatos, periodoActual }) {
  if (!datos) return null

  const { gastos, ventas, compras } = datos

  const pctSobreVentas = +((gastos.total / ventas.total) * 100).toFixed(1)

  const prev = todosLosDatos.find(d => {
    const [y, m] = periodoActual.split('-')
    return d.periodo === `${parseInt(y, 10) - 1}-${m}`
  })
  const varTotal = prev ? ((gastos.total - prev.gastos.total) / Math.abs(prev.gastos.total)) * 100 : null
  const varPct = prev ? pctSobreVentas - +((prev.gastos.total / prev.ventas.total) * 100).toFixed(1) : null

  // --- 1. Donut ---
  const donutData = CATEGORIAS.map(c => ({
    name: c.label,
    value: gastos[c.key],
    fill: c.color,
  }))

  // --- 2. Stacked evolution (12 meses) ---
  const last12 = todosLosDatos.slice(-12)
  const stackData = last12.map(d => {
    const row = { periodo: nombreMesCorto(d.periodo) }
    CATEGORIAS.forEach(c => { row[c.key] = d.gastos[c.key] })
    row.total = d.gastos.total
    return row
  })

  // --- 3. Suministros deep dive ---
  const last24 = todosLosDatos.slice(-24)
  const suministrosData = last24.map(d => ({
    periodo: nombreMesCorto(d.periodo),
    suministros: d.gastos.suministros,
  }))
  const avg12Suministros = last12.reduce((s, d) => s + d.gastos.suministros, 0) / last12.length
  const suministrosAlerta = gastos.suministros > avg12Suministros * 1.2

  // --- 4. Fijos vs Variables ---
  const fijos = gastos.alquiler + gastos.seguros + gastos.gestoria
  const variables = gastos.suministros + gastos.otros
  const totalGastos = fijos + variables
  const pctFijos = +((fijos / totalGastos) * 100).toFixed(1)
  const pctVariables = +((variables / totalGastos) * 100).toFixed(1)
  // Punto de equilibrio: costes fijos / margen% * 100
  const breakEven = compras.margenBrutoPct > 0
    ? Math.round((fijos + datos.personal.costeTotal) / (compras.margenBrutoPct / 100))
    : null

  // --- 5. Tabla mensual (12 meses) ---
  const tableData = last12.map(d => ({
    periodo: nombreMesCorto(d.periodo),
    ...d.gastos,
  }))

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Titulo */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#ffab00]" />
          Gastos Operativos
        </h2>
        <p className="text-sm text-gray-500 mt-1">{nombreMes(periodoActual)}</p>
      </div>

      {/* ---- 1. KPI Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard
          titulo="Total Gastos Operativos"
          valor={gastos.total}
          formato="moneda"
          icono={Receipt}
          color="amber"
          variacion={varTotal}
          subtitulo="Sin personal ni coste de mercancia"
          tooltip="Suma de suministros, alquiler, seguros, gestoria y otros gastos"
        />
        <KPICard
          titulo="% sobre Ventas"
          valor={pctSobreVentas}
          formato="porcentaje"
          icono={Percent}
          color="amber"
          variacion={varPct}
          tooltip="Peso de los gastos operativos sobre la facturacion total"
        />
      </div>

      {/* ---- 2. Donut de desglose ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Desglose de Gastos</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-[240px] h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-lg font-mono font-bold text-[#ffab00]">{formatearMoneda(gastos.total)}</span>
            </div>
          </div>
          {/* Leyenda */}
          <div className="flex flex-col gap-2">
            {donutData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: entry.fill }} />
                <span className="text-gray-400 w-24">{entry.name}</span>
                <span className="text-gray-300 font-mono">{formatearMoneda(entry.value)}</span>
                <span className="text-gray-500 text-xs">({formatearPct((entry.value / gastos.total) * 100)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- 3. Evolucion apilada (12 meses) ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Evolucion de Gastos (12 meses)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={stackData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="periodo" tick={{ fill: '#8b949e', fontSize: 11 }} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip formatter={v => formatearMoneda(v)} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
            {CATEGORIAS.map(c => (
              <Bar key={c.key} dataKey={c.key} name={c.label} stackId="gastos" fill={c.color} fillOpacity={0.8} />
            ))}
            <Line type="monotone" dataKey="total" name="Total" stroke="#ffffff" strokeWidth={2} dot={false} strokeOpacity={0.6} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 4. Deep dive suministros ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#40c4ff]" />
            Suministros: Evolucion Detallada
          </h3>
          {suministrosAlerta && (
            <span className="flex items-center gap-1 text-xs text-[#ff1744] bg-[#ff1744]/10 px-2 py-1 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5" />
              Supera 120% de la media
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={suministrosData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="periodo" tick={{ fill: '#8b949e', fontSize: 11 }} interval={2} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<CustomTooltip formatter={v => formatearMoneda(v)} />} />
            <ReferenceLine y={Math.round(avg12Suministros)} stroke="#ffab00" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: 'Media 12m', fill: '#ffab00', fontSize: 10, position: 'right' }} />
            <ReferenceLine y={Math.round(avg12Suministros * 1.2)} stroke="#ff1744" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: '120%', fill: '#ff1744', fontSize: 10, position: 'right' }} />
            <Line type="monotone" dataKey="suministros" name="Suministros" stroke="#40c4ff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-3 italic">
          El gasto energetico es critico en supermercados por las camaras frigorificas.
        </p>
      </div>

      {/* ---- 5. Fijos vs Variables ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Costes Fijos vs Variables</h3>
        <div className="space-y-4">
          {/* Barra proporcional */}
          <div className="flex h-6 rounded-md overflow-hidden">
            <div
              className="flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${pctFijos}%`, background: '#7c4dff' }}
            >
              {pctFijos}%
            </div>
            <div
              className="flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${pctVariables}%`, background: '#ffab00' }}
            >
              {pctVariables}%
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-sm bg-[#7c4dff]" />
                <span className="text-gray-400">Fijos</span>
              </div>
              <p className="text-gray-300 font-mono text-lg">{formatearMoneda(fijos)}</p>
              <p className="text-xs text-gray-500">Alquiler + Seguros + Gestoria</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-sm bg-[#ffab00]" />
                <span className="text-gray-400">Variables</span>
              </div>
              <p className="text-gray-300 font-mono text-lg">{formatearMoneda(variables)}</p>
              <p className="text-xs text-gray-500">Suministros + Otros</p>
            </div>
          </div>
          {breakEven && (
            <div className="border-t border-[#30363d] pt-3">
              <p className="text-xs text-gray-500">
                Punto de equilibrio (costes fijos + personal / margen%):
                <span className="text-[#ffab00] font-mono font-bold ml-1">{formatearMoneda(breakEven)}</span>
                <span className="ml-1">en ventas minimas necesarias</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---- 6. Tabla mensual ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Detalle Mensual de Gastos (12 meses)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#30363d] text-gray-500">
              <th className="text-left py-2 px-2 font-medium">Periodo</th>
              {CATEGORIAS.map(c => (
                <th key={c.key} className="text-right py-2 px-2 font-medium">{c.label}</th>
              ))}
              <th className="text-right py-2 px-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i} className="border-b border-[#30363d]/50 hover:bg-[#1c2129] transition-colors">
                <td className="py-2 px-2 text-gray-400 font-medium">{row.periodo}</td>
                {CATEGORIAS.map(c => (
                  <td key={c.key} className="py-2 px-2 text-right text-gray-300 font-mono">
                    {formatearMoneda(row[c.key])}
                  </td>
                ))}
                <td className="py-2 px-2 text-right text-[#ffab00] font-mono font-semibold">
                  {formatearMoneda(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Card explicativa ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex gap-3">
        <Info className="w-5 h-5 text-[#ffab00] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-400 leading-relaxed">
          Los gastos operativos son todos los costes necesarios para mantener la tienda abierta,
          excluyendo el coste de la mercancia y el personal. Controlar los suministros energeticos
          es clave: las camaras frigorificas funcionan 24h y el consumo sube significativamente en
          verano e invierno.
        </p>
      </div>
    </div>
  )
}
