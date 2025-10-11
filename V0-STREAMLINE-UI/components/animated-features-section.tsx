"use client"

import type React from "react"
import { motion } from "framer-motion"
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg"

interface BentoCardProps {
  title: string
  value: string | number
  subtitle?: string
  colors: string[]
  delay: number
}

const BentoCard: React.FC<BentoCardProps> = ({ title, value, subtitle, colors, delay }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay + 0.3,
      },
    },
  }

  const item = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } },
  }

  return (
    <motion.div
      className="relative overflow-hidden h-full bg-black rounded-lg border border-border/20 group"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      style={{
        filter: "url(#noise)",
      }}
    >
      <AnimatedGradient colors={colors} speed={0.05} blur="medium" />

      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px",
            mixBlendMode: "overlay",
          }}
        />
      </div>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div
          className="w-full h-full animate-pulse"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.05) 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: "48px 48px, 64px 64px",
            backgroundPosition: "0 0, 24px 24px",
          }}
        />
      </div>

      <div className="absolute inset-0 opacity-80 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full animate-[shine_4s_ease-in-out_infinite] w-[200%]" />
      </div>

      <motion.div
        className="relative z-10 p-3 sm:p-5 md:p-8 text-foreground backdrop-blur-sm h-full flex flex-col justify-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.h3 className="text-sm sm:text-base md:text-lg text-foreground mb-2" variants={item}>
          {title}
        </motion.h3>
        <motion.p className="text-2xl sm:text-4xl md:text-5xl font-medium mb-4 text-foreground" variants={item}>
          {value}
        </motion.p>
        {subtitle && (
          <motion.p className="text-sm text-foreground/80" variants={item}>
            {subtitle}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  )
}

export function AnimatedFeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 bg-black">
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence baseFrequency="0.4" numOctaves="2" result="noise" seed="2" type="fractalNoise" />
            <feColorMatrix in="noise" type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0.02 0.04 0.06" />
            </feComponentTransfer>
            <feComposite operator="over" in2="SourceGraphic" />
          </filter>
        </defs>
      </svg>

      <div className="container mx-auto">
        <div className="text-center mb-20 px-4">
          <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-sans mb-8 leading-snug sm:leading-snug md:leading-tight text-balance max-w-6xl mx-auto">
            <span className="font-bold text-white">An Agent for every company and creator.</span>{" "}
            <span className="font-normal text-gray-400">The best way to scale your content.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 max-w-4xl mx-auto font-normal leading-relaxed text-pretty px-2">
            Short form video has taken over social media. If you're not posting, then you're falling behind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
          <div className="md:col-span-2">
            <BentoCard
              title="No fluff. Just clips that work"
              value="Direct Integration"
              subtitle="Connect YouTube, Drive, or Dropbox. Your agent automatically detects new uploads, finds the best moments, and creates ready-to-share clips."
              colors={["#1a1a1a", "#2a2a2a", "#1f1f1f"]}
              delay={0.2}
            />
          </div>
          <BentoCard
            title="Team Collaboration"
            value="Seamless"
            subtitle="Work together efficiently"
            colors={["#151515", "#252525", "#1d1d1d"]}
            delay={0.4}
          />
          <BentoCard
            title="Lightning Performance"
            value="99.9%"
            subtitle="Uptime guaranteed"
            colors={["#1c1c1c", "#2c2c2c", "#181818"]}
            delay={0.6}
          />
          <div className="md:col-span-2">
            <BentoCard
              title="Amplify every post"
              value="Content At Scale"
              subtitle="From solo creators to global brands, Overlap delivers high-quality clips in minutes — no editing, no stress."
              colors={["#171717", "#272727", "#1b1b1b"]}
              delay={0.8}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
