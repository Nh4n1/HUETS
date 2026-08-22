import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  BookOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Alert, Button, Empty, Input, Spin, TimePicker, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useBookmarks } from '../../bookmarks/context/useBookmarks'
import { getPublicLocationByIdApi, searchPublicLocationsApi } from '../../locations/api/locationApi'
import { createItineraryApi, getItineraryApi, updateItineraryApi } from '../api/itineraryApi'
import {
  emptyDay,
  emptyItem,
  emptyItineraryForm,
  formToItineraryPayload,
  getItineraryFormError,
  getItineraryFormErrors,
  itineraryToForm,
} from '../itineraryForm'
import styles from './Itinerary.module.css'

const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback
const itemKey = (dayIndex, itemIndex) => `${dayIndex}:${itemIndex}`

function categoryName(location) {
  return location?.category?.name ?? location?.category?.code ?? 'Địa điểm'
}

function derivedEndTime(startTime, durationMinutes) {
  if (!startTime || !durationMinutes || Number(durationMinutes) < 1) return ''
  const [hours, minutes] = startTime.split(':').map(Number)
  const total = hours * 60 + minutes + Number(durationMinutes)
  if (!Number.isFinite(total) || total >= 24 * 60) return ''
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function LocationThumb({ location }) {
  return location?.coverImageUrl
    ? <img className={styles.locationThumb} src={location.coverImageUrl} alt="" />
    : <span className={styles.locationThumbPlaceholder}><EnvironmentOutlined /></span>
}

function LocationPicker({ value, selectedLocation, disabledIds, error, onChange }) {
  const { bookmarks } = useBookmarks()
  const [mode, setMode] = useState('search')
  const [changing, setChanging] = useState(!value)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [checkingId, setCheckingId] = useState('')
  const [unavailableIds, setUnavailableIds] = useState(() => new Set())

  const savedLocations = useMemo(() => bookmarks
    .filter((bookmark) => bookmark.targetType === 'location')
    .map((bookmark) => ({ id: bookmark.targetId, ...(bookmark.snapshot ?? {}) })), [bookmarks])

  useEffect(() => {
    const normalized = query.trim()
    if (mode !== 'search' || normalized.length < 2) {
      return undefined
    }

    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setSearchError('')
      searchPublicLocationsApi({ q: normalized, page: 1, pageSize: 10 })
        .then((payload) => { if (active) setResults(payload.data ?? []) })
        .catch((requestError) => { if (active) setSearchError(errorMessage(requestError, 'Không thể tìm địa điểm.')) })
        .finally(() => { if (active) setLoading(false) })
    }, 400)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [mode, query])

  const commitChoice = (location) => {
    onChange(location)
    setChanging(false)
    setQuery('')
  }

  const choose = async (location) => {
    if (mode !== 'saved') {
      commitChoice(location)
      return
    }
    try {
      setCheckingId(location.id)
      const currentLocation = await getPublicLocationByIdApi(location.id)
      commitChoice(currentLocation)
    } catch {
      setUnavailableIds((current) => new Set([...current, location.id]))
    } finally {
      setCheckingId('')
    }
  }

  if (value && selectedLocation && !changing) {
    return (
      <div className={styles.selectedLocation}>
        <LocationThumb location={selectedLocation} />
        <div>
          <strong>{selectedLocation.name}</strong>
          <span>{categoryName(selectedLocation)} · {selectedLocation.formattedAddress || 'Huế'}</span>
        </div>
        <Button onClick={() => setChanging(true)}>Đổi</Button>
      </div>
    )
  }

  const visibleLocations = mode === 'saved' ? savedLocations : query.trim().length >= 2 ? results : []
  return (
    <div className={styles.locationPicker}>
      <div className={styles.pickerTabs} role="tablist" aria-label="Nguồn địa điểm">
        <button className={mode === 'search' ? styles.selectedPickerTab : ''} type="button" role="tab" aria-selected={mode === 'search'} onClick={() => setMode('search')}><SearchOutlined /> Tìm địa điểm</button>
        <button className={mode === 'saved' ? styles.selectedPickerTab : ''} type="button" role="tab" aria-selected={mode === 'saved'} onClick={() => setMode('saved')}><BookOutlined /> Đã lưu ({savedLocations.length})</button>
      </div>
      {mode === 'search' ? (
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Nhập ít nhất 2 ký tự..."
          value={query}
          status={error ? 'error' : undefined}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      <div className={styles.locationResults} aria-live="polite">
        {loading ? <div className={styles.pickerState}><Spin size="small" /> Đang tìm địa điểm...</div> : null}
        {searchError ? <Alert showIcon type="error" message={searchError} /> : null}
        {!loading && mode === 'search' && query.trim().length < 2 ? <div className={styles.pickerState}>Nhập tên hoặc địa chỉ để tìm kiếm.</div> : null}
        {!loading && mode === 'search' && query.trim().length >= 2 && !visibleLocations.length && !searchError ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy địa điểm phù hợp." /> : null}
        {!loading && mode === 'saved' && !visibleLocations.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa lưu địa điểm nào." /> : null}
        {!loading && visibleLocations.map((location) => {
          const alreadyAdded = disabledIds.has(location.id)
          const unavailable = unavailableIds.has(location.id)
          const disabled = alreadyAdded || unavailable
          return (
            <div className={styles.locationResult} key={location.id}>
              <LocationThumb location={location} />
              <div><strong>{location.name}</strong><span>{unavailable ? '⚠ Địa điểm không còn khả dụng' : `${categoryName(location)} · ${location.formattedAddress || 'Huế'}`}</span></div>
              <Button type="primary" ghost disabled={disabled} loading={checkingId === location.id} onClick={() => choose(location)}>{unavailable ? 'Không thể thêm' : alreadyAdded ? 'Đã thêm' : 'Thêm'}</Button>
            </div>
          )
        })}
      </div>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  )
}

export function ItineraryEditorPage() {
  const { itineraryId } = useParams()
  const editing = Boolean(itineraryId)
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyItineraryForm)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!editing) return undefined
    let active = true
    getItineraryApi(itineraryId)
      .then((itinerary) => { if (active) setForm(itineraryToForm(itinerary)) })
      .catch((requestError) => { if (active) setError(errorMessage(requestError, 'Không thể tải dữ liệu trình chỉnh sửa.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editing, itineraryId])

  const validation = useMemo(() => getItineraryFormErrors(form), [form])
  const itemTimeValue = (value) => value ? dayjs(value, 'HH:mm') : null
  const updateRoot = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateItem = (dayIndex, itemIndex, field, value) => setForm((current) => ({
    ...current,
    days: current.days.map((day, currentDayIndex) => currentDayIndex !== dayIndex ? day : ({
      ...day,
      items: day.items.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) return item
        const next = { ...item, [field]: value }
        if (field === 'startTime' || field === 'durationMinutes') next.endTime = derivedEndTime(next.startTime, next.durationMinutes)
        return next
      }),
    })),
  }))

  const selectLocation = (dayIndex, itemIndex, location) => setForm((current) => ({
    ...current,
    days: current.days.map((day, currentDayIndex) => currentDayIndex !== dayIndex ? day : ({
      ...day,
      items: day.items.map((item, currentItemIndex) => currentItemIndex !== itemIndex ? item : ({ ...item, locationId: location.id, location })),
    })),
  }))

  const addDay = () => setForm((current) => ({ ...current, days: [...current.days, emptyDay()] }))
  const removeDay = (dayIndex) => setForm((current) => ({ ...current, days: current.days.filter((_, index) => index !== dayIndex) }))
  const addItem = (dayIndex) => setForm((current) => ({ ...current, days: current.days.map((day, index) => index === dayIndex ? ({ ...day, items: [...day.items, emptyItem()] }) : day) }))
  const removeItem = (dayIndex, itemIndex) => {
    setForm((current) => ({
      ...current,
      days: current.days.map((day, index) => index === dayIndex ? ({ ...day, items: day.items.filter((_, currentIndex) => currentIndex !== itemIndex) }) : day),
    }))
  }
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
    event.preventDefault()
    setSubmitted(true)
    if (getItineraryFormError(form)) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    try {
      setSaving(true)
      setError('')
      const itinerary = editing
        ? await updateItineraryApi(itineraryId, formToItineraryPayload(form))
        : await createItineraryApi(formToItineraryPayload(form))
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
    <main className={`${styles.page} ${styles.editorPage}`}>
      <div className={styles.editorHeader}>
        <Link to={editing ? `/itineraries/mine/${itineraryId}` : '/itineraries/mine'}><Button type="text" icon={<ArrowLeftOutlined />}>Quay lại</Button></Link>
        <div><span className={styles.eyebrow}>{editing ? 'Chỉnh sửa hành trình' : 'Tạo thủ công'}</span><h1>{editing ? 'Chỉnh sửa lịch trình' : 'Tạo lịch trình mới'}</h1><p>Chọn từng địa điểm từ kết quả tìm kiếm hoặc danh sách đã lưu của bạn.</p></div>
      </div>

      {error ? <Alert className={styles.editorAlert} showIcon type="error" message={error} closable onClose={() => setError('')} /> : null}
      {editing && form.status === 'hidden' ? <Alert className={styles.editorAlert} showIcon type="warning" message="Lịch trình đang bị ẩn khỏi cộng đồng" description={form.moderation?.hiddenReason ? `Lý do: ${form.moderation.hiddenReason}. Bạn có thể sửa nội dung nhưng không thể đổi quyền riêng tư.` : 'Bạn có thể sửa nội dung nhưng không thể đổi quyền riêng tư.'} /> : null}

      <form className={styles.editorLayout} onSubmit={submit}>
        <section className={styles.editorMain}>
          <div className={styles.formCard}>
            <h2>Thông tin cơ bản</h2>
            <label className={styles.fieldLabel} htmlFor="itinerary-title">Tên lịch trình <span>*</span></label>
            <Input id="itinerary-title" size="large" maxLength={200} placeholder="Ví dụ: Hai ngày thong dong ở Huế" value={form.title} status={submitted && validation.title ? 'error' : undefined} aria-invalid={Boolean(submitted && validation.title)} aria-describedby="itinerary-title-error" onChange={(event) => updateRoot('title', event.target.value)} />
            {submitted && validation.title ? <p className={styles.fieldError} id="itinerary-title-error">{validation.title}</p> : null}
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
                <div><strong>Ngày {dayIndex + 1}</strong><small>{day.items.length} điểm dừng</small></div>
                <Button type="text" danger icon={<DeleteOutlined />} disabled={form.days.length === 1} onClick={() => removeDay(dayIndex)}>Xóa ngày</Button>
              </header>

              <div className={styles.timelineEditor}>
                {day.items.map((item, itemIndex) => {
                  const errors = submitted ? validation.items[itemKey(dayIndex, itemIndex)] ?? {} : {}
                  const disabledIds = new Set(day.items.filter((_, index) => index !== itemIndex).map((entry) => entry.locationId).filter(Boolean))
                  return (
                    <article className={styles.itemEditor} key={`item-${itemIndex}`}>
                      <div className={styles.timelineRail}><span>{itemIndex + 1}</span></div>
                      <div className={styles.itemFields}>
                        <div className={styles.locationField} aria-invalid={Boolean(errors.locationId)}>
                          <label className={styles.fieldLabel}>Địa điểm <span>*</span></label>
                          <LocationPicker value={item.locationId} selectedLocation={item.location} disabledIds={disabledIds} error={errors.locationId} onChange={(location) => selectLocation(dayIndex, itemIndex, location)} />
                        </div>
                        <div>
                          <label className={styles.fieldLabel}>Bắt đầu</label>
                          <TimePicker format="HH:mm" value={itemTimeValue(item.startTime)} onChange={(value) => updateItem(dayIndex, itemIndex, 'startTime', value ? value.format('HH:mm') : '')} />
                        </div>
                        <div>
                          <label className={styles.fieldLabel}>Thời lượng (phút)</label>
                          <Input min="1" type="number" status={errors.durationMinutes ? 'error' : undefined} value={item.durationMinutes} onChange={(event) => updateItem(dayIndex, itemIndex, 'durationMinutes', event.target.value)} />
                        </div>
                        <div className={styles.derivedTime}><span>Kết thúc</span><strong>{item.endTime || '—'}</strong><small>Tự động tính</small></div>
                        {errors.durationMinutes ? <p className={`${styles.fieldError} ${styles.timeError}`}>{errors.durationMinutes}</p> : null}
                        <div className={styles.noteField}><label className={styles.fieldLabel}>Ghi chú</label><Input placeholder="Ăn sáng, tham quan, chụp ảnh..." value={item.note} onChange={(event) => updateItem(dayIndex, itemIndex, 'note', event.target.value)} /></div>
                      </div>
                      <div className={styles.itemActions}>
                        <Button aria-label="Đưa lên" title="Đưa lên" icon={<ArrowUpOutlined />} disabled={itemIndex === 0} onClick={() => moveItem(dayIndex, itemIndex, -1)} />
                        <Button aria-label="Đưa xuống" title="Đưa xuống" icon={<ArrowDownOutlined />} disabled={itemIndex === day.items.length - 1} onClick={() => moveItem(dayIndex, itemIndex, 1)} />
                        <Button danger aria-label="Xóa địa điểm" title="Xóa địa điểm" icon={<DeleteOutlined />} disabled={day.items.length === 1} onClick={() => removeItem(dayIndex, itemIndex)} />
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
            <fieldset className={styles.visibilityBlock}>
              <legend>Ai có thể xem?</legend>
              <div className={styles.visibilityChoice}>
                <button disabled={form.status === 'hidden'} className={form.visibility === 'private' ? styles.selectedVisibility : ''} type="button" aria-pressed={form.visibility === 'private'} onClick={() => updateRoot('visibility', 'private')}><LockOutlined /> Riêng tư</button>
                <button disabled={form.status === 'hidden'} className={form.visibility === 'public' ? styles.selectedVisibility : ''} type="button" aria-pressed={form.visibility === 'public'} onClick={() => updateRoot('visibility', 'public')}><GlobalOutlined /> Công khai</button>
              </div>
              <small>{form.status === 'hidden' ? 'Quyền riêng tư bị khóa cho đến khi admin hiện lại lịch trình.' : form.visibility === 'private' ? 'Chỉ bạn có thể xem.' : 'Mọi người có thể xem và sao chép lịch trình.'}</small>
            </fieldset>
            <div className={styles.summaryBox}>
              <span><CalendarOutlined /> {form.days.length} ngày</span>
              <span><EnvironmentOutlined /> {form.days.reduce((total, day) => total + day.items.length, 0)} điểm dừng</span>
            </div>
            <Button block size="large" type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>{saving ? 'Đang lưu...' : editing ? 'Lưu lịch trình' : 'Tạo lịch trình'}</Button>
          </div>
        </aside>
      </form>
    </main>
  )
}
