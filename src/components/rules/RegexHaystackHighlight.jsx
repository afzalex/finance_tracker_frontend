import { alpha } from '@mui/material/styles'
import { Box, Tooltip, Typography, useTheme } from '@mui/material'

/**
 * @typedef {{ start: number, end: number }} RegexSpan
 * @typedef {{ index: number, name?: string | null, start: number, end: number }} RegexGroupSpan
 * @typedef {{
 *   skipped?: boolean,
 *   haystack?: string,
 *   regex_error?: string | null,
 *   matched?: boolean | null,
 *   extracted_value?: string | null,
 *   full_match?: RegexSpan | null,
 *   groups?: RegexGroupSpan[],
 * }} RegexFieldPreview
 */

/**
 * @param {string} text
 * @param {RegexSpan | null | undefined} fullMatch
 * @param {RegexGroupSpan[] | undefined} groups
 */
function buildSegments(text, fullMatch, groups) {
  const t = text ?? ''
  const boundaries = new Set([0, t.length])
  if (fullMatch && fullMatch.end > fullMatch.start) {
    boundaries.add(fullMatch.start)
    boundaries.add(fullMatch.end)
  }
  for (const g of groups || []) {
    if (g && g.end > g.start && g.start >= 0) {
      boundaries.add(g.start)
      boundaries.add(g.end)
    }
  }
  const pts = Array.from(boundaries).sort((a, b) => a - b)
  /** @type {{ key: string, chunk: string, inFull: boolean, namedNames: string[], inNumberedOnly: boolean }[]} */
  const out = []
  for (let i = 0; i < pts.length - 1; i += 1) {
    const s = pts[i]
    const e = pts[i + 1]
    if (s === e) continue
    const inFull = !!(fullMatch && s >= fullMatch.start && e <= fullMatch.end)
    const overlapping = (groups || []).filter(
      (g) => g.end > g.start && g.start >= 0 && s >= g.start && e <= g.end,
    )
    const namedNames = overlapping
      .map((g) => g.name)
      .filter((n) => n != null && String(n).length > 0)
      .map(String)
    const inNumberedOnly = overlapping.some((g) => !g.name && g.index >= 1)
    out.push({
      key: `${s}:${e}`,
      chunk: t.slice(s, e),
      inFull,
      namedNames,
      inNumberedOnly,
    })
  }
  return out
}

/**
 * Renders haystack with server-provided match spans (full match vs capturing vs named).
 * @param {{ field: RegexFieldPreview }} props
 */
export default function RegexHaystackHighlight({ field }) {
  const theme = useTheme()

  if (!field || field.skipped) return null

  if (field.regex_error) {
    return (
      <Typography variant="body2" color="error">
        {field.regex_error}
      </Typography>
    )
  }

  if (field.matched === false) {
    return (
      <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
        <Typography variant="caption" color="text.secondary" component="span" sx={{ mr: 0.75 }}>
          No match.
        </Typography>
        <PlainHaystack haystack={field.haystack} />
      </Box>
    )
  }

  if (field.matched !== true) return null

  const segments = buildSegments(field.haystack ?? '', field.full_match, field.groups)

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 280,
        overflowY: 'auto',
        display: 'block',
      }}
    >
        {segments.map((seg) => {
          if (!seg.inFull) {
            return (
              <Box key={seg.key} component="span">
                {seg.chunk}
              </Box>
            )
          }
          if (seg.namedNames.length) {
            const title = seg.namedNames.join(', ')
            const sx = {
              bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.32 : 0.28),
              borderBottom: `2px dotted ${theme.palette.warning.dark}`,
              borderRadius: 0.25,
            }
            return (
              <Tooltip key={seg.key} title={title} arrow enterDelay={200}>
                <Box component="span" sx={sx}>
                  {seg.chunk}
                </Box>
              </Tooltip>
            )
          }
          if (seg.inNumberedOnly) {
            return (
              <Box
                key={seg.key}
                component="span"
                sx={{
                  bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.28 : 0.22),
                  borderRadius: 0.25,
                }}
              >
                {seg.chunk}
              </Box>
            )
          }
          return (
            <Box
              key={seg.key}
              component="span"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.18),
                borderRadius: 0.25,
              }}
            >
              {seg.chunk}
            </Box>
          )
        })}
    </Box>
  )
}

function PlainHaystack({ haystack }) {
  const h = haystack ?? ''
  if (!h) {
    return (
      <Typography variant="body2" color="text.secondary" component="span">
        —
      </Typography>
    )
  }
  return (
    <Box
      component="span"
      sx={{
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {h}
    </Box>
  )
}
