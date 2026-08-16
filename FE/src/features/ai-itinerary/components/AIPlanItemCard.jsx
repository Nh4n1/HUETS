import React from 'react'

export function AIPlanItemCard({
  item,
  isFirst,
  isLast,
  onOpenAlternatives,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const { locationId, locationName, suggestedStartTime, durationMinutes, estimatedTravelMinutes, note } = item

  return (
    <div className="plan-item">
      <div className="time-col">
        <strong>{suggestedStartTime || '08:00'}</strong>
        <span>{durationMinutes || 60} phút</span>
      </div>

      <div className="timeline-node" />

      <div className="plan-card">
        <div className="plan-photo citadel-lg" />

        <div className="plan-info">
          <small>ĐỊA ĐIỂM</small>
          <h4>{locationName || 'Địa điểm tham quan'}</h4>
          <p>{note || 'Điểm dừng trong hành trình'}</p>

          <div className="match-tags">
            <span>Tham quan</span>
            <span>Khám phá</span>
          </div>

          <div className="item-actions">
            <button type="button" onClick={() => onOpenAlternatives(locationId)}>
              Thay địa điểm
            </button>
            <button type="button" className="danger-link" onClick={() => onDelete(locationId)}>
              Xóa
            </button>
          </div>
        </div>

        <div className="reorder-actions">
          <button type="button" disabled={isFirst} onClick={() => onMoveUp(locationId)}>
            ↑
          </button>
          <button type="button" disabled={isLast} onClick={() => onMoveDown(locationId)}>
            ↓
          </button>
        </div>
      </div>
    </div>
  )
}
