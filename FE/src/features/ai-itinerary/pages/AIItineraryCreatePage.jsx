import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { AITripBasicsStep } from '../components/AITripBasicsStep'
import { AITripPreferenceStep } from '../components/AITripPreferenceStep'
import { AIProcessingState } from '../components/AIProcessingState'
import { generateAIPlanApi } from '../api/aiItineraryApi'
import {
  INITIAL_FORM_STATE,
  validateStepOne,
  validateStepTwo,
  buildGeneratePayload,
} from '../utils/aiItineraryForm'
import styles from './AIItineraryCreatePage.module.css'

export function AIItineraryCreatePage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1) // 1, 2, 3 (processing)
  const [formState, setFormState] = useState(INITIAL_FORM_STATE)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFormChange = (updates) => {
    setFormState((prev) => ({ ...prev, ...updates }))
    setError(null)
  }

  const handleNextStep1 = () => {
    const validation = validateStepOne(formState)
    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0]
      setError(firstErr)
      return
    }
    setError(null)
    setCurrentStep(2)
  }

  const handleBackStep2 = () => {
    setError(null)
    setCurrentStep(1)
  }

  const handleSubmit = async () => {
    const validation = validateStepTwo(formState)
    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0]
      setError(firstErr)
      return
    }

    setError(null)
    setSubmitting(true)
    setCurrentStep(3)

    try {
      const payload = buildGeneratePayload(formState)
      const draft = await generateAIPlanApi(payload)
      const draftData = draft.data || draft
      const draftId = draftData._id || draftData.id

      if (draftId) {
        navigate(`/ai-itinerary/preview/${draftId}`)
      } else {
        throw new Error('Không nhận được ID bản nháp.')
      }
    } catch (err) {
      setSubmitting(false)
      setCurrentStep(2) // Retain input state on error
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi khởi tạo lịch trình AI.'
      setError(errMsg)
    }
  }

  return (
    <div className={styles.container}>
      <section className="page-hero">
        <div>
          <p className="eyebrow">AI ITINERARY</p>
          <h1>Tạo lịch trình Huế bằng AI</h1>
          <p>
            Mô tả chuyến đi bạn muốn. HueTrip chỉ dùng các địa điểm đang khả dụng trong hệ thống
            và tạo một <strong>bản nháp</strong> để bạn chỉnh sửa trước khi lưu.
          </p>
        </div>
        <div className="hero-note">
          <span>✦</span>
          <div>
            <strong>AI chỉ tạo bản nháp</strong>
            <small>Bạn luôn quyết định trước khi lưu.</small>
          </div>
        </div>
      </section>

      {currentStep !== 3 && (
        <nav className="screen-nav">
          <button
            type="button"
            className={`nav-chip ${currentStep === 1 ? 'active' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            01 · Thông tin chuyến đi
          </button>
          <button
            type="button"
            className={`nav-chip ${currentStep === 2 ? 'active' : ''}`}
            onClick={() => {
              const val = validateStepOne(formState)
              if (val.isValid) setCurrentStep(2)
            }}
          >
            02 · Sở thích
          </button>
        </nav>
      )}

      <section className="screen">
        {currentStep === 1 && (
          <>
            <div className="screen-title">
              <div>
                <p className="eyebrow">MÀN HÌNH 01</p>
                <h2>Thông tin chuyến đi</h2>
                <p>Thu thập các dữ liệu ảnh hưởng trực tiếp đến việc lập kế hoạch.</p>
              </div>
              <div className="stepper">
                <span className="step active">1</span>
                <i />
                <span className="step">2</span>
                <i />
                <span className="step">3</span>
              </div>
            </div>

            {error && <div className="error-alert">⚠ {error}</div>}

            <div className="form-layout">
              <AITripBasicsStep
                formState={formState}
                onChange={handleFormChange}
                onNext={handleNextStep1}
              />

              <aside className="summary-panel">
                <p className="eyebrow">TÓM TẮT</p>
                <h3>Chuyến đi của bạn</h3>
                <ul className="summary-list">
                  <li>
                    <span>▣</span>
                    <div>
                      <strong>{formState.durationDays} ngày</strong>
                      <small>{formState.startDate || 'Chưa chọn ngày bắt đầu'}</small>
                    </div>
                  </li>
                  <li>
                    <span>◷</span>
                    <div>
                      <strong>{formState.dailyTimeRange.start} – {formState.dailyTimeRange.end}</strong>
                      <small>Khung giờ mỗi ngày</small>
                    </div>
                  </li>
                  <li>
                    <span>⌖</span>
                    <div>
                      <strong>Điểm đã chọn</strong>
                      <small>Trong Thành phố Huế</small>
                    </div>
                  </li>
                  <li>
                    <span>◉</span>
                    <div>
                      <strong>
                        {formState.transport === 'motorcycle'
                          ? 'Xe máy'
                          : formState.transport === 'car'
                          ? 'Ô tô'
                          : 'Đi bộ'}
                      </strong>
                      <small>
                        Nhịp độ{' '}
                        {formState.pace === 'relaxed'
                          ? 'thư giãn'
                          : formState.pace === 'fast'
                          ? 'nhiều hoạt động'
                          : 'cân bằng'}
                      </small>
                    </div>
                  </li>
                </ul>
                <div className="tip-box">
                  <strong>Mẹo</strong>
                  <span>Ngày bắt đầu giúp kiểm tra giờ mở cửa chính xác hơn.</span>
                </div>
              </aside>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="screen-title">
              <div>
                <p className="eyebrow">MÀN HÌNH 02</p>
                <h2>Sở thích và địa điểm bắt buộc</h2>
                <p>AI hiểu yêu cầu tự nhiên nhưng chỉ được chọn Location có thật trong hệ thống.</p>
              </div>
              <div className="stepper">
                <span className="step done">✓</span>
                <i className="done-line" />
                <span className="step active">2</span>
                <i />
                <span className="step">3</span>
              </div>
            </div>

            <div className="preference-layout">
              <AITripPreferenceStep
                formState={formState}
                onChange={handleFormChange}
                onBack={handleBackStep2}
                onSubmit={handleSubmit}
                submitting={submitting}
                error={error}
              />

              <aside className="summary-panel ai-explain">
                <p className="eyebrow">AI SẼ LÀM GÌ?</p>
                <h3>HueTrip vẫn kiểm soát dữ liệu</h3>
                <ol>
                  <li>
                    <span>1</span>
                    <p>
                      <strong>Hiểu sở thích</strong>
                      <small>Chuyển mô tả thành Category/Tag phù hợp.</small>
                    </p>
                  </li>
                  <li>
                    <span>2</span>
                    <p>
                      <strong>Chọn ứng viên</strong>
                      <small>Backend chỉ lấy Location đang approved.</small>
                    </p>
                  </li>
                  <li>
                    <span>3</span>
                    <p>
                      <strong>AI sắp xếp</strong>
                      <small>AI chỉ chọn trong candidate list.</small>
                    </p>
                  </li>
                  <li>
                    <span>4</span>
                    <p>
                      <strong>Backend kiểm tra lại</strong>
                      <small>Giờ mở cửa, trạng thái và timeline được validate.</small>
                    </p>
                  </li>
                </ol>
                <div className="notice-box">
                  <strong>Bookmark không áp dụng ở đây</strong>
                  <span>AI Itinerary là flow độc lập với Bookmark của tạo thủ công.</span>
                </div>
              </aside>
            </div>
          </>
        )}

        {currentStep === 3 && <AIProcessingState />}
      </section>
    </div>
  )
}
