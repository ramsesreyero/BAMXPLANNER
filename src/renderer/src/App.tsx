import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import React from 'react'

import DashboardView from './components/Dashboard'
import ColoniasView from './components/ColoniasView'
import InstitutionsView from './components/InstitutionsView'
import SupermarketsView from './components/SupermarketsView'
import TrucksView from './components/TrucksView'
import DriversView from './components/DriversView'
import CaridadView from './components/CaridadView'
import SettingsView from './components/SettingsView'
import MonthlyHistoryView from './components/MonthlyHistoryView'
import PlanningView from './components/PlanningView'
import { AppLayout } from './components/layout/AppLayout'

function App(): React.JSX.Element {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/colonias" element={<ColoniasView />} />
          <Route path="/instituciones" element={<InstitutionsView />} />
          <Route path="/supermercados" element={<SupermarketsView />} />
          <Route path="/unidades" element={<TrucksView />} />
          <Route path="/choferes" element={<DriversView />} />
          <Route path="/planeacion" element={<PlanningView />} />
          <Route path="/historial" element={<MonthlyHistoryView />} />
          <Route path="/caridad" element={<CaridadView />} />
          <Route path="/configuracion" element={<SettingsView />} />
        </Routes>
      </AppLayout>
    </Router>
  )
}

export default App
