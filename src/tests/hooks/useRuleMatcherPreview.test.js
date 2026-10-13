import { describe, expect, it } from 'vitest'
import {
  matchedMailFromPreviewResponse,
  normalizeMatchPreviewListResponse,
} from '../../hooks/useRuleMatcherPreview'

describe('matchedMailFromPreviewResponse', () => {
  it('returns normalized first item when context mail matched', () => {
    const data = {
      matched: true,
      mail_id: 'abc123',
      items: [
        {
          mail_id: 'abc123',
          subject: 'Payment received',
          sender: 'bank@example.com',
          snippet: 'You paid $50',
          body_text: 'Full body',
        },
      ],
    }
    expect(matchedMailFromPreviewResponse(data)).toEqual({
      mail_id: 'abc123',
      subject: 'Payment received',
      sender: 'bank@example.com',
      when: '',
      snippet: 'You paid $50',
      bodyText: 'Full body',
    })
  })

  it('returns null when no items', () => {
    expect(matchedMailFromPreviewResponse({ matched: false, items: [] })).toBeNull()
  })
})

describe('normalizeMatchPreviewListResponse', () => {
  it('maps body_text to bodyText', () => {
    const { items } = normalizeMatchPreviewListResponse({
      items: [{ mail_id: 'x', body_text: 'hello' }],
    })
    expect(items[0].bodyText).toBe('hello')
  })
})
