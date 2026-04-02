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
import { useMemo, useState } from 'react'
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

  const routeClassificationNew = classificationIdParam === 'new'
  const routeParserNew = parserIdParam === 'new'

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

  const forcedTab =
    routeClassificationId != null || routeClassificationNew
      ? 0
      : routeParserId != null || routeParserNew
        ? 1
        : null

  const tab = useMemo(() => {
    if (forcedTab != null) return forcedTab
    if (tabParam === 'parsers') return 1
    return 0
  }, [forcedTab, tabParam])

  const [classificationsShowInactive, setClassificationsShowInactive] =
    useState(false)
  const [parsersShowInactive, setParsersShowInactive] = useState(false)

  const showInactive =
    tab === 0 ? classificationsShowInactive : parsersShowInactive
  const setShowInactive =
    tab === 0 ? setClassificationsShowInactive : setParsersShowInactive

  const triggerCreate = () => {
    const sp = new URLSearchParams(searchParams)
    if (tab === 0) {
      sp.set('tab', 'classifications')
      navigate(`/settings/rules/classifications/new?${sp.toString()}`)
    } else {
      sp.set('tab', 'parsers')
      navigate(`/settings/rules/parsers/new?${sp.toString()}`)
    }
  }

  const setTabAndUrl = (nextTab) => {
    const next = nextTab === 1 ? 'parsers' : 'classifications'
    if (
      routeClassificationId != null ||
      routeParserId != null ||
      routeClassificationNew ||
      routeParserNew
    ) {
      const sp = new URLSearchParams(searchParams)
      sp.set('tab', next)
      navigate(`/settings/rules?${sp.toString()}`)
    } else {
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev)
        sp.set('tab', next)
        return sp
      })
    }
  }

  const openClassificationById = (id) => {
    const sp = new URLSearchParams(searchParams)
    sp.set('tab', 'classifications')
    navigate(`/settings/rules/classifications/${id}?${sp.toString()}`)
  }

  const closeClassificationRoute = () => {
    const sp = new URLSearchParams()
    sp.set('tab', 'classifications')
    const ret = searchParams.get('returnTo')
    if (ret) sp.set('returnTo', ret)
    navigate(`/settings/rules?${sp.toString()}`)
  }

  const openParserById = (id) => {
    const sp = new URLSearchParams(searchParams)
    sp.set('tab', 'parsers')
    navigate(`/settings/rules/parsers/${id}?${sp.toString()}`)
  }

  const closeParserRoute = () => {
    const sp = new URLSearchParams()
    sp.set('tab', 'parsers')
    const ret = searchParams.get('returnTo')
    if (ret) sp.set('returnTo', ret)
    navigate(`/settings/rules?${sp.toString()}`)
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
              routeId={routeClassificationId}
              routeCreate={routeClassificationNew}
              onOpenRule={openClassificationById}
              onCloseRule={closeClassificationRoute}
            />
          ) : (
            <ParsersSection
              showInactive={parsersShowInactive}
              routeId={routeParserId}
              routeCreate={routeParserNew}
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

