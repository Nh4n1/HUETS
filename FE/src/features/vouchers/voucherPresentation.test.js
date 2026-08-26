import { describe, expect, it } from 'vitest'
import { formatVoucherBenefit, getClaimTab } from './voucherPresentation'

describe('voucher presentation', () => {
  it('formats percentage and fixed VND benefits', () => {
    expect(formatVoucherBenefit({ type: 'percentage', value: 20, maxDiscountAmount: 50000 })).toContain('20%')
    expect(formatVoucherBenefit({ type: 'fixed_amount', value: 30000 })).toContain('30.000')
  })

  it('groups expired and blocked claims away from available claims', () => {
    expect(getClaimTab('available')).toBe('available')
    expect(getClaimTab('used')).toBe('used')
    expect(getClaimTab('expired')).toBe('unavailable')
    expect(getClaimTab('unavailable')).toBe('unavailable')
  })
})
