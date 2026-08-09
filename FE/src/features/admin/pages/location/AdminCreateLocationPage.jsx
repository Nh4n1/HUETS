import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  Alert,
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
  App,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { createLocationApi } from '../../api/adminLocationsApi'
import { getCategoriesApi, getTagsByCategoryApi, getWardsApi } from '../../api/referenceApi'
import {
  confirmUploadApi,
  deleteUploadedImageApi,
  getUploadSignatureApi,
  uploadFileToCloudinary,
} from '../../api/uploadApi'
import { LocationMapPicker } from '../../components/location/LocationMapPicker'

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
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
    DAYS_OF_WEEK.map((day) => [day.value, { enabled: false, open: null, close: null }]),
  )
}

export function AdminCreateLocationPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const mapLatitude = Form.useWatch('latitude', form)
  const mapLongitude = Form.useWatch('longitude', form)

  const [categories, setCategories] = useState([])
  const [wards, setWards] = useState([])
  const [referenceLoading, setReferenceLoading] = useState(true)
  const [referenceError, setReferenceError] = useState('')

  const [tagGroups, setTagGroups] = useState([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [selectedTagsByGroup, setSelectedTagsByGroup] = useState({})

  const [openingStatus, setOpeningStatus] = useState('unknown')
  const [scheduledDays, setScheduledDays] = useState(createEmptyScheduledDays)

  const [fileList, setFileList] = useState([])

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

  async function handleCategoryChange(categoryCode) {
    setSelectedTagsByGroup({})
    setTagGroups([])
    if (!categoryCode) return

    try {
      setTagsLoading(true)
      const result = await getTagsByCategoryApi(categoryCode)
      setTagGroups(result.groups)
    } catch (error) {
      message.error(
        error.response?.data?.message ?? 'Không thể tải danh sách đặc điểm cho danh mục này.',
      )
    } finally {
      setTagsLoading(false)
    }
  }

  function handleGroupTagsChange(group, value) {
    setSelectedTagsByGroup((previous) => ({
      ...previous,
      [group.code]: group.selectionMode === 'single' ? (value ? [value] : []) : value,
    }))
  }

  function handleMapPositionChange(lat, lng) {
    form.setFieldsValue({ latitude: lat, longitude: lng })
  }

  function handleFinishFailed({ errorFields }) {
    const hasPositionError = errorFields.some(
      (field) => field.name.includes('latitude') || field.name.includes('longitude'),
    )
    if (hasPositionError) {
      message.error('Vui lòng chọn vị trí trên bản đồ.')
    }
  }

  function handleDayToggle(dayValue, enabled) {
    setScheduledDays((previous) => ({
      ...previous,
      [dayValue]: { ...previous[dayValue], enabled },
    }))
  }

  function handleDayTimeChange(dayValue, times) {
    const [open, close] = times ?? [null, null]
    setScheduledDays((previous) => ({
      ...previous,
      [dayValue]: { ...previous[dayValue], open, close },
    }))
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
      message.error(`Chỉ được tải lên tối đa ${MAX_IMAGES} ảnh.`)
      return Upload.LIST_IGNORE
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      message.error('Ảnh chỉ hỗ trợ định dạng JPG, PNG hoặc WebP.')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      message.error('Mỗi ảnh không được vượt quá 5MB.')
      return Upload.LIST_IGNORE
    }
    return false
  }

  const tagCodes = useMemo(
    () => Object.values(selectedTagsByGroup).flat().filter(Boolean),
    [selectedTagsByGroup],
  )

  function buildOpeningHoursPayload() {
    if (openingStatus !== 'scheduled') {
      return { status: openingStatus, periods: [] }
    }

    const periods = DAYS_OF_WEEK
      .filter((day) => scheduledDays[day.value]?.enabled)
      .map((day) => {
        const entry = scheduledDays[day.value]
        if (!entry.open || !entry.close) return null
        return {
          dayOfWeek: day.value,
          ranges: [{ open: entry.open.format('HH:mm'), close: entry.close.format('HH:mm') }],
        }
      })
      .filter(Boolean)

    if (periods.length === 0) {
      throw new Error('Vui lòng chọn giờ mở cửa cho ít nhất một ngày.')
    }
    return { status: 'scheduled', periods }
  }

  async function handleFinish(values) {
    setErrorMessage('')

    if (fileList.length < 1) {
      message.error('Vui lòng chọn ít nhất 1 ảnh.')
      return
    }

    let openingHours
    try {
      openingHours = buildOpeningHoursPayload()
    } catch (error) {
      message.error(error.message)
      return
    }

    const uploadedPublicIds = []

    try {
      setSubmitting(true)

      // Ảnh chỉ thực sự lên Cloudinary tại đây, khi user đã bấm tạo địa điểm.
      setSubmitPhase('Đang tải ảnh lên...')
      const results = []
      for (const file of fileList) {
        const signatureData = await getUploadSignatureApi()
        const result = await uploadFileToCloudinary(file.originFileObj, signatureData)
        results.push({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        })
        uploadedPublicIds.push(result.public_id)
      }

      setSubmitPhase('Đang xác nhận ảnh...')
      const { assets } = await confirmUploadApi(results)
      const images = assets.map((asset, index) => ({ assetToken: asset.assetToken, position: index }))

      setSubmitPhase('Đang tạo địa điểm...')
      await createLocationApi({
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
      })

      message.success('Tạo địa điểm thành công.')
      navigate('/admin/locations')
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Tải ảnh lên hoặc tạo địa điểm không thành công.',
      )

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
    return <Spin fullscreen tip="Đang tải dữ liệu..." />
  }

  return (
    <main className="page-container">
      <Typography.Title level={2}>Thêm địa điểm mới</Typography.Title>

      {referenceError ? (
        <Alert type="error" showIcon message={referenceError} style={{ marginBottom: 16 }} />
      ) : null}
      {errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />
      ) : null}

      <Form layout="vertical" form={form} onFinish={handleFinish} onFinishFailed={handleFinishFailed}>
        <Card title="Thông tin cơ bản" style={{ marginBottom: 16 }}>
          <Form.Item
            name="name"
            label="Tên địa điểm"
            rules={[{ required: true, message: 'Vui lòng nhập tên địa điểm.' }]}
          >
            <Input placeholder="VD: Đại Nội Huế" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả.' }]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết về địa điểm" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
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
            <Col span={12}>
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
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ.' }]}
          >
            <Input placeholder="Số nhà, tên đường" />
          </Form.Item>

          <Form.Item name="locationNote" label="Ghi chú vị trí">
            <Input placeholder="VD: Đi vào hẻm nhỏ cạnh quán cà phê" />
          </Form.Item>

          <Form.Item name="latitude" hidden rules={[{ required: true, message: 'Vui lòng chọn vị trí trên bản đồ.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="longitude" hidden rules={[{ required: true, message: 'Vui lòng chọn vị trí trên bản đồ.' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="Vị trí trên bản đồ" required>
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
        </Card>

        <Card title="Giờ hoạt động" style={{ marginBottom: 16 }}>
          <Radio.Group
            value={openingStatus}
            onChange={(event) => setOpeningStatus(event.target.value)}
            options={[
              { value: 'unknown', label: 'Chưa rõ' },
              { value: 'always_open', label: 'Mở cửa cả ngày' },
              { value: 'scheduled', label: 'Theo lịch cụ thể' },
            ]}
          />

          {openingStatus === 'scheduled' ? (
            <div style={{ marginTop: 16 }}>
              {DAYS_OF_WEEK.map((day) => (
                <Row key={day.value} gutter={16} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={4}>
                    <Checkbox
                      checked={scheduledDays[day.value]?.enabled}
                      onChange={(event) => handleDayToggle(day.value, event.target.checked)}
                    >
                      {day.label}
                    </Checkbox>
                  </Col>
                  <Col span={10}>
                    <TimePicker.RangePicker
                      format="HH:mm"
                      disabled={!scheduledDays[day.value]?.enabled}
                      value={[scheduledDays[day.value]?.open, scheduledDays[day.value]?.close]}
                      onChange={(times) => handleDayTimeChange(day.value, times)}
                    />
                  </Col>
                </Row>
              ))}
            </div>
          ) : null}
        </Card>

        <Card title="Hình ảnh (1-5 ảnh)" style={{ marginBottom: 16 }}>
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
            multiple
            maxCount={MAX_IMAGES}
            accept="image/jpeg,image/png,image/webp"
            itemRender={(originNode, file, currentFileList) => {
              const index = currentFileList.findIndex((item) => item.uid === file.uid)
              return (
                <div>
                  {originNode}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                    <Button
                      size="small"
                      icon={<ArrowLeftOutlined />}
                      disabled={index <= 0}
                      onClick={() => moveImage(index, index - 1)}
                    />
                    <Button
                      size="small"
                      icon={<ArrowRightOutlined />}
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
          <Typography.Text type="secondary">
            Ảnh đầu tiên trong danh sách sẽ là ảnh đại diện. Dùng nút mũi tên để sắp xếp lại thứ tự.
            Ảnh chỉ được tải lên khi bạn bấm "Tạo địa điểm".
          </Typography.Text>
        </Card>

        <Divider />

        <Button type="primary" htmlType="submit" size="large" loading={submitting}>
          Tạo địa điểm
        </Button>
        {submitPhase ? (
          <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
            {submitPhase}
          </Typography.Text>
        ) : null}
      </Form>
    </main>
  )
}
