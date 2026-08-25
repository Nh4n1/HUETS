import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Image,
  Input,
  List,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../../auth/context/useAuth'
import {
  approveLocationApi,
  deleteAdminLocationApi,
  getAdminLocationByIdApi,
  hideLocationApi,
  rejectLocationApi,
  restoreLocationApi,
} from '../../api/adminLocationsApi'
import { LocationMapPicker } from '../../../locations/components/LocationMapPicker'
import {
  formatDateTime,
  LOCATION_STATUS,
} from '../../components/location/locationPresentation'
import styles from '../AdminPage.module.css'

const EDIT_FIELD_LABELS = {
  name: 'Tên địa điểm',
  description: 'Mô tả',
  categoryCode: 'Danh mục',
  tagCodes: 'Đặc điểm',
  aliases: 'Tên gọi khác',
  address: 'Địa chỉ',
  geo: 'Vị trí bản đồ',
  images: 'Hình ảnh',
  openingHours: 'Giờ hoạt động',
}

function openingHoursLabel(openingHours) {
  if (!openingHours || openingHours.status === 'unknown') return 'Chưa xác định'
  if (openingHours.status === 'always_open') return 'Mở cửa 24/7'
  return openingHours.periods
    .map((period) => {
      const ranges = period.ranges.map((range) => `${range.open}–${range.close}`).join(', ')
      return `Thứ ${period.dayOfWeek + 1}: ${ranges}`
    })
    .join('; ')
}

export function AdminLocationDetailPage() {
  const { locationId } = useParams()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const { user } = useAuth()
  const [rejectForm] = Form.useForm()
  const [hideForm] = Form.useForm()
  const [deleteForm] = Form.useForm()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [hideOpen, setHideOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    getAdminLocationByIdApi(locationId)
      .then((data) => {
        if (!active) return
        setLocation(data)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setErrorMessage(error.response?.data?.message ?? 'Không thể tải chi tiết địa điểm.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [locationId])

  async function refreshLocation() {
    try {
      setLoading(true)
      const data = await getAdminLocationByIdApi(locationId)
      setLocation(data)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải lại chi tiết địa điểm.')
    } finally {
      setLoading(false)
    }
  }

  async function runModeration(request, successMessage, redirectTo = '/admin/locations/pending') {
    try {
      setSubmitting(true)
      await request()
      message.success(successMessage)
      navigate(redirectTo)
    } catch (error) {
      if (error.response?.data?.code === 'STALE_RESOURCE') {
        message.warning('Địa điểm đã được thay đổi. Dữ liệu mới nhất đã được tải lại.')
        await refreshLocation()
        return
      }
      message.error(error.response?.data?.message ?? 'Không thể thực hiện kiểm duyệt.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleApprove() {
    modal.confirm({
      title: 'Duyệt địa điểm này?',
      content: 'Địa điểm sẽ được hiển thị công khai ngay sau khi duyệt.',
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: () => runModeration(
        () => approveLocationApi(location.id, {
          expectedStatus: location.status,
          expectedUpdatedAt: location.updatedAt,
        }),
        'Đã duyệt địa điểm.',
      ),
    })
  }

  async function handleDelete() {
    const values = await deleteForm.validateFields()
    try {
      setSubmitting(true)
      await deleteAdminLocationApi(location.id, {
        expectedStatus: location.status,
        expectedUpdatedAt: location.updatedAt,
        reason: values.reason,
      })
      message.success('Đã xóa địa điểm khỏi hệ thống.')
      navigate('/admin/locations')
    } catch (error) {
      if (error.response?.data?.code === 'STALE_RESOURCE') {
        message.warning('Địa điểm đã thay đổi. Dữ liệu mới nhất đã được tải lại.')
        setDeleteOpen(false)
        await refreshLocation()
        return
      }
      message.error(error.response?.data?.message ?? 'Không thể xóa địa điểm.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    const values = await rejectForm.validateFields()
    await runModeration(
      () => rejectLocationApi(location.id, {
        expectedStatus: location.status,
        expectedUpdatedAt: location.updatedAt,
        reason: values.reason,
      }),
      'Đã từ chối địa điểm.',
    )
    setRejectOpen(false)
    rejectForm.resetFields()
  }

  async function handleHide() {
    const values = await hideForm.validateFields()
    await runModeration(
      () => hideLocationApi(location.id, {
        expectedStatus: location.status,
        expectedUpdatedAt: location.updatedAt,
        reason: values.reason,
      }),
      'Đã ẩn địa điểm khỏi nội dung công khai.',
      '/admin/locations',
    )
  }

  function handleRestore() {
    modal.confirm({
      title: `Hiện lại địa điểm "${location.name}"?`,
      content: 'Địa điểm sẽ xuất hiện trở lại trên trang công khai và có thể được thêm vào lịch trình.',
      okText: 'Hiện lại',
      cancelText: 'Hủy',
      onOk: () => runModeration(
        () => restoreLocationApi(location.id, {
          expectedStatus: location.status,
          expectedUpdatedAt: location.updatedAt,
        }),
        'Đã hiện lại địa điểm.',
        '/admin/locations',
      ),
    })
  }

  if (loading) {
    return <Spin fullscreen tip="Đang tải địa điểm..." />
  }

  if (!location) {
    return (
      <main className={`${styles.page} page-container`}>
        <Alert type="error" showIcon message={errorMessage || 'Không tìm thấy địa điểm.'} />
      </main>
    )
  }

  const status = LOCATION_STATUS[location.status] ?? {
    label: location.status,
    color: 'default',
  }
  const canEdit = user?.role === 'admin'
    || (user?.role === 'mod' && location.status === 'pending')

  return (
    <main className={`${styles.page} page-container`}>
      <div className={styles.detailStack}>
        <header className={styles.pageHeader}>
          <div>
            <Link className={styles.backLink} to="/admin/locations">← Quay lại danh sách địa điểm</Link>
            <Typography.Title level={2}>{location.name}</Typography.Title>
            <Tag color={status.color}>{status.label}</Tag>
          </div>
          <div className={styles.headerActions}>
            {canEdit ? (
              <Link to={`/admin/locations/${location.id}/edit`}>
                <Button disabled={submitting}>Chỉnh sửa</Button>
              </Link>
            ) : null}
            {user?.role === 'admin' && ['hidden', 'rejected', 'withdrawn'].includes(location.status) ? (
              <Button danger disabled={submitting} onClick={() => setDeleteOpen(true)}>
                Xóa khỏi hệ thống
              </Button>
            ) : null}
            {location.status === 'pending' ? (
              <>
                <Button danger disabled={submitting} onClick={() => setRejectOpen(true)}>
                  Từ chối
                </Button>
                <Button type="primary" loading={submitting} onClick={handleApprove}>
                  Duyệt địa điểm
                </Button>
              </>
            ) : null}
            {location.status === 'approved' ? (
              <Button disabled={submitting} onClick={() => setHideOpen(true)}>
                Ẩn địa điểm
              </Button>
            ) : null}
            {location.status === 'hidden' ? (
              <Button type="primary" loading={submitting} onClick={handleRestore}>
                Hiện lại
              </Button>
            ) : null}
          </div>
        </header>

        {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
        {location.duplicateWarning ? (
          <Alert
            type="warning"
            showIcon
            message="Có địa điểm có khả năng bị trùng"
            description="Hãy đối chiếu tên và vị trí trước khi duyệt."
          />
        ) : null}
        {location.status === 'hidden' ? (
          <Alert
            type="warning"
            showIcon
            message="Địa điểm đang bị ẩn khỏi nội dung công khai"
            description={location.moderation?.hiddenReason
              ? `Lý do: ${location.moderation.hiddenReason}`
              : undefined}
          />
        ) : null}

        <Card title="Thông tin địa điểm">
          <Descriptions bordered column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label="Danh mục">{location.category?.name}</Descriptions.Item>
            <Descriptions.Item label="Người đóng góp">
              {location.contributor ? (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{location.contributor.displayName}</Typography.Text>
                  <Typography.Text type="secondary" copyable>
                    {location.contributor.email}
                  </Typography.Text>
                </Space>
              ) : 'Không xác định'}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>{location.formattedAddress}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú vị trí" span={2}>
              {location.address?.locationNote || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả" span={2}>{location.description}</Descriptions.Item>
            <Descriptions.Item label="Tên gọi khác" span={2}>
              {location.aliases?.join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Giờ hoạt động" span={2}>
              {openingHoursLabel(location.openingHours)}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày gửi">
              {formatDateTime(location.moderation?.submittedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật lần cuối">
              {formatDateTime(location.updatedAt)}
            </Descriptions.Item>
            {location.moderation?.rejectionReason ? (
              <Descriptions.Item label="Lý do từ chối" span={2}>
                {location.moderation.rejectionReason}
              </Descriptions.Item>
            ) : null}
            {location.moderation?.hiddenReason ? (
              <Descriptions.Item label="Lý do ẩn gần nhất" span={2}>
                {location.moderation.hiddenReason}
              </Descriptions.Item>
            ) : null}
            {location.moderation?.hiddenAt ? (
              <Descriptions.Item label="Ẩn lúc">
                {formatDateTime(location.moderation.hiddenAt)}
              </Descriptions.Item>
            ) : null}
            {location.moderation?.restoredAt ? (
              <Descriptions.Item label="Hiện lại lúc">
                {formatDateTime(location.moderation.restoredAt)}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 20 }}>Đặc điểm</Typography.Title>
          <Space wrap>
            {location.tagCodes?.length
              ? location.tagCodes.map((code) => <Tag key={code}>{code}</Tag>)
              : <Typography.Text type="secondary">Chưa có đặc điểm.</Typography.Text>}
          </Space>
        </Card>

        <Card title="Lịch sử chỉnh sửa">
          {location.editHistory?.length ? (
            <List
              dataSource={location.editHistory}
              renderItem={(entry) => (
                <List.Item>
                  <List.Item.Meta
                    title={(
                      <Space wrap>
                        <Typography.Text strong>
                          {entry.editor?.displayName ?? 'Tài khoản không còn tồn tại'}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {formatDateTime(entry.editedAt)}
                        </Typography.Text>
                      </Space>
                    )}
                    description={(
                      <Space direction="vertical" size={6}>
                        <Typography.Text>{entry.reason}</Typography.Text>
                        <Space wrap size={4}>
                          {entry.changedFields.map((field) => (
                            <Tag key={field}>{EDIT_FIELD_LABELS[field] ?? field}</Tag>
                          ))}
                        </Space>
                      </Space>
                    )}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Typography.Text type="secondary">Chưa có lần chỉnh sửa nào được ghi nhận.</Typography.Text>
          )}
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Vị trí">
              <LocationMapPicker
                readOnly
                value={{ lat: location.latitude, lng: location.longitude }}
              />
              <Typography.Text type="secondary">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Ảnh địa điểm">
              <Image.PreviewGroup>
                <Space wrap>
                  {location.images.map((image) => (
                    <Image
                      key={image.id}
                      src={image.url}
                      width={140}
                      height={100}
                      style={{ objectFit: 'cover' }}
                    />
                  ))}
                </Space>
              </Image.PreviewGroup>
            </Card>
          </Col>
        </Row>

        {location.duplicateCandidates?.length ? (
          <Card title="Địa điểm có khả năng trùng">
            <List
              dataSource={location.duplicateCandidates}
              renderItem={(candidate) => (
                <List.Item
                  actions={[
                    <Link key="detail" to={`/admin/locations/${candidate.locationId}`}>
                      Xem chi tiết
                    </Link>,
                  ]}
                >
                  <List.Item.Meta
                    title={candidate.name}
                    description={candidate.distanceMeters === undefined
                      ? `Trùng tên · ${candidate.status}`
                      : `Cách khoảng ${candidate.distanceMeters} m · ${candidate.status}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        ) : null}
      </div>

      <Modal
        title="Từ chối địa điểm"
        open={rejectOpen}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: submitting }}
        onOk={handleReject}
        onCancel={() => {
          setRejectOpen(false)
          rejectForm.resetFields()
        }}
      >
        <Alert
          showIcon
          type="info"
          message="Từ chối là một kết quả kiểm duyệt, không xóa địa điểm. Người đóng góp vẫn xem được địa điểm và lý do bên dưới."
          style={{ marginBottom: 16 }}
        />
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập lý do từ chối.' },
              { max: 1000, message: 'Lý do không được vượt quá 1000 ký tự.' },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả thông tin cần người đóng góp chỉnh sửa" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Ẩn địa điểm "${location.name}"`}
        open={hideOpen}
        okText="Xác nhận ẩn"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: submitting }}
        onOk={handleHide}
        onCancel={() => {
          setHideOpen(false)
          hideForm.resetFields()
        }}
      >
        <Alert
          showIcon
          type="warning"
          message="Địa điểm sẽ ngừng xuất hiện công khai. Bookmark, đánh giá và tham chiếu trong lịch trình vẫn được giữ."
          style={{ marginBottom: 16 }}
        />
        <Form form={hideForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do ẩn"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập lý do ẩn địa điểm.' },
              { max: 1000, message: 'Lý do không được vượt quá 1000 ký tự.' },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả vấn đề cần xác minh hoặc chỉnh sửa" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Xóa "${location.name}" khỏi hệ thống`}
        open={deleteOpen}
        okText="Xóa khỏi hệ thống"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: submitting }}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteOpen(false)
          deleteForm.resetFields()
        }}
      >
        <Alert
          showIcon
          type="error"
          message="Chỉ sử dụng khi địa điểm cần được loại khỏi dữ liệu vận hành. Hiện chưa có chức năng khôi phục trên giao diện."
          style={{ marginBottom: 12 }}
        />
        <Typography.Paragraph type="secondary">
          Bookmark liên quan sẽ bị xóa; đánh giá và tham chiếu lịch trình được giữ để truy vết.
        </Typography.Paragraph>
        <Form form={deleteForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do xóa"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập lý do xóa địa điểm.' },
              { max: 1000, message: 'Lý do không được vượt quá 1000 ký tự.' },
            ]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: dữ liệu thử nghiệm hoặc bản ghi trùng lặp" />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  )
}
