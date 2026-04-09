import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
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
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { styled } from '@mui/material/styles'
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
  createExclusionRule,
  deactivateExclusionRule,
  listExclusionRules,
  listParsers,
  patchExclusionRule,
} from '../../services/rulesApi'
import { listTransactionDistinctCatalog } from '../../services/financeApi'
import { leaveReturnCopy, parseSafeReturnToParam } from '../../utils/safeReturnTo'

const StackFormGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: '1fr 1fr',
  },
}))

function nullableString(v) {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

const SORT_Q = 'ex_sort'

const SORT_COL = {
  id: 'id',
  name: 'name',
  mail_count: 'mail_count',
  status: 'status',
}

const SORT_FIELDS = Object.values(SORT_COL)

function parseSortParam(sp) {
  const raw = sp.get(SORT_Q)
  const defaults = { sortBy: SORT_COL.id, sortDir: 'asc' }
  if (!raw) return defaults
  const i = raw.lastIndexOf(':')
  if (i < 1) return defaults
  let by = raw.slice(0, i)
  const dir = raw.slice(i + 1)
  if (!SORT_FIELDS.includes(by)) return defaults
  if (dir !== 'asc' && dir !== 'desc') return defaults
  return { sortBy: by, sortDir: dir }
}

function isDefaultSort(sortBy, sortDir) {
  return sortBy === SORT_COL.id && sortDir === 'asc'
}

function defaultDirForSortKey(key) {
  if (key === SORT_COL.mail_count) return 'desc'
  return 'asc'
}

export default function ExclusionRulesSection({
  showInactive,
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

  const resourceKey = `rules:exclusions:${showInactive}:${refreshKey}`
  const { status, data, error } = useResource(resourceKey, () =>
    listExclusionRules(),
  )

  // Fetch parsers for the multiselect
  const parsersResourceKey = `rules:parsers:all`
  const { data: parsersData } = useResource(parsersResourceKey, () => listParsers())
  const allParsers = useMemo(() => parsersData ?? [], [parsersData])

  const catalogResourceKey = `finance:catalog:all`
  const { data: catalogData } = useResource(catalogResourceKey, () => listTransactionDistinctCatalog())
  const availablePayees = useMemo(() => {
    if (!catalogData) return []
    const set = new Set([...(catalogData.merchants ?? []), ...(catalogData.counterparties ?? [])])
    // exclude the unnamed counterparty key
    if (catalogData.unnamed_counterparty_key) {
      set.delete(catalogData.unnamed_counterparty_key)
    }
    const arr = Array.from(set).filter(Boolean)
    arr.sort((a, b) => a.localeCompare(b))
    return arr
  }, [catalogData])

  const { sortBy, sortDir } = useMemo(
    () => parseSortParam(searchParams),
    [searchParams],
  )

  const rules = useMemo(() => {
    const items = data ?? []
    if (showInactive) return items
    return items.filter((c) => c.is_active)
  }, [data, showInactive])

  const sortedRules = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const copy = [...rules]
    copy.sort((a, b) => {
      if (sortBy === SORT_COL.id) return (a.id - b.id) * dir
      if (sortBy === SORT_COL.name)
        return String(a.name ?? '').localeCompare(String(b.name ?? '')) * dir
      if (sortBy === SORT_COL.mail_count)
        return ((a.mail_count ?? 0) - (b.mail_count ?? 0)) * dir
      if (sortBy === SORT_COL.status) {
        const ra = a.is_active ? 0 : 1
        const rb = b.is_active ? 0 : 1
        return (ra - rb) * dir
      }
      return 0
    })
    return copy
  }, [rules, sortBy, sortDir])

  const toggleSort = useCallback(
    (key) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev)
          const cur = parseSortParam(sp)
          let nextBy = key
          let nextDir = cur.sortDir
          if (cur.sortBy === key) {
            nextDir = cur.sortDir === 'asc' ? 'desc' : 'asc'
          } else {
            nextBy = key
            nextDir = defaultDirForSortKey(key)
          }
          if (isDefaultSort(nextBy, nextDir)) sp.delete(SORT_Q)
          else sp.set(SORT_Q, `${nextBy}:${nextDir}`)
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
      name: '',
      is_active: true,
      payees: [],
      parser_ids: [],
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
    const snackT = leaveReturnDialog.staySnack
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
    if (snackT) setSnack({ open: true, message: snackT })
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

  const requestDismissDialog = () => {
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
      name: rule.name ?? '',
      is_active: Boolean(rule.is_active),
      payees: Array.isArray(rule.payees) ? rule.payees : [],
      parser_ids: Array.isArray(rule.parser_ids) ? rule.parser_ids : [],
    })
    setDialog({ open: true, mode: 'edit', rule })
    if (syncUrl) onOpenRule?.(rule.id)
  }

  useEffect(() => {
    if (routeId == null) return
    const rule = rules.find((c) => c.id === routeId)
    if (!rule) return
    if (dialog.open && dialog.mode === 'edit' && dialog.rule?.id === routeId) return
    openEdit(rule, { syncUrl: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, rules])

  useEffect(() => {
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

  const buildPayload = () => {
    return {
      name: String(form.name ?? '').trim(),
      is_active: Boolean(form.is_active),
      payees: (form.payees ?? []).map(p => String(p).trim()).filter(Boolean),
      parser_ids: form.parser_ids ?? [],
    }
  }

  const validateForm = () => {
    const name = String(form.name ?? '').trim()
    if (!name) return 'Name is required.'
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
      const payload = buildPayload()
      const successMessage = dialog.mode === 'create' ? 'Created.' : 'Updated.'
      if (dialog.mode === 'create') {
        await createExclusionRule(payload)
      } else {
        await patchExclusionRule(dialog.rule.id, payload)
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
      await deactivateExclusionRule(deactivateState.rule.id)
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
            aria-label="exclusion rules table"
            sx={tableSmallScreenTextSx(theme)}
          >
            <TableHead>
              <TableRow>
                <SortableTableHeaderCell
                  sortDirection={sortBy === SORT_COL.id ? sortDir : false}
                  active={sortBy === SORT_COL.id}
                  direction={sortBy === SORT_COL.id ? sortDir : 'asc'}
                  onSort={() => toggleSort(SORT_COL.id)}
                >
                  ID
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  sortDirection={sortBy === SORT_COL.name ? sortDir : false}
                  active={sortBy === SORT_COL.name}
                  direction={sortBy === SORT_COL.name ? sortDir : 'asc'}
                  onSort={() => toggleSort(SORT_COL.name)}
                >
                  Name
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  align="right"
                  sortDirection={sortBy === SORT_COL.mail_count ? sortDir : false}
                  active={sortBy === SORT_COL.mail_count}
                  direction={sortBy === SORT_COL.mail_count ? sortDir : 'asc'}
                  onSort={() => toggleSort(SORT_COL.mail_count)}
                >
                  Mail Count
                </SortableTableHeaderCell>
                <SortableTableHeaderCell
                  align="right"
                  sortDirection={sortBy === SORT_COL.status ? sortDir : false}
                  active={sortBy === SORT_COL.status}
                  direction={sortBy === SORT_COL.status ? sortDir : 'asc'}
                  onSort={() => toggleSort(SORT_COL.status)}
                >
                  Status
                </SortableTableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRules.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  onClick={(e) => {
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
                  aria-label={`Edit rule ${c.name}`}
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
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      No exclusion rules found.
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
        onClose={() => requestDismissDialog()}
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
              ? 'Create exclusion rule'
              : 'Edit exclusion rule'}
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
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                fullWidth
              />
            </StackFormGrid>

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">
              Parsers
            </Typography>
            <Autocomplete
              multiple
              size="small"
              options={allParsers}
              getOptionLabel={(opt) => opt.name ?? `Parser ${opt.id}`}
              value={allParsers.filter((p) => (form.parser_ids ?? []).includes(p.id))}
              onChange={(_, newValue) =>
                setForm((f) => ({
                  ...f,
                  parser_ids: newValue.map((v) => v.id),
                }))
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Parsers"
                  placeholder="Select parsers…"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((opt, idx) => (
                  <Chip
                    {...getTagProps({ index: idx })}
                    key={opt.id}
                    size="small"
                    label={opt.name ?? `Parser ${opt.id}`}
                  />
                ))
              }
            />

            <Divider>
              <Typography variant="overline" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Typography variant="subtitle2" color="text.secondary">
              Payees
            </Typography>
            <StackFormGrid>
              <Autocomplete
                multiple
                freeSolo
                size="small"
                options={availablePayees}
                value={form.payees ?? []}
                onChange={(_, newValue) => {
                  setForm((f) => ({
                    ...f,
                    payees: newValue,
                  }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Matching Payees"
                    placeholder="Select or type..."
                    helperText="Creates exclusion if transaction counterparty or merchant matches any payee exactly (case-insensitive)."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((opt, idx) => (
                    <Chip
                      {...getTagProps({ index: idx })}
                      key={idx}
                      size="small"
                      label={opt}
                    />
                  ))
                }
              />
            </StackFormGrid>
          </Stack>
        </DialogContent>

        <DialogActions sx={dialogActionsCompactSx}>
          <Button
            size="small"
            onClick={requestDismissDialog}
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
          >
            {errorSnack.message}
          </Alert>
        </Snackbar>
      </Dialog>
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ open: false, message: '' })}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnack({ open: false, message: '' })}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={deactivateState.open}
        onClose={closeDeactivate}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Deactivate Rule?</DialogTitle>
        <DialogContent>
          Are you sure you want to continuously bypass exclusion for `{deactivateState.rule?.name}`?
        </DialogContent>
        <DialogActions sx={{ mb: 1, px: 2, display: 'flex', gap: 1 }}>
          <Button size="small" onClick={closeDeactivate} disabled={deactivating}>
            Cancel
          </Button>
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
        <Dialog
          open={leaveReturnDialog.open}
          onClose={() => {
            setLeaveReturnDialog({
              open: false,
              path: null,
              variant: null,
              staySnack: null,
            })
          }}
          maxWidth="xs"
          fullWidth
          slotProps={{
            backdrop: {
              sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
            },
          }}
          sx={{ zIndex: (theme) => theme.zIndex.modal + 3 }}
        >
          <DialogTitle>Wait, return to caller?</DialogTitle>
          <DialogContent>
            {leaveReturnDialog.variant === 'dismiss' ? (
              <Typography variant="body2">
                This dialog was opened from <strong>Unparsed Emails</strong>.{' '}
                We can return there, or you can stay here on the Classifications
                table.
              </Typography>
            ) : (
              <Typography variant="body2">
                {leaveReturnCopy[leaveReturnDialog.variant] ?? 'Changes saved! '}
                You can return to where you were, or stay here.
              </Typography>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              Returning to: {leaveReturnDialog.path}
            </Alert>
          </DialogContent>
          <DialogActions sx={{ mb: 1, px: 2, display: 'flex', gap: 1 }}>
            <Button size="small" onClick={handleLeaveReturnStay}>
              Stay Here
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleLeaveReturnContinue}
            >
              Return
            </Button>
          </DialogActions>
        </Dialog>
      </Portal>
    </>
  )
}
