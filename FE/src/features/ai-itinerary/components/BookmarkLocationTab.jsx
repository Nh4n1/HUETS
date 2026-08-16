import React, { useEffect, useState } from 'react'
import { getMyBookmarkedLocationsApi } from '../api/aiItineraryApi'

export function BookmarkLocationTab({ selectedIds = [], onSelectLocation }) {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function loadBookmarks() {
      setLoading(true)
      setError(null)
      try {
        const response = await getMyBookmarkedLocationsApi()
        const data = Array.isArray(response) ? response : (response?.data || [])
        if (isMounted) {
          setBookmarks(data)
        }
      } catch (err) {
        if (isMounted) {
          setError('Không thể tải danh sách địa điểm đã lưu.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadBookmarks()
    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return <div className="mini-status">Đang tải địa điểm đã lưu...</div>
  }

  if (error) {
    return <div className="mini-status error">{error}</div>
  }

  if (bookmarks.length === 0) {
    return <div className="mini-status">Bạn chưa lưu địa điểm nào.</div>
  }

  return (
    <div className="search-results-mini">
      {bookmarks.map((b) => {
        const loc = b.location || b.target || b
        const locId = loc._id || loc.id
        const isSelected = selectedIds.includes(locId)

        return (
          <div key={locId} className="mini-result-item">
            <span className="mini-thumb citadel" />
            <p>
              <strong>{loc.name || 'Địa điểm đã lưu'}</strong>
              <small>{loc.categoryCode || 'Địa điểm'} · {loc.address?.wardNameSnapshot || 'Huế'}</small>
            </p>
            <button
              type="button"
              disabled={isSelected}
              onClick={() => onSelectLocation(loc)}
            >
              {isSelected ? '✓ Đã chọn' : '＋ Thêm'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
