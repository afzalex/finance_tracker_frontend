import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LoadingBlock from './LoadingBlock'
import { renderWithTheme } from '../test/renderWithTheme'

describe('LoadingBlock', () => {
  it('shows a progress indicator', () => {
    renderWithTheme(<LoadingBlock />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
