import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import {
  getAdminUsersApi,
  lockUserApi,
  unlockUserApi,
} from '../../api/adminUsersApi'
import {
  formatDateTime,
  USER_ROLE,
  USER_STATUS,
} from '../../components/user/userPresentation'

const PAGE_SIZE = 12

export function AdminUsersPage() {
  const { message, modal } = App.useApp()
  const [lockForm] = Form.useForm()

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [lockTarget, setLockTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    getAdminUsersApi({
      page,
      pageSize: PAGE_SIZE,
      q: search || undefined,
      role: role || undefined,
      status: status || undefined,
    })
      .then(({ data, meta }) => {
        if (!active) return
        setUsers(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setErrorMessage(
          error.response?.data?.message ?? 'Không thể tải danh sách người dùng.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, role, search, status])

  async function refreshUsers() {
    try {
      setLoading(true)
      const { data, meta } = await getAdminUsersApi({
        page,
        pageSize: PAGE_SIZE,
        q: search || undefined,
        role: role || undefined,
        status: status || undefined,
      })
      setUsers(data)
      setTotal(meta.total)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Không thể tải lại danh sách người dùng.',
      )
    } finally {
      setLoading(false)
    }
  }

  function handlePageChange(nextPage) {
    setLoading(true)
    setPage(nextPage)
  }

  function handleSearchChange(value) {
    setLoading(true)
    setPage(1)
    setSearch(value)
  }

  function handleRoleChange(value) {
    setLoading(true)
    setPage(1)
    setRole(value)
  }

  function handleStatusChange(value) {
    setLoading(true)
    setPage(1)
    setStatus(value)
  }

  function openLockModal(user) {
    setLockTarget(user)
    lockForm.resetFields()
  }

  async function handleLockConfirm() {
    const values = await lockForm.validateFields()
    try {
      setSubmitting(true)
      await lockUserApi(lockTarget.id, { reason: values.reason })
      message.success(`Đã khóa tài khoản ${lockTarget.displayName}.`)
      setLockTarget(null)
      await refreshUsers()
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể khóa tài khoản.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleUnlock(user) {
    modal.confirm({
      title: `Mở khóa tài khoản ${user.displayName}?`,
      content: 'Người dùng sẽ có thể đăng nhập và sử dụng lại hệ thống.',
      okText: 'Mở khóa',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await unlockUserApi(user.id)
          message.success(`Đã mở khóa tài khoản ${user.displayName}.`)
          await refreshUsers()
        } catch (error) {
          message.error(error.response?.data?.message ?? 'Không thể mở khóa tài khoản.')
        }
      },
    })
  }

  const columns = [
    {
      title: 'Người dùng',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (value) => {
        const presentation = USER_ROLE[value] ?? { label: value, color: 'default' }
        return <Tag color={presentation.color}>{presentation.label}</Tag>
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value, record) => {
        const presentation = USER_STATUS[value] ?? { label: value, color: 'default' }
        return (
          <Space direction="vertical" size={0}>
            <Tag color={presentation.color}>{presentation.label}</Tag>
            {value === 'locked' && record.lockReason ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.lockReason}
              </Typography.Text>
            ) : null}
          </Space>
        )
      },
    },
    {
      title: 'Tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDateTime,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        record.status === 'locked' ? (
          <Button size="small" onClick={() => handleUnlock(record)}>
            Mở khóa
          </Button>
        ) : (
          <Button
            danger
            size="small"
            disabled={record.role === 'admin'}
            onClick={() => openLockModal(record)}
          >
            Khóa
          </Button>
        )
      ),
    },
  ]

  return (
    <main className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>
          Quản lý người dùng
        </Typography.Title>

        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Tìm theo tên hoặc email..."
            style={{ minWidth: 240 }}
            onSearch={handleSearchChange}
          />

          <Select
            value={role}
            onChange={handleRoleChange}
            style={{ minWidth: 160 }}
            options={[
              { value: '', label: 'Tất cả vai trò' },
              ...Object.entries(USER_ROLE).map(([value, item]) => ({
                value,
                label: item.label,
              })),
            ]}
          />

          <Select
            value={status}
            onChange={handleStatusChange}
            style={{ minWidth: 180 }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              ...Object.entries(USER_STATUS).map(([value, item]) => ({
                value,
                label: item.label,
              })),
            ]}
          />
        </Space>
      </div>

      {errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={users}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showTotal: (value) => `${value} người dùng`,
          onChange: handlePageChange,
        }}
      />

      <Modal
        title={lockTarget ? `Khóa tài khoản ${lockTarget.displayName}` : 'Khóa tài khoản'}
        open={Boolean(lockTarget)}
        okText="Xác nhận khóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: submitting }}
        onOk={handleLockConfirm}
        onCancel={() => setLockTarget(null)}
      >
        <Form form={lockForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do khóa (không bắt buộc)"
            rules={[
              { max: 500, message: 'Lý do không được vượt quá 500 ký tự.' },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả lý do khóa tài khoản này" />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  )
}