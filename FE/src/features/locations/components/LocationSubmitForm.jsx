import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Spin,
  TimePicker,
  Typography,
  Upload,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { getCategoriesApi, getTagsByCategoryApi, getWardsApi } from '../../../shared/api/referenceApi'
import {
  confirmUploadApi,
  deleteUploadedImageApi,
  getUploadSignatureApi,
  uploadFileToCloudinary,
} from '../../../shared/api/uploadApi'
import { createLocationApi } from '../api/locationSubmitApi'
import { LocationMapPicker } from './LocationMapPicker'
import styles from './LocationSubmitForm.module.css'

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_IMAGE_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'Chủ nhật' },
]

function createEmptyScheduledDays() {
  return Object.fromEntries(
    DAYS_OF_WEEK.map((day) => [day.value, {
      enabled: false,
      ranges: [{ open: null, close: null }],
    }]),
  )
}

function cloneRanges(ranges = []) {
  return ranges.map((range) => ({ open: range.open, close: range.close }))
}

function scheduledDaysFromLocation(location) {
  const days = createEmptyScheduledDays()
  if (location?.openingHours?.status !== 'scheduled') return days

  location.openingHours.periods.forEach((period) => {
    days[period.dayOfWeek] = {
      enabled: true,
      ranges: period.ranges.map((range) => ({
        open: dayjs(`2000-01-01T${range.open}:00`),
        close: dayjs(`2000-01-01T${range.close}:00`),
      })),
    }
  })
  return days
}

function imageFileListFromLocation(location) {
  return (location?.images ?? []).map((image, index) => ({
    uid: `existing-${image.id}`,
    name: `Ảnh ${index + 1}`,
    status: 'done',
    url: image.url,
    existingImageId: image.id,
  }))
}

// Form tạo địa điểm dùng chung. `onSuccess` được gọi sau khi tạo thành công
// (BE tự quyết định status: admin -> approved ngay, user thường -> pending
// chờ duyệt), để trang cha tự xử lý thông báo/điều hướng phù hợp.
export function LocationSubmitForm({
  mode = 'create',
  initialLocation = null,
  submitLabel = 'Tạo địa điểm',
  onSubmit,
  onSuccess,
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const mapLatitude = Form.useWatch('latitude', form)
  const mapLongitude = Form.useWatch('longitude', form)

  const [categories, setCategories] = useState([])
  const [wards, setWards] = useState([])
  const [referenceLoading, setReferenceLoading] = useState(true)
  const [referenceError, setReferenceError] = useState('')

  const [tagGroups, setTagGroups] = useState([])
  const [tagsLoading, setTagsLoading] = useState(mode === 'edit')
  const [selectedTagsByGroup, setSelectedTagsByGroup] = useState({})
  const [tagError, setTagError] = useState('')

  const [openingStatus, setOpeningStatus] = useState(
    initialLocation?.openingHours?.status ?? 'unknown',
  )
  const [scheduledDays, setScheduledDays] = useState(
    () => scheduledDaysFromLocation(initialLocation),
  )
  const [scheduleErrors, setScheduleErrors] = useState({})
  const [openingHoursError, setOpeningHoursError] = useState('')

  const [fileList, setFileList] = useState(() => imageFileListFromLocation(initialLocation))
  const [imageError, setImageError] = useState('')
  const [mapPositionError, setMapPositionError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitPhase, setSubmitPhase] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getCategoriesApi(), getWardsApi()])
      .then(([categoriesData, wardsData]) => {
        if (!active) return
        setCategories(categoriesData)
        setWards(wardsData)
      })
      .catch((error) => {
        if (!active) return
        setReferenceError(
          error.response?.data?.message ?? 'Không thể tải dữ liệu danh mục/phường xã.',
        )
      })
      .finally(() => {
        if (active) setReferenceLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !initialLocation || referenceLoading) return

    form.setFieldsValue({
      name: initialLocation.name,
      description: initialLocation.description,
      categoryCode: initialLocation.category?.code,
      wardCode: initialLocation.address?.wardCode,
      addressLine: initialLocation.address?.addressLine,
      locationNote: initialLocation.address?.locationNote ?? '',
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
    })

    let active = true
    getTagsByCategoryApi(initialLocation.category?.code)
      .then((result) => {
        if (!active) return
        setTagGroups(result.groups)
        setSelectedTagsByGroup(Object.fromEntries(
          result.groups.map((group) => [
            group.code,
            group.tags
              .map((tag) => tag.code)
              .filter((code) => initialLocation.tagCodes?.includes(code)),
          ]),
        ))
      })
      .catch((error) => {
        if (active) {
          setTagError(
            error.response?.data?.message ?? 'Không thể tải đặc điểm của địa điểm.',
          )
        }
      })
      .finally(() => {
        if (active) setTagsLoading(false)
      })

    return () => {
      active = false
    }
  }, [form, initialLocation, mode, referenceLoading])

  async function handleCategoryChange(categoryCode) {
    setSelectedTagsByGroup({})
    setTagGroups([])
    setTagError('')
    if (!categoryCode) return

    try {
      setTagsLoading(true)
      const result = await getTagsByCategoryApi(categoryCode)
      setTagGroups(result.groups)
    } catch (error) {
      setTagError(
        error.response?.data?.message ?? 'Không thể tải danh sách đặc điểm cho danh mục này.',
      )
    } finally {
      setTagsLoading(false)
    }
  }

  function handleGroupTagsChange(group, value) {
    setTagError('')
    setSelectedTagsByGroup((previous) => ({
      ...previous,
      [group.code]: group.selectionMode === 'single' ? (value ? [value] : []) : value,
    }))
  }

  function handleMapPositionChange(lat, lng) {
    form.setFieldsValue({ latitude: lat, longitude: lng })
    setMapPositionError('')
  }

  function handleFinishFailed({ errorFields }) {
    const hasPositionError = errorFields.some(
      (field) => field.name.includes('latitude') || field.name.includes('longitude'),
    )
    if (hasPositionError) {
      setMapPositionError('Vui lòng chọn vị trí trên bản đồ.')
    }
    validateImages()
    try {
      buildOpeningHoursPayload()
    } catch {
      // buildOpeningHoursPayload writes the error next to the affected schedule.
    }
  }

  function handleDayToggle(dayValue, enabled) {
    setScheduledDays((previous) => ({
      ...previous,
      [dayValue]: {
        ...previous[dayValue],
        enabled,
        ranges: previous[dayValue]?.ranges?.length
          ? previous[dayValue].ranges
          : [{ open: null, close: null }],
      },
    }))
    setScheduleErrors((previous) => {
      const next = { ...previous }
      delete next[dayValue]
      return next
    })
    setOpeningHoursError('')
  }

  function handleDayTimeChange(dayValue, rangeIndex, times) {
    const [open, close] = times ?? [null, null]
    setScheduledDays((previous) => ({
      ...previous,
      [dayValue]: {
        ...previous[dayValue],
        ranges: (previous[dayValue]?.ranges ?? [{ open: null, close: null }]).map((range, index) => (
          index === rangeIndex ? { open, close } : range
        )),
      },
    }))
    setScheduleErrors((previous) => {
      const next = { ...previous }
      delete next[dayValue]
      return next
    })
    setOpeningHoursError('')
  }

  function addDayRange(dayValue) {
    setScheduledDays((previous) => ({
      ...previous,
      [dayValue]: {
        ...previous[dayValue],
        ranges: [...(previous[dayValue]?.ranges ?? []), { open: null, close: null }],
      },
    }))
    setScheduleErrors((previous) => {
      const next = { ...previous }
      delete next[dayValue]
      return next
    })
    setOpeningHoursError('')
  }

  function removeDayRange(dayValue, rangeIndex) {
    setScheduledDays((previous) => {
      const ranges = previous[dayValue]?.ranges ?? []
      if (ranges.length <= 1) return previous
      return {
        ...previous,
        [dayValue]: {
          ...previous[dayValue],
          ranges: ranges.filter((_, index) => index !== rangeIndex),
        },
      }
    })
    setScheduleErrors((previous) => {
      const next = { ...previous }
      delete next[dayValue]
      return next
    })
    setOpeningHoursError('')
  }

  function applyFirstCompleteRangeToDays(dayValues) {
    const source = DAYS_OF_WEEK
      .map((day) => scheduledDays[day.value])
      .find((day) => day?.ranges?.length > 0 && day.ranges.every((range) => (
        range.open && range.close && range.close.isAfter(range.open)
      )))

    if (!source) {
      message.info('Hãy nhập một ngày hoàn chỉnh trước khi sao chép giờ.')
      return
    }

    setScheduledDays((previous) => {
      const next = { ...previous }
      dayValues.forEach((dayValue) => {
        next[dayValue] = {
          ...next[dayValue],
          enabled: true,
          ranges: cloneRanges(source.ranges),
        }
      })
      return next
    })
    setScheduleErrors({})
    setOpeningHoursError('')
  }

  function moveImage(fromIndex, toIndex) {
    setFileList((previous) => {
      const next = [...previous]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  // beforeUpload only validates + adds the file for local preview; the actual
  // Cloudinary upload happens later, when the form is submitted.
  function beforeUpload(file) {
    if (fileList.length >= MAX_IMAGES) {
      setImageError(`Chỉ được tải lên tối đa ${MAX_IMAGES} ảnh.`)
      return Upload.LIST_IGNORE
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Ảnh chỉ hỗ trợ định dạng JPG, PNG hoặc WebP.')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Mỗi ảnh không được vượt quá 5MB.')
      return Upload.LIST_IGNORE
    }
    setImageError('')
    return false
  }

  const tagCodes = useMemo(
    () => Object.values(selectedTagsByGroup).flat().filter(Boolean),
    [selectedTagsByGroup],
  )

  function validateImages() {
    if (fileList.length < 1) {
      setImageError('Vui lòng chọn ít nhất 1 ảnh.')
      return false
    }
    const totalNewImageSize = fileList
      .filter((file) => file.originFileObj)
      .reduce((total, file) => total + (file.size ?? 0), 0)
    if (totalNewImageSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
      setImageError('Tổng dung lượng ảnh mới không được vượt quá 20MB.')
      return false
    }
    setImageError('')
    return true
  }

  function buildOpeningHoursPayload() {
    if (openingStatus !== 'scheduled') {
      return { status: openingStatus, periods: [] }
    }

    const errors = {}
    const periods = []

    DAYS_OF_WEEK
      .filter((day) => scheduledDays[day.value]?.enabled)
      .forEach((day) => {
        const ranges = scheduledDays[day.value]?.ranges ?? []
        if (ranges.length === 0 || ranges.some((range) => !range.open || !range.close)) {
          errors[day.value] = 'Vui lòng nhập đủ giờ mở và giờ đóng.'
          return
        }
        if (ranges.some((range) => !range.close.isAfter(range.open))) {
          errors[day.value] = 'Giờ đóng phải sau giờ mở.'
          return
        }
        const sortedRanges = [...ranges].sort((left, right) => left.open.valueOf() - right.open.valueOf())
        if (sortedRanges.some((range, index) => (
          index > 0 && range.open.isBefore(sortedRanges[index - 1].close)
        ))) {
          errors[day.value] = 'Các khung giờ trong ngày không được chồng lấn.'
          return
        }
        periods.push({
          dayOfWeek: day.value,
          ranges: ranges.map((range) => ({
            open: range.open.format('HH:mm'),
            close: range.close.format('HH:mm'),
          })),
        })
      })

    setScheduleErrors(errors)

    if (Object.keys(errors).length > 0) {
      const message = 'Vui lòng kiểm tra lại giờ hoạt động của từng ngày.'
      setOpeningHoursError(message)
      throw new Error(message)
    }

    if (periods.length === 0) {
      const message = 'Vui lòng chọn giờ mở cửa cho ít nhất một ngày.'
      setOpeningHoursError(message)
      throw new Error(message)
    }
    setOpeningHoursError('')
    return { status: 'scheduled', periods }
  }

  const openingSummary = useMemo(() => {
    if (openingStatus === 'unknown') return 'Chưa xác định giờ hoạt động.'
    if (openingStatus === 'always_open') return 'Mở cửa 24/7.'

    const rows = DAYS_OF_WEEK
      .filter((day) => scheduledDays[day.value]?.enabled)
      .map((day) => {
        const ranges = scheduledDays[day.value]?.ranges ?? []
        const hours = ranges
          .filter((range) => range.open && range.close)
          .map((range) => `${range.open.format('HH:mm')}–${range.close.format('HH:mm')}`)
          .join(', ')
        return `${day.label}: ${hours || 'chưa nhập giờ'}`
      })

    return rows.length > 0 ? rows.join(' · ') : 'Chưa chọn ngày mở cửa.'
  }, [openingStatus, scheduledDays])

  async function handleFinish(values) {
    setErrorMessage('')

    let hasInlineError = !validateImages()

    let openingHours
    try {
      openingHours = buildOpeningHoursPayload()
    } catch {
      hasInlineError = true
    }
    if (hasInlineError) return

    const uploadedPublicIds = []
    let submissionStage = 'images'

    try {
      setSubmitting(true)

      // Ở chế độ edit, ảnh hiện có được giữ nguyên; chỉ file mới được upload.
      const newFiles = fileList.filter((file) => file.originFileObj)
      setSubmitPhase(newFiles.length > 0 ? 'Đang tải ảnh lên...' : 'Đang chuẩn bị dữ liệu...')
      const results = []
      for (const file of newFiles) {
        const signatureData = await getUploadSignatureApi()
        const result = await uploadFileToCloudinary(file.originFileObj, signatureData)
        results.push({
          uid: file.uid,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        })
        uploadedPublicIds.push(result.public_id)
      }

      let assets = []
      if (results.length > 0) {
        setSubmitPhase('Đang xác nhận ảnh...')
        const confirmation = await confirmUploadApi(results.map((result) => ({
          secureUrl: result.secureUrl,
          publicId: result.publicId,
          bytes: result.bytes,
          format: result.format,
        })))
        assets = confirmation.assets
      }
      const assetTokenByUid = new Map(
        newFiles.map((file, index) => [file.uid, assets[index]?.assetToken]),
      )
      const images = fileList.map((file, position) => (
        file.existingImageId
          ? { existingImageId: file.existingImageId, position }
          : { assetToken: assetTokenByUid.get(file.uid), position }
      ))

      submissionStage = 'location'
      setSubmitPhase(mode === 'edit' ? 'Đang cập nhật địa điểm...' : 'Đang tạo địa điểm...')
      const submitRequest = onSubmit ?? createLocationApi
      const location = await submitRequest({
        name: values.name,
        description: values.description,
        categoryCode: values.categoryCode,
        tagCodes,
        wardCode: values.wardCode,
        addressLine: values.addressLine,
        locationNote: values.locationNote || undefined,
        latitude: values.latitude,
        longitude: values.longitude,
        openingHours,
        images,
        ...(mode === 'edit' ? {
          aliases: initialLocation?.aliases ?? [],
          reason: values.reason,
        } : {}),
      })

      onSuccess?.(location)
    } catch (error) {
      const responseError = error.response?.data
      const messageText = responseError?.message
        ?? (mode === 'edit'
          ? 'Tải ảnh lên hoặc cập nhật địa điểm không thành công.'
          : 'Tải ảnh lên hoặc tạo địa điểm không thành công.')

      if (responseError?.code === 'INVALID_CATEGORY_TAG_COMBINATION') {
        if (responseError?.details?.invalidTagCodes || responseError?.details?.groupCode) {
          setTagError(messageText)
        } else {
          form.setFields([{ name: 'categoryCode', errors: [messageText] }])
        }
      } else if (responseError?.code === 'INVALID_WARD') {
        form.setFields([{ name: 'wardCode', errors: [messageText] }])
      } else if (responseError?.code === 'INVALID_COORDINATES') {
        setMapPositionError(messageText)
      } else if (responseError?.code === 'INVALID_OPENING_HOURS') {
        setOpeningHoursError(messageText)
      } else if (responseError?.code?.startsWith('INVALID_IMAGE')) {
        setImageError(messageText)
      } else if (responseError?.code === 'VALIDATION_ERROR') {
        const matchingField = [
          ['Tên địa điểm', 'name'],
          ['Mô tả', 'description'],
          ['Category', 'categoryCode'],
          ['Phường/xã', 'wardCode'],
          ['Địa chỉ', 'addressLine'],
          ['Ghi chú vị trí', 'locationNote'],
          ['Lý do chỉnh sửa', 'reason'],
        ].find(([label]) => messageText.startsWith(label))
        if (matchingField) {
          form.setFields([{ name: matchingField[1], errors: [messageText] }])
        } else if (messageText.includes('tagCodes')) {
          setTagError(messageText)
        } else {
          setErrorMessage(messageText)
        }
      } else if (!responseError && submissionStage === 'images') {
        setImageError(messageText)
      } else {
        setErrorMessage(messageText)
      }

      // Best-effort cleanup: don't leave images orphaned on Cloudinary if a later
      // step (confirm/create) failed. Swallow delete errors so the original
      // error message above is what the user sees.
      if (uploadedPublicIds.length > 0) {
        await Promise.allSettled(
          uploadedPublicIds.map((publicId) => deleteUploadedImageApi(publicId).catch(() => {})),
        )
      }
    } finally {
      setSubmitting(false)
      setSubmitPhase('')
    }
  }

  if (referenceLoading) {
    return <Spin tip="Đang tải dữ liệu..." />
  }

  return (
    <>
      {referenceError ? (
        <Alert type="error" showIcon message={referenceError} style={{ marginBottom: 16 }} />
      ) : null}
      {errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />
      ) : null}

      <Form
        className={styles.form}
        layout="vertical"
        form={form}
        scrollToFirstError
        onFinish={handleFinish}
        onFinishFailed={handleFinishFailed}
      >
        <Card title="Thông tin cơ bản" style={{ marginBottom: 16 }}>
          <Form.Item
            name="name"
            label="Tên địa điểm"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập tên địa điểm.' },
              { max: 200, message: 'Tên địa điểm không được vượt quá 200 ký tự.' },
            ]}
          >
            <Input placeholder="VD: Đại Nội Huế" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập mô tả.' },
              { max: 5000, message: 'Mô tả không được vượt quá 5000 ký tự.' },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết về địa điểm" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="categoryCode"
                label="Danh mục"
                rules={[{ required: true, message: 'Vui lòng chọn danh mục.' }]}
              >
                <Select
                  placeholder="Chọn danh mục"
                  options={categories.map((category) => ({ value: category.code, label: category.name }))}
                  onChange={handleCategoryChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="wardCode"
                label="Phường/xã"
                rules={[{ required: true, message: 'Vui lòng chọn phường/xã.' }]}
              >
                <Select
                  placeholder="Chọn phường/xã"
                  showSearch
                  optionFilterProp="label"
                  options={wards.map((ward) => ({ value: ward.code, label: ward.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="addressLine"
            label="Địa chỉ"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập địa chỉ.' },
              { max: 500, message: 'Địa chỉ không được vượt quá 500 ký tự.' },
            ]}
          >
            <Input placeholder="Số nhà, tên đường" />
          </Form.Item>

          <Form.Item
            name="locationNote"
            label="Ghi chú vị trí"
            rules={[{ max: 1000, message: 'Ghi chú vị trí không được vượt quá 1000 ký tự.' }]}
          >
            <Input placeholder="VD: Đi vào hẻm nhỏ cạnh quán cà phê" />
          </Form.Item>

          <Form.Item name="latitude" hidden rules={[{ required: true, message: 'Vui lòng chọn vị trí trên bản đồ.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="longitude" hidden rules={[{ required: true, message: 'Vui lòng chọn vị trí trên bản đồ.' }]}>
            <Input />
          </Form.Item>

          <Form.Item
            label="Vị trí trên bản đồ"
            required
            validateStatus={mapPositionError ? 'error' : undefined}
            help={mapPositionError || undefined}
          >
            <LocationMapPicker
              value={{ lat: mapLatitude, lng: mapLongitude }}
              onChange={handleMapPositionChange}
            />
            <Typography.Text type="secondary">
              {typeof mapLatitude === 'number' && typeof mapLongitude === 'number'
                ? `Đã chọn: ${mapLatitude.toFixed(6)}, ${mapLongitude.toFixed(6)}`
                : 'Chưa chọn vị trí trên bản đồ.'}
            </Typography.Text>
          </Form.Item>
        </Card>

        <Card title="Đặc điểm" style={{ marginBottom: 16 }}>
          {tagsLoading ? <Spin /> : null}
          {!tagsLoading && tagGroups.length === 0 ? (
            <Typography.Text type="secondary">
              Chọn một danh mục để xem các đặc điểm phù hợp.
            </Typography.Text>
          ) : null}
          {tagGroups.map((group) => (
            <div key={group.code} style={{ marginBottom: 16 }}>
              <Typography.Text strong>{group.name}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                {group.selectionMode === 'single' ? (
                  <Radio.Group
                    value={selectedTagsByGroup[group.code]?.[0]}
                    onChange={(event) => handleGroupTagsChange(group, event.target.value)}
                    options={group.tags.map((tag) => ({ value: tag.code, label: tag.name }))}
                  />
                ) : (
                  <Checkbox.Group
                    value={selectedTagsByGroup[group.code] ?? []}
                    onChange={(value) => handleGroupTagsChange(group, value)}
                    options={group.tags.map((tag) => ({ value: tag.code, label: tag.name }))}
                  />
                )}
              </div>
            </div>
          ))}
          {!tagsLoading && tagGroups.length > 0 ? (
            <Typography.Text type="secondary">
              Đã chọn {tagCodes.length} đặc điểm. Không giới hạn tổng số lượng.
            </Typography.Text>
          ) : null}
          {tagError ? (
            <Typography.Text type="danger" className={styles.fieldError}>
              {tagError}
            </Typography.Text>
          ) : null}
        </Card>

        <Card title="Giờ hoạt động" style={{ marginBottom: 16 }}>
          <Radio.Group
            value={openingStatus}
            optionType="button"
            buttonStyle="solid"
            style={{ display: 'flex', flexWrap: 'wrap' }}
            onChange={(event) => {
              setOpeningStatus(event.target.value)
              setScheduleErrors({})
              setOpeningHoursError('')
            }}
            options={[
              { value: 'unknown', label: 'Chưa rõ' },
              { value: 'always_open', label: 'Mở cửa 24/7' },
              { value: 'scheduled', label: 'Có lịch cụ thể' },
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0' }}>
            {openingStatus === 'unknown'
              ? 'Chọn mục này nếu chưa xác minh được giờ hoạt động.'
              : openingStatus === 'always_open'
                ? 'Địa điểm hoạt động cả ngày, tất cả các ngày trong tuần.'
                : 'Bật những ngày địa điểm mở cửa và nhập một hoặc nhiều khung giờ.'}
          </Typography.Paragraph>

          {openingStatus === 'scheduled' ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => applyFirstCompleteRangeToDays([1, 2, 3, 4, 5])}
                >
                  Áp dụng cho Thứ 2–Thứ 6
                </Button>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => applyFirstCompleteRangeToDays([6, 7])}
                >
                  Áp dụng cho cuối tuần
                </Button>
              </div>
              {DAYS_OF_WEEK.map((day) => (
                <Row key={day.value} gutter={[12, 8]} align="top" style={{ marginBottom: 12 }}>
                  <Col xs={24} sm={6} md={5}>
                    <Checkbox
                      checked={scheduledDays[day.value]?.enabled}
                      onChange={(event) => handleDayToggle(day.value, event.target.checked)}
                    >
                      {day.label}
                    </Checkbox>
                    {!scheduledDays[day.value]?.enabled ? (
                      <Typography.Text type="secondary" style={{ display: 'block', marginLeft: 24 }}>
                        Đóng cửa
                      </Typography.Text>
                    ) : null}
                  </Col>
                  <Col xs={24} sm={18} md={19}>
                    {scheduledDays[day.value]?.enabled ? (
                      <>
                        {(scheduledDays[day.value]?.ranges ?? []).map((range, rangeIndex) => (
                          <div
                            key={`${day.value}-${rangeIndex}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
                          >
                            <TimePicker.RangePicker
                              format="HH:mm"
                              value={[range.open, range.close]}
                              onChange={(times) => handleDayTimeChange(day.value, rangeIndex, times)}
                              style={{ width: 'min(100%, 360px)' }}
                              placeholder={['Giờ mở', 'Giờ đóng']}
                            />
                            {rangeIndex > 0 ? (
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label={`Xóa khung giờ ${rangeIndex + 1} của ${day.label}`}
                                title="Xóa khung giờ"
                                onClick={() => removeDayRange(day.value, rangeIndex)}
                              />
                            ) : null}
                          </div>
                        ))}
                        <Button
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => addDayRange(day.value)}
                        >
                          Thêm khung giờ
                        </Button>
                        {scheduleErrors[day.value] ? (
                          <Typography.Text type="danger" style={{ display: 'block' }}>
                            {scheduleErrors[day.value]}
                          </Typography.Text>
                        ) : null}
                      </>
                    ) : null}
                  </Col>
                </Row>
              ))}
              <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                Tóm tắt: {openingSummary}
              </Typography.Paragraph>
            </div>
          ) : (
            <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0' }}>
              Tóm tắt: {openingSummary}
            </Typography.Paragraph>
          )}
          {openingHoursError ? (
            <Typography.Text type="danger" className={styles.fieldError}>
              {openingHoursError}
            </Typography.Text>
          ) : null}
        </Card>

        <Card title="Hình ảnh (1-5 ảnh)" style={{ marginBottom: 16 }}>
          <Upload
            className={styles.imageUpload}
            listType="picture-card"
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={({ fileList: nextFileList }) => {
              setFileList(nextFileList)
              if (nextFileList.length !== fileList.length) setImageError('')
            }}
            multiple
            maxCount={MAX_IMAGES}
            accept="image/jpeg,image/png,image/webp"
            itemRender={(originNode, file, currentFileList) => {
              const index = currentFileList.findIndex((item) => item.uid === file.uid)
              return (
                <div className={styles.imageItem}>
                  {originNode}
                  <div className={styles.imageActions}>
                    <Button
                      size="small"
                      icon={<ArrowLeftOutlined />}
                      aria-label={`Di chuyển ảnh ${index + 1} sang trái`}
                      title="Di chuyển sang trái"
                      disabled={index <= 0}
                      onClick={() => moveImage(index, index - 1)}
                    />
                    <Button
                      size="small"
                      icon={<ArrowRightOutlined />}
                      aria-label={`Di chuyển ảnh ${index + 1} sang phải`}
                      title="Di chuyển sang phải"
                      disabled={index === -1 || index >= currentFileList.length - 1}
                      onClick={() => moveImage(index, index + 1)}
                    />
                  </div>
                </div>
              )
            }}
          >
            {fileList.length >= MAX_IMAGES ? null : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
              </div>
            )}
          </Upload>
          <Typography.Text type="secondary" className={styles.imageHint}>
            Ảnh đầu tiên trong danh sách sẽ là ảnh đại diện. Dùng nút mũi tên để sắp xếp lại thứ tự.
            Ảnh chỉ được tải lên khi bạn bấm &quot;{submitLabel}&quot;.
          </Typography.Text>
          {imageError ? (
            <Typography.Text type="danger" className={styles.fieldError}>
              {imageError}
            </Typography.Text>
          ) : null}
        </Card>

        {mode === 'edit' ? (
          <Card title="Lý do chỉnh sửa" style={{ marginBottom: 16 }}>
            <Form.Item
              name="reason"
              label="Nội dung giải trình"
              rules={[
                { required: true, whitespace: true, message: 'Vui lòng nhập lý do chỉnh sửa.' },
                { max: 1000, message: 'Lý do không được vượt quá 1000 ký tự.' },
              ]}
              extra="Lý do và nội dung thay đổi sẽ được lưu trong lịch sử kiểm duyệt."
            >
              <Input.TextArea
                rows={4}
                placeholder="Ví dụ: Sửa địa chỉ và vị trí ghim theo thông tin xác minh từ trang chính thức"
              />
            </Form.Item>
          </Card>
        ) : null}

        <Divider />
        <div className={styles.submitBar}>
          <Button type="primary" htmlType="submit" size="large" loading={submitting}>
            {submitLabel}
          </Button>
          {submitPhase ? <Typography.Text type="secondary">{submitPhase}</Typography.Text> : null}
        </div>
      </Form>
    </>
  )
}
