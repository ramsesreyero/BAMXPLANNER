import React, { useState, useEffect } from 'react'
import TitleBar from '../TitleBar'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    if (isDarkMode) {
      root.classList.add('dark')
      body.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      body.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const handleToggleDarkMode = (event?: React.MouseEvent) => {
    // If the browser doesn't support the View Transition API or user prefers reduced motion, fallback to basic toggle
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsDarkMode(!isDarkMode)
      return
    }

    // Capture the click coordinates to start the circular animation from there
    const x = event?.clientX ?? window.innerWidth / 2
    const y = event?.clientY ?? window.innerHeight / 2
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(async () => {
      setIsDarkMode(!isDarkMode)
      // Force layout calculation
      document.documentElement.clientHeight
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 400,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)'
        }
      )
    })
  }

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden bg-[var(--app-bg)] text-slate-900 transition-colors duration-300 dark:text-slate-100 font-inter ${isDarkMode ? 'dark' : ''}`}>
      <TitleBar isDarkMode={isDarkMode} onToggleDarkMode={handleToggleDarkMode} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-[var(--app-bg)] transition-colors duration-300">


          <div className="relative flex-1 overflow-y-auto overflow-x-hidden p-6 scroll-smooth">
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
