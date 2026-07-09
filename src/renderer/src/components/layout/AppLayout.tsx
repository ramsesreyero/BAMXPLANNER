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
    <div className={`flex flex-col h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-inter transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      <TitleBar isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-100 dark:bg-slate-900/50">


          <div className="flex-1 p-6 overflow-y-auto relative scroll-smooth overflow-x-hidden">
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
