'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ProgressBarProps {
  jobId: string
  onComplete: (clips: any[]) => void
  onError: (message: string) => void
}

interface StatusResponse {
  status?: string
  stage: string
  progress: number
  message: string
  clips?: any[]
  error?: string
}

const STAGE_MESSAGES = {
  download: 'Downloading your video...',
  extract_audio: 'Extracting audio...',
  transcribe: 'Listening closely to every word...',
  detect_highlights: 'Finding the good parts...',
  clip: 'Cutting highlights...',
  caption: 'Adding captions with rhythm...',
  email: 'Preparing delivery...',
  complete: 'Your clips are ready! 🎬'
}

export default function ProgressBar({ jobId, onComplete, onError }: ProgressBarProps) {
  const [status, setStatus] = useState<StatusResponse>({
    stage: 'download',
    progress: 0,
    message: STAGE_MESSAGES.download
  })

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let isPolling = true

    const pollStatus = async () => {
      if (!isPolling) return

      try {
        const response = await fetch(`/api/status/${jobId}`)
        const data = await response.json()

        setStatus(data)

        // Check if job is complete
        if (data.status === 'complete' || data.stage === 'complete') {
          isPolling = false
          if (interval) clearInterval(interval)

          if (data.clips && data.clips.length > 0) {
            console.log('[POLL] Job complete, stopping polling')
            onComplete(data.clips)
          } else {
            onError('No clips were generated')
          }
          return
        }

        // Check if job expired
        if (data.status === 'expired') {
          isPolling = false
          if (interval) clearInterval(interval)
          console.log('[POLL] Job expired')
          onError(data.message || 'Job expired or not found. Please re-submit.')
          return
        }

        // Check for errors
        if (data.status === 'error' || data.error) {
          isPolling = false
          if (interval) clearInterval(interval)
          console.log('[POLL] Job error:', data.error)
          onError(data.error || 'Processing failed')
          return
        }
      } catch (err: any) {
        isPolling = false
        if (interval) clearInterval(interval)
        onError(err.message || 'Failed to check status')
      }
    }

    interval = setInterval(pollStatus, 2000) // Poll every 2 seconds
    pollStatus() // Initial poll

    return () => {
      isPolling = false
      if (interval) clearInterval(interval)
    }
  }, [jobId, onComplete, onError])

  return (
    <div className="space-y-8">
      {/* Stage Message */}
      <motion.div
        key={status.stage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-[#FFD600]">
          {STAGE_MESSAGES[status.stage as keyof typeof STAGE_MESSAGES] || status.message}
        </h2>
      </motion.div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-[#FFD600] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${status.progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Progress Percentage */}
      <motion.div
        className="text-center text-sm text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {Math.round(status.progress)}%
      </motion.div>

      {/* Stage Console */}
      <motion.div
        className="p-4 bg-white/5 border border-white/10 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-[#FFD600] rounded-full animate-pulse" />
          <span className="text-sm text-gray-300">{status?.stage?.replace('_', ' ')}</span>
        </div>
      </motion.div>
    </div>
  )
}
