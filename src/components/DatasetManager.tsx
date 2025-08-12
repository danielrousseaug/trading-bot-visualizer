import { useRef, useState } from 'react'
import { useSimulatorStore } from '../hooks/useSimulator'
import { useShallow } from 'zustand/react/shallow'
import type { Dataset } from '../hooks/useSimulator'

export function DatasetManager() {
  const { 
    currentDataset, 
    availableDatasets, 
    isLoadingDataset, 
    datasetError, 
    loadDataset, 
    uploadCustomDataset 
  } = useSimulatorStore(
    useShallow((s) => ({
      currentDataset: s.currentDataset,
      availableDatasets: s.availableDatasets,
      isLoadingDataset: s.isLoadingDataset,
      datasetError: s.datasetError,
      loadDataset: s.loadDataset,
      uploadCustomDataset: s.uploadCustomDataset,
    })),
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleDatasetSelect = async (dataset: Dataset) => {
    try {
      setUploadError(null)
      await loadDataset(dataset)
      setShowDropdown(false)
    } catch (error) {
      console.error('Failed to load dataset:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please select a CSV file')
      return
    }

    try {
      setUploadError(null)
      await uploadCustomDataset(file)
      setShowDropdown(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
      setUploadError(errorMessage)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="relative" data-tour="dataset-selector">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Dataset</label>
        <div className="relative">
          <button
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-left min-w-[140px] flex items-center justify-between hover:bg-gray-700 transition-colors disabled:opacity-50"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={isLoadingDataset}
          >
            <span className="truncate">
              {isLoadingDataset ? 'Loading...' : currentDataset?.name || 'Select Dataset'}
            </span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[300px] max-h-80 overflow-y-auto">
              {availableDatasets.map((category) => (
                <div key={category.id} className="p-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {category.name}
                  </div>
                  {category.datasets.map((dataset) => (
                    <button
                      key={dataset.id}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                      onClick={() => handleDatasetSelect(dataset)}
                    >
                      <div className="font-medium">{dataset.name}</div>
                      <div className="text-xs text-gray-400 truncate">{dataset.description}</div>
                      {dataset.recordCount && (
                        <div className="text-xs text-gray-500">
                          {dataset.recordCount.toLocaleString()} records
                          {dataset.dateRange && (
                            <span className="ml-2">
                              {new Date(dataset.dateRange.start).toLocaleDateString()} - {new Date(dataset.dateRange.end).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))}
              
              <div className="border-t border-gray-700 p-2">
                <button
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors flex items-center justify-center gap-2"
                  onClick={triggerFileUpload}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload CSV File
                </button>
                <div className="text-xs text-gray-500 mt-1 px-3">
                  Required columns: timestamp, open, high, low, close, volume
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {(datasetError || uploadError) && (
        <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-2 py-1">
          {datasetError || uploadError}
        </div>
      )}

      {currentDataset && (
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {currentDataset.category && (
              <span className="px-2 py-0.5 bg-gray-700 rounded text-xs uppercase">
                {currentDataset.category}
              </span>
            )}
            {currentDataset.recordCount && (
              <span>{currentDataset.recordCount.toLocaleString()} records</span>
            )}
            {currentDataset.dateRange && (
              <span>
                {new Date(currentDataset.dateRange.start).toLocaleDateString()} - {new Date(currentDataset.dateRange.end).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}