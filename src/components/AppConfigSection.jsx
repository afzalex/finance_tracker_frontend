import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { getAppConfig, listMailAccounts, updateAppConfig } from '../services/financeApi'

export default function AppConfigSection() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  const [mailAccountId, setMailAccountId] = useState(0)
  const [mailAccountEmail, setMailAccountEmail] = useState('')
  
  const [pollSeconds, setPollSeconds] = useState('')
  const [lookbackDays, setLookbackDays] = useState('')
  const [gmailLabels, setGmailLabels] = useState('')

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      try {
        const accounts = await listMailAccounts()
        const primary = accounts.find(a => a.is_active && a.provider === 'gmail') || accounts[0]
        const pId = primary?.id || 0
        const pEmail = primary?.account_mail_id || ''
        
        const sysConf = await getAppConfig(0)
        let mailConf = []
        if (pId !== 0) {
           mailConf = await getAppConfig(pId)
        }

        if (active) {
           setMailAccountId(pId)
           setMailAccountEmail(pEmail)
           setPollSeconds(sysConf.find(c => c.key === 'app.mail.poll_seconds')?.value ?? '')
           setLookbackDays(sysConf.find(c => c.key === 'app.mail.initial_lookback_days')?.value ?? '')
           
           const mLabel = mailConf.find(c => c.key === 'app.mail.gmail.labels')?.value
           const sLabel = sysConf.find(c => c.key === 'app.mail.gmail.labels')?.value
           setGmailLabels(mLabel ?? sLabel ?? '')
           setLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load configuration')
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => { active = false }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (pollSeconds !== '') await updateAppConfig('app.mail.poll_seconds', pollSeconds, 0)
      if (lookbackDays !== '') await updateAppConfig('app.mail.initial_lookback_days', lookbackDays, 0)
      if (gmailLabels !== '' && mailAccountId !== 0) {
        await updateAppConfig('app.mail.gmail.labels', gmailLabels, mailAccountId)
      }
      
      // Flash success optionally, or just re-read? For now we just stay put.
    } catch (err) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage intervals and mailbox settings.
      </Typography>

      {loading ? (
        <CircularProgress size={24} sx={{ mt: 2 }} />
      ) : (
        <Stack spacing={2} sx={{ maxWidth: 600 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <TextField
            label="Poll interval (seconds)"
            variant="outlined"
            size="small"
            value={pollSeconds}
            onChange={(e) => setPollSeconds(e.target.value)}
            helperText="Frequency for incremental ingest"
          />

          <TextField
            label="Lookback (days)"
            variant="outlined"
            size="small"
            value={lookbackDays}
            onChange={(e) => setLookbackDays(e.target.value)}
            helperText="How far back to fetch initially"
          />

          <TextField
            label="Gmail Labels"
            variant="outlined"
            size="small"
            value={gmailLabels}
            onChange={(e) => setGmailLabels(e.target.value)}
            helperText={`Comma separated labels (e.g. INBOX,Finance)${mailAccountEmail ? ` for ${mailAccountEmail}` : ''}`}
            disabled={mailAccountId === 0}
          />

          <Box>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Box>
        </Stack>
      )}
    </>
  )
}
