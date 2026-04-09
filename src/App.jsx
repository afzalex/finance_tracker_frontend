import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import RootLayout from './components/RootLayout'
import StartupGate from './components/StartupGate'
import AppShell from './components/AppShell'
import { AppMetaProvider } from './contexts/AppMetaContext'
import { DateRangeProvider } from './contexts/DateRangeContext'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import UnparsedEmails from './pages/UnparsedEmails'
import GmailOauthCallback from './pages/GmailOauthCallback'
import NotFound from './pages/NotFound'


function App() {
  return (
    <AppMetaProvider>
      <DateRangeProvider>
        <Routes>
          <Route element={<RootLayout />}>
          <Route path="oauth/gmail/callback" element={<GmailOauthCallback />} />

          <Route element={<StartupGate />}>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="transactions/:transactionId" element={<Transactions />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="accounts/:accountId" element={<Accounts />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="emails/unparsed" element={<UnparsedEmails />} />
              <Route path="emails/unparsed/:mailId" element={<UnparsedEmails />} />
              <Route path="settings" element={<Navigate to="/settings/classifications" replace />} />
              <Route path="settings/rules" element={<Navigate to="/settings/classifications" replace />} />
              <Route path="settings/classifications" element={<Settings />} />
              <Route path="settings/classifications/:classificationId" element={<Settings />} />
              <Route path="settings/parsers" element={<Settings />} />
              <Route path="settings/parsers/:parserId" element={<Settings />} />
              <Route path="settings/exclusions" element={<Settings />} />
              <Route path="settings/exclusions/:exclusionRuleId" element={<Settings />} />
              <Route path="settings/app-config" element={<Navigate to="/settings/system" replace />} />
              <Route path="settings/system" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
        </Routes>
      </DateRangeProvider>
    </AppMetaProvider>
  )
}

export default App
