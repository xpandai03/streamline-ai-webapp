"use client"

import { useState, useEffect } from "react"
import { LeLoLogo } from "./lelo-logo"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out
        ${isScrolled ? "bg-black/80 backdrop-blur-md border-b border-white/10" : "bg-transparent"}
      `}
    >
      <div className="container mx-auto px-4 py-3 md:py-4 flex justify-center items-center">
        <LeLoLogo />
      </div>
    </header>
  )
}
