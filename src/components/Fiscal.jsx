import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Receipt, ArrowUpDown, Calendar, Table2, Info,
} from 'lucide-react';
import {
  formatearMoneda, formatearPct, nombreMes, nombreMesCorto,
} from '../data/sampleData';

/* ── Custom Tooltip ─────────────────────────────────────────── */
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {formatter ? formatter(entry.value) : formatearMoneda(entry.value)}
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

/* ── KPI mini card ──────────────────────────────────────────── */
function FiscalKPI({ label, valor, color = 'text-white', sub }) {
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-mono font-bold ${color}`}>{formatearMoneda(valor)}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ── Tax calendar helpers ───────────────────────────────────── */
function getNextDeadlines(periodoActual) {
  const [year, mm] = periodoActual.split('-').map(Number);
  const deadlines = [];

  // Quarterly IVA / IRPF deadlines (modelo 303/111)
  const quarterDates = [
    { q: 'T1', mes: 4, dia: 20, label: 'Mod. 303/111 — 1er Trimestre' },
    { q: 'T2', mes: 7, dia: 20, label: 'Mod. 303/111 — 2o Trimestre' },
    { q: 'T3', mes: 10, dia: 20, label: 'Mod. 303/111 — 3er Trimestre' },
    { q: 'T4', mes: 1, dia: 30, label: 'Mod. 303/111/390 — 4o Trimestre + Resumen anual', nextYear: true },
  ];

  quarterDates.forEach(({ q, mes, dia, label, nextYear }) => {
    const y = nextYear ? year + 1 : year;
    const date = new Date(y, mes - 1, dia);
    const refDate = new Date(year, mm - 1, 1);
    if (date >= refDate) {
      deadlines.push({ fecha: `${dia}/${String(mes).padStart(2, '0')}/${y}`, label, q });
    }
  });

  // Monthly SS (last business day of each month, simplified to 28th)
  for (let i = mm; i <= 12; i++) {
    deadlines.push({
      fecha: `28/${String(i).padStart(2, '0')}/${year}`,
      label: `Seguros Sociales — ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i-1]}`,
      q: 'SS',
    });
    if (deadlines.length >= 8) break;
  }

  return deadlines.slice(0, 8);
}

/* ── Main component ─────────────────────────────────────────── */
export default function Fiscal({ datos, todosLosDatos, periodoActual }) {
  if (!datos) {
    return (
      <div className="text-gray-500 text-center py-20">
        Selecciona un periodo con datos para ver el analisis fiscal.
      </div>
    );
  }

  const fiscal = datos.fiscal || {};
  const resultadoIVA = fiscal.resultadoIVA ?? 0;
  const esIngreso = resultadoIVA > 0;

  /* ── IVA Evolution data ───────────────────────────────────── */
  const evolutionData = useMemo(() => {
    return todosLosDatos.map(d => ({
      name: nombreMesCorto(d.periodo),
      repercutido: d.fiscal?.ivaRepercutido ?? 0,
      soportado: d.fiscal?.ivaSoportado ?? 0,
      resultado: (d.fiscal?.ivaRepercutido ?? 0) - (d.fiscal?.ivaSoportado ?? 0),
    }));
  }, [todosLosDatos]);

  /* ── Annual summary grouped by year ───────────────────────── */
  const annualTable = useMemo(() => {
    const byYear = {};
    todosLosDatos.forEach(d => {
      const [y, mm] = d.periodo.split('-');
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push({
        mes: parseInt(mm, 10),
        periodo: d.periodo,
        ivaRepercutido: d.fiscal?.ivaRepercutido ?? 0,
        ivaSoportado: d.fiscal?.ivaSoportado ?? 0,
        resultadoIVA: (d.fiscal?.ivaRepercutido ?? 0) - (d.fiscal?.ivaSoportado ?? 0),
        irpf: d.fiscal?.irpfRetenido ?? 0,
        ss: d.fiscal?.cuotasSS ?? 0,
      });
    });
    return byYear;
  }, [todosLosDatos]);

  const deadlines = useMemo(() => getNextDeadlines(periodoActual), [periodoActual]);

  const Q_COLORS = {
    T1: 'text-[#40c4ff]', T2: 'text-[#00c853]', T3: 'text-[#ffab00]', T4: 'text-[#ff1744]', SS: 'text-gray-400',
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <h1 className="text-xl font-semibold text-white tracking-tight">
        Analisis Fiscal{' '}
        <span className="text-gray-500 font-normal">— {nombreMes(periodoActual)}</span>
      </h1>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <FiscalKPI
          label="IVA Repercutido"
          valor={fiscal.ivaRepercutido ?? 0}
          color="text-[#00c853]"
          sub="Cobrado a clientes"
        />
        <FiscalKPI
          label="IVA Soportado"
          valor={fiscal.ivaSoportado ?? 0}
          color="text-[#ff1744]"
          sub="Pagado en compras y gastos"
        />
        <FiscalKPI
          label="Resultado IVA"
          valor={resultadoIVA}
          color={esIngreso ? 'text-[#ffab00]' : 'text-[#40c4ff]'}
          sub={esIngreso ? 'A ingresar en Hacienda' : 'A compensar'}
        />
        <FiscalKPI
          label="IRPF Retenido"
          valor={fiscal.irpfRetenido ?? 0}
          color="text-[#40c4ff]"
          sub="Retenciones a empleados"
        />
        <FiscalKPI
          label="Cuotas SS"
          valor={fiscal.cuotasSS ?? 0}
          color="text-gray-300"
          sub="Empresa + trabajador"
        />
      </div>

      {/* ── IVA Evolution Chart ─────────────────────────────── */}
      <Card title="Evolucion del IVA" icon={ArrowUpDown}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
              <Bar dataKey="repercutido" name="IVA Repercutido" fill="#00c853" opacity={0.8} radius={[3,3,0,0]} />
              <Bar dataKey="soportado" name="IVA Soportado" fill="#ff1744" opacity={0.8} radius={[3,3,0,0]} />
              <Line dataKey="resultado" name="Resultado IVA" stroke="#ffab00" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Tax Calendar ────────────────────────────────────── */}
        <Card title="Calendario Fiscal" icon={Calendar}>
          <div className="space-y-3">
            {deadlines.map((d, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-[#30363d] bg-[#0d1117]/50"
              >
                <div className={`text-xs font-mono font-bold mt-0.5 w-8 text-center ${Q_COLORS[d.q] || 'text-gray-400'}`}>
                  {d.q}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{d.label}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{d.fecha}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── IVA Note ────────────────────────────────────────── */}
        <Card title="Nota sobre tipos de IVA" icon={Info}>
          <div className="p-4 rounded-lg border border-[#40c4ff]/20 bg-[#40c4ff]/5">
            <p className="text-sm text-gray-300 leading-relaxed">
              En alimentacion conviven tipos de IVA del <strong className="text-white">0%</strong> (productos basicos),{' '}
              <strong className="text-white">4%</strong> (pan, leche, huevos, frutas, verduras, cereales, quesos),{' '}
              <strong className="text-white">10%</strong> (resto de alimentacion) y{' '}
              <strong className="text-white">21%</strong> (productos no alimentarios).
            </p>
            <p className="text-sm text-gray-400 mt-3">
              El tipo efectivo de un supermercado suele estar entre el <strong className="text-white">7% y el 9%</strong>,
              dependiendo de la proporcion de cada categoria en las ventas.
            </p>
          </div>
        </Card>
      </div>

      {/* ── Annual Tax Summary Table ────────────────────────── */}
      <Card title="Resumen Fiscal Anual" icon={Table2}>
        {Object.entries(annualTable).map(([year, meses]) => {
          let qAccum = { iva: 0, irpf: 0, ss: 0 };
          return (
            <div key={year} className="mb-8 last:mb-0">
              <h4 className="text-white font-semibold mb-3">{year}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Mes</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">IVA Reperc.</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">IVA Soport.</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Resultado IVA</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">IRPF Ret.</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Cuotas SS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meses.map((row, idx) => {
                      qAccum.iva += row.resultadoIVA;
                      qAccum.irpf += row.irpf;
                      qAccum.ss += row.ss;

                      const isQuarterEnd = row.mes % 3 === 0;
                      const rows = [];

                      rows.push(
                        <tr key={row.periodo} className="border-b border-[#30363d]/50 hover:bg-[#1c2129]">
                          <td className="py-2 px-3 text-gray-300">{nombreMesCorto(row.periodo)}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#00c853]">{formatearMoneda(row.ivaRepercutido)}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#ff1744]">{formatearMoneda(row.ivaSoportado)}</td>
                          <td className={`py-2 px-3 text-right font-mono ${row.resultadoIVA >= 0 ? 'text-[#ffab00]' : 'text-[#40c4ff]'}`}>
                            {formatearMoneda(row.resultadoIVA)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-gray-300">{formatearMoneda(row.irpf)}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-300">{formatearMoneda(row.ss)}</td>
                        </tr>
                      );

                      if (isQuarterEnd) {
                        rows.push(
                          <tr key={`q-${row.mes}`} className="bg-[#1c2129] border-b border-[#484f58]">
                            <td className="py-2 px-3 text-gray-400 font-semibold text-xs uppercase">
                              Subtotal T{row.mes / 3}
                            </td>
                            <td className="py-2 px-3" />
                            <td className="py-2 px-3" />
                            <td className="py-2 px-3 text-right font-mono font-semibold text-[#ffab00]">
                              {formatearMoneda(qAccum.iva)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-gray-300">
                              {formatearMoneda(qAccum.irpf)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-gray-300">
                              {formatearMoneda(qAccum.ss)}
                            </td>
                          </tr>
                        );
                        qAccum = { iva: 0, irpf: 0, ss: 0 };
                      }

                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
