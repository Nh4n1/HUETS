import { describe, expect, it } from 'vitest'
import { validateEvidenceFiles } from './evidenceValidation'

const image = (size = 1024, type = 'image/jpeg') => ({ size, type })

describe('ownership evidence validation', () => {
  it('accepts one to five supported images', () => {
    expect(validateEvidenceFiles([image(), image(2048, 'image/webp')])).toBe('')
  })

  it('rejects PDF and empty evidence', () => {
    expect(validateEvidenceFiles([])).toContain('1 đến 5')
    expect(validateEvidenceFiles([image(1024, 'application/pdf')])).toContain('không hỗ trợ PDF')
  })

  it('enforces per-file and total limits', () => {
    expect(validateEvidenceFiles([image(5 * 1024 * 1024 + 1)])).toContain('5 MB')
    expect(validateEvidenceFiles(Array.from({ length: 5 }, () => image(4.5 * 1024 * 1024)))).toContain('20 MB')
  })
})
