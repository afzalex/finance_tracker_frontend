import {
  Alert,
  Box,
  Button,
  Card,
  FormControlLabel,
  Stack,
  Switch,
  Tab,
  Tabs,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ClassificationsSection from '../components/rules/ClassificationsSection'
import ParsersSection from '../components/rules/ParsersSection'

export default function RulesPage() {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = String(searchParams.get('tab') ?? '').toLowerCase()
  const classificationIdParam = params.classificationId
  const parserIdParam = params.parserId

  const routeClassificationId = useMemo(() => {
    const n = Number(classificationIdParam)
    return Number.isFinite(n) ? n : null
  }, [classificationIdParam])

  const routeParserId = useMemo(() => {
    const n = Number(parserIdParam)
    return Number.isFinite(n) ? n : null
  }, [parserIdParam])

  const forcedTab = routeClassificationId != null ? 0 : routeParserId != null ? 1 : null

  const [tab, setTab] = useState(0)
  const [classificationsShowInactive, setClassificationsShowInactive] =
    useState(false)
  const [parsersShowInactive, setParsersShowInactive] = useState(false)
  const [classificationsCreateRequestId, setClassificationsCreateRequestId] =
    useState(0)
  const [parsersCreateRequestId, setParsersCreateRequestId] = useState(0)

  useEffect(() => {
    if (forcedTab != null) {
      setTab(forcedTab)
      return
    }
    if (tabParam === 'parsers') setTab(1)
    else if (tabParam === 'classifications') setTab(0)
    // else keep existing
  }, [forcedTab, tabParam])

  const showInactive =
    tab === 0 ? classificationsShowInactive : parsersShowInactive
  const setShowInactive =
    tab === 0 ? setClassificationsShowInactive : setParsersShowInactive

  const triggerCreate = () => {
    if (tab === 0) setClassificationsCreateRequestId((x) => x + 1)
    else setParsersCreateRequestId((x) => x + 1)
  }

  const setTabAndUrl = (nextTab) => {
    setTab(nextTab)
    const next = nextTab === 1 ? 'parsers' : 'classifications'
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      sp.set('tab', next)
      return sp
    })
    if (routeClassificationId != null || routeParserId != null) {
      navigate(`/settings/rules?tab=${next}`)
    }
  }

  const openClassificationById = (id) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      sp.set('tab', 'classifications')
      return sp
    })
    navigate(`/settings/rules/classifications/${id}?tab=classifications`)
  }

  const closeClassificationRoute = () => {
    navigate('/settings/rules?tab=classifications')
  }

  const openParserById = (id) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      sp.set('tab', 'parsers')
      return sp
    })
    navigate(`/settings/rules/parsers/${id}?tab=parsers`)
  }

  const closeParserRoute = () => {
    navigate('/settings/rules?tab=parsers')
  }

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <Box
          sx={{
            px: 2,
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTabAndUrl(v)}
            variant="scrollable"
          >
            <Tab label="Classifications" />
            <Tab label="Parsers" />
          </Tabs>

          <Stack direction="row" spacing={1} alignItems="center">
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
        </Box>
        <Box sx={{ p: 2, pt: 1.5 }}>
          {tab === 0 ? (
            <ClassificationsSection
              showInactive={classificationsShowInactive}
              createRequestId={classificationsCreateRequestId}
              routeId={routeClassificationId}
              onOpenRule={openClassificationById}
              onCloseRule={closeClassificationRoute}
            />
          ) : (
            <ParsersSection
              showInactive={parsersShowInactive}
              createRequestId={parsersCreateRequestId}
              routeId={routeParserId}
              onOpenRule={openParserById}
              onCloseRule={closeParserRoute}
            />
          )}
        </Box>
      </Card>

      <Alert severity="info">
        Deleting rules deactivates them (rows are kept for auditing and ingest
        behavior).
      </Alert>
    </Stack>
  )
}

