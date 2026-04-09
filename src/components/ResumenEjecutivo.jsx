import React from 'react'
import {
  TrendingUp,
  PieChart,
  Users,
  Landmark,
  CircleDollarSign,
  ShoppingCart,
  AlertTriangle,
  Info,
  AlertCircle,
  Shield,
} from 'lucide-react'
import KPICard from './KPICard'
import { formatearMoneda, formatearPct, nombreMes } from '../data/sampleData'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodoAnterior(periodoActual, todosLosDatos) {
  if (!todosLosDatos || todosLosDatos.length < 2) return null
  const idx = todosLosDatos.findIndex((d) => d.periodo === periodoActual)
  if (idx <= 0) return null
  return todosLosDatos[idx - 1]
}

function variacionPct(actual, anterior) {
  if (anterior == null || anterior === 0) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

// ---------------------------------------------------------------------------
// Health traffic light
// ---------------------------------------------------------------------------

function calcularSemaforo(datos) {
  if (!datos) return { color: 'gray', label: 'Sin datos', texto: '' }

  const margenPct = datos.compras?.margenBrutoPct ?? 0
  const personalPct = datos.personal?.pctSobreVentas ?? 0
  const neto = datos.resultado?.neto ?? 0

  const esRojo =
    neto < 0 || margenPct < 20

  const esVerde =
    neto > 0 && margenPct >= 22 && personalPct <= 18

  if (esRojo) {
    return {
      color: 'red',
      label: 'Atencion',
      texto:
        neto < 0
          ? `El resultado neto es negativo (${formatearMoneda(neto)}). Revisar gastos y margenes urgentemente.`
          : `El margen bruto (${formatearPct(margenPct)}) esta por debajo del 20%. Negociar con proveedores o revisar precios.`,
    }
  }

  if (esVerde) {
    return {
      color: 'green',
      label: 'Saludable',
      texto: `Resultado positivo, margen por encima del 22% y coste de personal controlado (${formatearPct(personalPct)}).`,
    }
  }

  // Amber — marginal
  const razones = []
  if (margenPct < 22) razones.push(`margen en ${formatearPct(margenPct)} (objetivo >= 22%)`)
  if (personalPct > 18) razones.push(`coste personal en ${formatearPct(personalPct)} (objetivo <= 18%)`)
  if (neto <= 0) razones.push('resultado neto neutro o negativo')

  return {
    color: 'amber',
    label: 'Vigilar',
    texto: `Indicadores en zona marginal: ${razones.join('; ')}.`,
  }
}

const SEMAFORO_STYLES = {
  green: { dot: 'bg-[#00c853]', border: 'border-[#00c853]/30', text: 'text-[#00c853]' },
  amber: { dot: 'bg-[#ffab00]', border: 'border-[#ffab00]/30', text: 'text-[#ffab00]' },
  red:   { dot: 'bg-[#ff1744]', border: 'border-[#ff1744]/30', text: 'text-[#ff1744]' },
  gray:  { dot: 'bg-gray-500',  border: 'border-gray-600',     text: 'text-gray-400' },
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

const ALERTA_STYLES = {
  danger:  { border: 'border-[#ff1744]/40', bg: 'bg-[#ff1744]/5',  text: 'text-[#ff1744]', Icon: AlertCircle },
  warning: { border: 'border-[#ffab00]/40', bg: 'bg-[#ffab00]/5',  text: 'text-[#ffab00]', Icon: AlertTriangle },
  info:    { border: 'border-[#40c4ff]/40', bg: 'bg-[#40c4ff]/5',  text: 'text-[#40c4ff]', Icon: Info },
}

// ---------------------------------------------------------------------------
// DAFO (SWOT)
// ---------------------------------------------------------------------------

const DAFO = [
  {
    titulo: 'Debilidades',
    color: 'text-[#ff1744]',
    bg: 'bg-[#ff1744]/5',
    border: 'border-[#ff1744]/30',
    items: [
      'Menor poder de compra frente a grandes cadenas',
      'Alta dependencia del personal clave',
      'Capacidad limitada de almacenamiento',
    ],
  },
  {
    titulo: 'Amenazas',
    color: 'text-[#ffab00]',
    bg: 'bg-[#ffab00]/5',
    border: 'border-[#ffab00]/30',
    items: [
      'Expansion de cadenas de descuento (Lidl, Aldi, Mercadona)',
      'Subida del coste energetico y de suministros',
      'Inflacion persistente que reduce el ticket medio',
    ],
  },
  {
    titulo: 'Fortalezas',
    color: 'text-[#00c853]',
    bg: 'bg-[#00c853]/5',
    border: 'border-[#00c853]/30',
    items: [
      'Proximidad y trato personalizado al cliente',
      'Frescura y rotacion diaria de producto perecedero',
      'Flexibilidad y rapidez en la toma de decisiones',
    ],
  },
  {
    titulo: 'Oportunidades',
    color: 'text-[#40c4ff]',
    bg: 'bg-[#40c4ff]/5',
    border: 'border-[#40c4ff]/30',
    items: [
      'Nicho de productos locales, ecologicos y gourmet',
      'Servicio de entrega a domicilio en el barrio',
      'Programas de fidelizacion y tarjeta de puntos',
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResumenEjecutivo({ datos, todosLosDatos, periodoActual }) {
  if (!datos) {
    return (
      <div className="text-gray-500 text-center py-20">
        Selecciona un periodo con datos para ver el resumen.
      </div>
    )
  }

  const anterior = getPeriodoAnterior(periodoActual, todosLosDatos)
  const semaforo = calcularSemaforo(datos)
  const ss = SEMAFORO_STYLES[semaforo.color]

  // Compute variations
  const vVentas      = variacionPct(datos.ventas?.total,           anterior?.ventas?.total)
  const vMargen      = variacionPct(datos.compras?.margenBruto,    anterior?.compras?.margenBruto)
  const vPersonal    = variacionPct(datos.personal?.costeTotal,    anterior?.personal?.costeTotal)
  const vTesoreria   = variacionPct(datos.tesoreria?.saldoBancario, anterior?.tesoreria?.saldoBancario)
  const vNeto        = variacionPct(datos.resultado?.neto,         anterior?.resultado?.neto)
  const vTicket      = variacionPct(datos.ventas?.ticketMedio,     anterior?.ventas?.ticketMedio)

  // Color logic for conditional cards
  const margenColor  = (datos.compras?.margenBrutoPct ?? 0) < 22 ? 'amber' : 'green'
  const personalPct  = datos.personal?.pctSobreVentas ?? 0
  const personalColor = personalPct > 18 ? 'red' : personalPct < 12 ? 'amber' : 'green'
  const netoColor    = (datos.resultado?.neto ?? 0) >= 0 ? 'green' : 'red'

  // Period display name
  const periodoLabel = periodoActual
    ? nombreMes(periodoActual)
    : periodoActual

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Resumen Ejecutivo{' '}
          <span className="text-gray-500 font-normal">
            — {periodoLabel}
          </span>
        </h1>
      </div>

      {/* ---- KPI Grid ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KPICard
          titulo="Ventas del Mes"
          valor={datos.ventas?.total}
          formato="moneda"
          variacion={vVentas}
          icono={TrendingUp}
          color="green"
          subtitulo={`${datos.ventas?.numeroTickets?.toLocaleString('es-ES') ?? '—'} tickets`}
          tooltip="Facturacion total del periodo (IVA incluido). Compara con el mes anterior para detectar tendencias."
        />

        <KPICard
          titulo="Margen Bruto Comercial"
          valor={datos.compras?.margenBruto}
          formato="moneda"
          variacion={vMargen}
          icono={PieChart}
          color={margenColor}
          subtitulo={`${formatearPct(datos.compras?.margenBrutoPct)} sobre ventas`}
          tooltip="Diferencia entre ventas y coste de mercancia. Objetivo: >= 22%. Por debajo indica presion en precios o exceso de mermas."
        />

        <KPICard
          titulo="Gasto de Personal"
          valor={datos.personal?.costeTotal}
          formato="moneda"
          variacion={vPersonal}
          icono={Users}
          color={personalColor}
          subtitulo={`${formatearPct(datos.personal?.pctSobreVentas)} sobre ventas`}
          tooltip="Coste total de nominas y SS. Rango saludable: 12-18% sobre ventas. Por encima requiere ajustar plantilla u horas."
        />

        <KPICard
          titulo="Posicion de Tesoreria"
          valor={datos.tesoreria?.saldoBancario}
          formato="moneda"
          variacion={vTesoreria}
          icono={Landmark}
          color="blue"
          subtitulo="Saldo bancario actual"
          tooltip="Liquidez disponible en cuentas bancarias. Indicador clave para afrontar pagos a proveedores y nominas."
        />

        <KPICard
          titulo="Resultado Neto"
          valor={datos.resultado?.neto}
          formato="moneda"
          variacion={vNeto}
          icono={CircleDollarSign}
          color={netoColor}
          subtitulo={`${formatearPct(datos.resultado?.pctSobreVentas)} sobre ventas`}
          tooltip="Beneficio o perdida tras todos los gastos. Verde = beneficio, rojo = perdida. Objetivo: mantener siempre en positivo."
        />

        <KPICard
          titulo="Ticket Medio"
          valor={datos.ventas?.ticketMedio}
          formato="moneda"
          variacion={vTicket}
          icono={ShoppingCart}
          color="green"
          subtitulo="Gasto medio por cliente"
          tooltip="Importe medio por ticket de compra. Subir el ticket medio es mas rentable que captar nuevos clientes."
        />
      </div>

      {/* ---- Health Traffic Light ---- */}
      <div className={`bg-[#161b22] border ${ss.border} rounded-xl p-5`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded-full ${ss.dot} shadow-lg animate-pulse`} />
            <span className={`text-sm font-semibold uppercase tracking-wider ${ss.text}`}>
              {semaforo.label}
            </span>
          </div>
          <Shield className={`w-5 h-5 ${ss.text} opacity-60`} />
        </div>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          {semaforo.texto}
        </p>
      </div>

      {/* ---- Alerts Panel ---- */}
      {datos.alertas && datos.alertas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Alertas
          </h2>
          <div className="space-y-2">
            {datos.alertas.map((alerta, i) => {
              const tipo = alerta.tipo || 'info'
              const st = ALERTA_STYLES[tipo] || ALERTA_STYLES.info
              const AlertIcon = st.Icon
              return (
                <div
                  key={i}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border
                    ${st.border} ${st.bg}
                    animate-fade-in-up
                  `}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <AlertIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${st.text}`} />
                  <span className="text-sm text-gray-300">{alerta.mensaje}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- DAFO (SWOT) ---- */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Analisis DAFO
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAFO.map((cuadrante) => (
            <div
              key={cuadrante.titulo}
              className={`
                ${cuadrante.bg} border ${cuadrante.border} rounded-xl p-4
              `}
            >
              <h3 className={`text-sm font-semibold ${cuadrante.color} mb-2`}>
                {cuadrante.titulo}
              </h3>
              <ul className="space-y-1.5">
                {cuadrante.items.map((item, j) => (
                  <li key={j} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${cuadrante.color.replace('text-', 'bg-')} flex-shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
