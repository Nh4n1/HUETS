import React, { useEffect, useState } from 'react'

const STEP_LABELS = [
  { step: 1, title: 'Đang hiểu sở thích của bạn', detail: 'Di sản · Ẩm thực · Không gian yên tĩnh' },
  { step: 2, title: 'Đang tìm địa điểm phù hợp', detail: 'Chỉ sử dụng Location đang khả dụng trong HueTrip.' },
  { step: 3, title: 'Đang sắp xếp theo thời gian và khoảng cách', detail: 'Thời gian di chuyển là ước tính.' },
  { step: 4, title: 'Đang kiểm tra bản nháp', detail: 'Backend xác minh lại lịch trình trước khi hiển thị.' },
]

export function AIProcessingState() {
  const [currentActiveStep, setCurrentActiveStep] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActiveStep((prev) => (prev < 4 ? prev + 1 : prev))
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="generation-shell">
      <div className="generation-orb">✦</div>
      <h3>Đang chuẩn bị hành trình phù hợp với bạn</h3>
      <p>Quá trình này có thể mất vài giây.</p>

      <div className="generation-steps">
        {STEP_LABELS.map((item, idx) => {
          const isDone = item.step < currentActiveStep
          const isActive = item.step === currentActiveStep

          return (
            <React.Fragment key={item.step}>
              <div className={`gen-step ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                <span>{isDone ? '✓' : item.step}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div className={`gen-line ${isDone ? '' : 'muted'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
