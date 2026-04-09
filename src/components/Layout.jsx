import React, { useState } from 'react'
import {
  ShoppingCart,
  LayoutDashboard,
  TrendingUp,
  Users,
  PieChart,
  Wallet,
  Receipt,
  Calculator,
  Target,
  Upload,
  MessageSquare,
  History,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { key: 'ventas', label: 'Ventas', icon: TrendingUp },
  { key: 'personal', label: 'Personal', icon: Users },
  { key: 'margen', label: 'Margen Comercial', icon: PieChart },
  { key: 'tesoreria', label: 'Tesorería', icon: Wallet },
  { key: 'gastos', label: 'Gastos', icon: Receipt },
  { key: 'fiscal', label: 'Fiscal', icon: Calculator },
  { key: 'equilibrio', label: 'Punto de Equilibrio', icon: Target },
  { key: 'cargar', label: 'Cargar Datos', icon: Upload },
  { key: 'consultar-ia', label: 'Consultar IA', icon: MessageSquare },
  { key: 'historico', label: 'Histórico', icon: History },
]

export default function Layout({
  activeSection,
  onNavigate,
  children,
  periodoActual,
  onPeriodoChange,
  periodos = [],
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNav = (key) => {
    onNavigate(key)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-200 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-[#161b22] border-r border-[#30363d]
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#30363d]">
          <ShoppingCart className="w-6 h-6 text-[#00c853] flex-shrink-0" />
          <span className="text-lg font-semibold tracking-tight text-white">
            Panel de Control
          </span>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key
            return (
              <button
                key={key}
                onClick={() => handleNav(key)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                  transition-colors duration-150 relative group
                  ${
                    isActive
                      ? 'text-[#00c853] bg-[#00c853]/10'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c2129]'
                  }
                `}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#00c853]" />
                )}
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Period selector */}
        <div className="px-4 py-4 border-t border-[#30363d]">
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
            Periodo
          </label>
          <div className="relative">
            <select
              value={periodoActual}
              onChange={(e) => onPeriodoChange(e.target.value)}
              className="
                w-full appearance-none bg-[#0d1117] border border-[#30363d] rounded-md
                px-3 py-2 text-sm text-gray-300
                focus:outline-none focus:border-[#00c853]/50 focus:ring-1 focus:ring-[#00c853]/30
                transition-colors cursor-pointer
              "
            >
              {periodos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <ShoppingCart className="w-5 h-5 text-[#00c853]" />
          <span className="text-sm font-semibold text-white">Panel de Control</span>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
