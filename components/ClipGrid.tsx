'use client'

import { motion } from 'framer-motion'

interface Clip {
  id: string
  url: string
  downloadUrl?: string
  thumbnail: string
  caption: string
  duration: number
}

interface ClipGridProps {
  clips: Clip[]
}

export default function ClipGrid({ clips }: ClipGridProps) {
  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadAll = () => {
    clips.forEach((clip, index) => {
      setTimeout(() => {
        const filename = `overlap-clip-${index + 1}.mp4`
        handleDownload(clip.downloadUrl || clip.url, filename)
      }, index * 500) // Stagger downloads
    })
  }

  return (
    <div className="space-y-6">
      {/* Download All Button */}
      {clips.length > 1 && (
        <div className="flex justify-center">
          <motion.button
            onClick={handleDownloadAll}
            className="px-6 py-3 bg-white/10 border border-[#FFD600] text-[#FFD600] font-bold rounded-xl hover:bg-[#FFD600] hover:text-black transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⬇️ Download All
          </motion.button>
        </div>
      )}

      {/* Clip Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clips.map((clip, index) => (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-[#FFD600] transition-all shadow-lg"
          >
            {/* Video Player */}
            <div className="relative aspect-[9/16] bg-black">
              <video
                src={clip.url}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain rounded-t-xl"
                style={{ backgroundColor: '#000000' }}
                onError={(e) => {
                  console.error('Video failed to load:', clip.url, e);
                }}
              />

              {/* Duration Badge */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 text-[#FFD600] text-xs font-bold rounded border border-[#FFD600]/30">
                {clip.duration}s
              </div>
            </div>

            {/* Clip Info */}
            <div className="p-4 space-y-3">
              {/* Caption */}
              <div className="min-h-[40px]">
                <p className="text-sm text-gray-300 line-clamp-2">
                  {clip.caption}
                </p>
              </div>

              {/* Download Button */}
              <a
                href={clip.downloadUrl || clip.url}
                download={`overlap-clip-${index + 1}.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 bg-[#FFD600] text-black font-bold text-sm rounded-lg hover:bg-[#FFD600]/90 transition-all shadow-md hover:shadow-[#FFD600]/20 text-center"
              >
                ⬇️ Download Clip {index + 1}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
