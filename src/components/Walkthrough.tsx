import { useState, useEffect } from 'react'

export type WalkthroughStep = {
  id: string
  title: string
  content: string
  target: string // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right'
  action?: () => void // Optional action to perform during this step
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    title: '👋 Welcome to Trading Bot Visualizer!',
    content: 'This tool helps you test and visualize different trading strategies on historical market data. Let\'s take a quick tour!',
    target: 'body',
    position: 'bottom'
  },
  {
    id: 'datasets',
    title: '📊 Choose Your Data',
    content: 'Start by selecting a dataset. We have stocks, crypto, and sample data. You can also upload your own CSV files!',
    target: '[data-tour="dataset-selector"]',
    position: 'bottom'
  },
  {
    id: 'strategies',
    title: '🎯 Pick a Trading Strategy',
    content: 'Choose from 8 professional trading strategies like MACD, Bollinger Bands, RSI, and more. Each has different logic for buying and selling.',
    target: '[data-tour="strategy-selector"]',
    position: 'bottom'
  },
  {
    id: 'controls',
    title: '⏯️ Control the Simulation',
    content: 'Use these controls to run your strategy simulation. Play to watch it trade automatically, or step through one decision at a time.',
    target: '[data-tour="playback-controls"]',
    position: 'bottom'
  },
  {
    id: 'charts',
    title: '📈 Watch the Strategy in Action',
    content: 'The main chart shows price action with strategy-specific indicators. Trade markers show when the strategy buys (green) or sells (red).',
    target: '[data-tour="main-chart"]',
    position: 'right'
  },
  {
    id: 'oscillators',
    title: '📊 Technical Indicators',
    content: 'Some strategies show additional indicators like RSI, MACD, or Stochastic oscillators to help you understand the trading signals.',
    target: '[data-tour="oscillator-chart"]',
    position: 'right'
  },
  {
    id: 'performance',
    title: '💰 Track Performance',
    content: 'Monitor your strategy\'s performance with key metrics: portfolio value, returns, win rate, and current positions.',
    target: '[data-tour="performance-metrics"]',
    position: 'left'
  },
  {
    id: 'trades',
    title: '📋 Trade History',
    content: 'See all recent trades with buy/sell signals, prices, and the reasoning behind each decision.',
    target: '[data-tour="trade-history"]',
    position: 'left'
  },
  {
    id: 'equity',
    title: '📈 Equity Curve',
    content: 'The equity curve shows how your portfolio value changes over time - the ultimate measure of strategy success!',
    target: '[data-tour="equity-chart"]',
    position: 'right'
  },
  {
    id: 'complete',
    title: '🎉 You\'re Ready to Trade!',
    content: 'Now you know how to use the Trading Bot Visualizer. Try different strategies and datasets to see what works best!',
    target: 'body',
    position: 'bottom'
  }
]

interface WalkthroughProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function Walkthrough({ isOpen, onClose, onComplete }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  const currentStepData = WALKTHROUGH_STEPS[currentStep]
  const isLastStep = currentStep === WALKTHROUGH_STEPS.length - 1

  useEffect(() => {
    if (!isOpen) return

    const target = document.querySelector(currentStepData.target) as HTMLElement
    if (target) {
      setHighlightedElement(target)
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Wait a bit for scroll to complete, then calculate position
      setTimeout(() => {
        const rect = target.getBoundingClientRect()
        const tooltipWidth = 350 // Estimated tooltip width
        const tooltipHeight = 200 // Estimated tooltip height
        const padding = 20
        
        // Get viewport dimensions first
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        let top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
        
        // Smart positioning based on preferred position and viewport constraints
        // Special handling for body element (welcome/complete steps)
        if (currentStepData.target === 'body') {
          // Center the tooltip on screen for body target
          top = (viewportHeight / 2) - (tooltipHeight / 2)
          left = (viewportWidth / 2) - (tooltipWidth / 2)
        } else {
          switch (currentStepData.position) {
            case 'top':
              top = rect.top - tooltipHeight - padding
              left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
              break
            case 'bottom':
              top = rect.bottom + padding
              left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
              break
            case 'left':
              top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
              left = rect.left - tooltipWidth - padding
              break
            case 'right':
              top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
              left = rect.right + padding
              break
          }
        }
        
        // Keep tooltip within viewport bounds
        
        // Horizontal bounds
        if (left < padding) {
          left = padding
        } else if (left + tooltipWidth > viewportWidth - padding) {
          left = viewportWidth - tooltipWidth - padding
        }
        
        // Vertical bounds
        if (top < padding) {
          top = padding
        } else if (top + tooltipHeight > viewportHeight - padding) {
          top = viewportHeight - tooltipHeight - padding
        }
        
        setTooltipPosition({ top, left })
      }, 100)
    }

    // Execute step action if present
    if (currentStepData.action) {
      currentStepData.action()
    }
  }, [currentStep, isOpen, currentStepData])

  useEffect(() => {
    if (!isOpen) {
      setHighlightedElement(null)
      return
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Spotlight Overlay - creates a cutout effect using multiple divs */}
      <div className="fixed inset-0 z-[100] pointer-events-auto">
        {highlightedElement ? (
          <>
            {(() => {
              const rect = highlightedElement.getBoundingClientRect()
              const padding = 8
              const left = rect.left - padding
              const top = rect.top - padding
              const width = rect.width + padding * 2
              const height = rect.height + padding * 2
              
              return (
                <>
                  {/* Top overlay */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: Math.max(0, top)
                    }}
                  />
                  
                  {/* Bottom overlay */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: top + height,
                      left: 0,
                      width: '100%',
                      height: Math.max(0, window.innerHeight - (top + height))
                    }}
                  />
                  
                  {/* Left overlay */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: top,
                      left: 0,
                      width: Math.max(0, left),
                      height: height
                    }}
                  />
                  
                  {/* Right overlay */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: top,
                      left: left + width,
                      width: Math.max(0, window.innerWidth - (left + width)),
                      height: height
                    }}
                  />
                  
                  {/* Highlight border around the element */}
                  <div
                    className="absolute border-4 border-blue-400 rounded-lg pointer-events-none shadow-lg animate-pulse"
                    style={{
                      top: rect.top - padding,
                      left: rect.left - padding,
                      width: rect.width + padding * 2,
                      height: rect.height + padding * 2,
                      boxShadow: `
                        0 0 20px rgba(59, 130, 246, 0.6),
                        0 0 40px rgba(59, 130, 246, 0.4),
                        inset 0 0 20px rgba(59, 130, 246, 0.2)
                      `,
                    }}
                  />
                </>
              )
            })()}
          </>
        ) : (
          <div className="absolute inset-0 bg-black/70" />
        )}
      </div>

      {/* Tooltip */}
      <div 
        className="fixed z-[101] pointer-events-auto"
        style={{ 
          top: tooltipPosition.top, 
          left: tooltipPosition.left 
        }}
      >
        <div className="bg-white text-gray-900 rounded-lg shadow-2xl p-6 w-[350px] border-2 border-blue-400">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-600">{currentStepData.title}</h3>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Skip tour"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-700 mb-6">{currentStepData.content}</p>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Step {currentStep + 1} of {WALKTHROUGH_STEPS.length}</span>
              <span>{Math.round(((currentStep + 1) / WALKTHROUGH_STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / WALKTHROUGH_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Skip Tour
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                {isLastStep ? 'Get Started! 🚀' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook to manage walkthrough state
export function useWalkthrough() {
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false)
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(() => {
    return localStorage.getItem('trading-bot-walkthrough-completed') === 'true'
  })

  const startWalkthrough = () => {
    setIsWalkthroughOpen(true)
  }

  const closeWalkthrough = () => {
    setIsWalkthroughOpen(false)
  }

  const completeWalkthrough = () => {
    setIsWalkthroughOpen(false)
    setHasSeenWalkthrough(true)
    localStorage.setItem('trading-bot-walkthrough-completed', 'true')
  }

  const resetWalkthrough = () => {
    setHasSeenWalkthrough(false)
    localStorage.removeItem('trading-bot-walkthrough-completed')
  }

  // Auto-start walkthrough for new users
  useEffect(() => {
    if (!hasSeenWalkthrough) {
      const timer = setTimeout(() => {
        startWalkthrough()
      }, 1500) // Small delay to let the page load

      return () => clearTimeout(timer)
    }
  }, [hasSeenWalkthrough])

  return {
    isWalkthroughOpen,
    hasSeenWalkthrough,
    startWalkthrough,
    closeWalkthrough,
    completeWalkthrough,
    resetWalkthrough,
  }
}