import { Box } from '@mui/material'
import { formatInrAmountParts } from '../utils/format'

/**
 * INR code + figure, matching the Accounts table pattern.
 * @param {{ value: number, totalRow?: boolean, figureSx?: object, density?: 'default' | 'emphasized', inline?: boolean, align?: 'start' | 'center' | 'end' }} props
 */
export default function InrAmountCell({
  value,
  totalRow = false,
  figureSx,
  density = 'default',
  inline = false,
  align = 'end',
}) {
  const { code, figure } = formatInrAmountParts(value)
  const compact = density === 'default'
  const justifyContent =
    align === 'center' ? 'center' : align === 'start' ? 'flex-start' : 'flex-end'
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        justifyContent,
        gap: 0.5,
        width: inline ? 'auto' : '100%',
        fontVariantNumeric: 'tabular-nums',
        ...(compact ? { typography: 'body2' } : {}),
      }}
    >
      <Box
        component="span"
        sx={{
          opacity: 0.45,
          fontWeight: 400,
          fontSize: compact ? '0.6875rem' : '0.8125rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'text.secondary',
          flexShrink: 0,
        }}
      >
        {code}
      </Box>
      <Box
        component="span"
        sx={{
          fontWeight: totalRow ? 700 : 600,
          color: totalRow ? 'text.primary' : 'inherit',
          ...(compact ? {} : { fontSize: '1.5rem', lineHeight: 1.2 }),
          ...figureSx,
        }}
      >
        {figure}
      </Box>
    </Box>
  )
}
