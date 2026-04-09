import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, FileSpreadsheet, File, Eye, EyeOff,
  Loader2, CheckCircle2, AlertCircle, Trash2, Key,
} from 'lucide-react';
import { guardarPeriodo, guardarDocumento, obtenerDocumentos } from '../lib/db';

/* ── Constants ──────────────────────────────────────────────── */
const DOCUMENT_TYPES = [
  { value: 'gestoria', label: 'Informe de gestoria' },
  { value: 'nominas', label: 'Nominas / TC' },
  { value: 'extracto', label: 'Extracto bancario' },
  { value: 'tpv', label: 'Informe TPV' },
  { value: 'facturas', label: 'Facturas proveedores' },
  { value: 'inventario', label: 'Inventario' },
];

const ACCEPTED_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-excel': 'Excel',
  'text/csv': 'CSV',
};

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer datos financieros de documentos de supermercados en España.

Analiza el documento proporcionado y extrae los datos financieros en el siguiente formato JSON:

{
  "ventas": { "total": number, "ticketMedio": number, "numeroTickets": number },
  "compras": { "costeMercancia": number, "margenBruto": number, "margenBrutoPct": number },
  "personal": { "costeTotal": number, "salarioBruto": number, "cuotaEmpresaSS": number, "numEmpleados": number, "pctSobreVentas": number },
  "gastos": { "total": number, "suministros": number, "alquiler": number, "seguros": number, "gestoria": number, "otros": number },
  "tesoreria": { "saldoBancario": number, "cobros": number, "pagos": number },
  "resultado": { "bruto": number, "neto": number, "pctSobreVentas": number },
  "fiscal": { "ivaRepercutido": number, "ivaSoportado": number, "resultadoIVA": number, "irpfRetenido": number, "cuotasSS": number }
}

INSTRUCCIONES:
- Extrae SOLO los datos que aparezcan claramente en el documento
- Los campos que no puedas determinar, ponlos como null
- Los importes deben ser numeros (sin simbolos de moneda)
- El margenBrutoPct es un porcentaje (ej: 24.5 para 24.5%)
- Responde SOLO con el JSON, sin texto adicional
- Si el documento es parcial (ej: solo nominas), rellena solo las secciones relevantes`;

/* ── Helpers ─────────────────────────────────────────────────── */
function getFileIcon(type) {
  if (type?.includes('pdf')) return FileText;
  if (type?.includes('sheet') || type?.includes('excel') || type?.includes('csv')) return FileSpreadsheet;
  return File;
}

function getFileTypeLabel(mime) {
  return ACCEPTED_TYPES[mime] || 'Archivo';
}

/* ── Main component ─────────────────────────────────────────── */
export default function CargaDocumentos() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [docType, setDocType] = useState('gestoria');
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  const periodo = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('anthropic_api_key', apiKey);
    }
  }, [apiKey]);

  // Load history when period changes
  useEffect(() => {
    obtenerDocumentos(periodo).then(docs => setHistory(docs || []));
  }, [periodo]);

  /* ── File processing ──────────────────────────────────────── */
  const processFile = useCallback(async (file) => {
    if (!apiKey) {
      setError('Introduce tu API Key de Anthropic antes de procesar documentos.');
      return;
    }

    const mime = file.type;
    if (!ACCEPTED_TYPES[mime]) {
      setError(`Tipo de archivo no soportado: ${mime || file.name.split('.').pop()}. Usa PDF, Excel o CSV.`);
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setStatusText('Leyendo archivo...');

    try {
      let content;
      let apiContent;

      if (mime === 'application/pdf') {
        // Read as base64 for PDF
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        setStatusText('Enviando PDF a Claude...');
        apiContent = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Este documento es de tipo "${DOCUMENT_TYPES.find(t => t.value === docType)?.label}" para el periodo ${periodo}. Extrae los datos financieros.`,
          },
        ];
      } else {
        // Read as text for CSV/Excel
        content = await file.text();
        setStatusText('Enviando datos a Claude...');
        apiContent = [
          {
            type: 'text',
            text: `Este documento es de tipo "${DOCUMENT_TYPES.find(t => t.value === docType)?.label}" para el periodo ${periodo}.\n\nContenido del archivo (${getFileTypeLabel(mime)}):\n\n${content}\n\nExtrae los datos financieros.`,
          },
        ];
      }

      setStatusText('Procesando con IA...');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: apiContent }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`API error ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';

      setStatusText('Analizando respuesta...');

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta de Claude.');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      setResult(extractedData);
      setStatusText('Datos extraidos correctamente');

      // Save to IndexedDB
      await guardarPeriodo(periodo, extractedData);
      await guardarDocumento({
        periodo,
        tipo: docType,
        nombre: file.name,
        tamanio: file.size,
        datosExtraidos: extractedData,
      });

      // Refresh history
      const docs = await obtenerDocumentos(periodo);
      setHistory(docs || []);

    } catch (err) {
      setError(err.message);
      setStatusText('');
    } finally {
      setProcessing(false);
    }
  }, [apiKey, docType, periodo]);

  /* ── Drag & Drop handlers ─────────────────────────────────── */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <h1 className="text-xl font-semibold text-white tracking-tight">
        Carga de Documentos
      </h1>

      {/* ── API Key ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-gray-400" />
          <h3 className="text-white font-semibold text-lg">API Key de Anthropic</h3>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-300 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-[#40c4ff] transition"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          La clave se guarda en localStorage de tu navegador. No se envia a ningun servidor salvo la API de Anthropic.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Period Selector + Doc Type ─────────────────────── */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
          <h3 className="text-white font-semibold">Periodo y tipo</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mes</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-300 text-sm focus:outline-none focus:border-[#40c4ff]"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Anio</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-300 text-sm focus:outline-none focus:border-[#40c4ff]"
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de documento</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-300 text-sm focus:outline-none focus:border-[#40c4ff]"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-600">
            Periodo seleccionado: <strong className="text-gray-400">{periodo}</strong>
          </p>
        </div>

        {/* ── Drag & Drop Zone ──────────────────────────────── */}
        <div className="lg:col-span-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              rounded-xl border-2 border-dashed p-12 text-center cursor-pointer
              transition-all duration-300
              ${dragOver
                ? 'border-[#40c4ff] bg-[#40c4ff]/5'
                : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58] hover:bg-[#1c2129]'
              }
              ${processing ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {processing ? (
              <div className="space-y-4">
                <Loader2 size={40} className="mx-auto text-[#40c4ff] animate-spin" />
                <p className="text-sm text-[#40c4ff]">{statusText}</p>
              </div>
            ) : (
              <>
                <Upload size={40} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-300 font-medium mb-2">
                  Arrastra un archivo aqui o haz clic para seleccionar
                </p>
                <div className="flex justify-center gap-4 mb-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <FileText size={14} /> PDF
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <FileSpreadsheet size={14} /> Excel
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <File size={14} /> CSV
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  El archivo se enviara a la API de Claude para extraer los datos financieros
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[#ff1744]/40 bg-[#ff1744]/5">
          <AlertCircle size={18} className="text-[#ff1744] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      )}

      {/* ── Result Preview ──────────────────────────────────── */}
      {result && (
        <div className="rounded-xl border border-[#00c853]/30 bg-[#00c853]/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-[#00c853]" />
            <h3 className="text-[#00c853] font-semibold">Datos extraidos correctamente</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {result.ventas?.total != null && (
              <div>
                <p className="text-xs text-gray-500">Ventas</p>
                <p className="text-sm font-mono text-white">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(result.ventas.total)}
                </p>
              </div>
            )}
            {result.compras?.margenBrutoPct != null && (
              <div>
                <p className="text-xs text-gray-500">Margen Bruto</p>
                <p className="text-sm font-mono text-white">{result.compras.margenBrutoPct}%</p>
              </div>
            )}
            {result.personal?.costeTotal != null && (
              <div>
                <p className="text-xs text-gray-500">Coste Personal</p>
                <p className="text-sm font-mono text-white">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(result.personal.costeTotal)}
                </p>
              </div>
            )}
            {result.resultado?.neto != null && (
              <div>
                <p className="text-xs text-gray-500">Resultado Neto</p>
                <p className={`text-sm font-mono ${result.resultado.neto >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(result.resultado.neto)}
                </p>
              </div>
            )}
          </div>
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
              Ver JSON completo
            </summary>
            <pre className="mt-2 text-xs text-gray-400 bg-[#0d1117] rounded-lg p-4 overflow-x-auto border border-[#30363d]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* ── Upload History ──────────────────────────────────── */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
        <h3 className="text-white font-semibold text-lg mb-4">
          Documentos cargados — {periodo}
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No hay documentos cargados para este periodo.</p>
        ) : (
          <div className="space-y-2">
            {history.map((doc, i) => {
              const TypeIcon = getFileIcon(doc.nombre);
              return (
                <div
                  key={doc.id || i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#30363d] bg-[#0d1117]/50 hover:bg-[#1c2129] transition"
                >
                  <TypeIcon size={18} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{doc.nombre}</p>
                    <p className="text-xs text-gray-600">
                      {DOCUMENT_TYPES.find(t => t.value === doc.tipo)?.label || doc.tipo}
                      {doc.fechaCarga && ` — ${new Date(doc.fechaCarga).toLocaleString('es-ES')}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-600 font-mono">
                    {doc.tamanio ? `${(doc.tamanio / 1024).toFixed(0)} KB` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
