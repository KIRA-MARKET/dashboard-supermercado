import React, { useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

const COLOR_MAP = {
  green:  { text: 'text-[#00c853]', bg: 'bg-[#00c853]/15', ring: 'ring-[#00c853]/20' },
  amber:  { text: 'text-[#ffab00]', bg: 'bg-[#ffab00]/15', ring: 'ring-[#ffab00]/20' },
  red:    { text: 'text-[#ff1744]', bg: 'bg-[#ff1744]/15', ring: 'ring-[#ff1744]/20' },
  blue:   { text: 'text-[#40c4ff]', bg: 'bg-[#40c4ff]/15', ring: 'ring-[#40c4ff]/20' },
}

function formatValor(valor, formato) {
  if (valor == null) return '—'
  switch (formato) {
    case 'moneda':
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(valor)
    case 'porcentaje':
      return `${valor.toFixed(1)}%`
    case 'numero':
    default:
      return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(valor)
  }
}

export default function KPICard({
  titulo,
  valor,
  subtitulo,
  variacion,
  icono: Icon,
  color = 'green',
  tooltip,
  formato = 'numero',
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const c = COLOR_MAP[color] || COLOR_MAP.green

  const variacionPositiva = variacion != null && variacion >= 0
  const variacionColor = variacionPositiva ? 'text-[#00c853]' : 'text-[#ff1744]'

  return (
    <div
      className="
        relative bg-[#161b22] border border-[#30363d] rounded-xl p-5
        hover:border-[#484f58] transition-all duration-300
        animate-fade-in-up group
      "
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div
          className="
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            bg-[#1c2129] border border-[#30363d] rounded-lg px-3 py-2
            text-xs text-gray-400 max-w-[220px] text-center
            shadow-lg shadow-black/40
            animate-fade-in-up
          "
        >
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-[#1c2129] border-r border-b border-[#30363d] rotate-45" />
          </div>
        </div>
      )}

      {/* Header row: icon + variation */}
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-full ${c.bg} flex items-center justify-center ring-1 ${c.ring}`}>
          {Icon && <Icon className={`w-[18px] h-[18px] ${c.text}`} />}
        </div>

        {variacion != null && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${variacionColor}`}>
            {variacionPositiva
              ? <ArrowUp className="w-3.5 h-3.5" />
              : <ArrowDown className="w-3.5 h-3.5" />
            }
            <span className="font-mono">
              {variacionPositiva ? '+' : ''}{variacion.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className={`text-2xl font-mono font-bold ${c.text} leading-tight mb-1`}>
        {formatValor(valor, formato)}
      </div>

      {/* Title */}
      <div className="text-sm text-gray-300 font-medium">{titulo}</div>

      {/* Subtitle */}
      {subtitulo && (
        <div className="text-xs text-gray-500 mt-1">{subtitulo}</div>
      )}
    </div>
  )
}
