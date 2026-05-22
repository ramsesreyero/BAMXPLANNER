import React from 'react'
import { Minus, Square, X, Sun, Moon, Heart } from 'lucide-react'

interface TitleBarProps {
    isDarkMode: boolean
    onToggleDarkMode: () => void
}

const TitleBar: React.FC<TitleBarProps> = ({ isDarkMode, onToggleDarkMode }) => {
    const handleMinimize = () => window.api.window.minimize()
    const handleMaximize = () => window.api.window.maximize()
    const handleClose = () => window.api.window.close()

    return (
        <div className="h-10 bg-white dark:bg-slate-950 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between select-none shrink-0 z-50">
            {/* Area arrastrable */}
            <div
                className="flex-1 h-full flex items-center px-4 gap-3 cursor-default"
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                <div className="w-5 h-5 bg-gradient-to-tr from-orange-600 to-red-600 rounded-md flex items-center justify-center shadow-sm">
                    <Heart className="text-white" size={12} fill="currentColor" />
                </div>
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    BAMX <span className="text-orange-600 dark:text-orange-400">Planner</span>
                </span>
            </div>

            {/* Botones de control - No arrastrable */}
            <div
                className="flex items-center h-full"
                style={{ WebkitAppRegion: 'no-drag' } as any}
            >
                <button
                    onClick={onToggleDarkMode}
                    className="h-full px-4 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                >
                    {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                </button>

                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                <button
                    onClick={handleMinimize}
                    className="h-full px-4 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 text-slate-400 hover:bg-red-500 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    )
}

export default TitleBar
