import React, { useEffect, useState } from 'react'
import { getItemAlternativesApi } from '../api/aiItineraryApi'

export function AlternativeLocationModal({ planId, locationId, onClose, onSelectAlternative }) {
  const [alternatives, setAlternatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function loadAlternatives() {
      setLoading(true)
      setError(null)
      try {
        const response = await getItemAlternativesApi(planId, locationId)
        const items = Array.isArray(response) ? response : (response?.data || [])
        if (isMounted) {
          setAlternatives(items)
        }
      } catch (err) {
        if (isMounted) {
          setError('Không thể tải gợi ý địa điểm thay thế.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (planId && locationId) {
      loadAlternatives()
    }
    return () => {
      isMounted = false
    }
  }, [planId, locationId])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Gợi ý địa điểm thay thế</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && <div className="mini-status">Đang tìm địa điểm thay thế...</div>}
          {error && <div className="mini-status error">{error}</div>}

          {!loading && !error && alternatives.length === 0 && (
            <div className="mini-status">Không tìm thấy địa điểm thay thế phù hợp.</div>
          )}

          {!loading &&
            !error &&
            alternatives.map((alt) => {
              const loc = alt.location
              const locId = loc._id || loc.id

              return (
                <div key={locId} className="alt-item">
                  <span className="mini-thumb citadel" />
                  <div className="alt-info">
                    <strong>{loc.name}</strong>
                    <small>{loc.categoryCode} · {loc.address?.addressLine || 'Huế'}</small>
                    <p className="alt-reason">{alt.reason}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => onSelectAlternative(locId)}
                  >
                    Chọn điểm này
                  </button>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
