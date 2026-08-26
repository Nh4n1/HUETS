import { BookOutlined, EnvironmentOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Input, Select, Spin } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBookmarks } from '../../bookmarks/context/useBookmarks'
import { getPublicLocationByIdApi, searchPublicLocationsApi } from '../../locations/api/locationApi'
import { getCategoriesApi } from '../../../shared/api/referenceApi'
import styles from '../pages/Itinerary.module.css'

const messageFor = (error) => error.response?.data?.message ?? 'Không thể tải địa điểm.'
const categoryName = (location) => location?.category?.name ?? location?.category?.code ?? 'Địa điểm'

function Thumb({ location }) {
  return location?.coverImageUrl
    ? <img className={styles.locationThumb} src={location.coverImageUrl} alt="" />
    : <span className={styles.locationThumbPlaceholder}><EnvironmentOutlined /></span>
}

export function LocationPicker({
  value,
  selectedLocation,
  disabledIds = new Set(),
  error,
  onChange,
  multiple = false,
  onConfirm,
  confirmLabel,
  footerNote,
}) {
  const { bookmarks } = useBookmarks()
  const [mode, setMode] = useState('search')
  const [changing, setChanging] = useState(!value)
  const [query, setQuery] = useState('')
  const [categoryCode, setCategoryCode] = useState('')
  const [categories, setCategories] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [selectedLocations, setSelectedLocations] = useState(() => new Map())
  const [confirming, setConfirming] = useState(false)
  const searchRequestRef = useRef(null)

  const savedLocations = useMemo(() => bookmarks
    .filter((bookmark) => bookmark.targetType === 'location')
    .map((bookmark) => ({
      id: bookmark.targetId,
      ...(bookmark.snapshot ?? {}),
      availability: bookmark.availability ?? 'available',
    })), [bookmarks])

  useEffect(() => {
    getCategoriesApi().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    if (mode !== 'search') return undefined
    let active = true
    const controller = new AbortController()
    searchRequestRef.current?.abort()
    searchRequestRef.current = controller
    const timer = window.setTimeout(() => {
      setLoading(true)
      setRequestError('')
      searchPublicLocationsApi({
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(categoryCode ? { categoryCode } : {}),
        page: 1,
        pageSize: 30,
      }, { signal: controller.signal })
        .then((payload) => { if (active) setResults(payload.data ?? []) })
        .catch((requestFailure) => {
          if (active && requestFailure.code !== 'ERR_CANCELED') setRequestError(messageFor(requestFailure))
        })
        .finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
      if (searchRequestRef.current === controller) searchRequestRef.current = null
    }
  }, [categoryCode, mode, query])

  const visible = mode === 'saved' ? savedLocations : results
  const loadDetail = async (location) => location.openingHours ? location : getPublicLocationByIdApi(location.id)
  const chooseOne = async (location) => {
    try {
      setConfirming(true)
      onChange(await loadDetail(location))
      setChanging(false)
    } catch (failure) {
      setRequestError(messageFor(failure))
    } finally {
      setConfirming(false)
    }
  }
  const toggle = (location) => setSelectedLocations((current) => {
    const next = new Map(current)
    if (next.has(location.id)) next.delete(location.id)
    else next.set(location.id, location)
    return next
  })
  const confirm = async () => {
    try {
      setConfirming(true)
      setRequestError('')
      const chosen = [...selectedLocations.values()]
      const details = await Promise.all(chosen.map(loadDetail))
      onConfirm(details)
      setSelectedLocations(new Map())
    } catch (failure) {
      setRequestError(messageFor(failure))
    } finally {
      setConfirming(false)
    }
  }
  const changeMode = (nextMode) => {
    if (nextMode === 'saved') {
      searchRequestRef.current?.abort()
      setLoading(false)
      setRequestError('')
    }
    setMode(nextMode)
  }

  if (!multiple && value && selectedLocation && !changing) {
    return (
      <div className={styles.selectedLocation}>
        <Thumb location={selectedLocation} />
        <div><strong>{selectedLocation.name}</strong><span>{categoryName(selectedLocation)} · {selectedLocation.formattedAddress || 'Huế'}</span></div>
        <Button onClick={() => setChanging(true)}>Đổi</Button>
      </div>
    )
  }

  return (
    <div className={styles.locationPicker}>
      <div className={styles.pickerTabs} role="tablist" aria-label="Nguồn địa điểm">
        <button role="tab" aria-selected={mode === 'search'} className={mode === 'search' ? styles.selectedPickerTab : ''} type="button" onClick={() => changeMode('search')}><SearchOutlined /> Tất cả</button>
        <button role="tab" aria-selected={mode === 'saved'} className={mode === 'saved' ? styles.selectedPickerTab : ''} type="button" onClick={() => changeMode('saved')}><BookOutlined /> Đã lưu ({savedLocations.length})</button>
      </div>
      {mode === 'search' ? (
        <div className={styles.pickerFilters}>
          <Input allowClear maxLength={200} prefix={<SearchOutlined />} placeholder="Tìm theo tên hoặc địa chỉ..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select allowClear placeholder="Tất cả danh mục" value={categoryCode || undefined} onChange={(next) => setCategoryCode(next ?? '')} options={categories.map((category) => ({ value: category.code, label: category.name }))} />
        </div>
      ) : null}
      {requestError ? <Alert showIcon type="error" message={requestError} /> : null}
      <div className={styles.locationResults} aria-live="polite">
        {loading ? <div className={styles.pickerState}><Spin size="small" /> Đang tải địa điểm...</div> : null}
        {!loading && !visible.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={mode === 'saved' ? 'Bạn chưa lưu địa điểm nào.' : 'Không tìm thấy địa điểm phù hợp.'} /> : null}
        {!loading && visible.map((location) => {
          const unavailable = location.availability === 'unavailable'
          const disabled = disabledIds.has(location.id) || unavailable
          const selected = selectedLocations.has(location.id)
          return (
            <div className={styles.locationResult} key={location.id}>
              <Thumb location={location} />
              <div><strong>{location.name}</strong><span>{unavailable ? '⚠ Địa điểm không còn khả dụng' : `${categoryName(location)} · ${location.formattedAddress || 'Huế'}`}</span></div>
              <Button
                type={selected ? 'primary' : 'default'}
                disabled={disabled}
                onClick={() => multiple ? toggle(location) : chooseOne(location)}
              >{disabled ? 'Không thể thêm' : multiple ? (selected ? 'Đã chọn' : 'Chọn') : 'Thêm'}</Button>
            </div>
          )
        })}
      </div>
      {multiple ? (
        <>
          {footerNote ? <p className={styles.distributionNote}>{footerNote}</p> : null}
          <div className={styles.pickerConfirmation}>
            <strong>Đã chọn {selectedLocations.size} địa điểm</strong>
            <Button type="primary" disabled={!selectedLocations.size} loading={confirming} onClick={confirm}>
              {confirmLabel ?? `Tiếp tục với ${selectedLocations.size} địa điểm →`}
            </Button>
          </div>
        </>
      ) : null}
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  )
}
