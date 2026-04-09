import React, { useMemo, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Area, Legend,
} from 'recharts'
import {
  Users, DollarSign, Percent, UserCheck, Clock, TrendingUp,
  AlertTriangle, AlertCircle, Info, ArrowUp, ArrowDown,
} from 'lucide-react'
import { formatearMoneda, formatearPct, nombreMes, nombreMesCorto } from '../data/sampleData'

// ---------------------------------------------------------------------------
// Dark tooltip shared across all charts
// ---------------------------------------------------------------------------
function DarkTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c2129] border border-[#30363d] rounded-lg px-4 py-3 shadow-xl shadow-black/50 text-sm">
      <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-mono font-semibold text-white ml-auto pl-3">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tiny sparkline component
// ---------------------------------------------------------------------------
function Sparkline({ data, dataKey, color, width = 120, height = 32 }) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// KPI card specific for this section
// ---------------------------------------------------------------------------
function PersonalKPI({ titulo, valor, variacion, icono: Icon, subtitulo, formato = 'moneda' }) {
  const formateado = formato === 'moneda'
    ? formatearMoneda(valor)
    : formato === 'pct'
      ? formatearPct(valor)
      : typeof valor === 'number'
        ? valor.toLocaleString('es-ES', { maximumFractionDigits: 2 })
        : valor

  const positiva = variacion != null && variacion >= 0
  // For personnel costs, positive variation (costs going up) is bad
  const variacionColor = formato === 'pct' || formato === 'moneda'
    ? (positiva ? 'text-[#ff1744]' : 'text-[#00c853]')
    : (positiva ? 'text-[#00c853]' : 'text-[#ff1744]')

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#484f58] transition-all duration-300 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-full bg-[#ffab00]/15 flex items-center justify-center ring-1 ring-[#ffab00]/20">
          {Icon && <Icon className="w-[18px] h-[18px] text-[#ffab00]" />}
        </div>
        {variacion != null && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${variacionColor}`}>
            {positiva ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            <span className="font-mono">{positiva ? '+' : ''}{variacion.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-mono font-bold text-[#ffab00] leading-tight mb-1">{formateado}</div>
      <div className="text-sm text-gray-300 font-medium">{titulo}</div>
      {subtitulo && <div className="text-xs text-gray-500 mt-1">{subtitulo}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper: variation % between two values
// ---------------------------------------------------------------------------
function variacionPct(actual, anterior) {
  if (!anterior || anterior === 0) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

// ---------------------------------------------------------------------------
// Helper: get previous month periodo string
// ---------------------------------------------------------------------------
function getMesAnterior(periodo) {
  const [y, m] = periodo.split('-').map(Number)
  const pm = m === 1 ? 12 : m - 1
  const py = m === 1 ? y - 1 : y
  return `${py}-${String(pm).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function Personal({ datos, todosLosDatos, periodoActual }) {
  if (!datos) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl border border-[#30363d] bg-[#161b22]">
        <p className="text-gray-500 text-lg">No hay datos para el periodo seleccionado.</p>
      </div>
    )
  }

  const mesAnteriorKey = getMesAnterior(periodoActual)
  const datosAnterior = todosLosDatos.find(d => d.periodo === mesAnteriorKey) || null

  // =========================================================================
  // 1. HEADER KPIs
  // =========================================================================
  const { costeTotal, salarioBruto, cuotaEmpresaSS, numEmpleados, pctSobreVentas } = datos.personal
  const nominaMedia = numEmpleados > 0 ? costeTotal / numEmpleados : 0

  const varCoste = datosAnterior ? variacionPct(costeTotal, datosAnterior.personal.costeTotal) : null
  const varPct = datosAnterior ? variacionPct(pctSobreVentas, datosAnterior.personal.pctSobreVentas) : null
  const varNomina = datosAnterior
    ? variacionPct(nominaMedia, datosAnterior.personal.costeTotal / datosAnterior.personal.numEmpleados)
    : null
  const varEmpleados = datosAnterior
    ? variacionPct(numEmpleados, datosAnterior.personal.numEmpleados)
    : null

  // =========================================================================
  // 2. EVOLUTION DATA (last 24 months)
  // =========================================================================
  const last24 = useMemo(() => {
    const idx = todosLosDatos.findIndex(d => d.periodo === periodoActual)
    if (idx < 0) return []
    const start = Math.max(0, idx - 23)
    return todosLosDatos.slice(start, idx + 1).map(d => ({
      periodo: d.periodo,
      label: nombreMesCorto(d.periodo),
      salarioBruto: d.personal.salarioBruto,
      cuotaSS: d.personal.cuotaEmpresaSS,
      pctVentas: d.personal.pctSobreVentas,
    }))
  }, [todosLosDatos, periodoActual])

  // =========================================================================
  // 3. CUMULATIVE GROWTH DATA
  // =========================================================================
  const growthData = useMemo(() => {
    if (todosLosDatos.length === 0) return []
    const base = todosLosDatos[0]
    const baseVentas = base.ventas.total
    const basePersonal = base.personal.costeTotal
    return todosLosDatos.map(d => {
      const growthVentas = ((d.ventas.total - baseVentas) / baseVentas) * 100
      const growthPersonal = ((d.personal.costeTotal - basePersonal) / basePersonal) * 100
      return {
        periodo: d.periodo,
        label: nombreMesCorto(d.periodo),
        crecVentas: +growthVentas.toFixed(1),
        crecPersonal: +growthPersonal.toFixed(1),
        alertZone: growthPersonal > growthVentas ? growthPersonal - growthVentas : null,
      }
    })
  }, [todosLosDatos])

  // =========================================================================
  // 4. YEAR-OVER-YEAR TABLE DATA
  // =========================================================================
  const yoyData = useMemo(() => {
    const years = [...new Set(todosLosDatos.map(d => d.periodo.split('-')[0]))].sort()
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
    const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    const rows = months.map((mm, idx) => {
      const row = { mes: MONTH_NAMES[idx] }
      years.forEach(y => {
        const d = todosLosDatos.find(d => d.periodo === `${y}-${mm}`)
        row[`coste_${y}`] = d ? d.personal.costeTotal : null
        row[`pct_${y}`] = d ? d.personal.pctSobreVentas : null
      })
      return row
    })

    // Annual totals
    const totals = { mes: 'TOTAL ANUAL' }
    years.forEach(y => {
      const yearData = todosLosDatos.filter(d => d.periodo.startsWith(y))
      totals[`coste_${y}`] = yearData.reduce((s, d) => s + d.personal.costeTotal, 0)
      const totalVentas = yearData.reduce((s, d) => s + d.ventas.total, 0)
      totals[`pct_${y}`] = totalVentas > 0 ? +((totals[`coste_${y}`] / totalVentas) * 100).toFixed(1) : null
    })

    return { years, rows, totals }
  }, [todosLosDatos])

  // =========================================================================
  // 5. COST PER HOUR
  // =========================================================================
  const HORAS_MES = 160
  const costePorHora = numEmpleados > 0 ? costeTotal / (numEmpleados * HORAS_MES) : 0
  const sparkCostHour = useMemo(() => {
    return todosLosDatos.map(d => ({
      periodo: d.periodo,
      valor: d.personal.numEmpleados > 0
        ? +(d.personal.costeTotal / (d.personal.numEmpleados * HORAS_MES)).toFixed(2)
        : 0,
    }))
  }, [todosLosDatos])

  // =========================================================================
  // 6. SMI IMPACT ANALYSIS
  // =========================================================================
  const smiAnalysis = useMemo(() => {
    const years = [...new Set(todosLosDatos.map(d => d.periodo.split('-')[0]))].sort()
    return years.map(y => {
      const yearData = todosLosDatos.filter(d => d.periodo.startsWith(y))
      const avgCoste = yearData.length > 0
        ? yearData.reduce((s, d) => s + d.personal.costeTotal, 0) / yearData.length
        : 0
      const avgNomina = yearData.length > 0
        ? yearData.reduce((s, d) => s + d.personal.costeTotal / d.personal.numEmpleados, 0) / yearData.length
        : 0
      return { year: y, avgCoste: Math.round(avgCoste), avgNomina: Math.round(avgNomina), meses: yearData.length }
    })
  }, [todosLosDatos])

  // =========================================================================
  // 7. ALERTS
  // =========================================================================
  const alertas = useMemo(() => {
    const list = []

    if (pctSobreVentas > 18) {
      list.push({
        tipo: 'danger',
        icono: AlertCircle,
        mensaje: `Coste de personal por encima del 18% de las ventas (${formatearPct(pctSobreVentas)})`,
        detalle: 'Este nivel compromete seriamente la rentabilidad. Es necesario actuar: revisar plantilla, renegociar turnos o aumentar ventas.',
      })
    } else if (pctSobreVentas > 16) {
      list.push({
        tipo: 'warning',
        icono: AlertTriangle,
        mensaje: `Coste de personal acercandose al limite (${formatearPct(pctSobreVentas)})`,
        detalle: 'Se acerca al umbral del 18%. Monitorizar de cerca la evolucion en los proximos meses.',
      })
    }

    if (datosAnterior) {
      const crecVentas = variacionPct(datos.ventas.total, datosAnterior.ventas.total)
      const crecPersonal = variacionPct(costeTotal, datosAnterior.personal.costeTotal)
      if (crecPersonal != null && crecVentas != null && crecPersonal > crecVentas) {
        list.push({
          tipo: 'warning',
          icono: TrendingUp,
          mensaje: `El coste de personal crece mas que las ventas (personal: ${crecPersonal > 0 ? '+' : ''}${crecPersonal.toFixed(1)}% vs ventas: ${crecVentas > 0 ? '+' : ''}${crecVentas.toFixed(1)}%)`,
          detalle: 'Si esta tendencia se mantiene, el margen operativo se deteriorara progresivamente.',
        })
      }

      if (numEmpleados !== datosAnterior.personal.numEmpleados) {
        const diff = numEmpleados - datosAnterior.personal.numEmpleados
        list.push({
          tipo: 'info',
          icono: Users,
          mensaje: `Cambio en plantilla: ${diff > 0 ? '+' : ''}${diff} empleado${Math.abs(diff) > 1 ? 's' : ''} respecto al mes anterior (${datosAnterior.personal.numEmpleados} -> ${numEmpleados})`,
          detalle: 'Verificar que el cambio en plantilla es coherente con la evolucion de ventas.',
        })
      }
    }

    return list
  }, [datos, datosAnterior, pctSobreVentas, costeTotal, numEmpleados])

  // =========================================================================
  // Tooltip state for alerts
  // =========================================================================
  const [alertTooltipIdx, setAlertTooltipIdx] = useState(null)

  // =========================================================================
  // RENDER
  // =========================================================================
  const alertColorMap = {
    danger: { border: 'border-[#ff1744]/40', bg: 'bg-[#ff1744]/10', text: 'text-[#ff1744]' },
    warning: { border: 'border-[#ffab00]/40', bg: 'bg-[#ffab00]/10', text: 'text-[#ffab00]' },
    info: { border: 'border-[#40c4ff]/40', bg: 'bg-[#40c4ff]/10', text: 'text-[#40c4ff]' },
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Personal</h1>
        <p className="text-gray-500 text-sm mt-1">{nombreMes(periodoActual)}</p>
      </div>

      {/* ================================================================= */}
      {/* 1. HEADER KPIs */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PersonalKPI
          titulo="Coste Total Personal"
          valor={costeTotal}
          variacion={varCoste}
          icono={DollarSign}
          subtitulo={`Bruto ${formatearMoneda(salarioBruto)} + SS ${formatearMoneda(cuotaEmpresaSS)}`}
        />
        <PersonalKPI
          titulo="% sobre Ventas"
          valor={pctSobreVentas}
          variacion={varPct}
          icono={Percent}
          formato="pct"
          subtitulo={
            <span className="flex items-center gap-1">
              Rango saludable:
              <span className="inline-block w-16 h-1.5 rounded-full bg-[#30363d] relative overflow-hidden">
                <span
                  className="absolute h-full rounded-full"
                  style={{
                    left: '0%',
                    width: `${Math.min(100, (pctSobreVentas / 25) * 100)}%`,
                    background: pctSobreVentas <= 12 ? '#00c853' : pctSobreVentas <= 18 ? '#ffab00' : '#ff1744',
                  }}
                />
                {/* Reference markers at 12% and 18% */}
                <span className="absolute h-full w-px bg-[#00c853]" style={{ left: `${(12/25)*100}%` }} />
                <span className="absolute h-full w-px bg-[#ff1744]" style={{ left: `${(18/25)*100}%` }} />
              </span>
              12-18%
            </span>
          }
        />
        <PersonalKPI
          titulo="Nomina Media/Empleado"
          valor={nominaMedia}
          variacion={varNomina}
          icono={UserCheck}
          subtitulo={`${numEmpleados} empleados`}
        />
        <PersonalKPI
          titulo="N. Empleados"
          valor={numEmpleados}
          variacion={varEmpleados}
          icono={Users}
          formato="numero"
        />
      </div>

      {/* ================================================================= */}
      {/* 2. PERSONNEL COST EVOLUTION (ComposedChart) */}
      {/* ================================================================= */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-fade-in-up">
        <h2 className="text-lg font-semibold text-white mb-1">Evolucion del Coste de Personal</h2>
        <p className="text-xs text-gray-500 mb-4">Ultimos 24 meses - Salario bruto + Cuotas SS</p>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={last24} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#30363d' }} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#8b949e', fontSize: 11 }}
              axisLine={{ stroke: '#30363d' }}
              tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#8b949e', fontSize: 11 }}
              axisLine={{ stroke: '#30363d' }}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              domain={[0, 25]}
            />
            <RTooltip
              content={
                <DarkTooltip
                  formatter={(val, name) =>
                    name === '% sobre Ventas' ? `${val}%` : formatearMoneda(val)
                  }
                />
              }
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              wrapperStyle={{ fontSize: 11, color: '#8b949e' }}
            />
            <Bar yAxisId="left" dataKey="salarioBruto" name="Salario Bruto" stackId="coste" fill="#ffab00" radius={[0, 0, 0, 0]} />
            <Bar yAxisId="left" dataKey="cuotaSS" name="Cuota SS Empresa" stackId="coste" fill="#e65100" radius={[3, 3, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pctVentas"
              name="% sobre Ventas"
              stroke="#ffffff"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: '#fff' }}
            />
            <ReferenceLine yAxisId="right" y={18} stroke="#ff1744" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '18%', position: 'right', fill: '#ff1744', fontSize: 10 }} />
            <ReferenceLine yAxisId="right" y={12} stroke="#00c853" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '12%', position: 'right', fill: '#00c853', fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ================================================================= */}
      {/* 3. PERSONNEL vs SALES GROWTH */}
      {/* ================================================================= */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-fade-in-up">
        <h2 className="text-lg font-semibold text-white mb-1">Crecimiento Acumulado: Personal vs Ventas</h2>
        <p className="text-xs text-gray-500 mb-1">Si el coste de personal crece mas que las ventas, hay un problema</p>
        <p className="text-xs text-[#ff1744]/70 mb-4">La zona roja indica periodos donde el coste de personal supera el crecimiento de ventas</p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={growthData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="alertZoneGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff1744" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ff1744" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#30363d' }} tickLine={false} />
            <YAxis
              tick={{ fill: '#8b949e', fontSize: 11 }}
              axisLine={{ stroke: '#30363d' }}
              tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <RTooltip
              content={
                <DarkTooltip formatter={(val, name) => `${val > 0 ? '+' : ''}${val}%`} />
              }
            />
            <Legend verticalAlign="top" align="right" iconType="line" wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
            <Area
              type="monotone"
              dataKey="alertZone"
              name="Zona de alerta"
              fill="url(#alertZoneGrad)"
              stroke="none"
              connectNulls={false}
            />
            <Line type="monotone" dataKey="crecVentas" name="Crec. Ventas" stroke="#00c853" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="crecPersonal" name="Crec. Personal" stroke="#ffab00" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <ReferenceLine y={0} stroke="#484f58" strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ================================================================= */}
      {/* 4. YEAR-OVER-YEAR COMPARISON TABLE */}
      {/* ================================================================= */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 overflow-x-auto animate-fade-in-up">
        <h2 className="text-lg font-semibold text-white mb-4">Comparativa Interanual</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363d]">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Mes</th>
              {yoyData.years.map(y => (
                <th key={y} className="text-right py-2 px-3 text-gray-400 font-medium" colSpan={2}>
                  {y}
                </th>
              ))}
            </tr>
            <tr className="border-b border-[#21262d]">
              <th />
              {yoyData.years.map(y => (
                <React.Fragment key={y}>
                  <th className="text-right py-1 px-2 text-gray-500 text-xs font-normal">Coste</th>
                  <th className="text-right py-1 px-2 text-gray-500 text-xs font-normal">% Ventas</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {yoyData.rows.map((row, idx) => (
              <tr key={idx} className="border-b border-[#21262d]/50 hover:bg-[#1c2129] transition-colors">
                <td className="py-2 px-3 text-gray-300 font-medium">{row.mes}</td>
                {yoyData.years.map(y => (
                  <React.Fragment key={y}>
                    <td className="text-right py-2 px-2 font-mono text-gray-300 text-xs">
                      {row[`coste_${y}`] != null ? formatearMoneda(row[`coste_${y}`]) : <span className="text-gray-600">--</span>}
                    </td>
                    <td className={`text-right py-2 px-2 font-mono text-xs ${
                      row[`pct_${y}`] != null && row[`pct_${y}`] > 18
                        ? 'text-[#ff1744] font-semibold'
                        : row[`pct_${y}`] != null && row[`pct_${y}`] > 16
                          ? 'text-[#ffab00]'
                          : 'text-gray-400'
                    }`}>
                      {row[`pct_${y}`] != null ? `${row[`pct_${y}`]}%` : <span className="text-gray-600">--</span>}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 border-[#ffab00]/30 bg-[#ffab00]/5">
              <td className="py-2.5 px-3 text-[#ffab00] font-bold">{yoyData.totals.mes}</td>
              {yoyData.years.map(y => (
                <React.Fragment key={y}>
                  <td className="text-right py-2.5 px-2 font-mono text-[#ffab00] text-xs font-semibold">
                    {yoyData.totals[`coste_${y}`] != null ? formatearMoneda(yoyData.totals[`coste_${y}`]) : '--'}
                  </td>
                  <td className={`text-right py-2.5 px-2 font-mono text-xs font-semibold ${
                    yoyData.totals[`pct_${y}`] != null && yoyData.totals[`pct_${y}`] > 18
                      ? 'text-[#ff1744]'
                      : 'text-[#ffab00]'
                  }`}>
                    {yoyData.totals[`pct_${y}`] != null ? `${yoyData.totals[`pct_${y}`]}%` : '--'}
                  </td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================================================================= */}
      {/* 5. COST PER HOUR + 6. SMI IMPACT — side by side */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Cost Per Hour */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#ffab00]" />
            <h2 className="text-lg font-semibold text-white">Coste por Hora Trabajada</h2>
          </div>
          <div className="flex items-end gap-6">
            <div>
              <div className="text-3xl font-mono font-bold text-[#ffab00]">
                {costePorHora.toFixed(2)} EUR/h
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Estimado sobre {HORAS_MES}h/mes por empleado a jornada completa
              </p>
              <p className="text-xs text-gray-500">
                {formatearMoneda(costeTotal)} / ({numEmpleados} emp. x {HORAS_MES}h)
              </p>
            </div>
            <div className="ml-auto">
              <p className="text-[10px] text-gray-500 mb-1 text-right">Evolucion</p>
              <Sparkline data={sparkCostHour} dataKey="valor" color="#ffab00" width={140} height={36} />
            </div>
          </div>
        </div>

        {/* 6. SMI Impact */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#ffab00]" />
            <h2 className="text-lg font-semibold text-white">Impacto Subidas SMI</h2>
          </div>
          <div className="space-y-3">
            {smiAnalysis.map((item, idx) => {
              const prev = idx > 0 ? smiAnalysis[idx - 1] : null
              const incNomina = prev ? ((item.avgNomina - prev.avgNomina) / prev.avgNomina * 100).toFixed(1) : null
              const incCoste = prev ? ((item.avgCoste - prev.avgCoste) / prev.avgCoste * 100).toFixed(1) : null
              return (
                <div key={item.year} className="flex items-center gap-4 py-2 border-b border-[#21262d] last:border-0">
                  <span className="text-white font-semibold text-sm w-12">{item.year}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Coste medio mensual:</span>
                      <span className="text-gray-200 font-mono">{formatearMoneda(item.avgCoste)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="text-gray-400">Nomina media/emp.:</span>
                      <span className="text-gray-200 font-mono">{formatearMoneda(item.avgNomina)}</span>
                    </div>
                  </div>
                  {incNomina && (
                    <div className="text-right min-w-[60px]">
                      <span className={`text-xs font-mono font-semibold ${parseFloat(incNomina) > 0 ? 'text-[#ff1744]' : 'text-[#00c853]'}`}>
                        {parseFloat(incNomina) > 0 ? '+' : ''}{incNomina}%
                      </span>
                      <p className="text-[10px] text-gray-500">vs {smiAnalysis[idx-1].year}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
            El SMI en Espana ha subido un 54% entre 2018 y 2025.
            Estas subidas impactan directamente en los costes de personal de pequenos comercios,
            donde los salarios estan mas proximos al minimo interprofesional.
          </p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 7. ALERTS PANEL */}
      {/* ================================================================= */}
      {alertas.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-white mb-4">Alertas de Personal</h2>
          <div className="space-y-3">
            {alertas.map((alerta, idx) => {
              const colors = alertColorMap[alerta.tipo] || alertColorMap.info
              const IconComp = alerta.icono
              return (
                <div
                  key={idx}
                  className={`relative flex items-start gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg} cursor-pointer`}
                  onMouseEnter={() => setAlertTooltipIdx(idx)}
                  onMouseLeave={() => setAlertTooltipIdx(null)}
                >
                  <IconComp className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colors.text}`} />
                  <p className={`text-sm ${colors.text}`}>{alerta.mensaje}</p>
                  {/* Tooltip */}
                  {alertTooltipIdx === idx && alerta.detalle && (
                    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1c2129] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-gray-400 max-w-xs text-center shadow-lg shadow-black/40">
                      {alerta.detalle}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-2 h-2 bg-[#1c2129] border-r border-b border-[#30363d] rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 8. EXPLANATORY NOTE */}
      {/* ================================================================= */}
      <div className="bg-[#161b22]/60 border border-[#21262d] rounded-xl p-4 animate-fade-in-up">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-gray-400 font-medium">Nota:</span> En supermercados independientes,
          el coste de personal es el gasto operativo mas importante y el mas controlable.
          El rango saludable esta entre el 12% y el 18% de las ventas. Por encima del 18%,
          la rentabilidad del negocio se ve seriamente comprometida. Este analisis incluye
          salario bruto, cuotas a la Seguridad Social a cargo de la empresa y pagas extra prorrateadas.
        </p>
      </div>
    </div>
  )
}
