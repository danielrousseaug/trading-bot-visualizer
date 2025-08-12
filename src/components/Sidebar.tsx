import React from 'react'
import { useSimulatorStore } from '../hooks/useSimulator'
import { useShallow } from 'zustand/react/shallow'

export function Sidebar() {
  const { 
    lastExplanation, 
    currentIndex, 
    candles, 
    trades, 
    portfolioValue, 
    cash, 
    shares,
    strategyName,
    getCurrentStrategyConfig 
  } = useSimulatorStore(
    useShallow((s) => ({
      lastExplanation: s.lastExplanation,
      currentIndex: s.currentIndex,
      candles: s.candles,
      trades: s.trades,
      portfolioValue: s.portfolioValue,
      cash: s.cash,
      shares: s.shares,
      strategyName: s.strategyName,
      getCurrentStrategyConfig: s.getCurrentStrategyConfig,
    })),
  )

  const strategyConfig = getCurrentStrategyConfig()
  
  // Ensure component re-renders when strategy changes
  React.useEffect(() => {
    // This effect ensures the component updates when strategy changes
  }, [strategyName])
  const currentPrice = candles[currentIndex]?.close ?? 0
  const initialValue = 10000
  const totalReturn = ((portfolioValue - initialValue) / initialValue) * 100
  const buyTrades = trades.filter(t => t.type === 'BUY')
  const sellTrades = trades.filter(t => t.type === 'SELL')
  const winningTrades = sellTrades.filter(sell => {
    const correspondingBuy = buyTrades.find(buy => buy.index < sell.index)
    return correspondingBuy && sell.price > correspondingBuy.price
  })
  const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0

  const ts = candles[currentIndex]?.timestamp

  return (
    <div className="space-y-4">
      {/* Strategy Info */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <div className="text-lg font-semibold mb-2">{strategyConfig?.displayName || 'Strategy'}</div>
        <div className="text-xs text-gray-400 mb-3">{strategyConfig?.description}</div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-gray-400">Portfolio Value</div>
            <div className="font-semibold text-white">${portfolioValue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-400">Total Return</div>
            <div className={`font-semibold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400">Cash</div>
            <div className="font-semibold text-blue-400">${cash.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-400">Shares</div>
            <div className="font-semibold text-yellow-400">{shares.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-400">Win Rate</div>
            <div className="font-semibold text-purple-400">{winRate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-gray-400">Total Trades</div>
            <div className="font-semibold text-gray-300">{trades.length}</div>
          </div>
        </div>
      </div>

      {/* Current Action */}
      <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
        <div className="text-sm font-semibold mb-2">Current Action</div>
        <div className="text-sm text-gray-300 whitespace-pre-line min-h-[3rem]">
          {lastExplanation || 'No action yet.'}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Time: {ts ?? '-'} | Price: ${currentPrice.toFixed(2)}
        </div>
      </div>

      {/* Recent Trades */}
      <div>
        <div className="text-sm font-semibold mb-2">Recent Trades</div>
        <div className="space-y-1 max-h-[25vh] overflow-auto pr-1">
          {trades.length === 0 && <div className="text-sm text-gray-500">No trades yet.</div>}
          {trades.slice(-15).reverse().map((t, i) => (
            <div key={`${t.index}-${i}`} className="text-xs flex justify-between items-center border-b border-gray-800 py-1.5">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                  t.type === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {t.type}
                </span>
                <span className="text-gray-300">${t.price.toFixed(2)}</span>
              </div>
              <span className="text-gray-500 text-xs">{candles[t.index]?.timestamp.slice(-5) ?? ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


