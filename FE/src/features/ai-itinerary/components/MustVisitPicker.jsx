import React, { useState, useEffect } from 'react'
import { searchLocationsApi } from '../api/aiItineraryApi'
import { BookmarkLocationTab } from './BookmarkLocationTab'

export function MustVisitPicker({ mustVisitLocations = [], onChangeMustVisit }) {
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'bookmark'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const selectedIds = mustVisitLocations.map((loc) => loc._id || loc.id)

  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== 'search') {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await searchLocationsApi(searchQuery.trim())
        const items = Array.isArray(response) ? response : (response?.data || [])
        setSearchResults(items)
      } catch (err) {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab])

  const handleAddLocation = (loc) => {
    const locId = loc._id || loc.id
    if (selectedIds.includes(locId)) return
    if (mustVisitLocations.length >= 10) return

    onChangeMustVisit([...mustVisitLocations, loc])
  }

  const handleRemoveLocation = (locId) => {
    onChangeMustVisit(mustVisitLocations.filter((loc) => (loc._id || loc.id) !== locId))
  }

  return (
    <div className="must-visit-picker">
      <div className="tab-picker-header">
        <button
          type="button"
          className={`picker-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          ⌕ Tìm địa điểm
        </button>
        <button
          type="button"
          className={`picker-tab ${activeTab === 'bookmark' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookmark')}
        >
          ♡ Đã lưu
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="search-tab-content">
          <div className="location-search-box">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Tìm địa điểm trong HueTrip (Đại Nội, Chùa Thiên Mụ...)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searching && <div className="mini-status">Đang tìm kiếm...</div>}

          {!searching && searchResults.length > 0 && (
            <div className="search-results-mini">
              {searchResults.map((loc) => {
                const locId = loc._id || loc.id
                const isSelected = selectedIds.includes(locId)
                return (
                  <div key={locId} className="mini-result-item">
                    <span className="mini-thumb citadel" />
                    <p>
                      <strong>{loc.name}</strong>
                      <small>{loc.categoryCode} · {loc.address?.addressLine || 'Huế'}</small>
                    </p>
                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleAddLocation(loc)}
                    >
                      {isSelected ? '✓ Đã chọn' : '＋ Thêm'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookmark' && (
        <BookmarkLocationTab
          selectedIds={selectedIds}
          onSelectLocation={handleAddLocation}
        />
      )}

      {mustVisitLocations.length > 0 && (
        <div className="selected-must">
          {mustVisitLocations.map((loc) => {
            const locId = loc._id || loc.id
            return (
              <span key={locId}>
                ★ {loc.name}
                <button type="button" onClick={() => handleRemoveLocation(locId)}>
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
