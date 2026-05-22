import { useState } from 'react';
import TrucksView from './fleet/TrucksView';
import DriversView from './fleet/DriversView';

const FleetView = () => {
  const [activeTab, setActiveTab] = useState('unidades');

  const tabs = [
    { id: 'unidades', label: 'Unidades & Recurso Móvil' },
    { id: 'choferes', label: 'Registro de Operadores' },
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Modern Fleet Tabs Header */}
      <div className="flex items-center px-6 overflow-x-auto scrollbar-hide bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border-b border-white/60 dark:border-white/10 pt-4 rounded-t-3xl shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 font-black tracking-tight text-sm uppercase transition-all relative whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-orange-600 dark:text-orange-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800 rounded-t-full shadow-[0_0_10px_rgba(30,41,59,0.5)]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 py-4 -mx-1 px-1">
        {activeTab === 'unidades' && <TrucksView />}
        {activeTab === 'choferes' && <DriversView />}
      </div>
    </div>
  );
};

export default FleetView;
