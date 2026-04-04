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
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import ClassificationsSection from '../components/rules/ClassificationsSection'
import ParsersSection from '../components/rules/ParsersSection'

function rulesQuerySuffix(searchParams) {
  const sp = new URLSearchParams(searchParams)
  sp.delete('tab')
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export default function RulesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()

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

  const isParsersPath = location.pathname.startsWith('/settings/rules/parsers')

  const tab = useMemo(() => {
    if (routeClassificationId != null || routeClassificationNew) return 0
    if (routeParserId != null || routeParserNew) return 1
    return isParsersPath ? 1 : 0
  }, [
    isParsersPath,
    routeClassificationId,
    routeClassificationNew,
    routeParserId,
    routeParserNew,
  ])

  const [classificationsShowInactive, setClassificationsShowInactive] =
    useState(false)
  const [parsersShowInactive, setParsersShowInactive] = useState(false)

  const showInactive =
    tab === 0 ? classificationsShowInactive : parsersShowInactive
  const setShowInactive =
    tab === 0 ? setClassificationsShowInactive : setParsersShowInactive

  const triggerCreate = () => {
    const suffix = rulesQuerySuffix(searchParams)
    if (tab === 0) {
      navigate(`/settings/rules/classifications/new${suffix}`)
    } else {
      navigate(`/settings/rules/parsers/new${suffix}`)
    }
  }

  const setTabAndUrl = (nextTab) => {
    const suffix = rulesQuerySuffix(searchParams)
    navigate(
      nextTab === 1
        ? `/settings/rules/parsers${suffix}`
        : `/settings/rules/classifications${suffix}`,
    )
  }

  const openClassificationById = (id) => {
    const suffix = rulesQuerySuffix(searchParams)
    navigate(`/settings/rules/classifications/${id}${suffix}`)
  }

  const closeClassificationRoute = () => {
    const sp = new URLSearchParams()
    const ret = searchParams.get('returnTo')
    if (ret) sp.set('returnTo', ret)
    const qs = sp.toString()
    navigate(qs ? `/settings/rules/classifications?${qs}` : '/settings/rules/classifications')
  }

  const openParserById = (id) => {
    const suffix = rulesQuerySuffix(searchParams)
    navigate(`/settings/rules/parsers/${id}${suffix}`)
  }

  const closeParserRoute = () => {
    const sp = new URLSearchParams()
    const ret = searchParams.get('returnTo')
    if (ret) sp.set('returnTo', ret)
    const qs = sp.toString()
    navigate(qs ? `/settings/rules/parsers?${qs}` : '/settings/rules/parsers')
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

