import { ArrowLeftOutlined, RobotOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Select, Slider } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getCategoriesApi } from '../../../shared/api/referenceApi'
import { LocationPicker } from '../components/LocationPicker'
import { createAiItineraryPlanApi } from '../api/aiItineraryApi'
import styles from './Itinerary.module.css'

const paceOptions = [
  { value: 'relaxed', label: 'Thư giãn' },
  { value: 'balanced', label: 'Cân bằng' },
  { value: 'active', label: 'Khám phá nhiều' },
]

export function AIItineraryCreatePage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [durationDays, setDurationDays] = useState(2)
  const [startDate, setStartDate] = useState('')
  const [dailyStart, setDailyStart] = useState('08:00')
  const [dailyEnd, setDailyEnd] = useState('18:00')
  const [categoryCodes, setCategoryCodes] = useState([])
  const [pace, setPace] = useState('balanced')
  const [mustVisits, setMustVisits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState([])

  useEffect(() => { getCategoriesApi().then(setCategories).catch(() => setError('Không thể tải danh mục.')) }, [])

  const generate = async (event) => {
    event.preventDefault()
    if (!categoryCodes.length) {
      setError('Vui lòng chọn ít nhất một loại trải nghiệm.')
      return
    }
    try {
      setLoading(true)
      setError('')
      setIssues([])
      const plan = await createAiItineraryPlanApi({
        durationDays,
        startDate: startDate || null,
        dailyTimeRange: { start: dailyStart, end: dailyEnd },
        pace,
        preferences: { preferredCategoryCodes: categoryCodes },
        mustVisitLocationIds: mustVisits.map(({ id }) => id),
      })
      navigate(`/itineraries/ai/${plan.id}`)
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'AI chưa thể tạo lịch trình. Vui lòng thử lại.')
      setIssues(requestError.response?.data?.details?.issues ?? [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`${styles.page} ${styles.aiCreatePage}`}>
      <Link to="/itineraries/new"><Button type="text" icon={<ArrowLeftOutlined />}>Quay lại</Button></Link>
      <form className={styles.aiForm} onSubmit={generate}>
        <div><span className={styles.eyebrow}>AI itinerary</span><h1><RobotOutlined /> Tạo lịch trình với AI</h1><p>AI chỉ lập kế hoạch trên các địa điểm công khai có trong HueTrip. Bạn luôn được xem lại trước khi lưu.</p></div>
        {error ? <Alert showIcon type="error" message={error} description={issues.length ? <ul>{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul> : null} /> : null}
        <div className={styles.aiField}><label>Số ngày: <strong>{durationDays}</strong></label><Slider min={1} max={14} value={durationDays} onChange={setDurationDays} /></div>
        <div className={styles.aiTwoColumns}>
          <div className={styles.aiField}><label htmlFor="ai-start-date">Ngày bắt đầu (không bắt buộc)</label><Input id="ai-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          <div className={styles.aiField}><label>Khung giờ mỗi ngày</label><div className={styles.timeRange}><Input type="time" value={dailyStart} onChange={(event) => setDailyStart(event.target.value)} /><span>→</span><Input type="time" value={dailyEnd} onChange={(event) => setDailyEnd(event.target.value)} /></div></div>
        </div>
        <div className={styles.aiField}><label>Bạn muốn trải nghiệm gì? <span>*</span></label><Select mode="multiple" placeholder="Chọn danh mục" value={categoryCodes} onChange={setCategoryCodes} options={categories.map((category) => ({ value: category.code, label: category.name }))} /></div>
        <div className={styles.aiField}><label>Nhịp độ</label><Select value={pace} onChange={setPace} options={paceOptions} /></div>
        <div className={styles.aiField}>
          <label>Địa điểm nhất định muốn ghé ({mustVisits.length})</label>
          {mustVisits.length ? <div className={styles.selectedChips}>{mustVisits.map((location) => <Button key={location.id} size="small" onClick={() => setMustVisits((current) => current.filter(({ id }) => id !== location.id))}>{location.name} ×</Button>)}</div> : null}
          <LocationPicker multiple disabledIds={new Set(mustVisits.map(({ id }) => id))} confirmLabel="Thêm Must Visit" onConfirm={(locations) => setMustVisits((current) => [...current, ...locations.filter((location) => !current.some(({ id }) => id === location.id))])} />
        </div>
        <Button size="large" type="primary" htmlType="submit" icon={<RobotOutlined />} loading={loading}>Tạo lịch trình</Button>
      </form>
    </main>
  )
}
