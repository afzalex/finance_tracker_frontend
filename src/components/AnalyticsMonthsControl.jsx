import { alpha } from '@mui/material/styles'
import { Box, MenuItem, Select, Stack, Typography } from '@mui/material'
import {
  ANALYTICS_MONTH_CHOICES,
  analyticsMonthsLabel,
} from '../utils/analyticsRange'

const labelSx = {
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontSize: '0.65rem',
  color: 'text.secondary',
  lineHeight: 1.2,
  flexShrink: 0,
}

function chipSx(theme) {
  return {
    display: 'inline-flex',
    alignItems: 'stretch',
    flexShrink: 0,
    minHeight: 44,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '6px',
    bgcolor: alpha(theme.palette.background.default, 0.72),
    overflow: 'hidden',
    boxSizing: 'border-box',
    transition: theme.transitions.create(['border-color', 'box-shadow'], {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.22),
      bgcolor: alpha(theme.palette.background.default, 0.88),
    },
    '&:focus-within': {
      outline: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
      outlineOffset: 2,
    },
  }
}

/**
 * Period selector for Analytics; matches {@link HeaderDateRangeFilter} chip border/size.
 */
export default function AnalyticsMonthsControl({
  value,
  onChange,
  fullWidth = false,
}) {
  return (
    <Box
      sx={(theme) => ({
        ...chipSx(theme),
        ...(fullWidth ? { width: '100%', minWidth: 0 } : {}),
      })}
      role="presentation"
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          flex: 1,
          minWidth: 0,
          px: 1.5,
          py: 0.75,
          boxSizing: 'border-box',
        }}
      >
        <Typography variant="caption" sx={labelSx} component="span">
          Period
        </Typography>
        <Select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          variant="standard"
          disableUnderline
          size="small"
          inputProps={{ 'aria-label': 'Analytics period' }}
          sx={{
            flex: 1,
            minWidth: fullWidth ? 0 : 148,
            fontWeight: 600,
            fontSize: '0.875rem',
            fontVariantNumeric: 'tabular-nums',
            '& .MuiSelect-select': {
              py: 0.25,
              pr: '24px !important',
              display: 'flex',
              alignItems: 'center',
            },
          }}
          MenuProps={{
            slotProps: {
              paper: {
                sx: (t) => ({
                  borderRadius: '6px',
                  border: `1px solid ${t.palette.divider}`,
                  mt: 0.5,
                }),
              },
            },
          }}
        >
          {ANALYTICS_MONTH_CHOICES.map((n) => (
            <MenuItem key={n} value={n} dense>
              {analyticsMonthsLabel(n)}
            </MenuItem>
          ))}
        </Select>
      </Stack>
    </Box>
  )
}
