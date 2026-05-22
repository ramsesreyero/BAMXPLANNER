import React from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xl z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.3)] border border-white/40 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800/50 relative flex items-center gap-6 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-red-600 dark:bg-red-500 text-white flex items-center justify-center shrink-0 shadow-2xl shadow-red-200 dark:shadow-none ring-4 ring-red-50 dark:ring-red-900/20">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                            {title}
                        </h3>
                        <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em] mt-1">Acción Requerida</p>
                    </div>
                </div>
                <div className="p-10">
                    <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="p-8 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-bold hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all uppercase text-xs tracking-widest border border-transparent hover:border-slate-200"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            onConfirm()
                            onCancel()
                        }}
                        className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-red-100 dark:shadow-none hover:bg-red-700 active:scale-[0.98] transition-all uppercase text-xs tracking-[0.2em]"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default ConfirmModal
