import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, BarChart3, Target, Table2, Calculator } from 'lucide-react';
import {
  formatearMoneda, formatearPct, nombreMes, nombreMesCorto, obtenerUltimosPeriodos
} from '../data/sampleData';

/* ── Custom Tooltip ─────────────────────────────────────────── */
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
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

/* ── Main component ─────────────────────────────────────────── */
export default function Ventas({ datos, todosLosDatos, periodoActual }) {

  /* 1. Monthly Sales Evolution (last 24 months) */
  const { evolutionData, prevYearData } = useMemo(() => {
    const ultimos24 = obtenerUltimosPeriodos(todosLosDatos, periodoActual, 24);
    const evol = ultimos24.map(d => {
      const mes = parseInt(d.periodo.split('-')[1], 10);
      const anio = parseInt(d.periodo.split('-')[0], 10);
      // Find same month previous year
      const prevKey = `${anio - 1}-${String(mes).padStart(2, '0')}`;
      const prev = todosLosDatos.find(x => x.periodo === prevKey);
      return {
        periodo: d.periodo,
        label: nombreMesCorto(d.periodo),
        ventas: d.ventas.total,
        ventasAnterior: prev ? prev.ventas.total : null,
      };
    });
    return { evolutionData: evol, prevYearData: null };
  }, [todosLosDatos, periodoActual]);

  /* 2. Year-over-Year Comparison */
  const yoyData = useMemo(() => {
    const byMonth = {};
    todosLosDatos.forEach(d => {
      const [anio, mesStr] = d.periodo.split('-');
      const mes = parseInt(mesStr, 10);
      if (!byMonth[mes]) byMonth[mes] = { mes, label: nombreMesCorto(d.periodo) };
      byMonth[mes][`y${anio}`] = d.ventas.total;
    });
    return Object.values(byMonth).sort((a, b) => a.mes - b.mes);
  }, [todosLosDatos]);

  const availableYears = useMemo(() => {
    const years = new Set(todosLosDatos.map(d => d.periodo.split('-')[0]));
    return Array.from(years).sort();
  }, [todosLosDatos]);

  const yearColors = { '2023': '#4a5568', '2024': '#00c853', '2025': '#40c4ff' };

  /* 3. Seasonality Pattern */
  const seasonalityData = useMemo(() => {
    const sums = {};
    const counts = {};
    todosLosDatos.forEach(d => {
      const mes = parseInt(d.periodo.split('-')[1], 10);
      sums[mes] = (sums[mes] || 0) + d.ventas.total;
      counts[mes] = (counts[mes] || 0) + 1;
    });
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const avg = sums[mes] ? sums[mes] / counts[mes] : 0;
      const isPeak = mes === 12 || mes === 4;
      const isValley = mes === 1 || mes === 2;
      return {
        mes,
        label: meses[i],
        promedio: Math.round(avg),
        fill: isPeak ? '#00c853' : isValley ? '#f44336' : '#40c4ff',
      };
    });
  }, [todosLosDatos]);

  /* 4. Key Metrics Table (last 12 months) */
  const tableData = useMemo(() => {
    const ultimos12 = obtenerUltimosPeriodos(todosLosDatos, periodoActual, 12);
    return ultimos12.map((d, idx) => {
      const [anio, mesStr] = d.periodo.split('-');
      const mes = parseInt(mesStr, 10);
      // MoM
      const prevMoM = idx > 0 ? ultimos12[idx - 1] : null;
      const varMoM = prevMoM ? ((d.ventas.total - prevMoM.ventas.total) / prevMoM.ventas.total) : null;
      // YoY
      const prevYoYKey = `${parseInt(anio, 10) - 1}-${mesStr}`;
      const prevYoY = todosLosDatos.find(x => x.periodo === prevYoYKey);
      const varYoY = prevYoY ? ((d.ventas.total - prevYoY.ventas.total) / prevYoY.ventas.total) : null;
      // Ventas/Día
      const ventasDia = d.ventas.ventasDiasHabiles;

      return {
        periodo: d.periodo,
        label: nombreMes(d.periodo),
        ventas: d.ventas.total,
        varMoM,
        varYoY,
        ticketMedio: d.ventas.ticketMedio,
        numTickets: d.ventas.numeroTickets,
        ventasDia,
      };
    });
  }, [todosLosDatos, periodoActual]);

  /* 5. Sales Projection */
  const projection = useMemo(() => {
    const currentYear = periodoActual.split('-')[0];
    const ytdData = todosLosDatos.filter(d => d.periodo.startsWith(currentYear));
    if (ytdData.length === 0) return null;
    const ytdTotal = ytdData.reduce((s, d) => s + d.ventas.total, 0);
    const avgMonthly = ytdTotal / ytdData.length;
    const projected = avgMonthly * 12;
    const monthsRemaining = 12 - ytdData.length;
    return {
      ytdTotal,
      avgMonthly,
      projected,
      monthsCounted: ytdData.length,
      monthsRemaining,
    };
  }, [todosLosDatos, periodoActual]);

  return (
    <div className="space-y-6">

      {/* 1. Monthly Sales Evolution */}
      <Card title="Evolucion Mensual de Ventas (24 meses)" icon={TrendingUp}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolutionData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00c853" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00c853" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 12 }} />
              <YAxis
                tickFormatter={v => formatearMoneda(v)}
                tick={{ fill: '#8b949e', fontSize: 12 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip formatter={formatearMoneda} />} />
              <Area
                type="monotone"
                dataKey="ventasAnterior"
                stroke="#4a5568"
                strokeDasharray="5 5"
                fill="none"
                name="Ano anterior"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="ventas"
                stroke="#00c853"
                strokeWidth={2}
                fill="url(#gradVentas)"
                name="Ventas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 2. Year-over-Year Comparison */}
      <Card title="Comparativa Interanual" icon={BarChart3}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yoyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 12 }} />
              <YAxis
                tickFormatter={v => formatearMoneda(v)}
                tick={{ fill: '#8b949e', fontSize: 12 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip formatter={formatearMoneda} />} />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                formatter={value => <span className="text-gray-300">{value}</span>}
              />
              {availableYears.map(year => (
                <Bar
                  key={year}
                  dataKey={`y${year}`}
                  name={year}
                  fill={yearColors[year] || '#8b949e'}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 3. Seasonality Pattern */}
      <Card title="Patron de Estacionalidad" icon={Target}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seasonalityData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 12 }} />
              <YAxis
                tickFormatter={v => formatearMoneda(v)}
                tick={{ fill: '#8b949e', fontSize: 12 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip formatter={formatearMoneda} />} />
              {seasonalityData.map((entry, i) => (
                <Bar
                  key={i}
                  dataKey="promedio"
                  name="Promedio"
                  data={[entry]}
                />
              ))}
              <Bar dataKey="promedio" name="Promedio mensual">
                {seasonalityData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-[#00c853]" /> Pico (Dic, Abr)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-[#f44336]" /> Valle (Ene, Feb)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-[#40c4ff]" /> Normal
          </span>
        </div>
      </Card>

      {/* 4. Key Metrics Table */}
      <Card title="Metricas Clave (12 meses)" icon={Table2}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363d] text-gray-400 text-left">
                <th className="py-3 px-2">Mes</th>
                <th className="py-3 px-2 text-right">Ventas</th>
                <th className="py-3 px-2 text-right">Var% MoM</th>
                <th className="py-3 px-2 text-right">Var% YoY</th>
                <th className="py-3 px-2 text-right">Ticket Medio</th>
                <th className="py-3 px-2 text-right">N Tickets</th>
                <th className="py-3 px-2 text-right">Ventas/Dia</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr
                  key={row.periodo}
                  className={`border-b border-[#30363d] ${i % 2 === 0 ? 'bg-[#161b22]' : 'bg-[#0d1117]'}`}
                >
                  <td className="py-2 px-2 text-gray-300">{row.label}</td>
                  <td className="py-2 px-2 text-right font-mono text-white">
                    {formatearMoneda(row.ventas)}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${
                    row.varMoM === null ? 'text-gray-500' :
                    row.varMoM >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {row.varMoM !== null ? formatearPct(row.varMoM) : '-'}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${
                    row.varYoY === null ? 'text-gray-500' :
                    row.varYoY >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {row.varYoY !== null ? formatearPct(row.varYoY) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-300">
                    {formatearMoneda(row.ticketMedio)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-300">
                    {row.numTickets.toLocaleString('es-ES')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-300">
                    {formatearMoneda(row.ventasDia)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Sales Projection */}
      {projection && (
        <Card title="Proyeccion de Ventas Anual" icon={Calculator}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">Acumulado YTD ({projection.monthsCounted} meses)</p>
              <p className="text-2xl font-bold font-mono text-white">
                {formatearMoneda(projection.ytdTotal)}
              </p>
            </div>
            <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">Media Mensual</p>
              <p className="text-2xl font-bold font-mono text-[#40c4ff]">
                {formatearMoneda(projection.avgMonthly)}
              </p>
            </div>
            <div className="rounded-lg border border-[#00c853]/30 bg-[#00c853]/5 p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">
                Proyeccion Anual ({projection.monthsRemaining} meses restantes)
              </p>
              <p className="text-2xl font-bold font-mono text-[#00c853]">
                {formatearMoneda(projection.projected)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Proyeccion lineal basada en la media mensual del periodo acumulado.
          </p>
        </Card>
      )}
    </div>
  );
}
