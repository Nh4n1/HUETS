import React from 'react'

export function AITripBasicsStep({ formState, onChange, onNext }) {
  const handleCounterChange = (delta) => {
    const nextVal = Math.max(1, Math.min(14, formState.durationDays + delta))
    onChange({ durationDays: nextVal })
  }

  const handleOriginTypeChange = (type) => {
    let coords = formState.origin.coordinates
    if (type === 'current_location' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange({
            origin: {
              type: 'current_location',
              coordinates: [pos.coords.longitude, pos.coords.latitude],
            },
          })
        },
        () => {
          onChange({
            origin: {
              type: 'current_location',
              coordinates: [107.5905, 16.4637],
            },
          })
        }
      )
      return
    }

    onChange({
      origin: {
        type,
        coordinates: coords || [107.5902, 16.4631],
      },
    })
  }

  return (
    <article className="form-panel">
      <div className="section-label">
        <span>01</span>
        <div>
          <strong>Thời gian chuyến đi</strong>
          <small>Giúp hệ thống chia lịch trình theo từng ngày.</small>
        </div>
      </div>

      <div className="two-col">
        <label>
          <span>Số ngày <b>*</b></span>
          <div className="counter-control">
            <button type="button" onClick={() => handleCounterChange(-1)}>−</button>
            <strong>{formState.durationDays} ngày</strong>
            <button type="button" onClick={() => handleCounterChange(1)}>＋</button>
          </div>
        </label>

        <label>
          <span>Ngày bắt đầu</span>
          <input
            type="date"
            value={formState.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
          <small>Giúp kiểm tra giờ mở cửa theo đúng thứ.</small>
        </label>
      </div>

      <div className="two-col">
        <label>
          <span>Bắt đầu mỗi ngày <b>*</b></span>
          <input
            type="time"
            value={formState.dailyTimeRange.start}
            onChange={(e) =>
              onChange({
                dailyTimeRange: { ...formState.dailyTimeRange, start: e.target.value },
              })
            }
          />
        </label>

        <label>
          <span>Kết thúc mỗi ngày <b>*</b></span>
          <input
            type="time"
            value={formState.dailyTimeRange.end}
            onChange={(e) =>
              onChange({
                dailyTimeRange: { ...formState.dailyTimeRange, end: e.target.value },
              })
            }
          />
        </label>
      </div>

      <hr />

      <div className="section-label">
        <span>02</span>
        <div>
          <strong>Điểm xuất phát</strong>
          <small>AI không tự đoán vị trí của bạn.</small>
        </div>
      </div>

      <div className="choice-grid origin-grid">
        <button
          type="button"
          className={`choice-card ${formState.origin.type === 'map_point' ? 'selected' : ''}`}
          onClick={() => handleOriginTypeChange('map_point')}
        >
          <span className="choice-icon">⌖</span>
          <strong>Chọn trên bản đồ</strong>
          <small>Đặt một điểm xuất phát trong khu vực Huế.</small>
        </button>

        <button
          type="button"
          className={`choice-card ${formState.origin.type === 'current_location' ? 'selected' : ''}`}
          onClick={() => handleOriginTypeChange('current_location')}
        >
          <span className="choice-icon">◎</span>
          <strong>Vị trí hiện tại</strong>
          <small>Chỉ xin quyền khi bạn chủ động sử dụng.</small>
        </button>

        <button
          type="button"
          className={`choice-card ${formState.origin.type === 'location_reference' ? 'selected' : ''}`}
          onClick={() => handleOriginTypeChange('location_reference')}
        >
          <span className="choice-icon">⌕</span>
          <strong>Chọn địa điểm có sẵn</strong>
          <small>Tìm một Location trong HueTrip.</small>
        </button>
      </div>

      <div className="map-placeholder">
        <div className="map-pin">⌖</div>
        <div className="map-caption">
          <strong>Điểm đã chọn</strong>
          <span>
            {formState.origin.coordinates
              ? `${formState.origin.coordinates[1].toFixed(4)}, ${formState.origin.coordinates[0].toFixed(4)} · Thành phố Huế`
              : 'Thành phố Huế'}
          </span>
        </div>
      </div>

      <hr />

      <div className="section-label">
        <span>03</span>
        <div>
          <strong>Phương tiện & nhịp độ</strong>
          <small>Một phương tiện chính cho toàn chuyến đi.</small>
        </div>
      </div>

      <div className="choice-grid transport-grid">
        <button
          type="button"
          className={`choice-card ${formState.transport === 'walking' ? 'selected' : ''}`}
          onClick={() => onChange({ transport: 'walking' })}
        >
          <span className="choice-icon">♟</span>
          <strong>Đi bộ</strong>
          <small>Khoảng cách ngắn, ít điểm hơn.</small>
        </button>

        <button
          type="button"
          className={`choice-card ${formState.transport === 'motorcycle' ? 'selected' : ''}`}
          onClick={() => onChange({ transport: 'motorcycle' })}
        >
          <span className="choice-icon">◉</span>
          <strong>Xe máy</strong>
          <small>Linh hoạt trong thành phố.</small>
        </button>

        <button
          type="button"
          className={`choice-card ${formState.transport === 'car' ? 'selected' : ''}`}
          onClick={() => onChange({ transport: 'car' })}
        >
          <span className="choice-icon">▰</span>
          <strong>Ô tô</strong>
          <small>Thời gian di chuyển là ước tính.</small>
        </button>
      </div>

      <div className="pace-row">
        <button
          type="button"
          className={formState.pace === 'relaxed' ? 'selected' : ''}
          onClick={() => onChange({ pace: 'relaxed' })}
        >
          <strong>Thư giãn</strong>
          <small>2–3 điểm/ngày</small>
        </button>

        <button
          type="button"
          className={formState.pace === 'moderate' ? 'selected' : ''}
          onClick={() => onChange({ pace: 'moderate' })}
        >
          <strong>Cân bằng</strong>
          <small>3–5 điểm/ngày</small>
        </button>

        <button
          type="button"
          className={formState.pace === 'fast' ? 'selected' : ''}
          onClick={() => onChange({ pace: 'fast' })}
        >
          <strong>Nhiều hoạt động</strong>
          <small>5–7 điểm/ngày</small>
        </button>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Tiếp tục →
        </button>
      </div>
    </article>
  )
}
