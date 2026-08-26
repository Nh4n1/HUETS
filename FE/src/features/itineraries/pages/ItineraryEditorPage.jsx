import {
  ArrowLeftOutlined,
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Alert, Button, Input, InputNumber, Spin, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { getPublicLocationByIdApi } from '../../locations/api/locationApi'
import { getAiItineraryPlanApi, saveAiItineraryPlanApi, updateAiItineraryPlanApi } from '../api/aiItineraryApi'
import { createItineraryApi, getItineraryApi, updateItineraryApi } from '../api/itineraryApi'
import { ItineraryDayTabs } from '../components/ItineraryDayTabs'
import { ItineraryLocationDrawer } from '../components/ItineraryLocationDrawer'
import { ItineraryStopCard } from '../components/ItineraryStopCard'
import { LocationPicker } from '../components/LocationPicker'
import { PlanningIssues } from '../components/PlanningIssues'
import { TripSummarySidebar } from '../components/TripSummarySidebar'
import {
  aiDraftToForm,
  createItemFromLocation,
  emptyItineraryForm,
  formToAiDraftPayload,
  formToItineraryPayload,
  getItineraryFormError,
  getItineraryFormErrors,
  itineraryToForm,
} from '../itineraryForm'
import { validateDraftSchedule } from '../utils/validateScheduleItem'
import styles from './Itinerary.module.css'

const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback
const itemKey = (dayIndex, itemIndex) => `${dayIndex}:${itemIndex}`

function derivedEndTime(startTime, durationMinutes) {
  if (!startTime || !durationMinutes || Number(durationMinutes) < 1) return ''
  const [hours, minutes] = startTime.split(':').map(Number)
  const total = hours * 60 + minutes + Number(durationMinutes)
  if (!Number.isFinite(total) || total >= 24 * 60) return ''
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function dateForDay(startDate, dayIndex) {
  if (!startDate) return ''
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
    .format(dayjs(startDate).add(dayIndex, 'day').toDate())
}

export function ItineraryEditorPage() {
  const { itineraryId, planId } = useParams()
  const editing = Boolean(itineraryId)
  const aiMode = Boolean(planId)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefillLocationId = editing ? '' : (searchParams.get('locationId') ?? '')
  const [form, setForm] = useState(emptyItineraryForm)
  const [loading, setLoading] = useState(editing || aiMode || Boolean(prefillLocationId))
  const [saving, setSaving] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [manualReady, setManualReady] = useState(editing || aiMode || Boolean(prefillLocationId))
  const [manualDays, setManualDays] = useState(2)
  const [setupError, setSetupError] = useState('')
  const [aiRequest, setAiRequest] = useState(null)
  const [aiWarnings, setAiWarnings] = useState([])
  const [backendIssues, setBackendIssues] = useState([])
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [expandedItemKey, setExpandedItemKey] = useState(null)
  const [locationDrawer, setLocationDrawer] = useState({ open: false, intent: null, dayIndex: null, itemIndex: null })

  useEffect(() => {
    if (!editing && !aiMode) return undefined
    let active = true
    const request = aiMode ? getAiItineraryPlanApi(planId) : getItineraryApi(itineraryId)
    request
      .then((payload) => {
        if (!active) return
        setForm(aiMode ? aiDraftToForm(payload) : itineraryToForm(payload))
        if (aiMode) {
          setAiRequest(payload.request)
          setAiWarnings(payload.warnings ?? [])
        }
      })
      .catch((requestError) => { if (active) setError(errorMessage(requestError, 'Không thể tải dữ liệu trình chỉnh sửa.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [aiMode, editing, itineraryId, planId])

  useEffect(() => {
    if (!prefillLocationId || editing || aiMode) return undefined
    let active = true
    getPublicLocationByIdApi(prefillLocationId)
      .then((location) => {
        if (!active) return
        setForm({
          ...emptyItineraryForm(),
          title: 'Chuyến đi Huế 1 ngày',
          days: [{ items: [createItemFromLocation(location)] }],
        })
        setManualDays(1)
        setManualReady(true)
      })
      .catch((requestError) => active && setError(errorMessage(requestError, 'Không thể thêm sẵn địa điểm vào lịch trình.')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [aiMode, editing, prefillLocationId])

  const validation = useMemo(() => getItineraryFormErrors(form), [form])
  const scheduleValidation = useMemo(
    () => validateDraftSchedule(form, aiRequest?.dailyTimeRange),
    [aiRequest, form],
  )
  const aiIncompleteCount = aiMode ? form.days.reduce((total, day) => total + day.items.filter(
    (item) => !item.startTime || !item.durationMinutes || Number(item.durationMinutes) < 1,
  ).length, 0) : 0
  const formErrorCount = (validation.title ? 1 : 0)
    + Object.keys(validation.items).length
    + form.days.filter((day) => day.items.length === 0).length
    + aiIncompleteCount
  const scheduleErrorCount = scheduleValidation.issues.filter(({ level }) => level === 'error').length
  const warningCount = scheduleValidation.issues.filter(({ level }) => level !== 'error').length + aiWarnings.length
  const errorCount = formErrorCount + scheduleErrorCount
  const activeDay = form.days[activeDayIndex] ?? form.days[0]
  const backendIssuesByItem = useMemo(() => {
    const byItem = {}
    const matched = new Set()
    backendIssues.forEach((issue, issueIndex) => {
      if (!issue.dayNumber) return
      const dayIndex = Number(issue.dayNumber) - 1
      const itemIndex = form.days[dayIndex]?.items.findIndex((item) => (
        issue.itemId ? item.id === issue.itemId : item.locationId === issue.locationId
      )) ?? -1
      if (itemIndex < 0) return
      const key = itemKey(dayIndex, itemIndex)
      byItem[key] = [...(byItem[key] ?? []), issue]
      matched.add(issueIndex)
    })
    return { byItem, unmatched: backendIssues.filter((_, index) => !matched.has(index)) }
  }, [backendIssues, form.days])

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

  const addDay = () => {
    if (aiMode || form.days.length >= 14) return
    setForm((current) => ({ ...current, days: [...current.days, { items: [] }] }))
    setActiveDayIndex(form.days.length)
    setExpandedItemKey(null)
  }

  const removeDay = (dayIndex) => {
    if (aiMode || form.days.length === 1) return
    const nextLength = form.days.length - 1
    setForm((current) => ({ ...current, days: current.days.filter((_, index) => index !== dayIndex) }))
    setActiveDayIndex((current) => Math.min(current > dayIndex ? current - 1 : current, nextLength - 1))
    setExpandedItemKey(null)
  }

  const removeItem = (dayIndex, itemIndex) => {
    setForm((current) => ({
      ...current,
      days: current.days.map((day, index) => index === dayIndex
        ? ({ ...day, items: day.items.filter((_, currentIndex) => currentIndex !== itemIndex) })
        : day),
    }))
    setExpandedItemKey(null)
  }

  const moveItem = (dayIndex, itemIndex, direction) => {
    const nextIndex = itemIndex + direction
    setForm((current) => ({
      ...current,
      days: current.days.map((day, index) => {
        if (index !== dayIndex || nextIndex < 0 || nextIndex >= day.items.length) return day
        const items = [...day.items]
        ;[items[itemIndex], items[nextIndex]] = [items[nextIndex], items[itemIndex]]
        return { ...day, items }
      }),
    }))
    setExpandedItemKey(itemKey(dayIndex, nextIndex))
  }

  const moveItemToDay = (dayIndex, itemIndex, targetDayIndex) => {
    if (dayIndex === targetDayIndex || form.days[targetDayIndex]?.items.length >= 20) return
    const targetIndex = form.days[targetDayIndex].items.length
    setForm((current) => {
      const moved = current.days[dayIndex]?.items[itemIndex]
      if (!moved) return current
      return {
        ...current,
        days: current.days.map((day, index) => {
          if (index === dayIndex) return { ...day, items: day.items.filter((_, currentIndex) => currentIndex !== itemIndex) }
          if (index === targetDayIndex) return { ...day, items: [...day.items, moved] }
          return day
        }),
      }
    })
    setActiveDayIndex(targetDayIndex)
    setExpandedItemKey(itemKey(targetDayIndex, targetIndex))
  }

  const beginManual = (locations) => {
    if (!locations.length) {
      setSetupError('Vui lòng chọn ít nhất một địa điểm.')
      return
    }
    const days = Array.from({ length: manualDays }, () => ({ items: [] }))
    locations.forEach((location, index) => days[index % manualDays].items.push(createItemFromLocation(location)))
    setForm({
      ...emptyItineraryForm(),
      title: `Chuyến đi Huế ${manualDays} ngày`,
      days,
    })
    setSetupError('')
    setActiveDayIndex(0)
    setManualReady(true)
  }

  const openLocationDrawer = (type, dayIndex, itemIndex = null) => {
    setLocationDrawer({ open: true, intent: type, dayIndex, itemIndex })
  }

  const closeLocationDrawer = () => setLocationDrawer({ open: false, intent: null, dayIndex: null, itemIndex: null })

  const selectDrawerLocation = (location) => {
    const { intent, dayIndex, itemIndex } = locationDrawer
    if (intent === 'replace') {
      setForm((current) => ({
        ...current,
        days: current.days.map((day, index) => index !== dayIndex ? day : ({
          ...day,
          items: day.items.map((item, currentIndex) => currentIndex === itemIndex
            ? { ...item, locationId: location.id, location }
            : item),
        })),
      }))
      setExpandedItemKey(itemKey(dayIndex, itemIndex))
    } else {
      const newIndex = form.days[dayIndex].items.length
      setForm((current) => ({
        ...current,
        days: current.days.map((day, index) => index === dayIndex
          ? { ...day, items: [...day.items, createItemFromLocation(location)] }
          : day),
      }))
      setExpandedItemKey(itemKey(dayIndex, newIndex))
    }
    closeLocationDrawer()
  }

  const drawerDisabledIds = useMemo(() => {
    const ids = form.days.flatMap((day, dayIndex) => day.items
      .filter((_, itemIndex) => locationDrawer.intent !== 'replace'
        || dayIndex !== locationDrawer.dayIndex
        || itemIndex !== locationDrawer.itemIndex)
      .map((item) => item.locationId))
      .filter(Boolean)
    return new Set(ids)
  }, [form.days, locationDrawer])

  const focusFirstInvalid = () => {
    const firstItemKey = Object.keys(validation.items)[0]
    if (firstItemKey) setActiveDayIndex(Number(firstItemKey.split(':')[0]))
    else {
      const emptyDayIndex = form.days.findIndex((day) => !day.items.length)
      if (emptyDayIndex >= 0) setActiveDayIndex(emptyDayIndex)
    }
    window.setTimeout(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    if (getItineraryFormError(form) || aiIncompleteCount || scheduleErrorCount) {
      if (aiIncompleteCount) setError('Mỗi địa điểm trong bản nháp AI cần có giờ bắt đầu và thời lượng.')
      focusFirstInvalid()
      return
    }
    try {
      setSaving(true)
      setError('')
      setBackendIssues([])
      let itinerary
      if (aiMode) {
        await updateAiItineraryPlanApi(planId, formToAiDraftPayload(form))
        itinerary = await saveAiItineraryPlanApi({
          planId,
          title: form.title.trim(),
          description: form.description.trim(),
          visibility: form.visibility,
        })
      } else {
        itinerary = editing
          ? await updateItineraryApi(itineraryId, formToItineraryPayload(form))
          : await createItineraryApi(formToItineraryPayload(form))
      }
      message.success(editing ? 'Đã cập nhật lịch trình.' : 'Đã tạo lịch trình.')
      navigate(`/itineraries/mine/${itinerary.id}`)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể lưu lịch trình. Vui lòng kiểm tra lại dữ liệu.'))
      setBackendIssues(requestError.response?.data?.details?.issues ?? [])
    } finally {
      setSaving(false)
    }
  }

  const saveDraft = async () => {
    setSubmitted(true)
    if (getItineraryFormError(form) || aiIncompleteCount || scheduleErrorCount) {
      focusFirstInvalid()
      return
    }
    try {
      setSavingDraft(true)
      setError('')
      setBackendIssues([])
      const updated = await updateAiItineraryPlanApi(planId, formToAiDraftPayload(form))
      setAiWarnings(updated.warnings ?? [])
      message.success('Đã lưu bản nháp AI.')
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể lưu bản nháp AI.'))
      setBackendIssues(requestError.response?.data?.details?.issues ?? [])
    } finally {
      setSavingDraft(false)
    }
  }

  if (loading) return <div className={styles.fullState}><Spin size="large" tip="Đang chuẩn bị lịch trình..." /></div>

  if (!manualReady) {
    return (
      <main className={`${styles.page} ${styles.manualSetupPage}`}>
        <div className={styles.editorHeader}>
          <Link to="/itineraries/new"><Button type="text" icon={<ArrowLeftOutlined />}>Lịch trình</Button></Link>
          <div><span className={styles.eyebrow}>Bước 1/2 · Tạo lịch trình</span><h1>Chọn những nơi bạn muốn ghé</h1><p>Chọn số ngày và các địa điểm. HueTrip sẽ phân bố sơ bộ giữa các ngày; bạn có thể sắp xếp lại ở bước tiếp theo.</p></div>
        </div>
        {setupError ? <Alert showIcon type="error" message={setupError} /> : null}
        <section className={styles.manualSetupCard}>
          <div className={styles.daysControl}>
            <div><span className={styles.eyebrow}>Thời lượng chuyến đi</span><h2>Số ngày</h2></div>
            <div className={styles.daysStepper}>
              <Button aria-label="Giảm số ngày" icon={<MinusOutlined />} disabled={manualDays <= 1} onClick={() => setManualDays((value) => Math.max(1, value - 1))} />
              <InputNumber id="manual-days" min={1} max={14} controls={false} value={manualDays} onChange={(value) => setManualDays(Math.max(1, Math.min(14, value || 1)))} />
              <strong>ngày</strong>
              <Button aria-label="Tăng số ngày" icon={<PlusOutlined />} disabled={manualDays >= 14} onClick={() => setManualDays((value) => Math.min(14, value + 1))} />
            </div>
          </div>
          <div className={styles.setupPickerHeading}><span className={styles.eyebrow}>Chọn địa điểm</span><h2>Những nơi bạn muốn ghé</h2></div>
          <LocationPicker
            multiple
            onConfirm={beginManual}
            footerNote="HueTrip sẽ chia sơ bộ các địa điểm giữa các ngày. Bạn có thể chuyển ngày, đổi thứ tự và chỉnh thời gian ở bước sau."
          />
        </section>
      </main>
    )
  }

  return (
    <main className={`${styles.page} ${styles.editorPage}`}>
      <div className={styles.editorHeader}>
        <Link to={editing ? `/itineraries/mine/${itineraryId}` : aiMode ? '/itineraries/new/ai' : '/itineraries/mine'}><Button type="text" icon={<ArrowLeftOutlined />}>Lịch trình của tôi</Button></Link>
        <div><span className={styles.eyebrow}>{editing ? 'Chỉnh sửa lịch trình' : aiMode ? 'Bản nháp AI' : 'Bước 2/2 · Tạo lịch trình'}</span><h1>{form.title || 'Chuyến đi Huế'}</h1><p>{aiMode ? 'AI đã tạo bản nháp từ dữ liệu địa điểm của HueTrip. Hãy kiểm tra trước khi lưu.' : 'Tập trung hoàn thiện từng ngày, thời gian và thứ tự điểm dừng.'}</p></div>
      </div>

      {error ? <Alert className={styles.editorAlert} showIcon type="error" message={error} closable onClose={() => setError('')} /> : null}
      {backendIssuesByItem.unmatched.length ? <div className={styles.backendIssues}><PlanningIssues issues={backendIssuesByItem.unmatched} compact={false} /></div> : null}
      {aiWarnings.length ? <details className={styles.aiWarnings}><summary>Lưu ý từ gợi ý AI · {aiWarnings.length}</summary><ul>{aiWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details> : null}
      {editing && form.status === 'hidden' ? <Alert className={styles.editorAlert} showIcon type="warning" message="Lịch trình đang bị ẩn khỏi cộng đồng" description={form.moderation?.hiddenReason ? `Lý do: ${form.moderation.hiddenReason}. Bạn có thể sửa nội dung nhưng không thể đổi quyền riêng tư.` : 'Bạn có thể sửa nội dung nhưng không thể đổi quyền riêng tư.'} /> : null}

      <form className={styles.editorLayout} onSubmit={submit}>
        <section className={styles.editorMain}>
          <div className={styles.basicInfoSection}>
            <label className={styles.fieldLabel} htmlFor="itinerary-title">Tên lịch trình <span>*</span></label>
            <Input id="itinerary-title" size="large" maxLength={200} placeholder="Ví dụ: Hai ngày thong dong ở Huế" value={form.title} status={submitted && validation.title ? 'error' : undefined} aria-invalid={Boolean(submitted && validation.title)} aria-describedby="itinerary-title-error" onChange={(event) => updateRoot('title', event.target.value)} />
            {submitted && validation.title ? <p className={styles.fieldError} id="itinerary-title-error">{validation.title}</p> : null}
            <label className={styles.fieldLabel} htmlFor="itinerary-description">Mô tả</label>
            <Input.TextArea id="itinerary-description" autoSize={{ minRows: 2, maxRows: 5 }} maxLength={5000} showCount placeholder="Thêm mô tả cho chuyến đi..." value={form.description} onChange={(event) => updateRoot('description', event.target.value)} />
          </div>

          <ItineraryDayTabs days={form.days} activeIndex={activeDayIndex} onChange={(index) => { setActiveDayIndex(index); setExpandedItemKey(null) }} onAddDay={addDay} canAddDay={!aiMode && form.days.length < 14} />

          <section className={styles.activeDayWorkspace}>
            <header className={styles.activeDayHeader}>
              <div><span className={styles.eyebrow}>Ngày {activeDayIndex + 1}</span><h2>{activeDay?.items.length ?? 0} điểm dừng</h2>{form.startDate ? <small>{dateForDay(form.startDate, activeDayIndex)}</small> : null}</div>
              <Button type="text" danger icon={<DeleteOutlined />} disabled={aiMode || form.days.length === 1} onClick={() => removeDay(activeDayIndex)}>Xóa ngày</Button>
            </header>

            {activeDay?.items.length ? (
              <div className={styles.stopTimeline}>
                {activeDay.items.map((item, itemIndex) => {
                  const key = itemKey(activeDayIndex, itemIndex)
                  return (
                    <ItineraryStopCard
                      key={item.id ?? `${item.locationId}-${itemIndex}`}
                      item={item}
                      dayIndex={activeDayIndex}
                      itemIndex={itemIndex}
                      days={form.days}
                      expanded={expandedItemKey === key}
                      issues={[
                        ...(item.locationId ? scheduleValidation.byItem[key] ?? [] : []),
                        ...(backendIssuesByItem.byItem[key] ?? []),
                      ].filter((issue, index, issues) => issues.findIndex((candidate) => candidate.code === issue.code && candidate.message === issue.message) === index)}
                      errors={submitted ? validation.items[key] ?? {} : {}}
                      mustVisit={aiRequest?.mustVisitLocationIds?.includes(item.locationId)}
                      onToggle={() => setExpandedItemKey((current) => current === key ? null : key)}
                      onUpdate={(field, value) => updateItem(activeDayIndex, itemIndex, field, value)}
                      onMove={(direction) => moveItem(activeDayIndex, itemIndex, direction)}
                      onMoveDay={(target) => moveItemToDay(activeDayIndex, itemIndex, target)}
                      onReplace={() => openLocationDrawer('replace', activeDayIndex, itemIndex)}
                      onDelete={() => removeItem(activeDayIndex, itemIndex)}
                    />
                  )
                })}
              </div>
            ) : <div className={styles.emptyDay}><p>Ngày này chưa có điểm dừng.</p><span>Thêm một địa điểm để bắt đầu xây hành trình.</span></div>}
            <Button className={styles.addStopButton} type="dashed" icon={<PlusOutlined />} onClick={() => openLocationDrawer('add', activeDayIndex)} disabled={(activeDay?.items.length ?? 0) >= 20}>Thêm địa điểm</Button>
          </section>
        </section>

        <TripSummarySidebar
          form={form}
          errorCount={errorCount}
          warningCount={warningCount}
          saving={saving}
          savingDraft={savingDraft}
          editing={editing}
          aiMode={aiMode}
          onStartDateChange={(event) => updateRoot('startDate', event.target.value)}
          onVisibilityChange={(value) => updateRoot('visibility', value)}
          onSaveDraft={saveDraft}
        />
      </form>

      <ItineraryLocationDrawer
        open={locationDrawer.open}
        intent={locationDrawer.intent ? { type: locationDrawer.intent } : null}
        disabledIds={drawerDisabledIds}
        onClose={closeLocationDrawer}
        onSelect={selectDrawerLocation}
      />
    </main>
  )
}
