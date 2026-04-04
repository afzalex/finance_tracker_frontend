import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { AccountType as ApiAccountType } from '../api'
import LoadingBlock from './LoadingBlock'
import { upsertAccount } from '../services/financeApi'

function nullableString(v) {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

function formatEnumLabel(v) {
  return String(v ?? '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AccountDetailDialog({
  open,
  onClose,
  account,
  listStatus,
  decodedAccountId,
  onSaved,
}) {
  const [displayName, setDisplayName] = useState('')
  const [provider, setProvider] = useState('')
  const [accountType, setAccountType] = useState('')
  const [conflictIdx, setConflictIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errorSnack, setErrorSnack] = useState({ open: false, message: '' })

  const conflicts = useMemo(() => {
    const raw = account?.raw?._conflict
    return Array.isArray(raw) && raw.length > 0 ? raw : null
  }, [account])

  const hasConflict = conflicts != null

  const accountTypeEnumSet = useMemo(
    () => new Set(Object.values(ApiAccountType)),
    [],
  )

  const accountTypeSelectValues = useMemo(() => {
    const base = Object.values(ApiAccountType)
    const cur = String(accountType ?? '').trim()
    if (cur && !accountTypeEnumSet.has(cur)) {
      return [cur, ...base]
    }
    return base
  }, [accountType, accountTypeEnumSet])

  useEffect(() => {
    if (!open || !account) return
    setDisplayName(account.name ?? '')
    if (hasConflict && conflicts.length > 0) {
      const c = conflicts[0]
      setProvider(String(c.provider ?? '').trim())
      setAccountType(String(c.account_type ?? '').trim())
      setConflictIdx(0)
    } else {
      setProvider(String(account.provider ?? '').trim())
      const t = account.type
      setAccountType(t && String(t).trim() !== '—' ? String(t).trim() : '')
    }
  }, [open, account, hasConflict, conflicts])

  const applyConflictSlice = useCallback(
    (idx) => {
      const c = conflicts?.[idx]
      if (!c) return
      setConflictIdx(idx)
      setProvider(String(c.provider ?? '').trim())
      setAccountType(String(c.account_type ?? '').trim())
    },
    [conflicts],
  )

  const handleSave = async () => {
    if (!account) return
    const prov = String(provider ?? '').trim()
    if (!prov) {
      setErrorSnack({ open: true, message: 'Provider is required.' })
      return
    }
    setSaving(true)
    try {
      await upsertAccount({
        account_id: account.account_id,
        provider: prov,
        account_type: nullableString(accountType),
        display_name: nullableString(displayName),
      })
      onSaved?.()
      onClose()
    } catch (e) {
      setErrorSnack({ open: true, message: e?.message ?? 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const loading = listStatus === 'loading'
  const notFound = listStatus === 'success' && !account && open

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle>Account</DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <LoadingBlock />
          ) : notFound ? (
            <Alert severity="warning">
              No account with ID <code>{decodedAccountId}</code> appears in the current list.
              It may have been removed or the ID may be wrong.
            </Alert>
          ) : account ? (
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <TextField
                size="small"
                label="Account ID"
                value={account.account_id}
                fullWidth
                disabled
                InputProps={{
                  sx: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  },
                }}
              />

              {hasConflict ? (
                <>
                  <Alert severity="info">
                    Multiple provider / type slices map to this account. Pick the one that should
                    own metadata (display name is stored with that pair).
                  </Alert>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="acc-conflict-slice-label">Provider &amp; account type</InputLabel>
                    <Select
                      labelId="acc-conflict-slice-label"
                      label="Provider & account type"
                      value={conflictIdx}
                      onChange={(e) => applyConflictSlice(Number(e.target.value))}
                    >
                      {conflicts.map((c, i) => (
                        <MenuItem key={i} value={i}>
                          {String(c.provider ?? '—')} ·{' '}
                          {c.account_type != null && String(c.account_type).trim() !== ''
                            ? formatEnumLabel(c.account_type)
                            : '—'}{' '}
                          ({c.count ?? 0} tx)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              ) : (
                <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
                  <TextField
                    size="small"
                    label="Provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    fullWidth
                    required
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel id="acc-type-label">Account type</InputLabel>
                    <Select
                      labelId="acc-type-label"
                      label="Account type"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Unset</em>
                      </MenuItem>
                      {accountTypeSelectValues.map((v) => (
                        <MenuItem key={v} value={v}>
                          {formatEnumLabel(v)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}

              <TextField
                size="small"
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                placeholder="Friendly label for this account"
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button size="small" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          {!loading && !notFound && account ? (
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={errorSnack.open}
        autoHideDuration={5000}
        onClose={() => setErrorSnack({ open: false, message: '' })}
        message={errorSnack.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}
