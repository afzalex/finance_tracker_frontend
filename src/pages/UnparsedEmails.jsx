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
  Portal,
  Snackbar,
  Stack,
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
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import useResource from '../hooks/useResource'
import { apiErrorMessage, listUnparsedEmails } from '../services/financeApi'

const clipCellSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
}

export default function UnparsedEmails() {
  const navigate = useNavigate()
  const params = useParams()
  const routeMailId = params.mailId ? String(params.mailId) : null
  const [uiMailId, setUiMailId] = useState(routeMailId)
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [openReprocessConfirm, setOpenReprocessConfirm] = useState(null)
  const bindOpenReprocessConfirm = useCallback(
    (fn) => setOpenReprocessConfirm(() => fn),
    [],
  )
  const openDetail = useCallback(
    (mailId) => {
      const mid = String(mailId ?? '')
      setUiMailId(mid)
      // keep URL in sync, but don't block UI
      navigate(`/emails/unparsed/${encodeURIComponent(mid)}`)
    },
    [navigate],
  )
  const closeDetail = useCallback(() => {
    setUiMailId(null)
    navigate('/emails/unparsed')
  }, [navigate])

  useEffect(() => {
    // Keep UI in sync when user navigates Back/Forward.
    setUiMailId(routeMailId)
  }, [routeMailId])

  const { status, data, error } = useResource('emails:unparsed', () =>
    listUnparsedEmails(),
  )

  const rows = useMemo(() => data ?? [], [data])

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Unparsed Emails"
        description="Emails in the unparsed queue (newest first)."
      />

      {error && <Alert severity="error">{apiErrorMessage(error)}</Alert>}

      <Card variant="outlined">
        <CardContent>
          {status === 'loading' ? (
            <LoadingBlock />
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small" aria-label="unparsed emails table" sx={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableCell sx={clipCellSx}>Mail ID</TableCell>
                    <TableCell sx={clipCellSx}>Subject</TableCell>
                    <TableCell sx={clipCellSx}>Snippet</TableCell>
                    <TableCell sx={clipCellSx}>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.mail_id}
                      hover
                      tabIndex={0}
                      role="button"
                      aria-label={`View unparsed email ${r.mail_id}`}
                      onClick={() => openDetail(r.mail_id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openDetail(r.mail_id)
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={clipCellSx} title={r.mail_id ?? ''}>
                        {r.mail_id ?? '—'}
                      </TableCell>
                      <TableCell sx={clipCellSx} title={r.subject ?? ''}>
                        {r.subject ?? '—'}
                      </TableCell>
                      <TableCell sx={clipCellSx} title={r.snippet ?? ''}>
                        {r.snippet ?? '—'}
                      </TableCell>
                      <TableCell sx={clipCellSx} title={r.reason ?? ''}>
                        {r.reason ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          No unparsed emails found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(uiMailId)}
        onClose={closeDetail}
        maxWidth="md"
        fullWidth
        scroll="paper"
        slotProps={{ transition: { timeout: 0 } }}
      >
        <DialogTitle>Source Email</DialogTitle>
        <DialogContent dividers>
          {uiMailId ? (
            <EmailSourcePanel
              mailId={uiMailId}
              active
              onNotify={(message) => setSnack({ open: true, message })}
              showReprocessButton={false}
              onBindOpenReprocessConfirm={bindOpenReprocessConfirm}
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

