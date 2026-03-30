import { ThemeProvider } from '@mui/material'
import { render } from '@testing-library/react'
import theme from '../theme'

export function renderWithTheme(ui, options) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>, options)
}
