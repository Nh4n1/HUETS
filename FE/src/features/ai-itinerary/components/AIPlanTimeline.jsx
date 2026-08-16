import React, { useState } from 'react'
import { AIPlanItemCard } from './AIPlanItemCard'

export function AIPlanTimeline({
  days = [],
  onOpenAlternatives,
  onDeleteItem,
  onReorderDayItems,
}) {
  const [activeDayIndex, setActiveDayIndex] = useState(0)

  if (!days || days.length === 0) {
    return <div className="mini-status">Bản nháp chưa có dữ liệu ngày.</div>
  }

  const activeDay = days[activeDayIndex] || days[0]
  const items = activeDay.items || []

  const handleMoveUp = (locationId) => {
    const idx = items.findIndex((i) => (i.locationId._id || i.locationId) === locationId || i.locationId === locationId)
    if (idx <= 0) return

    const newItems = [...items]
    const temp = newItems[idx - 1]
    newItems[idx - 1] = newItems[idx]
    newItems[idx] = temp

    onReorderDayItems(activeDay.dayNumber, newItems)
  }

  const handleMoveDown = (locationId) => {
    const idx = items.findIndex((i) => (i.locationId._id || i.locationId) === locationId || i.locationId === locationId)
    if (idx < 0 || idx >= items.length - 1) return

    const newItems = [...items]
    const temp = newItems[idx + 1]
    newItems[idx + 1] = newItems[idx]
    newItems[idx] = temp

    onReorderDayItems(activeDay.dayNumber, newItems)
  }

  return (
    <div className="draft-main">
      <div className="day-tabs">
        {days.map((d, idx) => (
          <button
            key={d.dayNumber}
            type="button"
            className={idx === activeDayIndex ? 'active' : ''}
            onClick={() => setActiveDayIndex(idx)}
          >
            Ngày {d.dayNumber} <small>{d.items?.length || 0} địa điểm</small>
          </button>
        ))}
      </div>

      <article className="day-plan">
        <header>
          <div>
            <p className="eyebrow">NGÀY {activeDay.dayNumber}</p>
            <h3>Hành trình Ngày {activeDay.dayNumber}</h3>
          </div>
          <div className="day-stats">
            <span>{items.length} điểm</span>
          </div>
        </header>

        {items.length === 0 && (
          <div className="mini-status">Ngày này chưa có địa điểm nào.</div>
        )}

        {items.map((item, index) => {
          const locId = item.locationId._id || item.locationId
          const travelMins = item.estimatedTravelMinutes || 15

          return (
            <React.Fragment key={locId}>
              {index > 0 && (
                <div className="travel-row">
                  <span>↓</span>
                  <p>
                    Di chuyển ước tính <strong>{travelMins} phút</strong>
                  </p>
                </div>
              )}
              <AIPlanItemCard
                item={item}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onOpenAlternatives={onOpenAlternatives}
                onDelete={onDeleteItem}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            </React.Fragment>
          )
        })}
      </article>
    </div>
  )
}
