import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  InputAdornment,
  Link,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import {
  dataCardWidthSx,
  layoutMajorDividerSx,
  layoutSectionSpacing,
  pageStackWidthSx,
} from '../utils/responsiveTable'
import useAppMeta from '../contexts/useAppMeta'
import {
  apiErrorMessage,
  getMailIngestJob,
  reprocessAllEmailsOffline,
  triggerMailIngest,
} from '../services/financeApi'
import AppConfigSection from '../components/AppConfigSection'
import ClassificationsSection from '../components/rules/ClassificationsSection'
import ParsersSection from '../components/rules/ParsersSection'
import ExclusionRulesSection from '../components/rules/ExclusionRulesSection'

const META_ROWS = [
  { key: 'app_version', label: 'App version' },
  { key: 'mail_user_email', label: 'Gmail account' },
  { key: 'is_healthy', label: 'API healthy', format: 'bool' },
  { key: 'is_initialized', label: 'Initialized', format: 'bool' },
  { key: 'is_mail_connectivity_working', label: 'Mail connectivity', format: 'bool' },
  { key: 'docs_url', label: 'API docs', format: 'url' },
  { key: 'openapi_url', label: 'OpenAPI JSON', format: 'url' },
  { key: 'redoc_url', label: 'ReDoc', format: 'url' },
]

function formatMetaValue(meta, { key, format: fmt }) {
  const raw = meta?.[key]
  if (raw === null || raw === undefined || raw === '') return null
  if (fmt === 'bool') {
    return (
      <Chip
        size="small"
        label={raw ? 'Yes' : 'No'}
        color={raw ? 'success' : 'default'}
        variant={raw ? 'filled' : 'outlined'}
        sx={{ height: 22 }}
      />
    )
  }
  if (fmt === 'url' && typeof raw === 'string') {
    return (
      <Link href={raw} target="_blank" rel="noopener noreferrer" variant="body2">
        {raw}
      </Link>
    )
  }
  return String(raw)
}

function rulesQuerySuffix(searchParams) {
  const sp = new URLSearchParams(searchParams)
  sp.delete('tab')
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

function formatIngestStats(stats) {
  if (!stats || typeof stats !== 'object') return ''
  const parts = []
  if (stats.fetched != null) parts.push(`${stats.fetched} fetched`)
  if (stats.parsed != null) parts.push(`${stats.parsed} parsed`)
  if (stats.unparsed != null) parts.push(`${stats.unparsed} unparsed`)
  if (stats.skipped != null) parts.push(`${stats.skipped} skipped`)
  if (stats.duplicate != null) parts.push(`${stats.duplicate} duplicate`)
  return parts.join(', ')
}

function ApiTab() {
  const meta = useAppMeta()
  const [reprocessState, setReprocessState] = useState({
    status: 'idle',
    message: '',
  })
  const [ingestDays, setIngestDays] = useState('30')
  const [ingestMaxMessages, setIngestMaxMessages] = useState('')
  const [ingestState, setIngestState] = useState({
    status: 'idle',
    message: '',
    jobId: null,
  })
  const ingestPollRef = useRef(null)

  useEffect(() => {
    return () => {
      if (ingestPollRef.current) window.clearInterval(ingestPollRef.current)
    }
  }, [])

  const stopIngestPoll = () => {
    if (ingestPollRef.current) {
      window.clearInterval(ingestPollRef.current)
      ingestPollRef.current = null
    }
  }

  const pollIngestJob = (jobId) => {
    stopIngestPoll()
    const tick = async () => {
      try {
        const job = await getMailIngestJob(jobId)
        if (job.status === 'completed') {
          stopIngestPoll()
          const summary = formatIngestStats(job.stats)
          setIngestState({
            status: 'success',
            jobId,
            message: summary
              ? `Ingest finished (${summary}).`
              : 'Ingest finished.',
          })
        } else if (job.status === 'failed') {
          stopIngestPoll()
          setIngestState({
            status: 'error',
            jobId,
            message: job.error ?? 'Ingest failed.',
          })
        }
      } catch (e) {
        stopIngestPoll()
        setIngestState({
          status: 'error',
          jobId,
          message: apiErrorMessage(e),
        })
      }
    }
    void tick()
    ingestPollRef.current = window.setInterval(tick, 3000)
  }

  const onIngestMail = async () => {
    stopIngestPoll()
    setIngestState({ status: 'loading', message: '', jobId: null })
    try {
      const maxRaw = String(ingestMaxMessages ?? '').trim()
      const data = await triggerMailIngest({
        days: Number(ingestDays),
        maxMessages: maxRaw === '' ? undefined : Number(maxRaw),
        wait: false,
      })
      if (data?.job_id) {
        setIngestState({
          status: 'running',
          jobId: data.job_id,
          message: `Ingest started for the last ${data.lookback_days ?? ingestDays} days.`,
        })
        pollIngestJob(data.job_id)
      } else if (data?.stats) {
        const summary = formatIngestStats(data.stats)
        setIngestState({
          status: 'success',
          jobId: null,
          message: summary ? `Ingest finished (${summary}).` : 'Ingest finished.',
        })
      } else {
        setIngestState({
          status: 'success',
          jobId: null,
          message: 'Ingest request accepted.',
        })
      }
    } catch (e) {
      setIngestState({
        status: 'error',
        message: apiErrorMessage(e),
        jobId: null,
      })
    }
  }

  const onReprocessAll = async () => {
    setReprocessState({ status: 'loading', message: '' })
    try {
      await reprocessAllEmailsOffline()
      setReprocessState({
        status: 'success',
        message: 'Reprocess started for all cached emails.',
      })
    } catch (e) {
      const msg = e?.message ?? 'Request failed'
      setReprocessState({ status: 'error', message: msg })
    }
  }

  return (
    <CardContent>
      {meta ? (
        <Stack
          component="dl"
          spacing={{ xs: 0.75, md: 1.25 }}
          sx={{ m: 0 }}
        >
          {META_ROWS.map((row) => {
            const value = formatMetaValue(meta, row)
            if (value == null) return null
            return (
              <Box
                key={row.key}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, 200px) 1fr' },
                  gap: { xs: 0.25, sm: 2 },
                  alignItems: 'center',
                }}
              >
                <Typography
                  component="dt"
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  {row.label}
                </Typography>
                <Box component="dd" sx={{ m: 0 }}>
                  {value}
                </Box>
              </Box>
            )
          })}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No metadata loaded.
        </Typography>
      )}
      <Divider sx={{ my: 2, ...layoutMajorDividerSx }} />
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Mail ingest
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Re-fetch Gmail messages from the last N days and run the ingest pipeline (ignores the stored cursor).
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'flex-start' }}
        sx={{ mb: 1 }}
      >
        <TextField
          size="small"
          type="number"
          label="Lookback days"
          value={ingestDays}
          onChange={(e) => setIngestDays(e.target.value)}
          inputProps={{ min: 1, max: 3650, step: 1, inputMode: 'numeric' }}
          sx={{ width: { xs: '100%', sm: 140 } }}
        />
        <TextField
          size="small"
          type="number"
          label="Max messages"
          value={ingestMaxMessages}
          onChange={(e) => setIngestMaxMessages(e.target.value)}
          placeholder="Optional"
          inputProps={{ min: 1, step: 1, inputMode: 'numeric' }}
          helperText="Newest first in window"
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={onIngestMail}
          disabled={ingestState.status === 'loading' || ingestState.status === 'running'}
          sx={{ mt: { xs: 0, sm: 0.25 } }}
        >
          {ingestState.status === 'loading' || ingestState.status === 'running'
            ? 'Ingesting…'
            : 'Ingest mail'}
        </Button>
      </Stack>
      {ingestState.message ? (
        <Box sx={{ mb: 1 }}>
          <Alert
            severity={
              ingestState.status === 'error'
                ? 'error'
                : ingestState.status === 'running'
                  ? 'info'
                  : 'success'
            }
          >
            {ingestState.message}
            {ingestState.jobId && ingestState.status === 'running'
              ? ` Job ${ingestState.jobId}.`
              : null}
          </Alert>
        </Box>
      ) : null}
      <Divider sx={{ my: 2, ...layoutMajorDividerSx }} />
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Offline reprocess
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          size="small"
          variant="contained"
          onClick={onReprocessAll}
          disabled={reprocessState.status === 'loading'}
        >
          Reprocess All Emails
        </Button>
      </Box>
      {reprocessState.message && (
        <Box sx={{ mt: 1 }}>
          <Alert
            severity={reprocessState.status === 'error' ? 'error' : 'success'}
          >
            {reprocessState.message}
          </Alert>
        </Box>
      )}
    </CardContent>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()

  const classificationIdParam = params.classificationId
  const parserIdParam = params.parserId
  const exclusionRuleIdParam = params.exclusionRuleId

  const routeClassificationNew = classificationIdParam === 'new'
  const routeParserNew = parserIdParam === 'new'
  const routeExclusionNew = exclusionRuleIdParam === 'new'

  const routeClassificationId = useMemo(() => {
    if (routeClassificationNew) return null
    const n = Number(classificationIdParam)
    return Number.isFinite(n) ? n : null
  }, [classificationIdParam, routeClassificationNew])

  const routeParserId = useMemo(() => {
    if (routeParserNew) return null
    const n = Number(parserIdParam)
    return Number.isFinite(n) ? n : null
  }, [parserIdParam, routeParserNew])

  const routeExclusionId = useMemo(() => {
    if (routeExclusionNew) return null
    const n = Number(exclusionRuleIdParam)
    return Number.isFinite(n) ? n : null
  }, [exclusionRuleIdParam, routeExclusionNew])

  const isClassificationsPath = location.pathname.startsWith('/settings/classifications')
  const isParsersPath = location.pathname.startsWith('/settings/parsers')
  const isExclusionsPath = location.pathname.startsWith('/settings/exclusions')
  const isSystemPath = location.pathname.startsWith('/settings/system')

  const tab = useMemo(() => {
    if (isClassificationsPath) return 0
    if (isParsersPath) return 1
    if (isExclusionsPath) return 2
    if (isSystemPath) return 3
    return 0
  }, [
    isClassificationsPath,
    isParsersPath,
    isExclusionsPath,
    isSystemPath
  ])

  const [classificationsShowInactive, setClassificationsShowInactive] = useState(false)
  const [parsersShowInactive, setParsersShowInactive] = useState(false)
  const [exclusionsShowInactive, setExclusionsShowInactive] = useState(false)

  const [classificationsSearch, setClassificationsSearch] = useState('')
  const [parsersSearch, setParsersSearch] = useState('')

  const showInactive =
    tab === 0 ? classificationsShowInactive : tab === 1 ? parsersShowInactive : exclusionsShowInactive
  const setShowInactive =
    tab === 0 ? setClassificationsShowInactive : tab === 1 ? setParsersShowInactive : setExclusionsShowInactive

  const searchQuery = tab === 0 ? classificationsSearch : tab === 1 ? parsersSearch : ''
  const setSearchQuery = useCallback(
    (v) => { if (tab === 0) setClassificationsSearch(v); else if (tab === 1) setParsersSearch(v) },
    [tab],
  )

  const triggerCreate = () => {
    const suffix = rulesQuerySuffix(searchParams)
    if (tab === 0) {
      navigate(`/settings/classifications/new${suffix}`)
    } else if (tab === 1) {
      navigate(`/settings/parsers/new${suffix}`)
    } else if (tab === 2) {
      navigate(`/settings/exclusions/new${suffix}`)
    }
  }

  const setTabAndUrl = (nextTab) => {
    const suffix = rulesQuerySuffix(searchParams)
    let path = '/settings/classifications'
    if (nextTab === 1) path = '/settings/parsers'
    if (nextTab === 2) path = '/settings/exclusions'
    if (nextTab === 3) path = '/settings/system'
    navigate(`${path}${suffix}`)
  }

  const openClassificationById = (id) => {
    const suffix = rulesQuerySuffix(searchParams)
    navigate(`/settings/classifications/${id}${suffix}`)
  }

  const closeClassificationRoute = (opts = {}) => {
    const sp = new URLSearchParams(searchParams)
    sp.delete('tab')
    if (opts.stripReturnTo) sp.delete('returnTo')
    const qs = sp.toString()
    navigate(qs ? `/settings/classifications?${qs}` : '/settings/classifications', { replace: true })
  }

  const openParserById = (id) => {
    const suffix = rulesQuerySuffix(searchParams)
    navigate(`/settings/parsers/${id}${suffix}`)
  }

  const closeParserRoute = (opts = {}) => {
    const sp = new URLSearchParams(searchParams)
    sp.delete('tab')
    if (opts.stripReturnTo) sp.delete('returnTo')
    const qs = sp.toString()
    navigate(qs ? `/settings/parsers?${qs}` : '/settings/parsers', { replace: true })
  }

  const openExclusionById = (id) => {
    const suffix = rulesQuerySuffix(searchParams)
    navigate(`/settings/exclusions/${id}${suffix}`)
  }

  const closeExclusionRoute = (opts = {}) => {
    const sp = new URLSearchParams(searchParams)
    sp.delete('tab')
    if (opts.stripReturnTo) sp.delete('returnTo')
    const qs = sp.toString()
    navigate(qs ? `/settings/exclusions?${qs}` : '/settings/exclusions', { replace: true })
  }

  return (
    <Stack spacing={layoutSectionSpacing} sx={pageStackWidthSx}>
      <PageHeader
        title="Settings"
      />

      <Card variant="outlined" sx={dataCardWidthSx}>
        <Box
          sx={{
            px: 2,
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: layoutSectionSpacing,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTabAndUrl(v)}
            variant="scrollable"
            sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
          >
            <Tab label="Classifications" />
            <Tab label="Parsers" />
            <Tab label="Rules" />
            <Tab label="System" />
          </Tabs>

          {tab < 2 && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1, width: '100%' }}
            >
              <TextField
                size="small"
                placeholder="Search by name or label…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1, minWidth: 0 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto', flexShrink: 0 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                    />
                  }
                  label="Show Inactive"
                  sx={{ m: 0, userSelect: 'none' }}
                />
                <Button size="small" variant="contained" onClick={triggerCreate}>
                  Add
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
        <Box sx={{ p: 2, pt: 1.5 }}>
          {tab === 0 ? (
            <ClassificationsSection
              showInactive={classificationsShowInactive}
              searchQuery={classificationsSearch}
              routeId={routeClassificationId}
              routeCreate={routeClassificationNew}
              onOpenRule={openClassificationById}
              onCloseRule={closeClassificationRoute}
            />
          ) : tab === 1 ? (
            <ParsersSection
               showInactive={parsersShowInactive}
               searchQuery={parsersSearch}
               routeId={routeParserId}
               routeCreate={routeParserNew}
               onOpenRule={openParserById}
               onCloseRule={closeParserRoute}
            />
          ) : tab === 2 ? (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">Exclusion Rules</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={exclusionsShowInactive}
                        onChange={(e) => setExclusionsShowInactive(e.target.checked)}
                      />
                    }
                    label="Show Inactive"
                    sx={{ m: 0, userSelect: 'none' }}
                  />
                  <Button size="small" variant="contained" onClick={triggerCreate}>
                    Add
                  </Button>
                </Stack>
              </Stack>
              <ExclusionRulesSection
                showInactive={exclusionsShowInactive}
                routeId={routeExclusionId}
                routeCreate={routeExclusionNew}
                onOpenRule={openExclusionById}
                onCloseRule={closeExclusionRoute}
              />
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>API Configuration</Typography>
              <AppConfigSection />
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>API & System</Typography>
              <ApiTab />
            </>
          )}
        </Box>
      </Card>
      
      {tab < 3 && (
        <Alert severity="info">
          Deleting rules deactivates them (rows are kept for auditing and ingest
          behavior).
        </Alert>
      )}
    </Stack>
  )
}
