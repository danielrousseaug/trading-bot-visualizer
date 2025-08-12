import { useEffect } from 'react'
import { Controls } from './components/Controls'
import { ChartPanel } from './components/Chart'
import { Portfolio } from './components/Portfolio'
import { Sidebar } from './components/Sidebar'
import { useSimulatorStore } from './hooks/useSimulator'
import './index.css'

function App() {
  useEffect(() => {
    const init = async () => {
      try {
        await useSimulatorStore.getState().initialize()
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }
    init()
  }, [])

  return (
    <div className="relative min-h-screen grid grid-rows-[auto_1fr_auto] md:grid-rows-[auto_1fr_auto] md:grid-cols-[minmax(0,1fr)_360px] gap-4 p-4">
      <div className="md:col-start-1 md:row-start-1 relative z-10">
        <Controls />
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-2 md:col-start-1 md:row-start-2 md:row-end-4 min-w-0 overflow-hidden">
        <ChartPanel />
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-2 md:col-start-2 md:row-start-1 md:row-end-3 min-w-0">
        <Sidebar />
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-2 md:col-span-2">
        <Portfolio />
      </div>
    </div>
  )
}

export default App
