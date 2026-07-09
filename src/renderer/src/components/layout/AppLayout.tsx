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

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden bg-[var(--app-bg)] text-slate-900 transition-colors duration-300 dark:text-slate-100 font-inter ${isDarkMode ? 'dark' : ''}`}>
      <TitleBar isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />

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
