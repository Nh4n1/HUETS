import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { Alert, Button, Input, Select, Spin, Switch, TimePicker, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getPublicLocationsApi } from '../../locations/api/locationApi'
import { createItineraryApi, getItineraryApi, updateItineraryApi } from '../api/itineraryApi'
import {
  emptyDay,
  emptyItem,
  emptyItineraryForm,
  formToItineraryPayload,
  getItineraryFormError,
  itineraryToForm,
} from '../itineraryForm'
import styles from './Itinerary.module.css'

const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback

export function ItineraryEditorPage() {
  const { itineraryId } = useParams()
  const editing = Boolean(itineraryId)
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyItineraryForm)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const requests = [getPublicLocationsApi({ page: 1, pageSize: 100 })]
    if (editing) requests.push(getItineraryApi(itineraryId))
    Promise.all(requests)
      .then(([locationPayload, itinerary]) => {
        if (!active) return
        setLocations(locationPayload.data ?? [])
        if (itinerary) setForm(itineraryToForm(itinerary))
      })
      .catch((requestError) => setError(errorMessage(requestError, 'Không thể tải dữ liệu trình chỉnh sửa.')))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editing, itineraryId])

  const locationOptions = useMemo(() => locations.map((location) => ({
    value: location.id,
    label: location.name,
  })), [locations])

  const itemTimeValue = (value) => value ? dayjs(value, 'HH:mm') : null

  const handleFormKeyDown = (event) => {
    if (event.key === 'Enter') {
      const target = event.target
      const tagName = target?.tagName?.toUpperCase()
      if (tagName === 'INPUT' || tagName === 'SELECT') {
        event.preventDefault()
      }
    }
  }

  const updateRoot = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateItem = (dayIndex, itemIndex, field, value) => setForm((current) => ({
    ...current,
    days: current.days.map((day, currentDayIndex) => currentDayIndex !== dayIndex ? day : ({
      ...day,
      items: day.items.map((item, currentItemIndex) => currentItemIndex !== itemIndex ? item : ({ ...item, [field]: value })),
    })),
  }))

  const addDay = () => setForm((current) => ({ ...current, days: [...current.days, emptyDay()] }))
  const removeDay = (dayIndex) => setForm((current) => ({
    ...current,
    days: current.days.filter((_, index) => index !== dayIndex),
  }))
  const addItem = (dayIndex) => setForm((current) => ({
    ...current,
    days: current.days.map((day, index) => index === dayIndex ? ({ ...day, items: [...day.items, emptyItem()] }) : day),
  }))
  const removeItem = (dayIndex, itemIndex) => setForm((current) => ({
    ...current,
    days: current.days.map((day, index) => index === dayIndex
      ? ({ ...day, items: day.items.filter((_, currentIndex) => currentIndex !== itemIndex) })
      : day),
  }))
  const moveItem = (dayIndex, itemIndex, direction) => setForm((current) => ({
    ...current,
    days: current.days.map((day, index) => {
      if (index !== dayIndex) return day
      const nextIndex = itemIndex + direction
      if (nextIndex < 0 || nextIndex >= day.items.length) return day
      const items = [...day.items]
      ;[items[itemIndex], items[nextIndex]] = [items[nextIndex], items[itemIndex]]
      return { ...day, items }
    }),
  }))

  const submit = async (event) => {
     console.log('Form data being submitted:', JSON.stringify(form, null, 2));
    event.preventDefault()
    const clientError = getItineraryFormError(form)
    if (clientError) {
      setError(clientError)
      return
    }
    try {
      setSaving(true)
      setError('')
      const payload = formToItineraryPayload(form)
      const itinerary = editing
        ? await updateItineraryApi(itineraryId, payload)
        : await createItineraryApi(payload)
      message.success(editing ? 'Đã cập nhật lịch trình.' : 'Đã tạo lịch trình.')
      navigate(`/itineraries/mine/${itinerary.id}`)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể lưu lịch trình. Vui lòng kiểm tra lại dữ liệu.'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className={styles.fullState}><Spin size="large" tip="Đang chuẩn bị lịch trình..." /></div>

  return (
    <main className={styles.page}>
      <div className={styles.editorHeader}>
        <Link to={editing ? `/itineraries/mine/${itineraryId}` : '/itineraries/mine'}><Button type="text" icon={<ArrowLeftOutlined />}>Quay lại</Button></Link>
        <div>
          <span className={styles.eyebrow}>{editing ? 'Chỉnh sửa hành trình' : 'Bắt đầu một chuyến đi mới'}</span>
          <h1>{editing ? 'Chỉnh sửa lịch trình' : 'Tạo lịch trình'}</h1>
        </div>
      </div>

      {error ? <Alert className={styles.editorAlert} showIcon type="error" message={error} closable onClose={() => setError('')} /> : null}

      <form className={styles.editorLayout} onSubmit={submit} onKeyDown={handleFormKeyDown}>
        <section className={styles.editorMain}>
          <div className={styles.formCard}>
            <label className={styles.fieldLabel} htmlFor="itinerary-title">Tên lịch trình <span>*</span></label>
            <Input id="itinerary-title" size="large" maxLength={200} placeholder="Ví dụ: Hai ngày thong dong ở Huế" value={form.title} onChange={(event) => updateRoot('title', event.target.value)} />
            <label className={styles.fieldLabel} htmlFor="itinerary-description">Mô tả</label>
            <Input.TextArea id="itinerary-description" rows={3} maxLength={5000} showCount placeholder="Một vài dòng về chuyến đi của bạn..." value={form.description} onChange={(event) => updateRoot('description', event.target.value)} />
          </div>

          <div className={styles.daysHeading}>
            <div><span className={styles.eyebrow}>Timeline</span><h2>Lịch trình từng ngày</h2></div>
            <Button icon={<PlusOutlined />} onClick={addDay} disabled={form.days.length >= 14}>Thêm ngày</Button>
          </div>

          {form.days.map((day, dayIndex) => (
            <section className={styles.dayCard} key={`day-${dayIndex + 1}`}>
              <header className={styles.dayHeader}>
                <div className={styles.dayNumber}>{dayIndex + 1}</div>
                <div><span>Ngày {dayIndex + 1}</span><small>{day.items.length} điểm dừng</small></div>
                <Button type="text" danger icon={<DeleteOutlined />} disabled={form.days.length === 1} onClick={() => removeDay(dayIndex)}>Xóa ngày</Button>
              </header>

              <div className={styles.timelineEditor}>
                {day.items.map((item, itemIndex) => {
                  const selectedInDay = new Set(day.items.filter((_, index) => index !== itemIndex).map((entry) => entry.locationId))
                  return (
                    <article className={styles.itemEditor} key={`item-${itemIndex}`}>
                      <div className={styles.timelineRail}><span>{itemIndex + 1}</span></div>
                      <div className={styles.itemFields}>
                        <div className={styles.locationField}>
                          <label className={styles.fieldLabel}>Địa điểm <span>*</span></label>
                          <Select
                            showSearch
                            size="large"
                            placeholder="Chọn một địa điểm"
                            value={item.locationId || undefined}
                            options={locationOptions.map((option) => ({ ...option, disabled: selectedInDay.has(option.value) }))}
                            optionFilterProp="label"
                            onChange={(value) => updateItem(dayIndex, itemIndex, 'locationId', value)}
                          />
                        </div>
                        <div>
                          <label className={styles.fieldLabel}>Bắt đầu</label>
                          <TimePicker
                            format="HH:mm"
                            value={itemTimeValue(item.startTime)}
                            onChange={(value) => updateItem(dayIndex, itemIndex, 'startTime', value ? value.format('HH:mm') : '')}
                          />
                        </div>
                        <div>
                          <label className={styles.fieldLabel}>Kết thúc</label>
                          <TimePicker
                            format="HH:mm"
                            value={itemTimeValue(item.endTime)}
                            onChange={(value) => updateItem(dayIndex, itemIndex, 'endTime', value ? value.format('HH:mm') : '')}
                          />
                        </div>
                        <div><label className={styles.fieldLabel}>Thời lượng (phút)</label><Input min="1" type="number" value={item.durationMinutes} onChange={(event) => updateItem(dayIndex, itemIndex, 'durationMinutes', event.target.value)} /></div>
                        <div className={styles.noteField}><label className={styles.fieldLabel}>Ghi chú</label><Input placeholder="Ăn sáng, tham quan, chụp ảnh..." value={item.note} onChange={(event) => updateItem(dayIndex, itemIndex, 'note', event.target.value)} /></div>
                      </div>
                      <div className={styles.itemActions}>
                        <Button aria-label="Đưa lên" icon={<ArrowUpOutlined />} disabled={itemIndex === 0} onClick={() => moveItem(dayIndex, itemIndex, -1)} />
                        <Button aria-label="Đưa xuống" icon={<ArrowDownOutlined />} disabled={itemIndex === day.items.length - 1} onClick={() => moveItem(dayIndex, itemIndex, 1)} />
                        <Button danger aria-label="Xóa địa điểm" icon={<DeleteOutlined />} disabled={day.items.length === 1} onClick={() => removeItem(dayIndex, itemIndex)} />
                      </div>
                    </article>
                  )
                })}
              </div>
              <Button className={styles.addStopButton} type="dashed" icon={<PlusOutlined />} onClick={() => addItem(dayIndex)} disabled={day.items.length >= 20}>Thêm điểm dừng</Button>
            </section>
          ))}
        </section>

        <aside className={styles.editorSidebar}>
          <div className={styles.formCard}>
            <h2>Thông tin chuyến đi</h2>
            <label className={styles.fieldLabel} htmlFor="start-date"><CalendarOutlined /> Ngày bắt đầu</label>
            <Input id="start-date" type="date" value={form.startDate} onChange={(event) => updateRoot('startDate', event.target.value)} />
            <div className={styles.visibilityRow}>
              <div><strong>{form.visibility === 'public' ? 'Công khai' : 'Riêng tư'}</strong><small>{form.visibility === 'public' ? 'Mọi người có thể xem' : 'Chỉ bạn có thể xem'}</small></div>
              <Switch checked={form.visibility === 'public'} onChange={(checked) => updateRoot('visibility', checked ? 'public' : 'private')} />
            </div>
            <div className={styles.summaryBox}>
              <span><CalendarOutlined /> {form.days.length} ngày</span>
              <span><EnvironmentOutlined /> {form.days.reduce((total, day) => total + day.items.length, 0)} điểm dừng</span>
            </div>
            <Button block size="large" type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>{editing ? 'Lưu thay đổi' : 'Tạo lịch trình'}</Button>
          </div>
        </aside>
      </form>
    </main>
  )
}
