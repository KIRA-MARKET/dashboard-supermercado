import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Calendar, Table2, TrendingUp, ArrowUpDown, Download,
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
          {entry.name}: {typeof entry.value === 'number' && Math.abs(entry.value) > 1
            ? formatearMoneda(entry.value)
            : `${entry.value?.toFixed?.(1) ?? entry.value}%`}
        </p>
      ))}
    </div>
  );
}

/* ── Card wrapper ───────────────────────────────────────────── */
function Card({ title, icon: Icon, children, action }) {
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-gray-400" />}
          <h3 className="text-white font-semibold text-lg">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Metrics config ─────────────────────────────────────────── */
const METRICS = [
  { key: 'ventas', label: 'Ventas', color: '#00c853', getter: d => d.ventas?.total ?? 0 },
  { key: 'margenBruto', label: 'Margen Bruto', color: '#40c4ff', getter: d => d.compras?.margenBruto ?? 0 },
  { key: 'personal', label: 'Personal', color: '#ffab00', getter: d => d.personal?.costeTotal ?? 0 },
  { key: 'neto', label: 'Resultado Neto', color: '#ff1744', getter: d => d.resultado?.neto ?? 0 },
];

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/* ── Color cell helper ──────────────────────────────────────── */
function colorCell(value, metric) {
  if (value == null) return 'text-gray-600';
  if (metric === 'neto' || metric === 'ventas' || metric === 'margenBruto') {
    return value >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]';
  }
  return 'text-gray-300';
}

function pctChangeColor(pct) {
  if (pct == null) return 'text-gray-600';
  return pct >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]';
}

/* ── Main component ─────────────────────────────────────────── */
export default function Historico({ datos, todosLosDatos, periodoActual }) {
  const [visibleMetrics, setVisibleMetrics] = useState(['ventas', 'neto']);
  const [selectedYear, setSelectedYear] = useState(null);

  if (!todosLosDatos || todosLosDatos.length === 0) {
    return (
      <div className="text-gray-500 text-center py-20">
        No hay datos historicos disponibles.
      </div>
    );
  }

  /* ── Available years ──────────────────────────────────────── */
  const years = useMemo(() => {
    const set = new Set(todosLosDatos.map(d => d.periodo.split('-')[0]));
    return [...set].sort();
  }, [todosLosDatos]);

  /* ── 12-month tables by year ──────────────────────────────── */
  const yearData = useMemo(() => {
    const byYear = {};
    todosLosDatos.forEach(d => {
      const [y] = d.periodo.split('-');
      if (!byYear[y]) byYear[y] = {};
      const m = parseInt(d.periodo.split('-')[1], 10);
      byYear[y][m] = d;
    });
    return byYear;
  }, [todosLosDatos]);

  /* ── Year-over-year KPI comparison ────────────────────────── */
  const annualKPIs = useMemo(() => {
    const result = {};
    years.forEach(y => {
      const yearPeriods = todosLosDatos.filter(d => d.periodo.startsWith(y));
      result[y] = {
        ventas: yearPeriods.reduce((s, d) => s + (d.ventas?.total ?? 0), 0),
        margenBruto: yearPeriods.reduce((s, d) => s + (d.compras?.margenBruto ?? 0), 0),
        personal: yearPeriods.reduce((s, d) => s + (d.personal?.costeTotal ?? 0), 0),
        gastos: yearPeriods.reduce((s, d) => s + (d.gastos?.total ?? 0), 0),
        neto: yearPeriods.reduce((s, d) => s + (d.resultado?.neto ?? 0), 0),
        meses: yearPeriods.length,
      };
      // Average margin %
      const avgMarginPct = yearPeriods.reduce((s, d) => s + (d.compras?.margenBrutoPct ?? 0), 0) / yearPeriods.length;
      result[y].margenPct = avgMarginPct;
      const avgPersonalPct = yearPeriods.reduce((s, d) => s + (d.personal?.pctSobreVentas ?? 0), 0) / yearPeriods.length;
      result[y].personalPct = avgPersonalPct;
    });
    return result;
  }, [todosLosDatos, years]);

  /* ── Multi-year trend chart data ──────────────────────────── */
  const trendData = useMemo(() => {
    return todosLosDatos.map(d => {
      const row = { name: nombreMesCorto(d.periodo) };
      METRICS.forEach(m => { row[m.key] = m.getter(d); });
      return row;
    });
  }, [todosLosDatos]);

  const toggleMetric = (key) => {
    setVisibleMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const displayYears = selectedYear ? [selectedYear] : years;

  const TABLE_ROWS = [
    { label: 'Ventas', getter: d => d?.ventas?.total, format: v => formatearMoneda(v), metric: 'ventas' },
    { label: 'Margen Bruto', getter: d => d?.compras?.margenBruto, format: v => formatearMoneda(v), metric: 'margenBruto' },
    { label: 'Margen %', getter: d => d?.compras?.margenBrutoPct, format: v => formatearPct(v), metric: 'pct' },
    { label: 'Personal', getter: d => d?.personal?.costeTotal, format: v => formatearMoneda(v), metric: 'personal' },
    { label: 'Personal %', getter: d => d?.personal?.pctSobreVentas, format: v => formatearPct(v), metric: 'pct' },
    { label: 'Gastos Fijos', getter: d => d?.gastos?.total, format: v => formatearMoneda(v), metric: 'gastos' },
    { label: 'Resultado Neto', getter: d => d?.resultado?.neto, format: v => formatearMoneda(v), metric: 'neto' },
    { label: 'Resultado %', getter: d => d?.resultado?.pctSobreVentas, format: v => formatearPct(v), metric: 'pct' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Historico y Comparativas
        </h1>

        {/* Year filter */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <select
            value={selectedYear || ''}
            onChange={e => setSelectedYear(e.target.value || null)}
            className="px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-300 text-sm focus:outline-none focus:border-[#40c4ff]"
          >
            <option value="">Todos los anios</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── 12-Month Comparison Table ───────────────────────── */}
      {displayYears.map(year => (
        <Card key={year} title={`Detalle Mensual ${year}`} icon={Table2}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium sticky left-0 bg-[#161b22] z-10 min-w-[110px]">
                    Concepto
                  </th>
                  {MESES_CORTO.map((m, i) => (
                    <th key={i} className="text-right py-2 px-2 text-gray-500 font-medium text-xs min-w-[70px]">{m}</th>
                  ))}
                  <th className="text-right py-2 px-2 text-gray-400 font-semibold text-xs min-w-[90px]">Total/Media</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, ri) => {
                  const values = Array.from({ length: 12 }, (_, i) => {
                    const d = yearData[year]?.[i + 1];
                    return d ? row.getter(d) : null;
                  });
                  const validValues = values.filter(v => v != null);
                  const isPercent = row.metric === 'pct';
                  const summary = validValues.length > 0
                    ? isPercent
                      ? validValues.reduce((s, v) => s + v, 0) / validValues.length
                      : validValues.reduce((s, v) => s + v, 0)
                    : null;

                  return (
                    <tr
                      key={ri}
                      className={`border-b border-[#30363d]/30 hover:bg-[#1c2129] ${
                        row.label === 'Resultado Neto' ? 'bg-[#1c2129]/50' : ''
                      }`}
                    >
                      <td className="py-2 px-2 text-gray-300 font-medium text-xs sticky left-0 bg-[#161b22] z-10">
                        {row.label}
                      </td>
                      {values.map((v, i) => (
                        <td
                          key={i}
                          className={`py-2 px-2 text-right font-mono text-xs ${
                            v == null ? 'text-gray-700' : colorCell(v, row.metric)
                          }`}
                        >
                          {v == null ? '—' : isPercent ? `${v.toFixed(1)}%` : `${(v / 1000).toFixed(1)}k`}
                        </td>
                      ))}
                      <td className={`py-2 px-2 text-right font-mono text-xs font-semibold ${
                        summary == null ? 'text-gray-700' : colorCell(summary, row.metric)
                      }`}>
                        {summary == null ? '—' : row.format(summary)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* ── Year-over-Year KPI Comparison ───────────────────── */}
      <Card title="Comparativa Anual de KPIs" icon={ArrowUpDown}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">KPI</th>
                {years.map(y => (
                  <th key={y} className="text-right py-2 px-3 text-gray-500 font-medium">{y}{annualKPIs[y]?.meses < 12 ? ` (${annualKPIs[y].meses}m)` : ''}</th>
                ))}
                {years.length >= 2 && (
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Var. interanual</th>
                )}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Ventas', key: 'ventas', isMoney: true },
                { label: 'Margen Bruto', key: 'margenBruto', isMoney: true },
                { label: 'Margen %', key: 'margenPct', isMoney: false, isPct: true },
                { label: 'Personal', key: 'personal', isMoney: true },
                { label: 'Personal %', key: 'personalPct', isMoney: false, isPct: true },
                { label: 'Resultado Neto', key: 'neto', isMoney: true },
              ].map(({ label, key, isMoney, isPct }) => {
                const vals = years.map(y => annualKPIs[y]?.[key] ?? null);
                const lastTwo = vals.slice(-2);
                const varPct = lastTwo.length === 2 && lastTwo[0] && lastTwo[0] !== 0
                  ? ((lastTwo[1] - lastTwo[0]) / Math.abs(lastTwo[0])) * 100
                  : null;

                return (
                  <tr key={key} className="border-b border-[#30363d]/30 hover:bg-[#1c2129]">
                    <td className="py-2 px-3 text-gray-300 font-medium">{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="py-2 px-3 text-right font-mono text-gray-300">
                        {v == null ? '—' : isMoney ? formatearMoneda(v) : isPct ? formatearPct(v) : v}
                      </td>
                    ))}
                    {years.length >= 2 && (
                      <td className={`py-2 px-3 text-right font-mono font-semibold ${pctChangeColor(varPct)}`}>
                        {varPct == null ? '—' : `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%`}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Multi-Year Trend Charts ─────────────────────────── */}
      <Card
        title="Tendencias Historicas"
        icon={TrendingUp}
        action={
          <div className="flex gap-2">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-medium transition-all
                  ${visibleMetrics.includes(m.key)
                    ? 'border border-current opacity-100'
                    : 'border border-[#30363d] text-gray-600 opacity-50 hover:opacity-80'
                  }
                `}
                style={visibleMetrics.includes(m.key) ? { color: m.color, borderColor: m.color, backgroundColor: `${m.color}10` } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} interval={2} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
              {METRICS.filter(m => visibleMetrics.includes(m.key)).map(m => (
                <Line
                  key={m.key}
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Export button (placeholder) ─────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={() => {}}
          className="
            flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-[#161b22] border border-[#30363d] text-gray-400
            hover:border-[#484f58] hover:text-gray-300
            transition-all duration-200
            cursor-not-allowed opacity-60
          "
          title="Proximamente"
        >
          <Download size={16} />
          <span className="text-sm">Exportar a PDF</span>
        </button>
      </div>
    </div>
  );
}
