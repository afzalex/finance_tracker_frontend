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
import { useState } from 'react'
import ClassificationsSection from '../components/rules/ClassificationsSection'
import ParsersSection from '../components/rules/ParsersSection'

export default function RulesPage() {
  const [tab, setTab] = useState(0)
  const [classificationsShowInactive, setClassificationsShowInactive] =
    useState(false)
  const [parsersShowInactive, setParsersShowInactive] = useState(false)
  const [classificationsCreateRequestId, setClassificationsCreateRequestId] =
    useState(0)
  const [parsersCreateRequestId, setParsersCreateRequestId] = useState(0)

  const showInactive =
    tab === 0 ? classificationsShowInactive : parsersShowInactive
  const setShowInactive =
    tab === 0 ? setClassificationsShowInactive : setParsersShowInactive

  const triggerCreate = () => {
    if (tab === 0) setClassificationsCreateRequestId((x) => x + 1)
    else setParsersCreateRequestId((x) => x + 1)
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
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
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
            />
          ) : (
            <ParsersSection
              showInactive={parsersShowInactive}
              createRequestId={parsersCreateRequestId}
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

