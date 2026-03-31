import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import RulesPage from './pages/RulesPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/rules" element={<RulesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
