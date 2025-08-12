import { useSimulatorStore } from '../hooks/useSimulator'
import { useShallow } from 'zustand/react/shallow'
import { DatasetManager } from './DatasetManager'

export function Controls() {
  const { 
    isPlaying, 
    play, 
    pause, 
    step, 
    reset, 
    strategyName, 
    setStrategyName, 
    speedMs, 
    setSpeedMs, 
    currentIndex, 
    candles,
    availableStrategies,
    getCurrentStrategyConfig
  } = useSimulatorStore(
    useShallow((s) => ({
      isPlaying: s.isPlaying,
      play: s.play,
      pause: s.pause,
      step: s.step,
      reset: s.reset,
      strategyName: s.strategyName,
      setStrategyName: s.setStrategyName,
      speedMs: s.speedMs,
      setSpeedMs: s.setSpeedMs,
      currentIndex: s.currentIndex,
      candles: s.candles,
      availableStrategies: s.availableStrategies,
      getCurrentStrategyConfig: s.getCurrentStrategyConfig,
    })),
  )
  
  const currentStrategy = getCurrentStrategyConfig()

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 bg-gray-900/90 backdrop-blur rounded-lg border border-gray-800 p-3 pointer-events-auto">
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400" onClick={play} disabled={isPlaying}>
          ▶️ Play
        </button>
        <button className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400" onClick={pause} disabled={!isPlaying}>
          ⏸️ Pause
        </button>
        <button className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400" onClick={step}>
          ⏭️ Step
        </button>
        <button className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400" onClick={reset}>
          ⏹️ Reset
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Strategy</label>
        <select
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 min-w-[140px]"
          value={strategyName}
          onChange={(e) => setStrategyName(e.target.value as any)}
        >
          {availableStrategies.map((strategy) => (
            <option key={strategy.name} value={strategy.name}>
              {strategy.displayName}
            </option>
          ))}
        </select>
      </div>
      
      {currentStrategy && (
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400 max-w-[200px] truncate" title={currentStrategy.description}>
            {currentStrategy.description}
          </div>
        </div>
      )}
      <DatasetManager />
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Speed</label>
        <input
          className="w-40"
          type="range"
          min={100}
          max={2000}
          step={50}
          value={speedMs}
          onChange={(e) => setSpeedMs(Number(e.target.value))}
        />
        <span className="text-sm text-gray-400">{speedMs}ms</span>
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="h-2 bg-gray-800 rounded">
          <div
            className="h-2 bg-emerald-600 rounded transition-[width] duration-200"
            style={{ width: `${Math.min(100, Math.round(((currentIndex + 1) / Math.max(1, candles.length)) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  )
}


