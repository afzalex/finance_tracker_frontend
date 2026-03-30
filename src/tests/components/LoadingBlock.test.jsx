import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LoadingBlock from '../../components/LoadingBlock'
import { renderWithTheme } from '../renderWithTheme'

describe('LoadingBlock', () => {
  it('shows a progress indicator', () => {
    renderWithTheme(<LoadingBlock />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
