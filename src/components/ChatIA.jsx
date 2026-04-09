import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2,
} from 'lucide-react';
import { formatearMoneda, nombreMes } from '../data/sampleData';

/* ── Suggested questions ────────────────────────────────────── */
const SUGERENCIAS = [
  'Por que ha bajado el margen este mes?',
  'Cuanto me cuesta realmente cada empleado?',
  'Cual es mi punto de equilibrio?',
  'Compara este trimestre con el del anio pasado',
  'Estoy pagando demasiado en luz?',
];

const SYSTEM_PROMPT = `Eres un analista financiero especializado en retail alimentario. Tienes acceso a los datos historicos del supermercado. Responde en espanol, de forma clara y directa. Usa cifras concretas de los datos proporcionados.

Cuando analices tendencias, compara meses anteriores. Si detectas problemas, sugiere acciones concretas. Evita ser generico: tus respuestas deben basarse en los numeros reales que tienes.`;

/* ── Main component ─────────────────────────────────────────── */
export default function ChatIA({ datos, todosLosDatos, periodoActual }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const apiKey = localStorage.getItem('anthropic_api_key') || '';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Send message ─────────────────────────────────────────── */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    if (!apiKey) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: 'Necesitas configurar tu API Key de Anthropic en la seccion "Carga de Documentos" antes de usar el chat.' },
      ]);
      return;
    }

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build context with all data
      const dataContext = JSON.stringify(todosLosDatos, null, 0);

      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

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
          max_tokens: 2048,
          system: `${SYSTEM_PROMPT}\n\nPeriodo actual: ${periodoActual}\n\nDatos historicos completos del supermercado:\n${dataContext}`,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Error API ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const assistantText = data.content?.[0]?.text || 'No he podido generar una respuesta.';

      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error al conectar con Claude: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, apiKey, todosLosDatos, periodoActual]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (text) => {
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] animate-fade-in-up">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Asistente IA{' '}
          <span className="text-gray-500 font-normal">— {periodoActual ? nombreMes(periodoActual) : ''}</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Pregunta lo que quieras sobre tus datos financieros. El asistente tiene acceso a todo el historico.
        </p>
      </div>

      {/* ── Suggested Questions ─────────────────────────────── */}
      {messages.length === 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Preguntas sugeridas:</p>
          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s)}
                className="
                  px-3 py-1.5 rounded-full text-xs
                  border border-[#30363d] bg-[#161b22] text-gray-400
                  hover:border-[#40c4ff] hover:text-[#40c4ff] hover:bg-[#40c4ff]/5
                  transition-all duration-200
                "
              >
                <Sparkles size={12} className="inline mr-1 -mt-0.5" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">Escribe una pregunta para empezar</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-xl px-4 py-3
                ${msg.role === 'user'
                  ? 'bg-[#1c2129] border border-[#30363d] text-gray-200'
                  : 'bg-[#161b22] border border-[#30363d] text-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                {msg.role === 'user'
                  ? <User size={14} className="text-gray-500" />
                  : <Bot size={14} className="text-[#40c4ff]" />
                }
                <span className="text-xs text-gray-500 font-medium">
                  {msg.role === 'user' ? 'Tu' : 'Asistente'}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-[#40c4ff] animate-spin" />
                <span className="text-xs text-gray-500">Analizando datos...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pregunta sobre tus datos financieros..."
          disabled={loading}
          className="
            flex-1 px-4 py-3 rounded-xl
            bg-[#161b22] border border-[#30363d] text-gray-200 text-sm
            placeholder-gray-600
            focus:outline-none focus:border-[#40c4ff]
            disabled:opacity-50
            transition
          "
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="
            px-4 py-3 rounded-xl
            bg-[#40c4ff]/10 border border-[#40c4ff]/30 text-[#40c4ff]
            hover:bg-[#40c4ff]/20
            disabled:opacity-30 disabled:cursor-not-allowed
            transition
          "
        >
          <Send size={18} />
        </button>
      </form>

      {!apiKey && (
        <p className="text-xs text-[#ffab00] mt-2">
          Configura tu API Key en "Carga de Documentos" para usar el chat.
        </p>
      )}
    </div>
  );
}
