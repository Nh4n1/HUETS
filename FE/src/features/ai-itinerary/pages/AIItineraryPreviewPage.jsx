import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react'
import {
  getAIDraftPreviewApi,
  replaceDraftItemApi,
  deleteDraftItemApi,
  savePlanToItineraryApi,
} from '../api/aiItineraryApi'
import { AIPlanTimeline } from '../components/AIPlanTimeline'
import { AlternativeLocationModal } from '../components/AlternativeLocationModal'
import styles from './AIItineraryCreatePage.module.css'

export function AIItineraryPreviewPage() {
  const { planId } = useParams()
  const navigate = useNavigate()

  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expired, setExpired] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveConflict, setSaveConflict] = useState(null) // { message, invalidItems }

  const [selectedAltLocationId, setSelectedAltLocationId] = useState(null)

  const loadDraft = async () => {
    setLoading(true)
    setError(null)
    setExpired(false)
    try {
      const response = await getAIDraftPreviewApi(planId)
      const data = response.data || response
      setDraft(data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setExpired(true)
      } else {
        setError(err?.response?.data?.message || 'Không thể tải bản nháp lịch trình.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (planId) {
      loadDraft()
    }
  }, [planId])

  const handleOpenAlternatives = (locationId) => {
    setSelectedAltLocationId(locationId)
  }

  const handleCloseAlternatives = () => {
    setSelectedAltLocationId(null)
  }

  const handleSelectAlternative = async (newLocationId) => {
    if (!selectedAltLocationId) return
    try {
      await replaceDraftItemApi(planId, selectedAltLocationId, newLocationId)
      setSelectedAltLocationId(null)
      await loadDraft()
    } catch (err) {
      alert(err?.response?.data?.message || 'Không thể thay thế địa điểm.')
    }
  }

  const handleDeleteItem = async (locationId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa điểm này khỏi bản nháp?')) return
    try {
      await deleteDraftItemApi(planId, locationId)
      await loadDraft()
    } catch (err) {
      alert(err?.response?.data?.message || 'Không thể xóa địa điểm.')
    }
  }

  const handleReorderDayItems = async (dayNumber, updatedItems) => {
    setDraft((prev) => {
      if (!prev) return prev
      const newDays = prev.days.map((d) => {
        if (d.dayNumber === dayNumber) {
          return { ...d, items: updatedItems }
        }
        return d
      })
      return { ...prev, days: newDays }
    })
  }

  const handleSaveToItinerary = async () => {
    setSaving(true)
    setSaveConflict(null)
    try {
      const response = await savePlanToItineraryApi(planId)
      const data = response.data || response
      const itineraryId = data._id || data.id

      if (itineraryId) {
        navigate(`/itineraries/mine/${itineraryId}`)
      } else {
        navigate('/itineraries/mine')
      }
    } catch (err) {
      setSaving(false)
      if (err?.response?.status === 409) {
        const details = err.response.data?.details || {}
        setSaveConflict({
          message: err.response.data?.message || 'Một số địa điểm không còn khả dụng.',
          invalidItems: details.invalidItems || [],
        })
      } else {
        alert(err?.response?.data?.message || 'Không thể lưu lịch trình.')
      }
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="mini-status" style={{ padding: '80px 0' }}>
          Đang tải bản nháp lịch trình...
        </div>
      </div>
    )
  }

  if (expired) {
    return (
      <div className={styles.container}>
        <section className="screen">
          <div className="state-card" style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
            <div className="state-icon expired-icon" style={{ margin: '0 auto 16px' }}>◷</div>
            <h3>Bản nháp đã hết hạn</h3>
            <p>Bản nháp AI chỉ được lưu tạm thời trước khi người dùng lưu chính thức.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/itineraries/ai/new')}
            >
              Tạo lại lịch trình mới
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (error || !draft) {
    return (
      <div className={styles.container}>
        <section className="screen">
          <div className="error-alert" style={{ maxWidth: '600px', margin: '40px auto' }}>
            ⚠ {error || 'Không tìm thấy bản nháp.'}
          </div>
        </section>
      </div>
    )
  }

  const totalStops = draft.days?.reduce((sum, d) => sum + (d.items?.length || 0), 0) || 0

  return (
    <div className={styles.container}>
      <div className="screen alt">
        <div className="draft-head">
          <div>
            <div className="badge-row">
              <span className="badge ai">✦ Bản nháp AI</span>
              <span className="badge neutral">{draft.durationDays} ngày</span>
              <span className="badge neutral">
                {draft.transport === 'motorcycle' ? 'Xe máy' : draft.transport === 'car' ? 'Ô tô' : 'Đi bộ'}
              </span>
              <span className="badge neutral">
                {draft.pace === 'relaxed' ? 'Thư giãn' : draft.pace === 'fast' ? 'Nhiều hoạt động' : 'Cân bằng'}
              </span>
            </div>
            <h2>{draft.title || 'Hành trình khám phá Huế'}</h2>
            <p>Bản nháp này chưa được lưu vào tài khoản. Bạn có thể chỉnh trước khi xác nhận.</p>
          </div>
          <div className="draft-head-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/itineraries/ai/new')}
            >
              Chỉnh yêu cầu
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveToItinerary}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : '▣ Lưu lịch trình'}
            </button>
          </div>
        </div>

        {draft.warnings && draft.warnings.length > 0 && (
          <div className="warning-summary">
            <span>⚠</span>
            <div>
              <strong>{draft.warnings.length} lưu ý về lịch trình</strong>
              <p>{draft.warnings.join(' · ')}</p>
            </div>
          </div>
        )}

        {saveConflict && (
          <div className="save-conflict">
            <div className="save-conflict-head">
              <span>⚠</span>
              <div>
                <strong>Một số địa điểm không còn khả dụng</strong>
                <p>{saveConflict.message}</p>
              </div>
            </div>
            {saveConflict.invalidItems.map((invalidId) => (
              <div key={invalidId} className="invalid-location-row">
                <span className="mini-thumb muted-thumb" />
                <div>
                  <strong>Địa điểm ID: {invalidId}</strong>
                  <small>Địa điểm đã bị ẩn hoặc ngưng hoạt động.</small>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleOpenAlternatives(invalidId)}
                >
                  Thay địa điểm
                </button>
                <button
                  type="button"
                  className="btn btn-ghost-danger"
                  onClick={() => handleDeleteItem(invalidId)}
                >
                  Xóa mục
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="draft-layout">
          <AIPlanTimeline
            days={draft.days}
            onOpenAlternatives={handleOpenAlternatives}
            onDeleteItem={handleDeleteItem}
            onReorderDayItems={handleReorderDayItems}
          />

          <aside className="draft-sidebar">
            <div className="mini-map">
              <span className="map-route route-a" />
              <span className="map-route route-b" />
              <span className="route-pin pin-1">1</span>
              <span className="route-pin pin-2">2</span>
              <span className="route-pin pin-3">3</span>
            </div>
            <div className="sidebar-section">
              <p className="eyebrow">TÓM TẮT HÀNH TRÌNH</p>
              <ul>
                <li>
                  <span>▣</span>
                  <strong>{totalStops} địa điểm</strong>
                </li>
                <li>
                  <span>◷</span>
                  <strong>{draft.durationDays} ngày chuyến đi</strong>
                </li>
              </ul>
            </div>
            <div className="sidebar-section">
              <button
                type="button"
                className="btn btn-outline full"
                onClick={() => navigate('/itineraries/ai/new')}
              >
                ⟳ Tạo lại lịch trình
              </button>
              <small>Chỉ gọi AI lại khi muốn thay đổi đáng kể toàn bộ bản nháp.</small>
            </div>
          </aside>
        </div>

        <div className="sticky-save">
          <div>
            <strong>Bản nháp chưa được lưu</strong>
            <span>Hãy kiểm tra lại trước khi lưu.</span>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/itineraries/ai/new')}
          >
            Tạo lại
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveToItinerary}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : '▣ Lưu lịch trình'}
          </button>
        </div>
      </div>

      {selectedAltLocationId && (
        <AlternativeLocationModal
          planId={planId}
          locationId={selectedAltLocationId}
          onClose={handleCloseAlternatives}
          onSelectAlternative={handleSelectAlternative}
        />
      )}
    </div>
  )
}
