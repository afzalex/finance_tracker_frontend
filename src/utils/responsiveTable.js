/** Flex children default to minWidth:auto and grow with wide content; use on page roots and cards. */
export const pageStackWidthSx = {
  minWidth: 0,
  maxWidth: '100%',
  width: '100%',
}

/**
 * Tighter vertical rhythm below `md`. Use for main page Stack `spacing`, toolbar/filter
 * Stack `gap`, and grid `gap` in page sections.
 */
export const layoutSectionSpacing = { xs: 1, md: 2 }

/** Divider between card title and table/body (e.g. Analytics). */
export const layoutSectionDividerSx = {
  my: { xs: 0.5, md: 1 },
}

/** Divider directly under list header row (Transactions, Unparsed, Dashboard cards). */
export const layoutSectionDividerBottomSx = {
  mb: { xs: 0.5, md: 1 },
}

/** Margin before divider / under headings / under alerts in those sections. */
export const layoutSectionMarginBottomSx = {
  mb: { xs: 0.5, md: 1 },
}

/** Larger section break (e.g. Settings). */
export const layoutMajorDividerSx = {
  my: { xs: 1, md: 2 },
}

/** Card that wraps a horizontally scrollable table — does not expand past the main column. */
export const dataCardWidthSx = {
  minWidth: 0,
  maxWidth: '100%',
  width: '100%',
  overflow: 'hidden',
}

/** Scroll only the table; keep pagination / chrome viewport-wide. */
export const tableHorizontalScrollSx = {
  minWidth: 0,
  maxWidth: '100%',
  width: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
}

/**
 * Smaller cell text below `md` (matches stacked filters / horizontal-scroll tables).
 * Pass as part of `<Table sx={[..., tableSmallScreenTextSx(theme)]}>`.
 * @param {import('@mui/material/styles').Theme} theme
 */
export function tableSmallScreenTextSx(theme) {
  return {
    [theme.breakpoints.down('md')]: {
      '& .MuiTableCell-root': {
        fontSize: '0.8125rem',
        lineHeight: 1.35,
      },
      '& .MuiTableSortLabel-root': {
        fontSize: 'inherit',
      },
    },
  }
}

/**
 * Match {@link tableSmallScreenTextSx} for the transactions table pagination bar.
 * @param {import('@mui/material/styles').Theme} theme
 */
export function tablePaginationSmallScreenSx(theme) {
  return {
    [theme.breakpoints.down('md')]: {
      '& .MuiTablePagination-toolbar': { fontSize: '0.8125rem' },
      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
        fontSize: 'inherit',
      },
    },
  }
}
