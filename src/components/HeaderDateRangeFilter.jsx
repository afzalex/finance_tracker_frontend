import { useCallback, useState } from 'react'
import { Box, Button, ButtonBase, Chip, Divider, Popover, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { DayPicker } from 'react-day-picker'
import useDateRange from '../contexts/useDateRange'
import { formatDate } from '../utils/format'

import 'react-day-picker/style.css'

function formatYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ymdToDate(ymd) {
  const parts = String(ymd).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return new Date()
  }
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function ymdToDisplay(ymd) {
  if (!ymd) return '—'
  return formatDate(`${ymd}T12:00:00`)
}

function defaultRangeYmd() {
  const now = new Date()
  const from = formatYmd(new Date(now.getFullYear(), now.getMonth(), 1))
  const to = formatYmd(now)
  return { from, to }
}

/** First through last day of the current calendar month. */
function currentMonthYmd() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const from = formatYmd(new Date(y, m, 1))
  const to = formatYmd(new Date(y, m + 1, 0))
  return { from, to }
}

/** First through last day of the previous calendar month. */
function previousMonthYmd() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const firstPrev = new Date(y, m - 1, 1)
  const py = firstPrev.getFullYear()
  const pm = firstPrev.getMonth()
  const from = formatYmd(new Date(py, pm, 1))
  const to = formatYmd(new Date(py, pm + 1, 0))
  return { from, to }
}

/** First day of current calendar quarter through last day of that quarter. */
function currentQuarterYmd() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const qStartMonth = Math.floor(m / 3) * 3
  const qEndMonth = qStartMonth + 2
  const from = formatYmd(new Date(y, qStartMonth, 1))
  const to = formatYmd(new Date(y, qEndMonth + 1, 0))
  return { from, to }
}

/** Jan 1 through Dec 31 of the current calendar year. */
function currentYearYmd() {
  const y = new Date().getFullYear()
  return {
    from: formatYmd(new Date(y, 0, 1)),
    to: formatYmd(new Date(y, 11, 31)),
  }
}

/**
 * From / To range control (Transactions page). Opens a popover calendar (anchored bottom-right).
 * First click starts a new range (resetOnSelect); second completes the draft; Apply commits and closes.
 * Presets apply immediately and close. Closing via backdrop discards an unapplied draft.
 * Committed range is shared via DateRangeContext (Transactions, Unparsed Emails, Accounts, Analytics).
 */
export default function HeaderDateRangeFilter() {
  const { from, to, setRange } = useDateRange()

  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  const [draft, setDraft] = useState(undefined)
  const [calendarMonth, setCalendarMonth] = useState(() => ymdToDate(defaultRangeYmd().from))

  const applyRangeYmd = useCallback((range) => {
    setRange({ from: range.from, to: range.to })
    setDraft({ from: ymdToDate(range.from), to: ymdToDate(range.to) })
    setCalendarMonth(ymdToDate(range.from))
    setAnchorEl(null)
  }, [setRange])

  const openPopover = useCallback(
    (event) => {
      const start = ymdToDate(from)
      const end = ymdToDate(to)
      setDraft({ from: start, to: end })
      setCalendarMonth(start)
      setAnchorEl(event.currentTarget)
    },
    [from, to],
  )

  const closePopover = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleSelect = useCallback((range) => {
    setDraft(range)
  }, [])

  const canConfirmDraft = Boolean(draft?.from && draft?.to)

  const confirmDraft = useCallback(() => {
    if (!draft?.from || !draft?.to) return
    setRange({ from: formatYmd(draft.from), to: formatYmd(draft.to) })
    setAnchorEl(null)
  }, [draft, setRange])

  const shortcutChipSx = (theme) => ({
    height: 26,
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '6px',
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    justifyContent: 'center',
    borderColor: alpha(theme.palette.divider, 0.5),
    bgcolor: alpha(theme.palette.action.hover, 0.06),
    '&:hover': {
      bgcolor: alpha(theme.palette.primary.main, 0.08),
      borderColor: alpha(theme.palette.primary.main, 0.4),
    },
    '&:focus-visible': {
      bgcolor: alpha(theme.palette.primary.main, 0.08),
      borderColor: alpha(theme.palette.primary.main, 0.5),
    },
    '& .MuiChip-label': {
      px: 0.5,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  })

  const labelSx = {
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontSize: '0.65rem',
    color: 'text.secondary',
    lineHeight: 1.2,
  }

  const chipCellSx = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.25,
    minHeight: 44,
    px: 1.5,
    py: 0.75,
    minWidth: 0,
    boxSizing: 'border-box',
  }

  const chipSx = (theme) => ({
    display: 'inline-flex',
    alignItems: 'stretch',
    flexShrink: 0,
    minHeight: 44,
    border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
    borderRadius: '6px',
    bgcolor: alpha(theme.palette.background.paper, 0.75),
    overflow: 'hidden',
    boxSizing: 'border-box',
    transition: theme.transitions.create(['border-color', 'box-shadow'], {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.35),
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  })

  return (
    <>
      <ButtonBase
        onClick={openPopover}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`From ${ymdToDisplay(from)} to ${ymdToDisplay(to)}. Open calendar.`}
        sx={{ borderRadius: '6px', flexShrink: 0 }}
      >
        <Box sx={chipSx} role="presentation">
          <Stack component="div" sx={chipCellSx}>
            <Typography variant="caption" sx={labelSx} component="span">
              From
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.25,
              }}
            >
              {ymdToDisplay(from)}
            </Typography>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider', my: 0 }} />

          <Stack component="div" sx={chipCellSx}>
            <Typography variant="caption" sx={labelSx} component="span">
              To
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.25,
              }}
            >
              {ymdToDisplay(to)}
            </Typography>
          </Stack>
        </Box>
      </ButtonBase>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: (theme) => ({
              mt: 1,
              width: { xs: 'min(100vw - 16px, 380px)', sm: 380 },
              maxWidth: 'calc(100vw - 16px)',
              borderRadius: '6px',
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
              bgcolor: alpha(theme.palette.background.paper, 0.55),
              backdropFilter: 'blur(12px)',
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
            }),
          },
        }}
      >
        <Stack spacing={0} sx={{ width: '100%' }}>
          <Box
            sx={(theme) => ({
              width: '100%',
              py: 0.5,
              px: 0.75,
              bgcolor: alpha(theme.palette.common.white, 0.35),
              '& .rdp-root': {
                '--rdp-accent-color': alpha(theme.palette.primary.main, 0.85),
                '--rdp-accent-background-color': alpha(theme.palette.primary.main, 0.08),
                /* Inner grid only — keep header/nav at library defaults */
                '--rdp-day-height': '30px',
                '--rdp-day-width': '30px',
                '--rdp-day_button-height': '28px',
                '--rdp-day_button-width': '28px',
                '--rdp-nav-height': '2.75rem',
                '--rdp-nav_button-height': '2.25rem',
                '--rdp-nav_button-width': '2.25rem',
                '--rdp-weekday-padding': '0.35rem 0',
                width: '100%',
                margin: 0,
              },
              '& .rdp-months, & .rdp-month': { width: '100%' },
              '& .rdp-month_grid': {
                width: '100%',
                tableLayout: 'fixed',
              },
              '& .rdp-weekday': {
                width: `${100 / 7}%`,
              },
              '& .rdp-day': {
                width: `${100 / 7}%`,
                verticalAlign: 'middle',
              },
              '& .rdp-day_button': {
                fontSize: '0.75rem',
                fontWeight: 500,
                margin: '0 auto',
              },
              '& .rdp-selected': {
                fontSize: 'inherit',
                fontWeight: 600,
              },
            })}
          >
            <DayPicker
              mode="range"
              resetOnSelect
              navLayout="around"
              selected={draft}
              onSelect={handleSelect}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
          </Box>

          <Divider sx={{ borderColor: (t) => alpha(t.palette.divider, 0.45) }} />

          <Box
            sx={(theme) => ({
              px: 1,
              py: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              bgcolor: alpha(theme.palette.action.hover, 0.05),
            })}
          >
            <Stack spacing={0.5} sx={{ width: '100%', alignSelf: 'stretch' }}>
              <Stack direction="row" spacing={0.5} sx={{ width: '100%' }}>
                <Chip
                  label="This Month"
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => applyRangeYmd(currentMonthYmd())}
                  sx={shortcutChipSx}
                />
                <Chip
                  label="Previous Month"
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => applyRangeYmd(previousMonthYmd())}
                  sx={shortcutChipSx}
                />
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ width: '100%' }}>
                <Chip
                  label="This Quarter"
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => applyRangeYmd(currentQuarterYmd())}
                  sx={shortcutChipSx}
                />
                <Chip
                  label="This Year"
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => applyRangeYmd(currentYearYmd())}
                  sx={shortcutChipSx}
                />
              </Stack>
            </Stack>

            <Button
              variant="contained"
              size="small"
              disableElevation
              disabled={!canConfirmDraft}
              onClick={confirmDraft}
              fullWidth
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                py: 0.75,
                borderRadius: '6px',
              }}
            >
              Apply
            </Button>
          </Box>
        </Stack>
      </Popover>
    </>
  )
}
