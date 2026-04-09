import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Target, TrendingUp, SlidersHorizontal, Table2,
} from 'lucide-react';
import {
  formatearMoneda, formatearPct, nombreMes, nombreMesCorto,
} from '../data/sampleData';

/* ── Custom Tooltip ─────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {typeof entry.value === 'number' && Math.abs(entry.value) > 10
            ? formatearMoneda(entry.value)
            : `${entry.value?.toFixed?.(1) ?? entry.value}%`}
        </p>
      ))}
    </div>
  );
}

/* ── Card wrapper ───────────────────────────────────────────── */
function Card({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={18} className="text-gray-400" />}
        <h3 className="text-white font-semibold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── Gauge visual ───────────────────────────────────────────── */
function BreakEvenGauge({ ventas, puntoEquilibrio }) {
  const pct = puntoEquilibrio > 0 ? Math.min((ventas / puntoEquilibrio) * 100, 200) : 0;
  const overBreakEven = ventas >= puntoEquilibrio;
  const barColor = overBreakEven ? 'bg-[#00c853]' : 'bg-[#ff1744]';
  const markerPos = Math.min(pct, 100);

  return (
    <div className="space-y-2">
      <div className="relative h-6 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
        <div
          className={`h-full ${barColor} transition-all duration-700 rounded-full`}
          style={{ width: `${markerPos}%` }}
        />
        {/* Break-even marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-[#ffab00]"
          style={{ left: `${Math.min(100, (puntoEquilibrio / Math.max(ventas, puntoEquilibrio) * 100))}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span className="text-[#ffab00] font-mono">PE: {formatearMoneda(puntoEquilibrio)}</span>
        <span>{formatearMoneda(Math.max(ventas, puntoEquilibrio))}</span>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function PuntoEquilibrio({ datos, todosLosDatos, periodoActual }) {
  const [deltaVentas, setDeltaVentas] = useState(0);
  const [nuevoMargen, setNuevoMargen] = useState(null);

  if (!datos) {
    return (
      <div className="text-gray-500 text-center py-20">
        Selecciona un periodo con datos para ver el analisis de rentabilidad.
      </div>
    );
  }

  const ventas = datos.ventas?.total ?? 0;
  const margenPct = datos.compras?.margenBrutoPct ?? 24;

  /* ── Break-even calculation ───────────────────────────────── */
  const costesFijos = useMemo(() => {
    const g = datos.gastos || {};
    // Fixed costs: rent, insurance, accounting, ~70% of personnel (fixed base)
    const personalFijo = Math.round((datos.personal?.costeTotal ?? 0) * 0.7);
    return (g.alquiler ?? 0) + (g.seguros ?? 0) + (g.gestoria ?? 0) + personalFijo;
  }, [datos]);

  const puntoEquilibrio = margenPct > 0 ? Math.round(costesFijos / (margenPct / 100)) : 0;
  const colchon = ventas - puntoEquilibrio;

  /* ── Profitability evolution ──────────────────────────────── */
  const profitData = useMemo(() => {
    return todosLosDatos.map(d => ({
      name: nombreMesCorto(d.periodo),
      neto: d.resultado?.neto ?? 0,
      pct: d.resultado?.pctSobreVentas ?? 0,
    }));
  }, [todosLosDatos]);

  /* ── Year-over-year table ─────────────────────────────────── */
  const yoyTable = useMemo(() => {
    const byYear = {};
    todosLosDatos.forEach(d => {
      const [y] = d.periodo.split('-');
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push({
        mes: parseInt(d.periodo.split('-')[1], 10),
        neto: d.resultado?.neto ?? 0,
        pct: d.resultado?.pctSobreVentas ?? 0,
      });
    });
    return byYear;
  }, [todosLosDatos]);

  /* ── Simulator ────────────────────────────────────────────── */
  const margenSim = nuevoMargen ?? margenPct;
  const ventasSim = Math.round(ventas * (1 + deltaVentas / 100));
  const margenBrutoSim = Math.round(ventasSim * (margenSim / 100));
  const costesVariables = (datos.compras?.costeMercancia ?? 0) * (ventasSim / ventas);
  const personalTotal = datos.personal?.costeTotal ?? 0;
  const gastosTotal = datos.gastos?.total ?? 0;
  const netoSim = Math.round(margenBrutoSim - personalTotal - gastosTotal);
  const netoActual = datos.resultado?.neto ?? 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <h1 className="text-xl font-semibold text-white tracking-tight">
        Punto de Equilibrio y Rentabilidad{' '}
        <span className="text-gray-500 font-normal">— {nombreMes(periodoActual)}</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Break-Even Card ─────────────────────────────────── */}
        <Card title="Punto de Equilibrio" icon={Target}>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-mono font-bold text-[#ffab00]">
                {formatearMoneda(puntoEquilibrio)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Necesitas vender <strong className="text-white">{formatearMoneda(puntoEquilibrio)}</strong> al mes
                solo para cubrir costes fijos
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Costes fijos estimados: {formatearMoneda(costesFijos)} / Margen: {formatearPct(margenPct)}
              </p>
            </div>

            <BreakEvenGauge ventas={ventas} puntoEquilibrio={puntoEquilibrio} />
          </div>
        </Card>

        {/* ── Margin Above Break-Even ─────────────────────────── */}
        <Card title="Colchon sobre Punto de Equilibrio" icon={TrendingUp}>
          <div className="space-y-6">
            <div className="text-center">
              <p className={`text-4xl font-mono font-bold ${colchon >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                {colchon >= 0 ? '+' : ''}{formatearMoneda(colchon)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {colchon >= 0
                  ? `Vendes un ${((colchon / puntoEquilibrio) * 100).toFixed(0)}% por encima del punto de equilibrio`
                  : `Te faltan ${formatearMoneda(Math.abs(colchon))} para alcanzar el equilibrio`}
              </p>
            </div>

            {/* Visual bar */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">Ventas</span>
                <div className="flex-1 h-4 bg-[#0d1117] rounded-full border border-[#30363d] overflow-hidden">
                  <div
                    className="h-full bg-[#00c853] rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono w-20 text-right">{formatearMoneda(ventas)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">Pto. Eq.</span>
                <div className="flex-1 h-4 bg-[#0d1117] rounded-full border border-[#30363d] overflow-hidden">
                  <div
                    className="h-full bg-[#ffab00] rounded-full"
                    style={{ width: `${puntoEquilibrio > 0 ? Math.min((puntoEquilibrio / ventas) * 100, 100) : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono w-20 text-right">{formatearMoneda(puntoEquilibrio)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Profitability Evolution ──────────────────────────── */}
      <Card title="Evolucion de Rentabilidad" icon={TrendingUp}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
              <ReferenceLine yAxisId="left" y={0} stroke="#484f58" strokeDasharray="3 3" />
              <Line yAxisId="left" dataKey="neto" name="Resultado Neto" stroke="#00c853" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" dataKey="pct" name="% sobre Ventas" stroke="#40c4ff" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Year-over-Year Table ─────────────────────────────── */}
      <Card title="Comparativa Anual de Resultados" icon={Table2}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Anio</th>
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(m => (
                  <th key={m} className="text-right py-2 px-3 text-gray-500 font-medium text-xs">{m}</th>
                ))}
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(yoyTable).map(([year, meses]) => {
                const total = meses.reduce((s, m) => s + m.neto, 0);
                return (
                  <tr key={year} className="border-b border-[#30363d]/50 hover:bg-[#1c2129]">
                    <td className="py-2 px-3 text-gray-300 font-semibold">{year}</td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const mes = meses.find(m => m.mes === i + 1);
                      if (!mes) return <td key={i} className="py-2 px-3 text-right text-gray-600">—</td>;
                      return (
                        <td
                          key={i}
                          className={`py-2 px-3 text-right font-mono text-xs ${
                            mes.neto >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'
                          }`}
                        >
                          {(mes.neto / 1000).toFixed(1)}k
                        </td>
                      );
                    })}
                    <td className={`py-2 px-3 text-right font-mono font-semibold ${total >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                      {formatearMoneda(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Simple Simulator ────────────────────────────────── */}
      <Card title="Simulador de Escenarios" icon={SlidersHorizontal}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Variacion de ventas: <span className="text-white font-mono">{deltaVentas >= 0 ? '+' : ''}{deltaVentas}%</span>
              </label>
              <input
                type="range"
                min={-30}
                max={30}
                value={deltaVentas}
                onChange={e => setDeltaVentas(Number(e.target.value))}
                className="w-full h-2 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#40c4ff]"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>-30%</span>
                <span>0%</span>
                <span>+30%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Margen bruto: <span className="text-white font-mono">{margenSim.toFixed(1)}%</span>
              </label>
              <input
                type="range"
                min={15}
                max={35}
                step={0.5}
                value={margenSim}
                onChange={e => setNuevoMargen(Number(e.target.value))}
                className="w-full h-2 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#ffab00]"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>15%</span>
                <span>{formatearPct(margenPct)} actual</span>
                <span>35%</span>
              </div>
            </div>

            <button
              onClick={() => { setDeltaVentas(0); setNuevoMargen(null); }}
              className="text-xs text-gray-500 hover:text-gray-300 underline transition"
            >
              Resetear valores
            </button>
          </div>

          {/* Current vs Simulated */}
          <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-5">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Actual</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Ventas</span>
                <span className="text-sm font-mono text-gray-300">{formatearMoneda(ventas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Margen</span>
                <span className="text-sm font-mono text-gray-300">{formatearPct(margenPct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Margen bruto</span>
                <span className="text-sm font-mono text-gray-300">{formatearMoneda(datos.compras?.margenBruto ?? 0)}</span>
              </div>
              <hr className="border-[#30363d]" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-400 font-semibold">Resultado Neto</span>
                <span className={`text-sm font-mono font-bold ${netoActual >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                  {formatearMoneda(netoActual)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#40c4ff]/30 bg-[#40c4ff]/5 p-5">
            <h4 className="text-xs text-[#40c4ff] uppercase tracking-wider mb-4">Simulado</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Ventas</span>
                <span className="text-sm font-mono text-white">{formatearMoneda(ventasSim)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Margen</span>
                <span className="text-sm font-mono text-white">{formatearPct(margenSim)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Margen bruto</span>
                <span className="text-sm font-mono text-white">{formatearMoneda(margenBrutoSim)}</span>
              </div>
              <hr className="border-[#40c4ff]/20" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-400 font-semibold">Resultado Neto</span>
                <span className={`text-sm font-mono font-bold ${netoSim >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                  {formatearMoneda(netoSim)}
                </span>
              </div>
              {netoSim !== netoActual && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Diferencia</span>
                  <span className={`text-xs font-mono ${netoSim > netoActual ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                    {netoSim > netoActual ? '+' : ''}{formatearMoneda(netoSim - netoActual)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
