import { useMemo } from 'react'
import { useTheme } from '@mui/material'

/** Matches RootLayout footer content height (excluding safe-area padding). */
const FOOTER_BAR_PX = 44

/**
 * Inset dialog paper below the fixed AppBar and above the fixed footer so chrome stays visible.
 * Use for primary detail/edit dialogs (not small confirms).
 */
export default function useDetailDialogSlotProps() {
  const theme = useTheme()
  return useMemo(() => {
    const raw = theme.mixins.toolbar?.minHeight ?? 56
    const toolbarPx =
      typeof raw === 'number'
        ? raw
        : Number.parseInt(String(raw).replace(/px$/i, ''), 10) || 56
    return {
      paper: {
        sx: {
          m: { xs: 1, sm: 2 },
          mt: { xs: `${toolbarPx + 8}px`, sm: undefined },
          maxHeight: {
            xs: `calc(100dvh - ${toolbarPx}px - ${FOOTER_BAR_PX}px - 24px - env(safe-area-inset-bottom, 0px))`,
            sm: '90vh',
          },
          // Only narrow viewports: nearly full-bleed. sm+ keeps Dialog `maxWidth` / `fullWidth` (md, sm, …).
          [theme.breakpoints.down('sm')]: {
            width: 'calc(100vw - 16px)',
            maxWidth: 'calc(100vw - 16px)',
          },
        },
      },
    }
  }, [theme])
}
