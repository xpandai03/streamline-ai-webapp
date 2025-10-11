'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface VideoInputProps {
  onSubmit: (youtubeUrl: string, email: string) => void
}

export default function VideoInput({ onSubmit }: VideoInputProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({ url: '', email: '' })

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    return youtubeRegex.test(url)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = { url: '', email: '' }

    if (!youtubeUrl.trim()) {
      newErrors.url = 'Please enter a YouTube URL'
    } else if (!validateYouTubeUrl(youtubeUrl)) {
      newErrors.url = 'Please enter a valid YouTube URL'
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    setErrors(newErrors)

    if (!newErrors.url && !newErrors.email) {
      onSubmit(youtubeUrl, email)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="space-y-4">
        {/* YouTube URL Input */}
        <div>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Paste a YouTube link..."
            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD600] focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
          />
          {errors.url && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-400"
            >
              {errors.url}
            </motion.p>
          )}
        </div>

        {/* Email Input */}
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email for delivery..."
            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD600] focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
          />
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-400"
            >
              {errors.email}
            </motion.p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        className="w-full px-8 py-4 bg-[#FFD600] text-black font-bold text-lg rounded-xl hover:opacity-90 glow-yellow transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Generate Clips
      </motion.button>
    </motion.form>
  )
}
