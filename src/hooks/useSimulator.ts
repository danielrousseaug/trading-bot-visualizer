import { create } from 'zustand'
import Papa from 'papaparse'

export type Candle = {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  smaShort?: number
  smaLong?: number
  emaShort?: number
  emaLong?: number
  macdLine?: number
  macdSignal?: number
  macdHistogram?: number
  bollingerUpper?: number
  bollingerMiddle?: number
  bollingerLower?: number
  stochK?: number
  stochD?: number
}

export type RsiPoint = { timestamp: string; value: number }
export type EquityPoint = { timestamp: string; value: number }

type Trade = { index: number; type: 'BUY' | 'SELL'; price: number; reason: string }

type StrategyName = 'SMA_CROSSOVER' | 'EMA_CROSSOVER' | 'RSI' | 'MACD' | 'BOLLINGER_BANDS' | 'STOCHASTIC' | 'MEAN_REVERSION' | 'BUY_AND_HOLD'

export type StrategyConfig = {
  name: StrategyName
  displayName: string
  description: string
  parameters: Record<string, number>
  indicators: string[]
}

export type IndicatorSeries = { 
  timestamp: string; 
  value: number; 
  signal?: number;
  histogram?: number;
  upper?: number;
  lower?: number;
}

export type Dataset = {
  id: string
  name: string
  description: string
  category: 'stock' | 'crypto' | 'index' | 'custom'
  path?: string
  data?: string
  dateRange?: { start: string; end: string }
  recordCount?: number
}

export type DatasetCategory = {
  id: string
  name: string
  datasets: Dataset[]
}

export type SimulatorState = {
  candles: Candle[]
  rsiSeries: RsiPoint[]
  equitySeries: EquityPoint[]
  trades: Trade[]
  currentIndex: number
  isPlaying: boolean
  speedMs: number
  cash: number
  shares: number
  lastExplanation: string
  strategyName: StrategyName
  portfolioValue: number
  currentDataset: Dataset | null
  availableDatasets: DatasetCategory[]
  availableStrategies: StrategyConfig[]
  isLoadingDataset: boolean
  datasetError: string | null
  macdSeries: IndicatorSeries[]
  stochasticSeries: IndicatorSeries[]
  bollingerSeries: IndicatorSeries[]
  initialize: () => void
  loadFromCsvText: (text: string, dataset?: Partial<Dataset>) => void
  loadDataset: (dataset: Dataset) => Promise<void>
  uploadCustomDataset: (file: File) => Promise<void>
  play: () => void
  pause: () => void
  step: () => void
  reset: () => void
  setStrategyName: (n: StrategyName) => void
  setSpeedMs: (ms: number) => void
  getCurrentStrategyConfig: () => StrategyConfig | undefined
}

function computeSMA(values: number[], window: number): (number | undefined)[] {
  const out = new Array<number | undefined>(values.length).fill(undefined)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= window) sum -= values[i - window]
    if (i >= window - 1) out[i] = sum / window
  }
  return out
}

function computeEMA(values: number[], window: number): (number | undefined)[] {
  const out = new Array<number | undefined>(values.length).fill(undefined)
  const multiplier = 2 / (window + 1)
  
  // Start with SMA for first value
  let sum = 0
  for (let i = 0; i < Math.min(window, values.length); i++) {
    sum += values[i]
    if (i === window - 1) {
      out[i] = sum / window
    }
  }
  
  // Calculate EMA for remaining values
  for (let i = window; i < values.length; i++) {
    out[i] = (values[i] * multiplier) + (out[i - 1]! * (1 - multiplier))
  }
  
  return out
}

function computeMACD(values: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = computeEMA(values, fastPeriod)
  const emaSlow = computeEMA(values, slowPeriod)
  
  const macdLine = new Array<number | undefined>(values.length).fill(undefined)
  for (let i = 0; i < values.length; i++) {
    if (emaFast[i] !== undefined && emaSlow[i] !== undefined) {
      macdLine[i] = emaFast[i]! - emaSlow[i]!
    }
  }
  
  const macdSignal = computeEMA(macdLine.filter(v => v !== undefined), signalPeriod)
  const signal = new Array<number | undefined>(values.length).fill(undefined)
  let signalIndex = 0
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] !== undefined) {
      signal[i] = macdSignal[signalIndex]
      signalIndex++
    }
  }
  
  const histogram = new Array<number | undefined>(values.length).fill(undefined)
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] !== undefined && signal[i] !== undefined) {
      histogram[i] = macdLine[i]! - signal[i]!
    }
  }
  
  return { macdLine, signal, histogram }
}

function computeBollingerBands(values: number[], window = 20, stdDev = 2) {
  const sma = computeSMA(values, window)
  const upper = new Array<number | undefined>(values.length).fill(undefined)
  const lower = new Array<number | undefined>(values.length).fill(undefined)
  
  for (let i = window - 1; i < values.length; i++) {
    const slice = values.slice(i - window + 1, i + 1)
    const mean = sma[i]!
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window
    const std = Math.sqrt(variance)
    
    upper[i] = mean + (stdDev * std)
    lower[i] = mean - (stdDev * std)
  }
  
  return { upper, middle: sma, lower }
}

function computeStochastic(highs: number[], lows: number[], closes: number[], kPeriod = 14, dPeriod = 3) {
  const stochK = new Array<number | undefined>(closes.length).fill(undefined)
  
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highSlice = highs.slice(i - kPeriod + 1, i + 1)
    const lowSlice = lows.slice(i - kPeriod + 1, i + 1)
    
    const highest = Math.max(...highSlice)
    const lowest = Math.min(...lowSlice)
    
    if (highest !== lowest) {
      stochK[i] = ((closes[i] - lowest) / (highest - lowest)) * 100
    } else {
      stochK[i] = 50
    }
  }
  
  const stochD = computeSMA(stochK.filter(v => v !== undefined), dPeriod)
  const stochDFull = new Array<number | undefined>(closes.length).fill(undefined)
  let dIndex = 0
  for (let i = 0; i < closes.length; i++) {
    if (stochK[i] !== undefined) {
      stochDFull[i] = stochD[dIndex]
      dIndex++
    }
  }
  
  return { stochK, stochD: stochDFull }
}

function computeRSI(closes: number[], window = 14): number[] {
  if (closes.length === 0) return []
  const rsi = new Array<number>(closes.length).fill(50)
  let gain = 0
  let loss = 0
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const up = Math.max(change, 0)
    const down = Math.max(-change, 0)
    if (i <= window) {
      gain += up
      loss += down
      if (i === window) {
        const avgGain = gain / window
        const avgLoss = loss / window
        // Initialize Wilder's averages for subsequent smoothing
        gain = avgGain
        loss = avgLoss
        const rs = avgLoss === 0 ? Number.POSITIVE_INFINITY : avgGain / avgLoss
        rsi[i] = 100 - 100 / (1 + rs)
      }
    } else {
      const avgGain = (gain * (window - 1) + up) / window
      const avgLoss = (loss * (window - 1) + down) / window
      gain = avgGain
      loss = avgLoss
      const rs = avgLoss === 0 ? Number.POSITIVE_INFINITY : avgGain / avgLoss
      rsi[i] = 100 - 100 / (1 + rs)
    }
  }
  return rsi
}

function decide(strategy: StrategyName, idx: number, candles: Candle[], rsi: number[]): { action: 'BUY' | 'SELL' | 'HOLD'; reason: string } {
  const c = candles[idx]
  const prev = candles[idx - 1]
  if (!c) return { action: 'HOLD', reason: 'No candle' }
  
  switch (strategy) {
    case 'SMA_CROSSOVER': {
      if (c.smaShort !== undefined && c.smaLong !== undefined && prev?.smaShort !== undefined && prev?.smaLong !== undefined) {
        // Crossover detection
        if (prev.smaShort <= prev.smaLong && c.smaShort > c.smaLong) {
          return { action: 'BUY', reason: `SMA bullish crossover (${c.smaShort.toFixed(2)} crosses above ${c.smaLong.toFixed(2)})` }
        }
        if (prev.smaShort >= prev.smaLong && c.smaShort < c.smaLong) {
          return { action: 'SELL', reason: `SMA bearish crossover (${c.smaShort.toFixed(2)} crosses below ${c.smaLong.toFixed(2)})` }
        }
      }
      return { action: 'HOLD', reason: 'No SMA crossover signal' }
    }
    
    case 'EMA_CROSSOVER': {
      if (c.emaShort !== undefined && c.emaLong !== undefined && prev?.emaShort !== undefined && prev?.emaLong !== undefined) {
        if (prev.emaShort <= prev.emaLong && c.emaShort > c.emaLong) {
          return { action: 'BUY', reason: `EMA bullish crossover (${c.emaShort.toFixed(2)} crosses above ${c.emaLong.toFixed(2)})` }
        }
        if (prev.emaShort >= prev.emaLong && c.emaShort < c.emaLong) {
          return { action: 'SELL', reason: `EMA bearish crossover (${c.emaShort.toFixed(2)} crosses below ${c.emaLong.toFixed(2)})` }
        }
      }
      return { action: 'HOLD', reason: 'No EMA crossover signal' }
    }
    
    case 'RSI': {
      const value = rsi[idx]
      if (value < 30) return { action: 'BUY', reason: `RSI oversold signal (${value.toFixed(1)} < 30)` }
      if (value > 70) return { action: 'SELL', reason: `RSI overbought signal (${value.toFixed(1)} > 70)` }
      return { action: 'HOLD', reason: `RSI neutral (${value.toFixed(1)})` }
    }
    
    case 'MACD': {
      if (c.macdLine !== undefined && c.macdSignal !== undefined && prev?.macdLine !== undefined && prev?.macdSignal !== undefined) {
        if (prev.macdLine <= prev.macdSignal && c.macdLine > c.macdSignal) {
          return { action: 'BUY', reason: `MACD bullish crossover (${c.macdLine.toFixed(3)} > ${c.macdSignal.toFixed(3)})` }
        }
        if (prev.macdLine >= prev.macdSignal && c.macdLine < c.macdSignal) {
          return { action: 'SELL', reason: `MACD bearish crossover (${c.macdLine.toFixed(3)} < ${c.macdSignal.toFixed(3)})` }
        }
      }
      return { action: 'HOLD', reason: 'No MACD crossover signal' }
    }
    
    case 'BOLLINGER_BANDS': {
      if (c.bollingerUpper !== undefined && c.bollingerLower !== undefined) {
        if (c.close <= c.bollingerLower) {
          return { action: 'BUY', reason: `Price at lower Bollinger Band (${c.close.toFixed(2)} ≤ ${c.bollingerLower.toFixed(2)})` }
        }
        if (c.close >= c.bollingerUpper) {
          return { action: 'SELL', reason: `Price at upper Bollinger Band (${c.close.toFixed(2)} ≥ ${c.bollingerUpper.toFixed(2)})` }
        }
      }
      return { action: 'HOLD', reason: 'Price within Bollinger Bands' }
    }
    
    case 'STOCHASTIC': {
      if (c.stochK !== undefined && c.stochD !== undefined) {
        if (c.stochK < 20 && c.stochD < 20) {
          return { action: 'BUY', reason: `Stochastic oversold (%K: ${c.stochK.toFixed(1)}, %D: ${c.stochD.toFixed(1)})` }
        }
        if (c.stochK > 80 && c.stochD > 80) {
          return { action: 'SELL', reason: `Stochastic overbought (%K: ${c.stochK.toFixed(1)}, %D: ${c.stochD.toFixed(1)})` }
        }
      }
      return { action: 'HOLD', reason: 'Stochastic in neutral range' }
    }
    
    case 'MEAN_REVERSION': {
      if (c.bollingerMiddle !== undefined) {
        const deviation = ((c.close - c.bollingerMiddle) / c.bollingerMiddle) * 100
        if (deviation < -2) {
          return { action: 'BUY', reason: `Price below MA by ${Math.abs(deviation).toFixed(1)}% - mean reversion buy` }
        }
        if (deviation > 2) {
          return { action: 'SELL', reason: `Price above MA by ${deviation.toFixed(1)}% - mean reversion sell` }
        }
      }
      return { action: 'HOLD', reason: 'Price near moving average' }
    }
    
    case 'BUY_AND_HOLD': {
      if (idx === 0) return { action: 'BUY', reason: 'Initial buy and hold' }
      return { action: 'HOLD', reason: 'Hold position' }
    }
    
    default:
      return { action: 'HOLD', reason: 'Unknown strategy' }
  }
}

let intervalId: number | null = null

const STRATEGY_CONFIGS: StrategyConfig[] = [
  {
    name: 'SMA_CROSSOVER',
    displayName: 'SMA Crossover',
    description: 'Simple Moving Average crossover strategy using 10 and 20 period SMAs',
    parameters: { shortPeriod: 10, longPeriod: 20 },
    indicators: ['SMA Short', 'SMA Long']
  },
  {
    name: 'EMA_CROSSOVER', 
    displayName: 'EMA Crossover',
    description: 'Exponential Moving Average crossover strategy - more responsive than SMA',
    parameters: { shortPeriod: 12, longPeriod: 26 },
    indicators: ['EMA Short', 'EMA Long']
  },
  {
    name: 'RSI',
    displayName: 'RSI Oscillator',
    description: 'Relative Strength Index - buy oversold, sell overbought conditions',
    parameters: { period: 14, oversold: 30, overbought: 70 },
    indicators: ['RSI']
  },
  {
    name: 'MACD',
    displayName: 'MACD Strategy',
    description: 'Moving Average Convergence Divergence - momentum and trend following',
    parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    indicators: ['MACD Line', 'MACD Signal', 'MACD Histogram']
  },
  {
    name: 'BOLLINGER_BANDS',
    displayName: 'Bollinger Bands',
    description: 'Volatility-based strategy - buy at lower band, sell at upper band',
    parameters: { period: 20, stdDev: 2 },
    indicators: ['Bollinger Upper', 'Bollinger Middle', 'Bollinger Lower']
  },
  {
    name: 'STOCHASTIC',
    displayName: 'Stochastic Oscillator',
    description: 'Momentum oscillator - identifies overbought and oversold conditions',
    parameters: { kPeriod: 14, dPeriod: 3, oversold: 20, overbought: 80 },
    indicators: ['Stoch %K', 'Stoch %D']
  },
  {
    name: 'MEAN_REVERSION',
    displayName: 'Mean Reversion',
    description: 'Price reversion to moving average - contrarian strategy',
    parameters: { period: 20, threshold: 2 },
    indicators: ['SMA', 'Price Deviation']
  },
  {
    name: 'BUY_AND_HOLD',
    displayName: 'Buy & Hold',
    description: 'Simple buy and hold strategy - buy once at the beginning',
    parameters: {},
    indicators: []
  }
]

const BUILT_IN_DATASETS: DatasetCategory[] = [
  {
    id: 'samples',
    name: '📊 Sample Data',
    datasets: [
      { 
        id: 'sample', 
        name: 'Demo Dataset', 
        description: 'Sample financial data for testing strategies', 
        category: 'stock', 
        path: '/sample_data.csv' 
      },
    ]
  },
  {
    id: 'stocks',
    name: '📈 US Stocks',
    datasets: [
      { 
        id: 'aapl', 
        name: 'Apple Inc. (AAPL)', 
        description: 'Apple stock - technology giant and iPhone maker', 
        category: 'stock', 
        path: '/datasets/aapl.csv' 
      },
      { 
        id: 'msft', 
        name: 'Microsoft Corp. (MSFT)', 
        description: 'Microsoft stock - cloud computing and software leader', 
        category: 'stock', 
        path: '/datasets/msft.csv' 
      },
    ]
  },
  {
    id: 'crypto',
    name: '₿ Cryptocurrency',
    datasets: [
      { 
        id: 'btc', 
        name: 'Bitcoin (BTC-USDT)', 
        description: 'Bitcoin - original and largest cryptocurrency', 
        category: 'crypto', 
        path: '/datasets/btc.csv' 
      },
      { 
        id: 'eth', 
        name: 'Ethereum (ETH-USDT)', 
        description: 'Ethereum - smart contracts and DeFi platform', 
        category: 'crypto', 
        path: '/datasets/eth.csv' 
      },
      { 
        id: 'ada', 
        name: 'Cardano (ADA-USDT)', 
        description: 'Cardano - proof-of-stake blockchain platform', 
        category: 'crypto', 
        path: '/datasets/ada.csv' 
      },
      { 
        id: 'dot', 
        name: 'Polkadot (DOT-USDT)', 
        description: 'Polkadot - interoperable blockchain protocol', 
        category: 'crypto', 
        path: '/datasets/dot.csv' 
      },
      { 
        id: 'sol', 
        name: 'Solana (SOL-USDT)', 
        description: 'Solana - high-performance blockchain platform', 
        category: 'crypto', 
        path: '/datasets/sol.csv' 
      },
    ]
  }
]

function validateCsvData(text: string): { isValid: boolean; error?: string; recordCount?: number } {
  try {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    
    if (parsed.errors.length > 0) {
      return { isValid: false, error: `CSV parsing error: ${parsed.errors[0].message}` }
    }

    const rows = parsed.data as any[]
    if (rows.length === 0) {
      return { isValid: false, error: 'No data rows found' }
    }

    const requiredColumns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
    const headers = Object.keys(rows[0] || {})
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    
    if (missingColumns.length > 0) {
      return { isValid: false, error: `Missing required columns: ${missingColumns.join(', ')}` }
    }

    let validRows = 0
    for (const row of rows) {
      if (row.timestamp && !isNaN(Number(row.open)) && !isNaN(Number(row.high)) && 
          !isNaN(Number(row.low)) && !isNaN(Number(row.close)) && !isNaN(Number(row.volume))) {
        validRows++
      }
    }

    if (validRows === 0) {
      return { isValid: false, error: 'No valid data rows found' }
    }

    return { isValid: true, recordCount: validRows }
  } catch (error) {
    return { isValid: false, error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

function buildStateFromCsvText(text: string, dataset?: Partial<Dataset>) {
  const validation = validateCsvData(text)
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid CSV data')
  }

  const parsed = Papa.parse(text, { header: true, dynamicTyping: true })
  const rows = (parsed.data as any[]).filter((r) => r.timestamp)
  
  // Sort by timestamp to ensure chronological order (oldest first)
  const sortedRows = rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  
  const candles = sortedRows.map((r) => ({
    timestamp: r.timestamp as string,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  })) as Candle[]

  const closes = candles.map((c) => c.close)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  
  // Calculate all technical indicators
  const smaShort = computeSMA(closes, 10)
  const smaLong = computeSMA(closes, 20)
  const emaShort = computeEMA(closes, 12)
  const emaLong = computeEMA(closes, 26)
  
  const macd = computeMACD(closes, 12, 26, 9)
  const bollinger = computeBollingerBands(closes, 20, 2)
  const stochastic = computeStochastic(highs, lows, closes, 14, 3)
  
  // Apply indicators to candles
  for (let i = 0; i < candles.length; i++) {
    candles[i].smaShort = smaShort[i]
    candles[i].smaLong = smaLong[i]
    candles[i].emaShort = emaShort[i]
    candles[i].emaLong = emaLong[i]
    candles[i].macdLine = macd.macdLine[i]
    candles[i].macdSignal = macd.signal[i]
    candles[i].macdHistogram = macd.histogram[i]
    candles[i].bollingerUpper = bollinger.upper[i]
    candles[i].bollingerMiddle = bollinger.middle[i]
    candles[i].bollingerLower = bollinger.lower[i]
    candles[i].stochK = stochastic.stochK[i]
    candles[i].stochD = stochastic.stochD[i]
  }
  
  const rsi = computeRSI(closes, 14)
  const rsiSeries = candles.map((c, i) => ({ timestamp: c.timestamp, value: rsi[i] ?? 50 }))
  
  // Create indicator series for charts
  const macdSeries = candles.map((c) => ({
    timestamp: c.timestamp,
    value: c.macdLine ?? 0,
    signal: c.macdSignal,
    histogram: c.macdHistogram
  }))
  
  const stochasticSeries = candles.map((c) => ({
    timestamp: c.timestamp,
    value: c.stochK ?? 50,
    signal: c.stochD
  }))
  
  const bollingerSeries = candles.map((c) => ({
    timestamp: c.timestamp,
    value: c.bollingerMiddle ?? c.close,
    upper: c.bollingerUpper,
    lower: c.bollingerLower
  }))

  const firstValid = candles.findIndex((c) => c.smaShort !== undefined && c.smaLong !== undefined)
  const startIndex = firstValid === -1 ? 0 : firstValid

  const initialValue = 10000
  const equitySeries: EquityPoint[] = [
    { timestamp: candles[startIndex]?.timestamp ?? new Date().toISOString(), value: initialValue },
  ]

  const datasetWithMetadata: Dataset = {
    id: dataset?.id || 'custom-' + Date.now(),
    name: dataset?.name || 'Custom Dataset',
    description: dataset?.description || 'Uploaded dataset',
    category: dataset?.category || 'custom',
    data: text,
    recordCount: validation.recordCount,
    dateRange: candles.length > 0 ? {
      start: candles[0].timestamp,
      end: candles[candles.length - 1].timestamp
    } : undefined,
    ...dataset
  }

  return { candles, rsiSeries, macdSeries, stochasticSeries, bollingerSeries, startIndex, equitySeries, dataset: datasetWithMetadata }
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  candles: [],
  rsiSeries: [],
  equitySeries: [],
  trades: [],
  currentIndex: 0,
  isPlaying: false,
  speedMs: 500,
  cash: 10000,
  shares: 0,
  lastExplanation: '',
  strategyName: 'SMA_CROSSOVER',
  portfolioValue: 10000,
  currentDataset: null,
  availableDatasets: BUILT_IN_DATASETS,
  availableStrategies: STRATEGY_CONFIGS,
  isLoadingDataset: false,
  datasetError: null,
  macdSeries: [],
  stochasticSeries: [],
  bollingerSeries: [],

  initialize: async () => {
    const sampleDataset = BUILT_IN_DATASETS[0]?.datasets[0] // Sample dataset
    if (sampleDataset) {
      try {
        await get().loadDataset(sampleDataset)
      } catch (error) {
        console.error('Failed to initialize with sample dataset:', error)
      }
    }
  },

  loadDataset: async (dataset: Dataset) => {
    set({ isLoadingDataset: true, datasetError: null })
    try {
      let text: string
      
      if (dataset.data) {
        text = dataset.data
      } else if (dataset.path) {
        const response = await fetch(dataset.path)
        if (!response.ok) {
          throw new Error(`Failed to load dataset: ${response.statusText}`)
        }
        text = await response.text()
      } else {
        throw new Error('Dataset has no data or path')
      }

      const { candles, rsiSeries, macdSeries, stochasticSeries, bollingerSeries, startIndex, equitySeries, dataset: datasetWithMetadata } = buildStateFromCsvText(text, dataset)
      
      set({
        candles,
        rsiSeries,
        macdSeries,
        stochasticSeries,
        bollingerSeries,
        equitySeries,
        currentIndex: startIndex,
        trades: [],
        cash: 10000,
        shares: 0,
        lastExplanation: '',
        portfolioValue: 10000,
        currentDataset: datasetWithMetadata,
        isLoadingDataset: false,
        datasetError: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dataset'
      set({ 
        isLoadingDataset: false, 
        datasetError: errorMessage,
        currentDataset: null
      })
      throw error
    }
  },

  uploadCustomDataset: async (file: File) => {
    set({ isLoadingDataset: true, datasetError: null })
    try {
      const text = await file.text()
      const customDataset: Partial<Dataset> = {
        id: 'custom-' + Date.now(),
        name: file.name.replace('.csv', ''),
        description: `Custom dataset uploaded: ${file.name}`,
        category: 'custom'
      }

      const { candles, rsiSeries, macdSeries, stochasticSeries, bollingerSeries, startIndex, equitySeries, dataset } = buildStateFromCsvText(text, customDataset)
      
      set((state) => {
        const customCategory = state.availableDatasets.find(cat => cat.id === 'custom')
        const updatedCategories = customCategory 
          ? state.availableDatasets.map(cat => 
              cat.id === 'custom' 
                ? { ...cat, datasets: [dataset, ...cat.datasets] }
                : cat
            )
          : [...state.availableDatasets, { 
              id: 'custom', 
              name: 'Custom Datasets', 
              datasets: [dataset] 
            }]

        return {
          candles,
          rsiSeries,
          macdSeries,
          stochasticSeries,
          bollingerSeries,
          equitySeries,
          currentIndex: startIndex,
          trades: [],
          cash: 10000,
          shares: 0,
          lastExplanation: '',
          portfolioValue: 10000,
          currentDataset: dataset,
          availableDatasets: updatedCategories,
          isLoadingDataset: false,
          datasetError: null
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload dataset'
      set({ 
        isLoadingDataset: false, 
        datasetError: errorMessage 
      })
      throw error
    }
  },

  loadFromCsvText: (text: string, dataset?: Partial<Dataset>) => {
    try {
      const { candles, rsiSeries, macdSeries, stochasticSeries, bollingerSeries, startIndex, equitySeries, dataset: datasetWithMetadata } = buildStateFromCsvText(text, dataset)
      set({
        candles,
        rsiSeries,
        macdSeries,
        stochasticSeries,
        bollingerSeries,
        equitySeries,
        currentIndex: startIndex,
        trades: [],
        cash: 10000,
        shares: 0,
        lastExplanation: '',
        portfolioValue: 10000,
        currentDataset: datasetWithMetadata,
        isPlaying: false,
        datasetError: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
      set({ datasetError: errorMessage })
      throw error
    }
  },

  play: () => {
    const { isPlaying, speedMs } = get()
    if (isPlaying) return
    set({ isPlaying: true })
    const tick = () => {
      const { currentIndex, candles } = get()
      if (currentIndex >= candles.length - 1) {
        get().pause()
        return
      }
      get().step()
    }
    intervalId = window.setInterval(tick, speedMs)
  },

  pause: () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
    set({ isPlaying: false })
  },

  step: () => {
    const { currentIndex, candles, strategyName, rsiSeries, cash, shares, trades, equitySeries } = get()
    if (currentIndex >= candles.length - 1) return
    const nextIndex = currentIndex + 1
    const decision = decide(strategyName, nextIndex, candles, rsiSeries.map((r) => r.value))

    let newCash = cash
    let newShares = shares
    const price = candles[nextIndex].close
    let explanation = decision.reason
    if (decision.action === 'BUY' && cash >= price) {
      const qty = Math.floor(cash / price)
      if (qty > 0) {
        newCash -= qty * price
        newShares += qty
        trades.push({ index: nextIndex, type: 'BUY', price, reason: decision.reason })
        explanation = `BUY ${qty} @ $${price.toFixed(2)} — ${decision.reason}`
      }
    } else if (decision.action === 'SELL' && shares > 0) {
      newCash += shares * price
      trades.push({ index: nextIndex, type: 'SELL', price, reason: decision.reason })
      explanation = `SELL ${shares} @ $${price.toFixed(2)} — ${decision.reason}`
      newShares = 0
    }

    const portfolioValue = newCash + newShares * price
    const nextEquity = [...equitySeries, { timestamp: candles[nextIndex].timestamp, value: portfolioValue }]
    set({ currentIndex: nextIndex, cash: newCash, shares: newShares, lastExplanation: explanation, trades: [...trades], portfolioValue, equitySeries: nextEquity })
  },

  reset: () => {
    const { candles } = get()
    const firstValid = candles.findIndex((c) => c.smaShort !== undefined && c.smaLong !== undefined)
    const startIndex = firstValid === -1 ? 0 : firstValid
    set({ 
      currentIndex: startIndex, 
      trades: [], 
      cash: 10000, 
      shares: 0, 
      lastExplanation: '', 
      portfolioValue: 10000, 
      equitySeries: candles.length ? [{ timestamp: candles[startIndex].timestamp, value: 10000 }] : [] 
    })
  },

  setStrategyName: (n) => {
    const wasPlaying = get().isPlaying
    if (wasPlaying) {
      get().pause()
    }
    set({ strategyName: n })
    get().reset()
  },
  
  setSpeedMs: (ms) => {
    const wasPlaying = get().isPlaying
    if (wasPlaying) {
      get().pause()
    }
    set({ speedMs: ms })
    if (wasPlaying) {
      get().play()
    }
  },
  
  getCurrentStrategyConfig: () => {
    const { strategyName, availableStrategies } = get()
    return availableStrategies.find(s => s.name === strategyName)
  },
}))


