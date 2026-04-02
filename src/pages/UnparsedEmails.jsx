import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Portal,
  Select,
  Snackbar,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EmailSourcePanel from '../components/EmailSourcePanel'
import SortableTableHeaderCell from '../components/SortableTableHeaderCell'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import useResource from '../hooks/useResource'
import { apiErrorMessage, listUnparsedEmails } from '../services/financeApi'
import { formatDateTime } from '../utils/format'

const clipCellSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
}

const FILTER_ALL = ''
const FILTER_NONE = '__none__'
/** Parser filter: any row with a parser (name or id). */
const FILTER_PARSER_NON_NULL = '__parser_non_null__'
/** Menu label for FILTER_NONE (italic in dropdowns). */
const FILTER_OPTION_LABEL_NONE = 'None'
/** Menu label for FILTER_PARSER_NON_NULL (italic in Parser dropdown). */
const FILTER_OPTION_LABEL_HAS_PARSER = '(Has Parser)'

/** Stable key for filters (empty = no classification). */
function rowClassificationKey(r) {
  if (r.classification_name?.trim()) return r.classification_name.trim()
  if (r.classification_id != null) return `#${r.classification_id}`
  return ''
}

/** Stable key for filters (empty = no parser). */
function rowParserKey(r) {
  if (r.parser_name?.trim()) return r.parser_name.trim()
  if (r.parser_id != null) return `#${r.parser_id}`
  return ''
}

function classificationCellText(r) {
  const k = rowClassificationKey(r)
  return k || '—'
}

function parserCellText(r) {
  const k = rowParserKey(r)
  return k || '—'
}

function rowWhyNotParsedKey(r) {
  const v = (r.reason ?? r.classification_reason ?? '').trim()
  return v
}

function whyNotParsedCellText(r) {
  const k = rowWhyNotParsedKey(r)
  return k || '—'
}

/** Missing / invalid dates sort last when descending (newest first). */
function receivedSortMs(r) {
  const raw = r.mail_received_at
  if (raw == null || String(raw).trim() === '') return Number.NEGATIVE_INFINITY
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY
}

const UNPARSED_SORT = {
  received: 'received',
  subject: 'subject',
  whyNotParsed: 'whyNotParsed',
  classification: 'classification',
  parser: 'parser',
  mailId: 'mailId',
}

function compareUnparsedRows(a, b, sortBy, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1
  let cmp = 0
  switch (sortBy) {
    case UNPARSED_SORT.received: {
      const ta = receivedSortMs(a)
      const tb = receivedSortMs(b)
      if (ta !== tb) cmp = ta < tb ? -1 : 1
      break
    }
    case UNPARSED_SORT.subject:
      cmp = String(a.subject ?? '').localeCompare(String(b.subject ?? ''), undefined, {
        sensitivity: 'base',
      })
      break
    case UNPARSED_SORT.whyNotParsed:
      cmp = whyNotParsedCellText(a).localeCompare(whyNotParsedCellText(b), undefined, {
        sensitivity: 'base',
      })
      break
    case UNPARSED_SORT.classification:
      cmp = classificationCellText(a).localeCompare(classificationCellText(b), undefined, {
        sensitivity: 'base',
      })
      break
    case UNPARSED_SORT.parser:
      cmp = parserCellText(a).localeCompare(parserCellText(b), undefined, {
        sensitivity: 'base',
      })
      break
    case UNPARSED_SORT.mailId:
      cmp = String(a.mail_id ?? '').localeCompare(String(b.mail_id ?? ''), undefined, {
        sensitivity: 'base',
      })
      break
    default:
      cmp = 0
  }
  if (cmp !== 0) return cmp * dir
  const ia = Number(a.id) || 0
  const ib = Number(b.id) || 0
  return ia - ib
}

export default function UnparsedEmails() {
  const navigate = useNavigate()
  const params = useParams()
  /** Route segment: numeric = unparsed queue id; otherwise legacy provider mail_id. */
  const routeDetailKey = params.mailId ? String(params.mailId) : null
  const [uiDetailKey, setUiDetailKey] = useState(routeDetailKey)
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [openReprocessConfirm, setOpenReprocessConfirm] = useState(null)
  const [filterClassification, setFilterClassification] = useState(FILTER_ALL)
  const [filterParser, setFilterParser] = useState(FILTER_ALL)
  const [filterWhyNotParsed, setFilterWhyNotParsed] = useState(FILTER_ALL)
  const [subjectQuery, setSubjectQuery] = useState('')
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [sortBy, setSortBy] = useState(UNPARSED_SORT.received)
  const [sortDir, setSortDir] = useState('desc')

  const bindOpenReprocessConfirm = useCallback(
    (fn) => setOpenReprocessConfirm(() => fn),
    [],
  )

  const openDetail = useCallback(
    (queueOrMailId) => {
      const seg = String(queueOrMailId ?? '')
      setUiDetailKey(seg)
      navigate(`/emails/unparsed/${encodeURIComponent(seg)}`)
    },
    [navigate],
  )

  const closeDetail = useCallback(() => {
    setUiDetailKey(null)
    navigate('/emails/unparsed')
  }, [navigate])

  const onReprocessSuccess = useCallback(() => {
    setListRefreshKey((k) => k + 1)
    closeDetail()
  }, [closeDetail])

  useEffect(() => {
    // Keep UI in sync when user navigates Back/Forward.
    setUiDetailKey(routeDetailKey)
  }, [routeDetailKey])

  const { status, data, error } = useResource(
    `emails:unparsed:${listRefreshKey}`,
    () => listUnparsedEmails(),
  )

  const rows = useMemo(() => data ?? [], [data])

  const classificationFilterOptions = useMemo(() => {
    const set = new Set()
    let hasEmpty = false
    for (const r of rows) {
      const k = rowClassificationKey(r)
      if (k === '') hasEmpty = true
      else set.add(k)
    }
    return { values: [...set].sort((a, b) => a.localeCompare(b)), hasEmpty }
  }, [rows])

  const parserFilterOptions = useMemo(() => {
    const set = new Set()
    let hasEmpty = false
    let hasNonNull = false
    for (const r of rows) {
      const k = rowParserKey(r)
      if (k === '') hasEmpty = true
      else {
        hasNonNull = true
        set.add(k)
      }
    }
    return {
      values: [...set].sort((a, b) => a.localeCompare(b)),
      hasEmpty,
      hasNonNull,
    }
  }, [rows])

  const whyNotParsedFilterOptions = useMemo(() => {
    const set = new Set()
    let hasEmpty = false
    for (const r of rows) {
      const k = rowWhyNotParsedKey(r)
      if (k === '') hasEmpty = true
      else set.add(k)
    }
    return {
      values: [...set].sort((a, b) => a.localeCompare(b)),
      hasEmpty,
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase()
    return rows.filter((r) => {
      if (q) {
        const sub = String(r.subject ?? '').toLowerCase()
        if (!sub.includes(q)) return false
      }
      const wk = rowWhyNotParsedKey(r)
      if (filterWhyNotParsed === FILTER_NONE && wk !== '') return false
      if (
        filterWhyNotParsed &&
        filterWhyNotParsed !== FILTER_NONE &&
        wk !== filterWhyNotParsed
      ) {
        return false
      }
      const ck = rowClassificationKey(r)
      const pk = rowParserKey(r)
      if (filterClassification === FILTER_NONE && ck !== '') return false
      if (
        filterClassification &&
        filterClassification !== FILTER_NONE &&
        ck !== filterClassification
      ) {
        return false
      }
      if (filterParser === FILTER_NONE && pk !== '') return false
      if (filterParser === FILTER_PARSER_NON_NULL && pk === '') return false
      if (
        filterParser &&
        filterParser !== FILTER_NONE &&
        filterParser !== FILTER_PARSER_NON_NULL &&
        pk !== filterParser
      ) {
        return false
      }
      return true
    })
  }, [
    rows,
    subjectQuery,
    filterWhyNotParsed,
    filterClassification,
    filterParser,
  ])

  const displayedRows = useMemo(() => {
    const copy = [...filteredRows]
    copy.sort((a, b) => compareUnparsedRows(a, b, sortBy, sortDir))
    return copy
  }, [filteredRows, sortBy, sortDir])

  const toggleUnparsedSort = useCallback(
    (key) => {
      if (sortBy === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortBy(key)
        setSortDir(key === UNPARSED_SORT.received ? 'desc' : 'asc')
      }
    },
    [sortBy],
  )

  useEffect(() => {
    if (
      filterClassification &&
      filterClassification !== FILTER_NONE &&
      !classificationFilterOptions.values.includes(filterClassification)
    ) {
      setFilterClassification(FILTER_ALL)
    }
  }, [filterClassification, classificationFilterOptions.values])

  useEffect(() => {
    if (
      filterParser &&
      filterParser !== FILTER_NONE &&
      filterParser !== FILTER_PARSER_NON_NULL &&
      !parserFilterOptions.values.includes(filterParser)
    ) {
      setFilterParser(FILTER_ALL)
    }
  }, [filterParser, parserFilterOptions.values])

  useEffect(() => {
    if (filterClassification === FILTER_NONE && !classificationFilterOptions.hasEmpty) {
      setFilterClassification(FILTER_ALL)
    }
  }, [filterClassification, classificationFilterOptions.hasEmpty])

  useEffect(() => {
    if (filterParser === FILTER_NONE && !parserFilterOptions.hasEmpty) {
      setFilterParser(FILTER_ALL)
    }
  }, [filterParser, parserFilterOptions.hasEmpty])

  useEffect(() => {
    if (filterParser === FILTER_PARSER_NON_NULL && !parserFilterOptions.hasNonNull) {
      setFilterParser(FILTER_ALL)
    }
  }, [filterParser, parserFilterOptions.hasNonNull])

  useEffect(() => {
    if (
      filterWhyNotParsed &&
      filterWhyNotParsed !== FILTER_NONE &&
      !whyNotParsedFilterOptions.values.includes(filterWhyNotParsed)
    ) {
      setFilterWhyNotParsed(FILTER_ALL)
    }
  }, [filterWhyNotParsed, whyNotParsedFilterOptions.values])

  useEffect(() => {
    if (
      filterWhyNotParsed === FILTER_NONE &&
      !whyNotParsedFilterOptions.hasEmpty
    ) {
      setFilterWhyNotParsed(FILTER_ALL)
    }
  }, [filterWhyNotParsed, whyNotParsedFilterOptions.hasEmpty])

  const uiQueueId =
    uiDetailKey && /^\d+$/.test(uiDetailKey) ? Number(uiDetailKey) : null

  return (
    <Stack spacing={2}>
      <PageHeader title="Unparsed Emails" />

      {error && <Alert severity="error">{apiErrorMessage(error)}</Alert>}

      <Card variant="outlined">
        <CardContent>
          {status === 'loading' ? (
            <LoadingBlock />
          ) : (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <TextField
                  size="small"
                  label="Search subject"
                  placeholder="Type to filter by subject…"
                  value={subjectQuery}
                  onChange={(e) => setSubjectQuery(e.target.value)}
                  sx={{
                    flex: '1 1 200px',
                    minWidth: { xs: '100%', sm: 200 },
                  }}
                  slotProps={{ htmlInput: { 'aria-label': 'Search subject' } }}
                />
                <FormControl
                  size="small"
                  sx={{ flex: '0 0 auto', minWidth: 200, maxWidth: 280 }}
                >
                  <InputLabel id="unparsed-filter-whynot-label">
                    Why Not Parsed
                  </InputLabel>
                  <Select
                    labelId="unparsed-filter-whynot-label"
                    id="unparsed-filter-whynot"
                    value={filterWhyNotParsed}
                    label="Why Not Parsed"
                    onChange={(e) => setFilterWhyNotParsed(e.target.value)}
                  >
                    <MenuItem value={FILTER_ALL}>
                      <em>All</em>
                    </MenuItem>
                    {whyNotParsedFilterOptions.hasEmpty && (
                      <MenuItem value={FILTER_NONE}>
                        <em>{FILTER_OPTION_LABEL_NONE}</em>
                      </MenuItem>
                    )}
                    {whyNotParsedFilterOptions.values.map((v) => (
                      <MenuItem
                        key={v}
                        value={v}
                        sx={{
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {v.length > 80 ? `${v.slice(0, 80)}…` : v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  sx={{ flex: '0 0 auto', minWidth: 200, maxWidth: 280 }}
                >
                  <InputLabel id="unparsed-filter-classification-label">
                    Classification
                  </InputLabel>
                  <Select
                    labelId="unparsed-filter-classification-label"
                    id="unparsed-filter-classification"
                    value={filterClassification}
                    label="Classification"
                    onChange={(e) => setFilterClassification(e.target.value)}
                  >
                    <MenuItem value={FILTER_ALL}>
                      <em>All</em>
                    </MenuItem>
                    {classificationFilterOptions.hasEmpty && (
                      <MenuItem value={FILTER_NONE}>
                        <em>{FILTER_OPTION_LABEL_NONE}</em>
                      </MenuItem>
                    )}
                    {classificationFilterOptions.values.map((v) => (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  sx={{ flex: '0 0 auto', minWidth: 200, maxWidth: 280 }}
                  data-testid="unparsed-filter-parser"
                >
                  <InputLabel id="unparsed-filter-parser-label">Parser</InputLabel>
                  <Select
                    labelId="unparsed-filter-parser-label"
                    id="unparsed-filter-parser"
                    value={filterParser}
                    label="Parser"
                    onChange={(e) => setFilterParser(e.target.value)}
                  >
                    <MenuItem value={FILTER_ALL}>
                      <em>All</em>
                    </MenuItem>
                    {parserFilterOptions.hasEmpty && (
                      <MenuItem value={FILTER_NONE}>
                        <em>{FILTER_OPTION_LABEL_NONE}</em>
                      </MenuItem>
                    )}
                    {parserFilterOptions.hasNonNull && (
                      <MenuItem value={FILTER_PARSER_NON_NULL}>
                        <em>{FILTER_OPTION_LABEL_HAS_PARSER}</em>
                      </MenuItem>
                    )}
                    {parserFilterOptions.values.map((v) => (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Table
                  size="small"
                  aria-label="unparsed emails table"
                  sx={{ tableLayout: 'fixed', width: '100%' }}
                >
                  <colgroup>
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <SortableTableHeaderCell
                        sx={clipCellSx}
                        sortDirection={
                          sortBy === UNPARSED_SORT.received ? sortDir : false
                        }
                        active={sortBy === UNPARSED_SORT.received}
                        direction={
                          sortBy === UNPARSED_SORT.received ? sortDir : 'asc'
                        }
                        onSort={() => toggleUnparsedSort(UNPARSED_SORT.received)}
                      >
                        Received
                      </SortableTableHeaderCell>
                      <SortableTableHeaderCell
                        sx={clipCellSx}
                        sortDirection={
                          sortBy === UNPARSED_SORT.subject ? sortDir : false
                        }
                        active={sortBy === UNPARSED_SORT.subject}
                        direction={
                          sortBy === UNPARSED_SORT.subject ? sortDir : 'asc'
                        }
                        onSort={() => toggleUnparsedSort(UNPARSED_SORT.subject)}
                      >
                        Subject
                      </SortableTableHeaderCell>
                      <SortableTableHeaderCell
                        sx={clipCellSx}
                        sortDirection={
                          sortBy === UNPARSED_SORT.whyNotParsed ? sortDir : false
                        }
                        active={sortBy === UNPARSED_SORT.whyNotParsed}
                        direction={
                          sortBy === UNPARSED_SORT.whyNotParsed ? sortDir : 'asc'
                        }
                        onSort={() =>
                          toggleUnparsedSort(UNPARSED_SORT.whyNotParsed)
                        }
                      >
                        Why Not Parsed
                      </SortableTableHeaderCell>
                      <SortableTableHeaderCell
                        sx={clipCellSx}
                        sortDirection={
                          sortBy === UNPARSED_SORT.classification ? sortDir : false
                        }
                        active={sortBy === UNPARSED_SORT.classification}
                        direction={
                          sortBy === UNPARSED_SORT.classification
                            ? sortDir
                            : 'asc'
                        }
                        onSort={() =>
                          toggleUnparsedSort(UNPARSED_SORT.classification)
                        }
                      >
                        Classification
                      </SortableTableHeaderCell>
                      <SortableTableHeaderCell
                        sx={clipCellSx}
                        sortDirection={
                          sortBy === UNPARSED_SORT.parser ? sortDir : false
                        }
                        active={sortBy === UNPARSED_SORT.parser}
                        direction={
                          sortBy === UNPARSED_SORT.parser ? sortDir : 'asc'
                        }
                        onSort={() => toggleUnparsedSort(UNPARSED_SORT.parser)}
                      >
                        Parser
                      </SortableTableHeaderCell>
                      <SortableTableHeaderCell
                        sx={clipCellSx}
                        sortDirection={
                          sortBy === UNPARSED_SORT.mailId ? sortDir : false
                        }
                        active={sortBy === UNPARSED_SORT.mailId}
                        direction={
                          sortBy === UNPARSED_SORT.mailId ? sortDir : 'asc'
                        }
                        onSort={() => toggleUnparsedSort(UNPARSED_SORT.mailId)}
                      >
                        Mail ID
                      </SortableTableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedRows.map((r) => (
                      <TableRow
                        key={r.id ?? r.mail_id}
                        hover
                        tabIndex={0}
                        role="button"
                        aria-label={`View unparsed queue item ${r.id ?? r.mail_id}`}
                        onClick={() => openDetail(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openDetail(r.id)
                          }
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell sx={clipCellSx}>
                          {r.mail_received_at
                            ? formatDateTime(r.mail_received_at)
                            : '—'}
                        </TableCell>
                        <TableCell sx={clipCellSx} title={r.subject ?? ''}>
                          {r.subject ?? '—'}
                        </TableCell>
                        <TableCell
                          sx={clipCellSx}
                          title={r.reason ?? r.classification_reason ?? ''}
                        >
                          {whyNotParsedCellText(r)}
                        </TableCell>
                        <TableCell
                          sx={clipCellSx}
                          title={
                            r.classification_id != null
                              ? `ID ${r.classification_id}`
                              : ''
                          }
                        >
                          {classificationCellText(r)}
                        </TableCell>
                        <TableCell
                          sx={clipCellSx}
                          title={
                            r.parser_id != null ? `ID ${r.parser_id}` : ''
                          }
                        >
                          {parserCellText(r)}
                        </TableCell>
                        <TableCell sx={clipCellSx} title={r.mail_id ?? ''}>
                          {r.mail_id ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            No unparsed emails found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.length > 0 && filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            No rows match the current filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(uiDetailKey)}
        onClose={closeDetail}
        maxWidth="md"
        fullWidth
        scroll="paper"
        slotProps={{ transition: { timeout: 0 } }}
      >
        <DialogTitle>Source Email</DialogTitle>
        <DialogContent dividers>
          {uiDetailKey ? (
            <EmailSourcePanel
              mailId={uiQueueId != null ? undefined : uiDetailKey}
              unparsedMessageId={uiQueueId ?? undefined}
              active
              onNotify={(message) => setSnack({ open: true, message })}
              showReprocessButton={false}
              onBindOpenReprocessConfirm={bindOpenReprocessConfirm}
              onReprocessSuccess={onReprocessSuccess}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No email selected.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'flex-start',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Button size="small" variant="outlined" onClick={closeDetail}>
            Cancel
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            disabled={typeof openReprocessConfirm !== 'function'}
            onClick={() => openReprocessConfirm?.()}
          >
            Reprocess Email
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
    </Stack>
  )
}

