import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Portal,
  Snackbar,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { MessageType as ApiMessageType } from '../../api'
import useDetailDialogSlotProps from '../../hooks/useDetailDialogSlotProps'
import useResource from '../../hooks/useResource'
import { dialogActionsCompactSx } from '../../utils/dialogActionsCompactSx'
import {
  layoutSectionSpacing,
  tableHorizontalScrollSx,
  tableSmallScreenTextSx,
} from '../../utils/responsiveTable'
import LoadingBlock from '../LoadingBlock'
import SortableTableHeaderCell from '../SortableTableHeaderCell'
import {
  createClassification,
  deactivateClassification,
  listClassifications,
  patchClassification,
} from '../../services/rulesApi'
import {
  MATCH_PREVIEW_FALLBACK_WINDOW,
  MATCH_PREVIEW_LIMIT,
  matcherMailPreviewTriggerSx,
  useRuleMatcherPreview,
} from '../../hooks/useRuleMatcherPreview'
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

/** Persisted in URL on the rules page (same pattern as transactions `sort`). */
const CLS_SORT_Q = 'c_sort'

const CLS_SORT_COL = {
  id: 'id',
  name: 'name',
  message_type: 'message_type',
  priority: 'priority',
  mail_count: 'mail_count',
  status: 'status',
}

const CLS_SORT_FIELDS = Object.values(CLS_SORT_COL)

function parseClassificationsSortParam(sp) {
  const raw = sp.get(CLS_SORT_Q)
  const defaults = { sortBy: CLS_SORT_COL.id, sortDir: 'asc' }
  if (!raw) return defaults
  const i = raw.lastIndexOf(':')
  if (i < 1) return defaults
  let by = raw.slice(0, i)
  const dir = raw.slice(i + 1)
  if (by === 'updated_at') by = CLS_SORT_COL.mail_count
  if (!CLS_SORT_FIELDS.includes(by)) return defaults
  if (dir !== 'asc' && dir !== 'desc') return defaults
  return { sortBy: by, sortDir: dir }
}

function isDefaultClassificationsSort(sortBy, sortDir) {
  return sortBy === CLS_SORT_COL.id && sortDir === 'asc'
}

function defaultDirForClassificationsSortKey(key) {
  if (
    key === CLS_SORT_COL.mail_count ||
    key === CLS_SORT_COL.priority
  ) {
    return 'desc'
  }
  return 'asc'
}

export default function ClassificationsSection({
  showInactive,
  searchQuery = '',
  routeId,
  routeCreate = false,
  onOpenRule,
  onCloseRule,
}) {
  const theme = useTheme()
  const detailSlotProps = useDetailDialogSlotProps()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const safeReturnPath = useMemo(
    () => parseSafeReturnToParam(searchParams.get('returnTo')),
    [searchParams],
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const [_mutationError, setMutationError] = useState(null)
  const [errorSnack, setErrorSnack] = useState({ open: false, message: '' })
  const [snack, setSnack] = useState({ open: false, message: '' })

  const resourceKey = `rules:classifications:${showInactive}:${refreshKey}`
  const { status, data, error } = useResource(resourceKey, () =>
    listClassifications(),
  )

  const { sortBy, sortDir } = useMemo(
    () => parseClassificationsSortParam(searchParams),
    [searchParams],
  )

  const classifications = useMemo(() => {
    let items = data ?? []
    if (!showInactive) items = items.filter((c) => c.is_active)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter((c) =>
        String(c.name ?? '').toLowerCase().includes(q),
      )
    }
    return items
  }, [data, showInactive, searchQuery])

  const sortedClassifications = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const copy = [...classifications]
    copy.sort((a, b) => {
      if (sortBy === CLS_SORT_COL.id) return (a.id - b.id) * dir
      if (sortBy === CLS_SORT_COL.name)
        return String(a.name ?? '').localeCompare(String(b.name ?? '')) * dir
      if (sortBy === CLS_SORT_COL.message_type)
        return String(a.message_type ?? '').localeCompare(String(b.message_type ?? '')) * dir
      if (sortBy === CLS_SORT_COL.priority)
        return ((a.priority ?? 0) - (b.priority ?? 0)) * dir
      if (sortBy === CLS_SORT_COL.mail_count)
        return ((a.mail_count ?? 0) - (b.mail_count ?? 0)) * dir
      if (sortBy === CLS_SORT_COL.status) {
        const ra = a.is_active ? 0 : 1
        const rb = b.is_active ? 0 : 1
        return (ra - rb) * dir
      }
      return 0
    })
    return copy
  }, [classifications, sortBy, sortDir])

  const toggleSort = useCallback(
    (key) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev)
          const cur = parseClassificationsSortParam(sp)
          let nextBy = key
          let nextDir = cur.sortDir
          if (cur.sortBy === key) {
            nextDir = cur.sortDir === 'asc' ? 'desc' : 'asc'
          } else {
            nextBy = key
            nextDir = defaultDirForClassificationsSortKey(key)
          }
          if (isDefaultClassificationsSort(nextBy, nextDir)) sp.delete(CLS_SORT_Q)
          else sp.set(CLS_SORT_Q, `${nextBy}:${nextDir}`)
          return sp
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

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

  const {
    hasContextMail,
    previewEnabled,
    setPreviewEnabled,
    previewState,
    setPreviewState,
    fetchMatchingMailsPreview,
    matchPreviewAbortRef,
    contextMailMatch,
  } = useRuleMatcherPreview({
    dialogOpen: dialog.open,
    subjectMatch: form.subject_match_regex,
    senderMatch: form.sender_match_regex,
    bodyMatch: form.body_match_regex,
  })

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
    const snack = leaveReturnDialog.staySnack
    const variant = leaveReturnDialog.variant
    setLeaveReturnDialog({
      open: false,
      path: null,
      variant: null,
      staySnack: null,
    })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!next.has('returnTo')) return prev
        next.delete('returnTo')
        return next
      },
      { replace: true },
    )
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
        <Box sx={tableHorizontalScrollSx}>
          <Table
            size="small"
            aria-label="classifications table"
            sx={tableSmallScreenTextSx(theme)}
          >
            <TableHead>
              <TableRow>
                <SortableTableHeaderCell
                  sortDirection={sortBy === CLS_SORT_COL.id ? sortDir : false}
                  active={sortBy === CLS_SORT_COL.id}
                  direction={sortBy === CLS_SORT_COL.id ? sortDir : 'asc'}
                  onSort={() => toggleSort(CLS_SORT_COL.id)}
                >
                  ID
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  sortDirection={sortBy === CLS_SORT_COL.name ? sortDir : false}
                  active={sortBy === CLS_SORT_COL.name}
                  direction={sortBy === CLS_SORT_COL.name ? sortDir : 'asc'}
                  onSort={() => toggleSort(CLS_SORT_COL.name)}
                >
                  Name
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  sortDirection={sortBy === CLS_SORT_COL.message_type ? sortDir : false}
                  active={sortBy === CLS_SORT_COL.message_type}
                  direction={sortBy === CLS_SORT_COL.message_type ? sortDir : 'asc'}
                  onSort={() => toggleSort(CLS_SORT_COL.message_type)}
                >
                  Message Type
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  align="right"
                  sortDirection={sortBy === CLS_SORT_COL.priority ? sortDir : false}
                  active={sortBy === CLS_SORT_COL.priority}
                  direction={sortBy === CLS_SORT_COL.priority ? sortDir : 'asc'}
                  onSort={() => toggleSort(CLS_SORT_COL.priority)}
                >
                  Priority
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  align="right"
                  sortDirection={sortBy === CLS_SORT_COL.mail_count ? sortDir : false}
                  active={sortBy === CLS_SORT_COL.mail_count}
                  direction={sortBy === CLS_SORT_COL.mail_count ? sortDir : 'asc'}
                  onSort={() => toggleSort(CLS_SORT_COL.mail_count)}
                >
                  Mail Count
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  align="right"
                  sortDirection={sortBy === CLS_SORT_COL.status ? sortDir : false}
                  active={sortBy === CLS_SORT_COL.status}
                  direction={sortBy === CLS_SORT_COL.status ? sortDir : 'asc'}
                  onSort={() => toggleSort(CLS_SORT_COL.status)}
                >
                  Status
                </SortableTableHeaderCell>
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
                  <TableCell align="left" sx={{ whiteSpace: 'nowrap' }}>
                    {c.id}
                  </TableCell>
                  <TableCell align="left" sx={{ maxWidth: 260 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {c.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">{c.message_type}</TableCell>
                  <TableCell align="right">{c.priority}</TableCell>
                  <TableCell align="right">
                    {c.mail_count != null ? c.mail_count : '—'}
                  </TableCell>
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
        slotProps={{
          paper: {
            sx: [
              { position: 'relative', overflow: 'visible' },
              detailSlotProps.paper.sx,
            ],
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
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
          <Stack spacing={layoutSectionSpacing}>
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

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={1}
              sx={{ mb: 0.5 }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Matcher
              </Typography>
              {hasContextMail ? (
                <Box sx={{ flexShrink: 0 }}>
                  {(() => {
                    const m = contextMailMatch
                    const chipTooltip =
                      m.status === 'loading'
                        ? ''
                        : m.status === 'error'
                          ? m.error ?? ''
                          : m.notInCache
                            ? 'Not in local mail cache yet (run ingest first).'
                            : m.matched === null && m.status === 'ready'
                              ? 'Add a subject, sender, or body matcher to compare.'
                              : m.matched === true || m.matched === false
                                ? m.mailSubject
                                  ? `Subject: ${m.mailSubject}`
                                  : 'Subject: (empty)'
                                : ''
                    const face = (label, { startIcon = null } = {}) => (
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        tabIndex={-1}
                        disableRipple
                        onClick={(e) => e.stopPropagation()}
                        startIcon={startIcon}
                        sx={matcherMailPreviewTriggerSx}
                      >
                        {label}
                      </Button>
                    )
                    const chip =
                      m.status === 'loading' ? (
                        face('Checking…', {
                          startIcon: <CircularProgress size={12} color="inherit" />,
                        })
                      ) : m.status === 'error' ? (
                        face('Could not verify')
                      ) : m.notInCache ? (
                        face('Not in mail cache')
                      ) : m.matched === null ? (
                        face('Add matchers to compare')
                      ) : m.matched ? (
                        face('Matched')
                      ) : (
                        face('Not matched')
                      )
                    return (
                      <Tooltip
                        title={chipTooltip}
                        placement="top-end"
                        disableHoverListener={!chipTooltip}
                        slotProps={{
                          popper: {
                            disablePortal: true,
                          },
                          tooltip: {
                            sx: {
                              maxWidth: 'min(22rem, calc(100vw - 32px))',
                              textAlign: 'right',
                            },
                          },
                        }}
                      >
                        <Box component="span" sx={{ display: 'inline-block' }}>
                          {chip}
                        </Box>
                      </Tooltip>
                    )
                  })()}
                </Box>
              ) : (
                <Box sx={{ flexShrink: 0 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    sx={matcherMailPreviewTriggerSx}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (previewEnabled) {
                        matchPreviewAbortRef.current?.abort()
                        matchPreviewAbortRef.current = null
                        setPreviewEnabled(false)
                        setPreviewState({ status: 'idle', data: null, error: null })
                      } else {
                        setPreviewEnabled(true)
                        void fetchMatchingMailsPreview()
                      }
                    }}
                  >
                    {previewEnabled ? 'Hide Matching Mails' : 'Show Matching Mails'}
                  </Button>
                </Box>
              )}
            </Stack>
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
              />
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
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
            </StackFormGrid>

            {!hasContextMail && previewEnabled ? (
            <Box
              sx={{
                // Match MUI outlined TextField border + radius
                border: (t) =>
                  `1px solid ${
                    t.palette.mode === 'light'
                      ? 'rgba(0, 0, 0, 0.23)'
                      : 'rgba(255, 255, 255, 0.23)'
                  }`,
                borderRadius: 0.5,
                p: 1.5,
                bgcolor: 'transparent',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                gap={1}
                sx={{ mb: 1 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    Matching Mails
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="flex-end"
                  gap={0.75}
                  sx={{ flexShrink: 0, minWidth: 0, textAlign: 'right' }}
                >
                  {previewState.status !== 'idle' ? (
                    <Tooltip title="Refresh matching mails" placement="top">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => {
                            void fetchMatchingMailsPreview()
                          }}
                          disabled={previewState.status === 'loading'}
                          aria-label="Refresh matching mails"
                        >
                          <RefreshCw size={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                  {previewState.status !== 'idle' ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        textAlign: { xs: 'left', sm: 'right' },
                        maxWidth: { xs: '100%', sm: 360 },
                      }}
                    >
                      Showing up to <b>{MATCH_PREVIEW_LIMIT}</b> matches (
                      {previewState.data?.windowLabel ?? MATCH_PREVIEW_FALLBACK_WINDOW})
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>

              <Divider sx={{ mb: 1.25 }} />

              {previewState.status === 'idle' ? null : previewState.status === 'loading' ? (
                <Stack divider={<Divider flexItem />} spacing={0}>
                  {Array.from({ length: MATCH_PREVIEW_LIMIT }, (_, idx) => (
                    <Box key={idx} sx={{ py: 1.25 }}>
                      <Skeleton variant="text" animation="wave" width="82%" height={22} />
                      <Skeleton variant="text" animation="wave" width="46%" height={16} sx={{ mt: 0.25 }} />
                      <Skeleton variant="text" animation="wave" width="100%" height={18} sx={{ mt: 1 }} />
                      <Skeleton variant="text" animation="wave" width="91%" height={18} sx={{ mt: 0.5 }} />
                    </Box>
                  ))}
                </Stack>
              ) : previewState.status === 'error' ? (
                <Typography variant="body2" color="warning.main">
                  {previewState.error ?? 'Preview failed.'}
                </Typography>
              ) : previewState.status === 'empty' ? (
                <Typography variant="body2" color="text.secondary">
                  No mails matched these rules (
                  {previewState.data?.windowLabel ?? MATCH_PREVIEW_FALLBACK_WINDOW}).
                </Typography>
              ) : (
                <Stack divider={<Divider flexItem />} spacing={0}>
                  {(previewState.data?.items ?? []).slice(0, MATCH_PREVIEW_LIMIT).map((m, idx) => (
                    <Box key={`${m.mail_id}:${m.when}:${idx}`} sx={{ py: 1.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {m.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {m.sender} • {m.when}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {m.snippet}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
            ) : null}

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">
              Extractor
            </Typography>
            <StackFormGrid>
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
                minRows={2}
              />
              <TextField
                size="small"
                label="Snippet Extract Regex"
                value={form.snippet_extract_regex}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    snippet_extract_regex: e.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={2}
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
                minRows={2}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
            </StackFormGrid>
          </Stack>
        </DialogContent>

        <DialogActions sx={dialogActionsCompactSx}>
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
        fullWidth
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
        <DialogActions sx={dialogActionsCompactSx}>
          <Button size="small" onClick={handleLeaveReturnStay}>
            Stay Here
          </Button>
          <Button size="small" variant="contained" onClick={handleLeaveReturnContinue}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deactivateState.open} onClose={closeDeactivate} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate classification?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            This will set <code>is_active</code> to false for this rule. Rows are kept in
            the database.
          </Typography>
        </DialogContent>
        <DialogActions sx={dialogActionsCompactSx}>
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
        gap: layoutSectionSpacing,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      }}
    >
      {children}
    </Box>
  )
}

