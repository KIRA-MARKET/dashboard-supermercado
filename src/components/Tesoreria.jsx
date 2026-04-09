import React from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Legend,
} from 'recharts'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, Info } from 'lucide-react'
import KPICard from './KPICard'
import { formatearMoneda, formatearPct, nombreMes, nombreMesCorto } from '../data/sampleData'

// ---------------------------------------------------------------------------
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c2129] border border-[#30363d] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-400 mb-1 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill || entry.stroke }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color || entry.fill || entry.stroke }} />
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
export default function Tesoreria({ datos, todosLosDatos, periodoActual }) {
  if (!datos) return null

  const { tesoreria } = datos
  const prev = todosLosDatos.find(d => {
    const [y, m] = periodoActual.split('-')
    return d.periodo === `${parseInt(y, 10) - 1}-${m}`
  })

  const varSaldo = prev ? ((tesoreria.saldoBancario - prev.tesoreria.saldoBancario) / Math.abs(prev.tesoreria.saldoBancario)) * 100 : null
  const varCobros = prev ? ((tesoreria.cobros - prev.tesoreria.cobros) / Math.abs(prev.tesoreria.cobros)) * 100 : null
  const varPagos = prev ? ((tesoreria.pagos - prev.tesoreria.pagos) / Math.abs(prev.tesoreria.pagos)) * 100 : null

  // --- 24 meses para evolucion ---
  const last24 = todosLosDatos.slice(-24)

  const saldoData = last24.map(d => ({
    periodo: nombreMesCorto(d.periodo),
    saldo: d.tesoreria.saldoBancario,
  }))

  const cashFlowData = last24.map(d => ({
    periodo: nombreMesCorto(d.periodo),
    cobros: d.tesoreria.cobros,
    pagos: d.tesoreria.pagos,
    flujoNeto: d.tesoreria.cobros - d.tesoreria.pagos,
  }))

  const diasPagoData = last24.map(d => ({
    periodo: nombreMesCorto(d.periodo),
    dias: d.tesoreria.diasPagoProveedores,
  }))

  // --- Proyeccion 3 meses ---
  const lastN = todosLosDatos.slice(-3)
  const avgNetFlow = lastN.reduce((s, d) => s + (d.tesoreria.cobros - d.tesoreria.pagos), 0) / lastN.length
  const currentSaldo = tesoreria.saldoBancario
  const [cy, cm] = periodoActual.split('-').map(Number)
  const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const forecast = [1, 2, 3].map(offset => {
    const totalM = cm + offset
    const fYear = cy + Math.floor((totalM - 1) / 12)
    const fMonth = ((totalM - 1) % 12) + 1
    return {
      label: `${MESES_CORTO[fMonth - 1]} ${String(fYear).slice(2)}`,
      saldo: Math.round(currentSaldo + avgNetFlow * offset),
    }
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Titulo */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#40c4ff]" />
          Tesoreria
        </h2>
        <p className="text-sm text-gray-500 mt-1">{nombreMes(periodoActual)}</p>
      </div>

      {/* ---- 1. KPI Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          titulo="Saldo Bancario"
          valor={tesoreria.saldoBancario}
          formato="moneda"
          icono={Wallet}
          color="blue"
          variacion={varSaldo}
          tooltip="Saldo disponible en cuentas bancarias al cierre del mes"
        />
        <KPICard
          titulo="Cobros del Mes"
          valor={tesoreria.cobros}
          formato="moneda"
          icono={ArrowDownCircle}
          color="green"
          variacion={varCobros}
          tooltip="Total cobrado: ventas en efectivo, tarjeta y transferencias"
        />
        <KPICard
          titulo="Pagos del Mes"
          valor={tesoreria.pagos}
          formato="moneda"
          icono={ArrowUpCircle}
          color="red"
          variacion={varPagos}
          tooltip="Total pagado: proveedores, personal, gastos fijos e impuestos"
        />
      </div>

      {/* ---- 2. Evolucion Saldo Bancario (AreaChart) ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Evolucion del Saldo Bancario (24 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={saldoData}>
            <defs>
              <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#40c4ff" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#40c4ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="periodo" tick={{ fill: '#8b949e', fontSize: 11 }} interval={2} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip formatter={v => formatearMoneda(v)} />} />
            <ReferenceLine y={0} stroke="#ff1744" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#40c4ff" strokeWidth={2} fill="url(#gradSaldo)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 3. Cash Flow: Cobros vs Pagos ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Flujo de Caja: Cobros vs Pagos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={cashFlowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="periodo" tick={{ fill: '#8b949e', fontSize: 11 }} interval={2} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip formatter={v => formatearMoneda(v)} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
            <Bar dataKey="cobros" name="Cobros" fill="#00c853" fillOpacity={0.7} radius={[3,3,0,0]} />
            <Bar dataKey="pagos" name="Pagos" fill="#ff1744" fillOpacity={0.7} radius={[3,3,0,0]} />
            <Line type="monotone" dataKey="flujoNeto" name="Flujo Neto" stroke="#ffab00" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 4. Dias de Pago a Proveedores ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Dias de Pago a Proveedores</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={diasPagoData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="periodo" tick={{ fill: '#8b949e', fontSize: 11 }} interval={2} />
            <YAxis domain={[20, 55]} tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${v}d`} />
            <Tooltip content={<CustomTooltip formatter={v => `${v} dias`} />} />
            <Line type="monotone" dataKey="dias" name="Dias Pago" stroke="#40c4ff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 5. Proyeccion 3 meses ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Proyeccion de Tesoreria (3 meses)</h3>
        <p className="text-xs text-gray-500 mb-4">Basada en el flujo neto medio de los ultimos 3 meses ({formatearMoneda(Math.round(avgNetFlow))}/mes)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {forecast.map((f, i) => {
            const isNegative = f.saldo < 0
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 text-center ${
                  isNegative
                    ? 'border-[#ff1744]/40 bg-[#ff1744]/5'
                    : 'border-[#30363d] bg-[#0d1117]'
                }`}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{f.label}</p>
                <p className={`text-lg font-mono font-bold ${isNegative ? 'text-[#ff1744]' : 'text-[#40c4ff]'}`}>
                  {formatearMoneda(f.saldo)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ---- 6. Card explicativa ---- */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex gap-3">
        <Info className="w-5 h-5 text-[#40c4ff] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-400 leading-relaxed">
          En un supermercado, la tesoreria tiene una ventaja natural: se cobra al contado
          (efectivo y tarjeta) pero se paga a proveedores con 30-45 dias de plazo. Esta
          diferencia genera un colchon de liquidez que hay que gestionar bien.
        </p>
      </div>
    </div>
  )
}
