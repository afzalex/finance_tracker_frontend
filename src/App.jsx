import { Route, Routes } from 'react-router-dom'
import RootLayout from './components/RootLayout'
import StartupGate from './components/StartupGate'
import AppShell from './components/AppShell'
import { AppMetaProvider } from './contexts/AppMetaContext'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import RulesPage from './pages/RulesPage'
import UnparsedEmails from './pages/UnparsedEmails'
import GmailOauthCallback from './pages/GmailOauthCallback'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AppMetaProvider>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="oauth/gmail/callback" element={<GmailOauthCallback />} />

          <Route element={<StartupGate />}>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="transactions/:transactionId" element={<Transactions />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="emails/unparsed" element={<UnparsedEmails />} />
              <Route path="emails/unparsed/:mailId" element={<UnparsedEmails />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/rules" element={<RulesPage />} />
              <Route
                path="settings/rules/classifications/:classificationId"
                element={<RulesPage />}
              />
              <Route
                path="settings/rules/parsers/:parserId"
                element={<RulesPage />}
              />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AppMetaProvider>
  )
}

export default App
