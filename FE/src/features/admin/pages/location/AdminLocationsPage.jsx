import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { approveLocationApi, getAdminLocationsApi, rejectLocationApi } from '../../api/adminLocationsApi'
import {
  formatDateTime,
  LOCATION_STATUS,
} from '../../components/location/locationPresentation'

const PAGE_SIZE = 12

export function AdminLocationsPage({ fixedStatus, title = 'Quản lý địa điểm' }) {
  const { message, modal } = App.useApp()
  const [rejectForm] = Form.useForm()

  const [locations, setLocations] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(fixedStatus ?? '')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [rejectTarget, setRejectTarget] = useState(null)
  const [moderatingId, setModeratingId] = useState(null)

  async function loadLocations() {
    try {
      setLoading(true)
      const { data, meta } = await getAdminLocationsApi({
        page,
        pageSize: PAGE_SIZE,
        status: (fixedStatus ?? status) || undefined,
      })
      setLocations(data)
      setTotal(meta.total)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Không thể tải danh sách địa điểm.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    getAdminLocationsApi({
      page,
      pageSize: PAGE_SIZE,
      status: (fixedStatus ?? status) || undefined,
    })
      .then(({ data, meta }) => {
        if (!active) return
        setLocations(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setErrorMessage(
          error.response?.data?.message ?? 'Không thể tải danh sách địa điểm.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fixedStatus, page, status])

  async function runModeration(record, request, successMessage) {
    try {
      setModeratingId(record.id)
      await request()
      message.success(successMessage)
      await loadLocations()
    } catch (error) {
      if (error.response?.data?.code === 'STALE_RESOURCE') {
        message.warning('Địa điểm đã được thay đổi bởi thao tác khác. Danh sách đã được tải lại.')
        await loadLocations()
        return
      }
      message.error(error.response?.data?.message ?? 'Không thể thực hiện kiểm duyệt.')
    } finally {
      setModeratingId(null)
    }
  }

  function handleApprove(record) {
    modal.confirm({
      title: `Duyệt địa điểm "${record.name}"?`,
      content: 'Địa điểm sẽ được hiển thị công khai ngay sau khi duyệt.',
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: () => runModeration(
        record,
        () => approveLocationApi(record.id, {
          expectedStatus: record.status,
          expectedUpdatedAt: record.updatedAt,
        }),
        'Đã duyệt địa điểm.',
      ),
    })
  }

  function openRejectModal(record) {
    setRejectTarget(record)
    rejectForm.resetFields()
  }

  async function handleRejectConfirm() {
    const values = await rejectForm.validateFields()
    const record = rejectTarget
    await runModeration(
      record,
      () => rejectLocationApi(record.id, {
        expectedStatus: record.status,
        expectedUpdatedAt: record.updatedAt,
        reason: values.reason,
      }),
      'Đã từ chối địa điểm.',
    )
    setRejectTarget(null)
  }

  const columns = [
    {
      title: 'Tên địa điểm',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Link to={`/admin/locations/${record.id}`}>{name}</Link>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value) => {
        const presentation = LOCATION_STATUS[value] ?? { label: value, color: 'default' }
        return <Tag color={presentation.color}>{presentation.label}</Tag>
      },
    },
    {
      title: 'Danh mục',
      key: 'category',
      render: (_, record) => record.category?.name,
    },
    { title: 'Địa chỉ', dataIndex: 'formattedAddress', key: 'formattedAddress' },
    {
      title: 'Người đóng góp',
      key: 'contributor',
      render: (_, record) => record.contributor?.displayName ?? 'Không xác định',
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: formatDateTime,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        record.status === 'pending' ? (
          <Space>
            <Button
              size="small"
              type="primary"
              loading={moderatingId === record.id}
              disabled={moderatingId !== null && moderatingId !== record.id}
              onClick={() => handleApprove(record)}
            >
              Duyệt
            </Button>
            <Button
              size="small"
              danger
              disabled={moderatingId !== null}
              onClick={() => openRejectModal(record)}
            >
              Từ chối
            </Button>
            <Link to={`/admin/locations/${record.id}`}>Chi tiết</Link>
          </Space>
        ) : (
          <Link to={`/admin/locations/${record.id}`}>Xem chi tiết</Link>
        )
      ),
    },
  ]

  function handlePageChange(nextPage) {
    setLoading(true)
    setPage(nextPage)
  }

  function handleStatusChange(nextStatus) {
    setLoading(true)
    setPage(1)
    setStatus(nextStatus)
  }

  return (
    <main className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>{title}</Typography.Title>
        <Space wrap>
          {fixedStatus ? null : (
            <Select
              value={status}
              onChange={handleStatusChange}
              style={{ minWidth: 180 }}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...Object.entries(LOCATION_STATUS).map(([value, item]) => ({
                  value,
                  label: item.label,
                })),
              ]}
            />
          )}
          <Link to="/admin/locations/new">
            <Button type="primary">Thêm địa điểm</Button>
          </Link>
        </Space>
      </div>

      {errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={locations}
        columns={columns}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showTotal: (value) => `${value} địa điểm`,
          onChange: handlePageChange,
        }}
      />

      <Modal
        title={rejectTarget ? `Từ chối địa điểm "${rejectTarget.name}"` : 'Từ chối địa điểm'}
        open={Boolean(rejectTarget)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: moderatingId === rejectTarget?.id }}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      >
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
    </main>
  )
}