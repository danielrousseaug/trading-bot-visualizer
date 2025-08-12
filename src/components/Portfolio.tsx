import { useSimulatorStore } from '../hooks/useSimulator'
import { useShallow } from 'zustand/react/shallow'

export function Portfolio() {
  const { cash, shares, portfolioValue, currentPrice, initialCash } = useSimulatorStore(
    useShallow((s) => ({
      cash: s.cash,
      shares: s.shares,
      portfolioValue: s.portfolioValue,
      currentPrice: s.candles[s.currentIndex]?.close ?? 0,
      initialCash: 10000,
    })),
  )

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div>💰 Cash: ${cash.toFixed(2)}</div>
      <div>📦 Shares: {shares}</div>
      <div>🧮 Value: ${portfolioValue.toFixed(2)}</div>
      <div>💹 Price: ${currentPrice.toFixed(2)}</div>
      <div>
        📈 PnL: ${(portfolioValue - initialCash).toFixed(2)}
        <span className={portfolioValue - initialCash >= 0 ? 'text-emerald-400 ml-2' : 'text-red-400 ml-2'}>
          {(((portfolioValue - initialCash) / initialCash) * 100).toFixed(2)}%
        </span>
      </div>
    </div>
  )
}


