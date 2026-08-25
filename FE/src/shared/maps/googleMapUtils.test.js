import { describe, expect, it } from 'vitest'
import {
  buildAddressSuggestion,
  detachAdvancedMarker,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  normalizeLocationAddressLine,
  toLatLngLiteral,
} from './googleMapUtils'

describe('Google map utilities', () => {
  it('builds a street-level suggestion from Place address components', () => {
    expect(buildAddressSuggestion({
      formattedAddress: '15 Lê Lợi, Phường Thuận Hóa, Huế, Việt Nam',
      addressComponents: [
        { longText: '15', types: ['street_number'] },
        { longText: 'Lê Lợi', types: ['route'] },
        { longText: 'Phường Thuận Hóa', types: ['administrative_area_level_3'] },
      ],
    })).toEqual({
      formattedAddress: '15 Lê Lợi, Phường Thuận Hóa, Huế, Việt Nam',
      suggestedAddressLine: '15 Lê Lợi',
    })
  })

  it('does not use the full formatted address when street components are absent', () => {
    expect(buildAddressSuggestion({
      formatted_address: 'Đồi Vọng Cảnh, Huế, Việt Nam',
      address_components: [],
    })).toEqual({
      formattedAddress: 'Đồi Vọng Cảnh, Huế, Việt Nam',
      suggestedAddressLine: null,
    })
  })

  it('accepts Google LatLng objects and creates external URLs', () => {
    expect(toLatLngLiteral({ lat: () => 16.4637, lng: () => 107.5909 })).toEqual({ lat: 16.4637, lng: 107.5909 })
    expect(googleMapsSearchUrl(16.4637, 107.5909)).toContain('query=16.4637%2C107.5909')
    expect(googleMapsDirectionsUrl(16.4637, 107.5909)).toContain('destination=16.4637%2C107.5909')
  })

  it('normalizes address line whitespace without stripping address parts', () => {
    expect(normalizeLocationAddressLine('  15   Lê Lợi\n tầng 2  ')).toBe('15 Lê Lợi tầng 2')
  })

  it('does not throw when an incompletely initialized marker rejects map cleanup', () => {
    let removed = false
    const marker = {
      set map(_value) {
        throw new TypeError("Cannot read properties of undefined (reading 'getRootNode')")
      },
      remove() {
        removed = true
      },
    }

    expect(() => detachAdvancedMarker(marker)).not.toThrow()
    expect(removed).toBe(true)
  })
})
