import React from 'react'
import { MustVisitPicker } from './MustVisitPicker'

const PROMPT_CHIPS = [
  'Di sản và ẩm thực',
  'Thư giãn, ít di chuyển',
  'Phù hợp gia đình',
  'Chụp ảnh và ngắm cảnh',
  'Quán cà phê không gian đẹp',
]

export function AITripPreferenceStep({ formState, onChange, onBack, onSubmit, submitting, error }) {
  const handleAddChipText = (chipText) => {
    const currentText = formState.preferenceText.trim()
    if (currentText.includes(chipText)) return

    const newText = currentText ? `${currentText}. ${chipText}` : chipText
    if (newText.length <= 500) {
      onChange({ preferenceText: newText })
    }
  }

  return (
    <article className="form-panel">
      {error && <div className="error-alert">⚠ {error}</div>}

      <label className="big-field">
        <span>Bạn muốn chuyến đi như thế nào? <b>*</b></span>
        <textarea
          rows={6}
          placeholder="Ví dụ: Muốn đi nhẹ nhàng, ưu tiên di tích và món ăn Huế. Buổi chiều muốn ghé một quán cà phê yên tĩnh..."
          value={formState.preferenceText}
          onChange={(e) => onChange({ preferenceText: e.target.value })}
        />
        <div className="helper-row">
          <small>Mô tả sở thích, không gian, món ăn hoặc hoạt động mong muốn.</small>
          <span>{formState.preferenceText.length} / 500</span>
        </div>
      </label>

      <div className="prompt-chips">
        {PROMPT_CHIPS.map((chip, idx) => (
          <button type="button" key={idx} onClick={() => handleAddChipText(chip)}>
            ＋ {chip}
          </button>
        ))}
      </div>

      <hr />

      <div className="section-label">
        <span>★</span>
        <div>
          <strong>Địa điểm nhất định muốn đến</strong>
          <small>Tuỳ chọn. Nếu đã chọn, AI không được tự bỏ qua.</small>
        </div>
      </div>

      <MustVisitPicker
        mustVisitLocations={formState.mustVisitLocations}
        onChangeMustVisit={(mustVisitLocations) => onChange({ mustVisitLocations })}
      />

      <div className="request-review">
        <div>
          <span>▣</span>
          <strong>{formState.durationDays} ngày</strong>
        </div>
        <div>
          <span>◷</span>
          <strong>{formState.dailyTimeRange.start}–{formState.dailyTimeRange.end}</strong>
        </div>
        <div>
          <span>◉</span>
          <strong>
            {formState.transport === 'motorcycle'
              ? 'Xe máy'
              : formState.transport === 'car'
              ? 'Ô tô'
              : 'Đi bộ'}
          </strong>
        </div>
        <div>
          <span>★</span>
          <strong>{formState.mustVisitLocations.length} điểm bắt buộc</strong>
        </div>
      </div>

      <div className="form-actions split">
        <button type="button" className="btn btn-outline" onClick={onBack} disabled={submitting}>
          ← Quay lại
        </button>
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Đang gửi...' : '✦ Tạo lịch trình'}
        </button>
      </div>
    </article>
  )
}
