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
    <div className={`flex flex-col h-screen w-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-inter transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      <TitleBar isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F1F5F9]/50 dark:bg-slate-900/50">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 dark:bg-orange-500/10 blur-[120px] -mr-64 -mt-64 pointer-events-none" />

          {/* Status Bar */}
          <div className="h-16 flex items-center px-10 shrink-0 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <span className="w-2 h-2 rounded-full bg-orange-500 block" />
                <span className="absolute inset-0 w-2 h-2 rounded-full bg-orange-500 animate-ping opacity-75" />
              </div>
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 tracking-[0.3em] uppercase">
                Sistema de Inteligencia Logística Activo
              </span>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto relative scroll-smooth overflow-x-hidden">
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
