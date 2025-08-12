import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { useMemo } from 'react'
import { useSimulatorStore } from '../hooks/useSimulator'
import { useShallow } from 'zustand/react/shallow'

const Plot = createPlotlyComponent(Plotly)

export function ChartPanel() {
  const { 
    candles, 
    currentIndex, 
    trades, 
    strategyName, 
    rsiSeries, 
    equitySeries, 
    macdSeries, 
    stochasticSeries, 
    getCurrentStrategyConfig 
  } = useSimulatorStore(
    useShallow((s) => ({
      candles: s.candles,
      currentIndex: s.currentIndex,
      trades: s.trades,
      strategyName: s.strategyName,
      rsiSeries: s.rsiSeries,
      equitySeries: s.equitySeries,
      macdSeries: s.macdSeries,
      stochasticSeries: s.stochasticSeries,
      getCurrentStrategyConfig: s.getCurrentStrategyConfig,
    })),
  )
  
  const strategyConfig = getCurrentStrategyConfig()

  const data = useMemo(() => {
    const slice = candles.slice(0, Math.max(1, currentIndex + 1))
    const times = slice.map((c) => c.timestamp)
    const open = slice.map((c) => c.open)
    const high = slice.map((c) => c.high)
    const low = slice.map((c) => c.low)
    const close = slice.map((c) => c.close)

    const tradeTimes = trades.map((t) => candles[t.index]?.timestamp)
    const tradePrices = trades.map((t) => candles[t.index]?.close)
    const tradeColors = trades.map((t) => (t.type === 'BUY' ? 'lime' : 'tomato'))
    const tradeTexts = trades.map((t) => `${t.type} @ $${t.price.toFixed(2)}\n${t.reason}`)

    const baseData: any[] = [
      {
        type: 'candlestick',
        x: times,
        open,
        high,
        low,
        close,
        name: 'OHLC',
        increasing: { line: { color: '#10b981' } },
        decreasing: { line: { color: '#ef4444' } },
      },
      {
        x: tradeTimes,
        y: tradePrices,
        type: 'scatter',
        mode: 'markers',
        name: 'Trades',
        marker: { color: tradeColors, size: 12, symbol: 'triangle-up', line: { width: 2, color: '#ffffff' } },
        text: tradeTexts,
        hoverinfo: 'text',
      },
    ]

    // Add strategy-specific indicators
    switch (strategyName) {
      case 'SMA_CROSSOVER':
        baseData.push(
          { x: times, y: slice.map(c => c.smaShort ?? null), type: 'scatter', mode: 'lines', name: 'SMA Short (10)', line: { color: '#60a5fa', width: 2 } },
          { x: times, y: slice.map(c => c.smaLong ?? null), type: 'scatter', mode: 'lines', name: 'SMA Long (20)', line: { color: '#f59e0b', width: 2 } }
        )
        break
      case 'EMA_CROSSOVER':
        baseData.push(
          { x: times, y: slice.map(c => c.emaShort ?? null), type: 'scatter', mode: 'lines', name: 'EMA Short (12)', line: { color: '#60a5fa', width: 2 } },
          { x: times, y: slice.map(c => c.emaLong ?? null), type: 'scatter', mode: 'lines', name: 'EMA Long (26)', line: { color: '#f59e0b', width: 2 } }
        )
        break
      case 'BOLLINGER_BANDS':
        baseData.push(
          { x: times, y: slice.map(c => c.bollingerUpper ?? null), type: 'scatter', mode: 'lines', name: 'BB Upper', line: { color: '#ef4444', width: 2, dash: 'dot' } },
          { x: times, y: slice.map(c => c.bollingerMiddle ?? null), type: 'scatter', mode: 'lines', name: 'BB Middle', line: { color: '#6b7280', width: 2 } },
          { x: times, y: slice.map(c => c.bollingerLower ?? null), type: 'scatter', mode: 'lines', name: 'BB Lower', line: { color: '#10b981', width: 2, dash: 'dot' } }
        )
        break
      case 'MEAN_REVERSION':
        baseData.push(
          { x: times, y: slice.map(c => c.bollingerMiddle ?? null), type: 'scatter', mode: 'lines', name: 'Mean (SMA 20)', line: { color: '#8b5cf6', width: 3 } }
        )
        break
    }

    return baseData
  }, [candles, currentIndex, trades, strategyName])

  const oscillatorData = useMemo(() => {
    const slice = rsiSeries.slice(0, Math.max(1, currentIndex + 1))
    const macdSlice = macdSeries.slice(0, Math.max(1, currentIndex + 1))
    const stochSlice = stochasticSeries.slice(0, Math.max(1, currentIndex + 1))
    
    switch (strategyName) {
      case 'RSI':
        return {
          data: [
            { x: slice.map(r => r.timestamp), y: slice.map(r => r.value), type: 'scatter', mode: 'lines', name: 'RSI', line: { color: '#a78bfa', width: 2 } },
            { x: [slice[0]?.timestamp, slice.at(-1)?.timestamp], y: [70, 70], type: 'scatter', mode: 'lines', name: 'Overbought (70)', line: { color: '#ef4444', dash: 'dot', width: 1 } },
            { x: [slice[0]?.timestamp, slice.at(-1)?.timestamp], y: [30, 30], type: 'scatter', mode: 'lines', name: 'Oversold (30)', line: { color: '#10b981', dash: 'dot', width: 1 } },
          ],
          title: 'RSI (Relative Strength Index)',
          yRange: [0, 100]
        }
      case 'MACD':
        return {
          data: [
            { x: macdSlice.map(m => m.timestamp), y: macdSlice.map(m => m.value), type: 'scatter', mode: 'lines', name: 'MACD Line', line: { color: '#60a5fa', width: 2 } },
            { x: macdSlice.map(m => m.timestamp), y: macdSlice.map(m => m.signal ?? 0), type: 'scatter', mode: 'lines', name: 'Signal Line', line: { color: '#f59e0b', width: 2 } },
            { x: macdSlice.map(m => m.timestamp), y: macdSlice.map(m => m.histogram ?? 0), type: 'bar', name: 'Histogram', marker: { color: macdSlice.map(m => (m.histogram ?? 0) >= 0 ? '#10b981' : '#ef4444') } },
          ],
          title: 'MACD (Moving Average Convergence Divergence)',
          yRange: undefined
        }
      case 'STOCHASTIC':
        return {
          data: [
            { x: stochSlice.map(s => s.timestamp), y: stochSlice.map(s => s.value), type: 'scatter', mode: 'lines', name: '%K', line: { color: '#60a5fa', width: 2 } },
            { x: stochSlice.map(s => s.timestamp), y: stochSlice.map(s => s.signal ?? 50), type: 'scatter', mode: 'lines', name: '%D', line: { color: '#f59e0b', width: 2 } },
            { x: [stochSlice[0]?.timestamp, stochSlice.at(-1)?.timestamp], y: [80, 80], type: 'scatter', mode: 'lines', name: 'Overbought (80)', line: { color: '#ef4444', dash: 'dot', width: 1 } },
            { x: [stochSlice[0]?.timestamp, stochSlice.at(-1)?.timestamp], y: [20, 20], type: 'scatter', mode: 'lines', name: 'Oversold (20)', line: { color: '#10b981', dash: 'dot', width: 1 } },
          ],
          title: 'Stochastic Oscillator',
          yRange: [0, 100]
        }
      default:
        return {
          data: [
            { x: slice.map(r => r.timestamp), y: slice.map(r => r.value), type: 'scatter', mode: 'lines', name: 'RSI', line: { color: '#a78bfa', width: 2 } },
            { x: [slice[0]?.timestamp, slice.at(-1)?.timestamp], y: [70, 70], type: 'scatter', mode: 'lines', name: 'Overbought (70)', line: { color: '#ef4444', dash: 'dot', width: 1 } },
            { x: [slice[0]?.timestamp, slice.at(-1)?.timestamp], y: [30, 30], type: 'scatter', mode: 'lines', name: 'Oversold (30)', line: { color: '#10b981', dash: 'dot', width: 1 } },
          ],
          title: 'RSI (Relative Strength Index)',
          yRange: [0, 100]
        }
    }
  }, [rsiSeries, macdSeries, stochasticSeries, currentIndex, strategyName])

  const equityData = useMemo(() => {
    const slice = equitySeries.slice(0, Math.max(1, currentIndex + 1))
    return [
      { x: slice.map((e) => e.timestamp), y: slice.map((e) => e.value), type: 'scatter', mode: 'lines', name: 'Equity', line: { color: '#34d399' } } as any,
    ]
  }, [equitySeries, currentIndex])

  return (
    <div className="space-y-4">
      <div className="h-[60vh] md:h-[56vh]" data-tour="main-chart">
        <Plot
          data={data as any}
          layout={{
            title: `${strategyConfig?.displayName || strategyName} — Price Action`,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e5e7eb' },
            margin: { t: 40, r: 16, b: 16, l: 56 },
            xaxis: { showgrid: true, gridcolor: '#1f2937' },
            yaxis: { showgrid: true, gridcolor: '#1f2937' },
            legend: { 
              x: 0, 
              y: 1, 
              bgcolor: 'rgba(0,0,0,0.8)', 
              bordercolor: '#374151',
              font: { size: 12 }
            },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
        />
      </div>
      
      {['RSI', 'MACD', 'STOCHASTIC'].includes(strategyName) && (
        <div className="h-[22vh] md:h-[20vh]" data-tour="oscillator-chart">
          <Plot
            data={oscillatorData.data as any}
            layout={{
              title: oscillatorData.title,
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              font: { color: '#e5e7eb' },
              margin: { t: 32, r: 16, b: 24, l: 56 },
              xaxis: { showgrid: true, gridcolor: '#1f2937' },
              yaxis: { showgrid: true, gridcolor: '#1f2937', range: oscillatorData.yRange },
              legend: { 
                x: 0, 
                y: 1, 
                bgcolor: 'rgba(0,0,0,0.8)', 
                bordercolor: '#374151',
                font: { size: 11 }
              },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
          />
        </div>
      )}
      
      <div className="h-[20vh]" data-tour="equity-chart">
        <Plot
          data={equityData as any}
          layout={{
            title: 'Portfolio Equity Curve',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e5e7eb' },
            margin: { t: 32, r: 16, b: 24, l: 56 },
            xaxis: { showgrid: true, gridcolor: '#1f2937' },
            yaxis: { showgrid: true, gridcolor: '#1f2937' },
            legend: { 
              x: 0, 
              y: 1, 
              bgcolor: 'rgba(0,0,0,0.8)', 
              bordercolor: '#374151',
              font: { size: 11 }
            },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
        />
      </div>
    </div>
  )
}


