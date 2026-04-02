import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Portal,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MessageType as ApiMessageType } from '../../api'
import useResource from '../../hooks/useResource'
import LoadingBlock from '../LoadingBlock'
import SortableTableHeaderCell from '../SortableTableHeaderCell'
import {
  createClassification,
  deactivateClassification,
  listClassifications,
  patchClassification,
} from '../../services/rulesApi'
import { formatDateTime } from '../../utils/format'
import { leaveReturnCopy, parseSafeReturnToParam } from '../../utils/safeReturnTo'

function nullableString(v) {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

function toNullablePriority(v) {
  const s = String(v ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export default function ClassificationsSection({
  showInactive,
  routeId,
  routeCreate = false,
  onOpenRule,
  onCloseRule,
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const safeReturnPath = useMemo(
    () => parseSafeReturnToParam(searchParams.get('returnTo')),
    [searchParams],
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const [mutationError, setMutationError] = useState(null)
  const [errorSnack, setErrorSnack] = useState({ open: false, message: '' })
  const [snack, setSnack] = useState({ open: false, message: '' })

  const resourceKey = `rules:classifications:${showInactive}:${refreshKey}`
  const { status, data, error } = useResource(resourceKey, () =>
    listClassifications(),
  )

  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('asc')

  const classifications = useMemo(() => {
    const items = data ?? []
    if (showInactive) return items
    return items.filter((c) => c.is_active)
  }, [data, showInactive])

  const sortedClassifications = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const copy = [...classifications]
    copy.sort((a, b) => {
      if (sortBy === 'id') return (a.id - b.id) * dir
      if (sortBy === 'name') return String(a.name ?? '').localeCompare(String(b.name ?? '')) * dir
      if (sortBy === 'priority') return ((a.priority ?? 0) - (b.priority ?? 0)) * dir
      if (sortBy === 'updated_at') return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir
      return 0
    })
    return copy
  }, [classifications, sortBy, sortDir])

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(key)
    setSortDir('asc')
  }

  const [dialog, setDialog] = useState({
    open: false,
    mode: 'create',
    rule: null,
  })

  const emptyForm = useMemo(
    () => ({
      message_type: '',
      name: '',
      priority: '',
      is_active: true,
      subject_match_regex: '',
      subject_extract_regex: '',
      sender_match_regex: '',
      body_match_regex: '',
      body_extract_regex: '',
      snippet_extract_regex: '',
    }),
    [],
  )

  const [form, setForm] = useState(emptyForm)

  const performCloseDialog = () => {
    const wasEdit = dialog.mode === 'edit'
    const wasCreateFromRoute = dialog.mode === 'create' && routeCreate
    setDialog({ open: false, mode: 'create', rule: null })
    if (wasEdit || wasCreateFromRoute) onCloseRule?.()
  }

  const [leaveReturnDialog, setLeaveReturnDialog] = useState({
    open: false,
    path: null,
    variant: null,
    staySnack: null,
  })

  const handleLeaveReturnStay = () => {
    const variant = leaveReturnDialog.variant
    const snack = leaveReturnDialog.staySnack
    setLeaveReturnDialog({
      open: false,
      path: null,
      variant: null,
      staySnack: null,
    })
    if (searchParams.get('returnTo')) {
      const next = new URLSearchParams(searchParams)
      next.delete('returnTo')
      setSearchParams(next, { replace: true })
    }
    if (variant === 'dismiss') performCloseDialog()
    if (snack) setSnack({ open: true, message: snack })
  }

  const handleLeaveReturnContinue = () => {
    const path = leaveReturnDialog.path
    const variant = leaveReturnDialog.variant
    setLeaveReturnDialog({
      open: false,
      path: null,
      variant: null,
      staySnack: null,
    })
    if (variant === 'dismiss') performCloseDialog()
    if (path) navigate(path)
  }

  const requestDismissClassificationDialog = () => {
    if (!safeReturnPath) {
      performCloseDialog()
      return
    }
    setLeaveReturnDialog({
      open: true,
      path: safeReturnPath,
      variant: 'dismiss',
      staySnack: null,
    })
  }

  const openCreate = () => {
    setMutationError(null)
    setForm(emptyForm)
    setDialog({ open: true, mode: 'create', rule: null })
  }

  useEffect(() => {
    if (!routeCreate) return
    openCreate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCreate])

  useEffect(() => {
    if (routeCreate) return
    if (!dialog.open || dialog.mode !== 'create') return
    setDialog({ open: false, mode: 'create', rule: null })
  }, [routeCreate, dialog.open, dialog.mode])

  const openEdit = (rule, { syncUrl } = { syncUrl: true }) => {
    setMutationError(null)
    setForm({
      message_type: rule.message_type ?? '',
      name: rule.name ?? '',
      priority: rule.priority != null ? String(rule.priority) : '',
      is_active: Boolean(rule.is_active),
      subject_match_regex: rule.subject_match_regex ?? '',
      subject_extract_regex: rule.subject_extract_regex ?? '',
      sender_match_regex: rule.sender_match_regex ?? '',
      body_match_regex: rule.body_match_regex ?? '',
      body_extract_regex: rule.body_extract_regex ?? '',
      snippet_extract_regex: rule.snippet_extract_regex ?? '',
    })
    setDialog({ open: true, mode: 'edit', rule })
    if (syncUrl) onOpenRule?.(rule.id)
  }

  useEffect(() => {
    if (routeId == null) return
    const rule = classifications.find((c) => c.id === routeId)
    if (!rule) return
    if (dialog.open && dialog.mode === 'edit' && dialog.rule?.id === routeId) return
    openEdit(rule, { syncUrl: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, classifications])

  useEffect(() => {
    // If the URL no longer points at a specific classification, close the edit dialog.
    if (routeId != null) return
    if (!dialog.open || dialog.mode !== 'edit') return
    setDialog({ open: false, mode: 'create', rule: null })
  }, [routeId, dialog.open, dialog.mode])

  const [deactivateState, setDeactivateState] = useState({
    open: false,
    rule: null,
  })
  const [deactivateFromEdit, setDeactivateFromEdit] = useState(false)
  const closeDeactivate = () => {
    setDeactivateFromEdit(false)
    setDeactivateState({ open: false, rule: null })
  }

  const buildClassificationPayload = () => {
    const payload = {
      message_type: String(form.message_type ?? '').trim(),
      name: String(form.name ?? '').trim(),
      is_active: Boolean(form.is_active),
      subject_match_regex: nullableString(form.subject_match_regex),
      subject_extract_regex: nullableString(form.subject_extract_regex),
      sender_match_regex: nullableString(form.sender_match_regex),
      body_match_regex: nullableString(form.body_match_regex),
      body_extract_regex: nullableString(form.body_extract_regex),
      snippet_extract_regex: nullableString(form.snippet_extract_regex),
    }

    const priority = toNullablePriority(form.priority)
    if (form.priority.trim() === '') {
      // omit priority on create; patch can still clear via explicit delete
      if (dialog.mode === 'edit') payload.priority = null
    } else {
      payload.priority = priority
    }

    return payload
  }

  const validateForm = () => {
    const messageType = String(form.message_type ?? '').trim()
    const name = String(form.name ?? '').trim()
    const prio = String(form.priority ?? '').trim()
    if (!messageType) return 'Message Type is required.'
    if (!name) return 'Name is required.'
    if (prio) {
      const n = Number(prio)
      if (!Number.isFinite(n) || n < 1 || n > 100) return 'Priority must be between 1 and 100.'
    }
    return null
  }

  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setMutationError(validationError)
      setErrorSnack({ open: true, message: validationError })
      return
    }

    if (
      dialog.mode === 'edit' &&
      dialog.rule?.is_active === true &&
      form.is_active === false
    ) {
      setDeactivateFromEdit(true)
      setDeactivateState({ open: true, rule: dialog.rule })
      return
    }

    setSaving(true)
    setMutationError(null)

    try {
      const payload = buildClassificationPayload()
      const successMessage = dialog.mode === 'create' ? 'Created.' : 'Updated.'
      if (dialog.mode === 'create') {
        await createClassification(payload)
      } else {
        await patchClassification(dialog.rule.id, payload)
      }
      performCloseDialog()
      setRefreshKey((x) => x + 1)
      if (safeReturnPath) {
        setLeaveReturnDialog({
          open: true,
          path: safeReturnPath,
          variant: 'afterSave',
          staySnack: successMessage,
        })
      } else {
        setSnack({ open: true, message: successMessage })
      }
    } catch (e) {
      const msg = e?.message ?? 'Request failed'
      setMutationError(msg)
      setErrorSnack({ open: true, message: msg })
    } finally {
      setSaving(false)
    }
  }

  const [deactivating, setDeactivating] = useState(false)

  const confirmDeactivate = async () => {
    if (!deactivateState.rule) return
    setDeactivating(true)
    setMutationError(null)
    try {
      await deactivateClassification(deactivateState.rule.id)
      closeDeactivate()
      const fromEdit = deactivateFromEdit
      if (fromEdit) {
        setDeactivateFromEdit(false)
        performCloseDialog()
      }
      setRefreshKey((x) => x + 1)
      if (fromEdit && safeReturnPath) {
        setLeaveReturnDialog({
          open: true,
          path: safeReturnPath,
          variant: 'afterDeactivate',
          staySnack: 'Deactivated.',
        })
      } else {
        setSnack({ open: true, message: 'Deactivated.' })
      }
    } catch (e) {
      const msg = e?.message ?? 'Request failed'
      setMutationError(msg)
      setErrorSnack({ open: true, message: msg })
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <>
      {error && <Alert severity="error">{error}</Alert>}
      {status === 'loading' ? (
        <LoadingBlock />
      ) : (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" aria-label="classifications table">
            <TableHead>
              <TableRow>
                <SortableTableHeaderCell
                  sortDirection={sortBy === 'id' ? sortDir : false}
                  active={sortBy === 'id'}
                  direction={sortBy === 'id' ? sortDir : 'asc'}
                  onSort={() => toggleSort('id')}
                >
                  ID
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  sortDirection={sortBy === 'name' ? sortDir : false}
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortDir : 'asc'}
                  onSort={() => toggleSort('name')}
                >
                  Name
                </SortableTableHeaderCell>
                <TableCell>Message Type</TableCell>
                <SortableTableHeaderCell
                  align="right"
                  sortDirection={sortBy === 'priority' ? sortDir : false}
                  active={sortBy === 'priority'}
                  direction={sortBy === 'priority' ? sortDir : 'asc'}
                  onSort={() => toggleSort('priority')}
                >
                  Priority
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  sortDirection={sortBy === 'updated_at' ? sortDir : false}
                  active={sortBy === 'updated_at'}
                  direction={sortBy === 'updated_at' ? sortDir : 'asc'}
                  onSort={() => toggleSort('updated_at')}
                >
                  Updated
                </SortableTableHeaderCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedClassifications.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  onClick={(e) => {
                    // Avoid focus staying on a row while the app root is aria-hidden by the Dialog.
                    e.currentTarget.blur()
                    openEdit(c)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.currentTarget.blur()
                      openEdit(c)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Edit classification ${c.name}`}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{c.id}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {c.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{c.message_type}</TableCell>
                  <TableCell align="right">{c.priority}</TableCell>
                  <TableCell>{formatDateTime(c.updated_at)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={c.is_active ? 'success' : 'default'}
                      variant={c.is_active ? 'filled' : 'outlined'}
                      label={c.is_active ? 'Active' : 'Inactive'}
                      sx={{ userSelect: 'none' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {classifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No classifications found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog
        open={dialog.open}
        onClose={() => requestDismissClassificationDialog()}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { position: 'relative', overflow: 'visible' } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <span>
            {dialog.mode === 'create'
              ? 'Create classification'
              : 'Edit classification'}
          </span>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />
            }
            label="Active"
            sx={{ m: 0, userSelect: 'none' }}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ position: 'relative' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              Core
            </Typography>
            <StackFormGrid>
              <TextField
                size="small"
                label="Message Type"
                value={form.message_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message_type: e.target.value }))
                }
                required
                fullWidth
                select
              >
                {Object.values(ApiMessageType).map((v) => (
                  <MenuItem key={v} value={v}>
                    {v.replaceAll('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                size="small"
                label="Priority"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
                fullWidth
                type="number"
                inputProps={{ min: 1, max: 100, step: 1, inputMode: 'numeric' }}
              />
            </StackFormGrid>

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">
              Subject / Sender
            </Typography>
            <StackFormGrid>
              <TextField
                size="small"
                label="Subject Match Regex"
                value={form.subject_match_regex}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    subject_match_regex: e.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={3}
              />
              <TextField
                size="small"
                label="Subject Extract Regex"
                value={form.subject_extract_regex}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    subject_extract_regex: e.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={3}
              />
              <TextField
                size="small"
                label="Sender Match Regex"
                value={form.sender_match_regex}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sender_match_regex: e.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={3}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
            </StackFormGrid>

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">
              Body / Snippet
            </Typography>
            <StackFormGrid>
              <TextField
                size="small"
                label="Body Match Regex"
                value={form.body_match_regex}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    body_match_regex: e.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={3}
              />
              <TextField
                size="small"
                value={form.snippet_extract_regex}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    snippet_extract_regex: e.target.value,
                  }))
                }
                label="Snippet Extract Regex"
                fullWidth
                multiline
                minRows={3}
              />
              <TextField
                size="small"
                label="Body Extract Regex"
                value={form.body_extract_regex}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    body_extract_regex: e.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={3}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
            </StackFormGrid>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ gap: 1 }}>
          <Button
            size="small"
            onClick={requestDismissClassificationDialog}
            disabled={saving}
            variant="outlined"
          >
            Cancel
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" variant="contained" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : dialog.mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>

        <Snackbar
          open={errorSnack.open}
          autoHideDuration={4000}
          onClose={() => setErrorSnack({ open: false, message: '' })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          sx={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            right: 'auto',
            zIndex: (theme) => theme.zIndex.modal + 1,
          }}
        >
          <Alert
            severity="error"
            variant="filled"
            onClose={() => setErrorSnack({ open: false, message: '' })}
            sx={{ alignItems: 'center' }}
          >
            {errorSnack.message}
          </Alert>
        </Snackbar>
      </Dialog>

      <Dialog
        open={leaveReturnDialog.open}
        onClose={handleLeaveReturnStay}
        maxWidth="sm"
      >
        <DialogTitle>
          {leaveReturnDialog.path && leaveReturnDialog.variant
            ? leaveReturnCopy(leaveReturnDialog.path, leaveReturnDialog.variant).title
            : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            {leaveReturnDialog.path && leaveReturnDialog.variant
              ? leaveReturnCopy(leaveReturnDialog.path, leaveReturnDialog.variant).body
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={handleLeaveReturnStay}>
            Stay here
          </Button>
          <Button size="small" variant="contained" onClick={handleLeaveReturnContinue}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deactivateState.open} onClose={closeDeactivate} maxWidth="sm">
        <DialogTitle>Deactivate classification?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            This will set <code>is_active</code> to false for this rule. Rows are kept in
            the database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" onClick={closeDeactivate} disabled={deactivating}>
            Cancel
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={confirmDeactivate}
            disabled={deactivating}
          >
            {deactivating ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      <Portal>
        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack({ open: false, message: '' })}
          message={snack.message}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 16,
            zIndex: (theme) => theme.zIndex.snackbar,
          }}
        />
      </Portal>

    </>
  )
}

function StackFormGrid({ children }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      }}
    >
      {children}
    </Box>
  )
}

