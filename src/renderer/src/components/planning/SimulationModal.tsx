import React from 'react'
import { createPortal } from 'react-dom'
import { X, Map as MapIcon } from 'lucide-react'
import { MapVisualizer } from '../MapVisualizer'
import { RouteStop } from '../../utils/geneticRouting'

interface SimulationModalProps {
  isOpen: boolean
  onClose: () => void
  isOptimizing: boolean
  optimizedRoute: RouteStop[]
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  isOptimizing,
  optimizedRoute
}) => {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-[85vw] h-[80vh] bg-white/90 backdrop-blur-3xl rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col pointer-events-auto">
        <div className="p-10 border-b border-white/10 relative bg-slate-950 text-white shrink-0 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-900/20 ring-4 ring-white/5">
              <MapIcon className="text-white" size={32} />
            </div>
            <div>
              <h3 className="text-4xl heading-premium tracking-tighter">
                Rastreo <span className="text-blue-500">Logístico</span>
              </h3>
              <p className="text-slate-400 mt-1 font-medium text-lg opacity-80">
                Optimización heurística A.G. en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-10 right-10 text-slate-500 hover:text-white transition-all w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-2xl border border-transparent hover:border-white/10 shadow-lg"
          >
            <X size={28} />
          </button>
        </div>
        <div className="flex-1 bg-slate-50 p-6 overflow-hidden min-h-0 relative flex">
          {isOptimizing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-[10001]">
              <div className="relative">
                <div className="w-20 h-20 border-8 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-xs mt-6">
                Computando Rutas...
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-row overflow-hidden rounded-[3rem] shadow-inner border border-slate-200">
              <MapVisualizer route={optimizedRoute} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
