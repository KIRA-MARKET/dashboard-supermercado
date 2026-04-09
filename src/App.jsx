import React, { useState, useMemo } from 'react'
import Layout from './components/Layout'
import { DATOS_EJEMPLO } from './data/sampleData'
import ResumenEjecutivo from './components/ResumenEjecutivo'
import Ventas from './components/Ventas'
import Personal from './components/Personal'
import MargenComercial from './components/MargenComercial'
import Tesoreria from './components/Tesoreria'
import Gastos from './components/Gastos'
import Fiscal from './components/Fiscal'
import PuntoEquilibrio from './components/PuntoEquilibrio'
import CargaDocumentos from './components/CargaDocumentos'
import ChatIA from './components/ChatIA'
import Historico from './components/Historico'

export default function App() {
  const [activeSection, setActiveSection] = useState('resumen')
  const [periodoActual, setPeriodoActual] = useState('2025-03')

  const periodos = useMemo(() => {
    return [...new Set(DATOS_EJEMPLO.map((d) => d.periodo))].sort().reverse()
  }, [])

  const datosActuales = useMemo(() => {
    return DATOS_EJEMPLO.find((d) => d.periodo === periodoActual) || null
  }, [periodoActual])

  const sectionProps = {
    datos: datosActuales,
    todosLosDatos: DATOS_EJEMPLO,
    periodoActual,
  }

  function renderSection() {
    switch (activeSection) {
      case 'resumen':
        return <ResumenEjecutivo {...sectionProps} />
      case 'ventas':
        return <Ventas {...sectionProps} />
      case 'personal':
        return <Personal {...sectionProps} />
      case 'margen':
        return <MargenComercial {...sectionProps} />
      case 'tesoreria':
        return <Tesoreria {...sectionProps} />
      case 'gastos':
        return <Gastos {...sectionProps} />
      case 'fiscal':
        return <Fiscal {...sectionProps} />
      case 'equilibrio':
        return <PuntoEquilibrio {...sectionProps} />
      case 'cargar':
        return <CargaDocumentos />
      case 'consultar-ia':
        return <ChatIA {...sectionProps} />
      case 'historico':
        return <Historico {...sectionProps} />
      default:
        return <ResumenEjecutivo {...sectionProps} />
    }
  }

  return (
    <Layout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      periodoActual={periodoActual}
      onPeriodoChange={setPeriodoActual}
      periodos={periodos}
    >
      {renderSection()}
    </Layout>
  )
}
