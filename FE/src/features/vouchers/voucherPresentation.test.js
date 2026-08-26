import { describe, expect, it } from 'vitest'
import { formatVoucherBenefit, formatVoucherDateTime, getClaimTab, getViewerClaimPresentation, getVoucherConditionSummary } from './voucherPresentation'

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

  it('formats voucher timestamps in Vietnamese time without seconds', () => {
    expect(formatVoucherDateTime('2026-08-26T01:00:00.000Z')).toBe('08:00 · 26/08/2026')
    expect(formatVoucherDateTime(null)).toBe('—')
  })

  it('summarizes conditions and viewer claim states', () => {
    expect(getVoucherConditionSummary({ minOrderAmount: 100000 })).toContain('100.000')
    expect(getViewerClaimPresentation({ displayStatus: 'available' }).label).toBe('Đã lưu')
    expect(getViewerClaimPresentation({ displayStatus: 'used' }).label).toBe('Đã sử dụng')
  })
})
