'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Check, X, RotateCw } from 'lucide-react'
import { ApiError, fetchApi } from '../lib/api'

enum AITask {
  Paraphrasing = 'paraphrasing',
  Expanding = 'expanding',
  Summarising = 'summarising',
}

interface ApiResponse {
  suggestion: string
}

const AITextEditor = () => {
  const [text, setText] = useState('')
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' })
  const [showAIButton, setShowAIButton] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentTask, setCurrentTask] = useState<AITask>(AITask.Paraphrasing)
  const [suggestion, setSuggestion] = useState('')
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTextSelect = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = text.substring(start, end)

    if (selectedText.length > 0) {
      setSelection({ start, end, text: selectedText })
      setShowAIButton(true)
    }
    else {
      setShowAIButton(false)
      setShowDropdown(false)
    }
  }

  const handleAIAction = async (task: AITask) => {
    setShowDropdown(false)
    setLoading(true)
    setError('')
    setShowSuggestion(true)
    setSuggestion('')
    setCurrentTask(task)

    try {
      const response = await fetchApi<ApiResponse>('/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: task,
          input: selection.text,
        }),
      })

      setSuggestion(response.suggestion)
    }
    catch (err) {
      setError((err as ApiError).message)
    }
    finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    const newText = text.substring(0, selection.start) + suggestion + text.substring(selection.end)
    setText(newText)
    handleReject() // Reset state after accepting
  }

  const handleTryAgain = () => {
    handleAIAction(currentTask)
  }

  const handleReject = () => {
    setShowSuggestion(false)
    setSuggestion('')
    setError('')
    setShowAIButton(false)
    setShowDropdown(false)
    setSelection({ start: 0, end: 0, text: '' })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="w-2/3 mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Text Editor</h1>

        <div className="relative">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onSelect={handleTextSelect}
              onClick={handleTextSelect}
              className="w-full h-64 p-4 text-gray-900 resize-none focus:outline-none font-mono text-sm leading-6"
              placeholder="Start typing or paste your text here. Select text to use AI features..."
            />
          </div>

          {showAIButton && (
            <div
              ref={dropdownRef}
              className="absolute z-10 bottom-0 right-0 mb-2 mr-2"
            >
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-2 shadow-lg transition-colors flex items-center gap-1"
              >
                <Sparkles size={16} />
                <span className="text-sm font-medium">Ask AI</span>
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-40">
                  <button
                    onClick={() => handleAIAction(AITask.Paraphrasing)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Paraphrase
                  </button>
                  <button
                    onClick={() => handleAIAction(AITask.Expanding)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Expand
                  </button>
                  <button
                    onClick={() => handleAIAction(AITask.Summarising)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Summarise
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {selection.text && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2 font-medium">Selected text:</p>
            <p className="text-gray-900">{selection.text}</p>
          </div>
        )}

        {showSuggestion && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Suggestion</h3>
            </div>

            {loading
              ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                )
              : error
                ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )
                : (
                    <div className="bg-purple-50 rounded-lg p-4 mb-4">
                      <p className="text-gray-900">{suggestion}</p>
                    </div>
                  )}

            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={loading || !!error || !suggestion}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Check size={16} />
                Accept
              </button>
              <button
                onClick={handleTryAgain}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <RotateCw size={16} />
                Try Again
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <X size={16} />
                Reject
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500">
          <p>💡 Tip: Select any text in the editor to see AI options</p>
        </div>
      </div>
    </div>
  )
}

export { AITextEditor }
