import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Settings from '../../pages/Settings'
import { renderWithTheme } from '../renderWithTheme'

describe('Settings', () => {
  it('renders settings page elements', () => {
    renderWithTheme(<Settings />)
    
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Placeholder settings page.')).toBeInTheDocument()
    expect(
      screen.getByText(/Backend integration is not wired yet/i)
    ).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
    expect(
      screen.getByText(/Planned: configurable base URL and connectivity check./i)
    ).toBeInTheDocument()
  })
})
