import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PageHeader from './PageHeader'
import { renderWithTheme } from '../test/renderWithProviders'

describe('PageHeader', () => {
  it('renders title and description', () => {
    renderWithTheme(
      <PageHeader title="Dashboard" description="Subtitle text." />,
    )
    expect(screen.getByRole('heading', { level: 4, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Subtitle text.')).toBeInTheDocument()
  })

  it('renders title only when description is omitted', () => {
    renderWithTheme(<PageHeader title="Settings" />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
