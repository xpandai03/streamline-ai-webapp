'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VideoInput from '@/components/VideoInput'
import ProgressBar from '@/components/ProgressBar'
import ClipGrid from '@/components/ClipGrid'

type AppState = 'idle' | 'processing' | 'complete' | 'error'

const STORAGE_KEY = 'overlap:lastJobId'

export default function Home() {
  const [state, setState] = useState<AppState>('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [clips, setClips] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Resume polling from localStorage on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem(STORAGE_KEY)

    if (savedJobId && !jobId) {
      console.log('[RESUME] Resuming job from localStorage:', savedJobId)
      setJobId(savedJobId)
      setState('processing')
    }
  }, [])

  const handleSubmit = async (youtubeUrl: string, email: string) => {
    try {
      setState('processing')
      setError(null)

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed')
      }

      // Save jobId to localStorage for resume capability
      localStorage.setItem(STORAGE_KEY, data.jobId)
      console.log('[JOB] Saved job to localStorage:', data.jobId)

      setJobId(data.jobId)
    } catch (err: any) {
      setState('error')
      setError(err.message)
    }
  }

  const handleComplete = (clips: any[]) => {
    setClips(clips)
    setState('complete')

    // Clear localStorage on successful completion
    localStorage.removeItem(STORAGE_KEY)
    console.log('[JOB] Cleared job from localStorage')
  }

  const handleError = (message: string) => {
    setError(message)
    setState('error')
  }

  const handleReset = () => {
    setState('idle')
    setJobId(null)
    setClips([])
    setError(null)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8"
      >
        <h1 className="text-xl font-bold">Overlap</h1>
      </motion.div>

      {/* Main Content */}
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-5xl font-bold tracking-tight">
                  Paste a YouTube link.
                </h2>
                <p className="text-xl text-gray-400">
                  Get viral clips in minutes.
                </p>
              </div>

              <VideoInput onSubmit={handleSubmit} />
            </motion.div>
          )}

          {state === 'processing' && jobId && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProgressBar
                jobId={jobId}
                onComplete={handleComplete}
                onError={handleError}
              />
            </motion.div>
          )}

          {state === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">✅ Your clips are ready</h2>
                <p className="text-gray-400">
                  {clips.length} viral moment{clips.length !== 1 ? 's' : ''} extracted. Watch below or download.
                </p>
              </div>

              <ClipGrid clips={clips} />

              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="text-[#FFD600] hover:underline"
                >
                  Create more clips
                </button>
              </div>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-4"
            >
              <h2 className="text-2xl font-bold text-red-500">Something went wrong</h2>
              <p className="text-gray-400">{error}</p>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-[#FFD600] text-black font-bold rounded-xl hover:opacity-90"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-sm text-[#BFBFBF]"
      >
        Powered by Overlap AI
      </motion.div>
    </main>
  )
}
