import { useState } from 'react';
import ColoniasView from './ColoniasView';
import InstitutionsView from './InstitutionsView';
import SupermarketsView from './SupermarketsView';
import CaridadView from './CaridadView';
import WarehouseView from './WarehouseView';

const CatalogsView = () => {
  const [activeTab, setActiveTab] = useState('colonias');

  const tabs = [
    { id: 'colonias', label: 'Colonias' },
    { id: 'supermercados', label: 'Puntos Súper' },
    { id: 'instituciones', label: 'Instituciones' },
    { id: 'caridad', label: 'Ruta de la Caridad' },
    { id: 'almacen', label: 'Almacén CORE' },
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Modern Catalog Tabs Header */}
      <div className="flex items-center px-6 overflow-x-auto scrollbar-hide bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border-b border-white/60 dark:border-white/10 pt-4 rounded-t-3xl shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 font-black tracking-tight text-sm uppercase transition-all relative whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Embedded View */}
      <div className="flex-1 h-full py-4 -mx-1 px-1">
        {activeTab === 'colonias' && <ColoniasView />}
        {activeTab === 'supermercados' && <SupermarketsView />}
        {activeTab === 'instituciones' && <InstitutionsView />}
        {activeTab === 'caridad' && <CaridadView />}
        {activeTab === 'almacen' && <WarehouseView />}
      </div>
    </div>
  );
};

export default CatalogsView;
