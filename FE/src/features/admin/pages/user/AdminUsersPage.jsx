import {
  LockOutlined,
  LoginOutlined,
  MoreOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Avatar,
  Button,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import {
  changeUserRoleApi,
  createManagedUserApi,
  getAdminUsersApi,
  getAdminUserStatsApi,
  lockUserApi,
  revokeUserSessionsApi,
  unlockUserApi,
} from '../../api/adminUsersApi'
import {
  formatDateTime,
  USER_ROLE,
  USER_STATUS,
} from '../../components/user/userPresentation'
import styles from './AdminUsersPage.module.css'

const PAGE_SIZE = 12
const EMPTY_STATS = { total: 0, active: 0, locked: 0, moderators: 0 }

const errorText = (error, fallback) => error.response?.data?.message ?? fallback

export function AdminUsersPage() {
  const { message, modal } = App.useApp()
  const [lockForm] = Form.useForm()
  const [createForm] = Form.useForm()
  const [roleForm] = Form.useForm()

  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [detailTarget, setDetailTarget] = useState(null)
  const [lockTarget, setLockTarget] = useState(null)
  const [roleTarget, setRoleTarget] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)

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
        if (active) setErrorMessage(errorText(error, 'Không thể tải danh sách người dùng.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [page, role, search, status])

  useEffect(() => {
    getAdminUserStatsApi().then(setStats).catch(() => {})
  }, [])

  async function refreshUsers({ includeStats = false } = {}) {
    try {
      setLoading(true)
      const requests = [getAdminUsersApi({
        page,
        pageSize: PAGE_SIZE,
        q: search || undefined,
        role: role || undefined,
        status: status || undefined,
      })]
      if (includeStats) requests.push(getAdminUserStatsApi())
      const [listResult, statsResult] = await Promise.all(requests)
      setUsers(listResult.data)
      setTotal(listResult.meta.total)
      if (statsResult) setStats(statsResult)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(errorText(error, 'Không thể tải lại danh sách người dùng.'))
    } finally {
      setLoading(false)
    }
  }

  function updateFilter(setter, value) {
    setLoading(true)
    setPage(1)
    setter(value)
  }

  function resetFilters() {
    setLoading(true)
    setPage(1)
    setSearchInput('')
    setSearch('')
    setRole('')
    setStatus('')
  }

  function openRoleModal(user) {
    setRoleTarget(user)
    roleForm.setFieldsValue({ role: user.role })
  }

  async function handleCreate() {
    const values = await createForm.validateFields()
    try {
      setSubmitting(true)
      await createManagedUserApi({
        displayName: values.displayName,
        email: values.email,
        temporaryPassword: values.temporaryPassword,
        role: values.role,
      })
      message.success('Đã tạo tài khoản mới.')
      setCreateOpen(false)
      createForm.resetFields()
      setPage(1)
      await refreshUsers({ includeStats: true })
    } catch (error) {
      message.error(errorText(error, 'Không thể tạo tài khoản.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRoleChange() {
    const values = await roleForm.validateFields()
    try {
      setSubmitting(true)
      await changeUserRoleApi(roleTarget.id, values.role)
      message.success(`Đã cập nhật vai trò của ${roleTarget.displayName}.`)
      setRoleTarget(null)
      await refreshUsers({ includeStats: true })
    } catch (error) {
      message.error(errorText(error, 'Không thể cập nhật vai trò.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLock() {
    const values = await lockForm.validateFields()
    try {
      setSubmitting(true)
      await lockUserApi(lockTarget.id, { reason: values.reason })
      message.success(`Đã khóa tài khoản ${lockTarget.displayName}.`)
      setLockTarget(null)
      await refreshUsers({ includeStats: true })
    } catch (error) {
      message.error(errorText(error, 'Không thể khóa tài khoản.'))
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
          await refreshUsers({ includeStats: true })
        } catch (error) {
          message.error(errorText(error, 'Không thể mở khóa tài khoản.'))
        }
      },
    })
  }

  function handleRevokeSessions(user) {
    modal.confirm({
      title: `Đăng xuất ${user.displayName} khỏi mọi thiết bị?`,
      content: 'Các phiên đăng nhập hiện tại sẽ bị thu hồi. Người dùng cần đăng nhập lại.',
      okText: 'Thu hồi phiên',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const result = await revokeUserSessionsApi(user.id)
          message.success(`Đã thu hồi ${result.revokedSessions} phiên đăng nhập.`)
        } catch (error) {
          message.error(errorText(error, 'Không thể thu hồi phiên đăng nhập.'))
        }
      },
    })
  }

  function actionItems(user) {
    const items = [{ key: 'view', label: 'Xem chi tiết' }]
    if (user.role === 'admin') return items
    items.push(
      { key: 'role', label: user.role === 'mod' ? 'Chuyển thành người dùng' : 'Cấp quyền kiểm duyệt' },
      { key: 'sessions', label: 'Thu hồi phiên đăng nhập' },
      { type: 'divider' },
      { key: user.status === 'locked' ? 'unlock' : 'lock', danger: user.status !== 'locked', label: user.status === 'locked' ? 'Mở khóa' : 'Khóa tài khoản' },
    )
    return items
  }

  function handleAction(key, user) {
    if (key === 'view') setDetailTarget(user)
    if (key === 'role') openRoleModal(user)
    if (key === 'sessions') handleRevokeSessions(user)
    if (key === 'unlock') handleUnlock(user)
    if (key === 'lock') {
      lockForm.resetFields()
      setLockTarget(user)
    }
  }

  const columns = [
    {
      title: 'Người dùng',
      key: 'identity',
      render: (_, user) => (
        <div className={styles.identityCell}>
          <Avatar className={styles.avatar} src={user.avatarUrl}>{user.displayName?.[0]}</Avatar>
          <div>
            <button className={styles.userName} type="button" onClick={() => setDetailTarget(user)}>{user.displayName}</button>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Vai trò', dataIndex: 'role', key: 'role',
      responsive: ['sm'],
      render: (value) => {
        const item = USER_ROLE[value] ?? { label: value, color: 'default' }
        return <Tag className={styles.roleTag} color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (value, user) => {
        const item = USER_STATUS[value] ?? { label: value, color: 'default' }
        return (
          <Space direction="vertical" size={0}>
            <Tag className={styles.statusTag} color={item.color}>{item.label}</Tag>
            {user.lockReason ? <Typography.Text className={styles.lockReason} type="secondary" ellipsis>{user.lockReason}</Typography.Text> : null}
          </Space>
        )
      },
    },
    { title: 'Tham gia', dataIndex: 'createdAt', key: 'createdAt', responsive: ['lg'], render: formatDateTime },
    {
      title: '', key: 'actions', width: 56, align: 'right',
      render: (_, user) => (
        <Tooltip title="Mở menu thao tác" placement="left">
          <Dropdown menu={{ items: actionItems(user), onClick: ({ key }) => handleAction(key, user) }} trigger={['click']}>
            <Button className={styles.actionButton} type="text" icon={<MoreOutlined />} aria-label={`Mở menu thao tác với ${user.displayName}`} />
          </Dropdown>
        </Tooltip>
      ),
    },
  ]

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Tài khoản hệ thống</span>
          <Typography.Title level={2}>Quản lý người dùng</Typography.Title>
          <p>Tạo tài khoản, kiểm soát truy cập và phân công kiểm duyệt viên.</p>
        </div>
        <Button className={styles.createButton} size="large" type="primary" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>Tạo tài khoản</Button>
      </header>

      <section className={styles.statsGrid} aria-label="Thống kê tài khoản">
        <article className={styles.statCard}><span className={styles.statIcon}><TeamOutlined /></span><div><span className={styles.statLabel}>Tổng tài khoản</span><strong>{stats.total}</strong></div></article>
        <article className={styles.statCard}><span className={styles.statIcon}><LoginOutlined /></span><div><span className={styles.statLabel}>Đang hoạt động</span><strong>{stats.active}</strong></div></article>
        <article className={styles.statCard}><span className={styles.statIcon}><SafetyCertificateOutlined /></span><div><span className={styles.statLabel}>Kiểm duyệt viên</span><strong>{stats.moderators}</strong></div></article>
        <article className={styles.statCard}><span className={`${styles.statIcon} ${styles.dangerIcon}`}><LockOutlined /></span><div><span className={styles.statLabel}>Đã khóa</span><strong>{stats.locked}</strong></div></article>
      </section>

      <section className={styles.toolbar} aria-label="Tìm kiếm và lọc người dùng">
        <div className={styles.filters}>
          <Input.Search allowClear enterButton="Tìm" prefix={<SearchOutlined />} placeholder="Tìm theo tên hoặc email..." className={styles.search} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onSearch={(value) => updateFilter(setSearch, value.trim())} />
          <Select value={role} onChange={(value) => updateFilter(setRole, value)} className={styles.select} options={[{ value: '', label: 'Tất cả vai trò' }, ...Object.entries(USER_ROLE).map(([value, item]) => ({ value, label: item.label }))]} />
          <Select value={status} onChange={(value) => updateFilter(setStatus, value)} className={styles.select} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(USER_STATUS).map(([value, item]) => ({ value, label: item.label }))]} />
        </div>
        <Button disabled={!search && !role && !status} onClick={resetFilters}>Xóa bộ lọc</Button>
      </section>

      {errorMessage ? <Alert className={styles.alert} type="error" showIcon message={errorMessage} action={<Button size="small" onClick={() => refreshUsers()}>Thử lại</Button>} /> : null}

      <section className={styles.contentCard}>
        <div className={styles.tableHeading}>
          <div><strong>Danh sách tài khoản</strong><span>{total} người dùng phù hợp</span></div>
          <Button type="text" icon={<ReloadOutlined />} loading={loading} onClick={() => refreshUsers({ includeStats: true })}>Tải lại</Button>
        </div>
        <Table className={styles.table} size="small" rowKey="id" loading={loading} dataSource={users} columns={columns} tableLayout="fixed" locale={{ emptyText: 'Không có người dùng phù hợp với bộ lọc.' }} pagination={{ current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false, showTotal: (value) => `${value} người dùng`, onChange: (nextPage) => { setLoading(true); setPage(nextPage) } }} />
      </section>

      <Drawer title="Chi tiết tài khoản" open={Boolean(detailTarget)} width="min(440px, 100vw)" onClose={() => setDetailTarget(null)}>
        {detailTarget ? (
          <div className={styles.drawerContent}>
            <div className={styles.drawerIdentity}>
              <Avatar className={styles.drawerAvatar} size={64} src={detailTarget.avatarUrl}>{detailTarget.displayName?.[0]}</Avatar>
              <div><strong>{detailTarget.displayName}</strong><span className={styles.drawerEmail}>{detailTarget.email}</span><Space size={4}><Tag className={styles.roleTag} color={USER_ROLE[detailTarget.role]?.color}>{USER_ROLE[detailTarget.role]?.label}</Tag><Tag className={styles.statusTag} color={USER_STATUS[detailTarget.status]?.color}>{USER_STATUS[detailTarget.status]?.label}</Tag></Space></div>
            </div>
          <Descriptions className={styles.descriptions} column={1} bordered size="small">
            <Descriptions.Item label="Họ tên">{detailTarget.displayName}</Descriptions.Item>
            <Descriptions.Item label="Email">{detailTarget.email}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">{USER_ROLE[detailTarget.role]?.label}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{USER_STATUS[detailTarget.status]?.label}</Descriptions.Item>
            <Descriptions.Item label="Ngày tham gia">{formatDateTime(detailTarget.createdAt)}</Descriptions.Item>
            {detailTarget.lockReason ? <Descriptions.Item label="Lý do khóa">{detailTarget.lockReason}</Descriptions.Item> : null}
          </Descriptions>
          </div>
        ) : null}
      </Drawer>

      <Modal title="Tạo tài khoản" open={createOpen} okText="Tạo tài khoản" cancelText="Hủy" confirmLoading={submitting} onOk={handleCreate} onCancel={() => { setCreateOpen(false); createForm.resetFields() }}>
        <Form form={createForm} layout="vertical" initialValues={{ role: 'user' }}>
          <Form.Item name="displayName" label="Tên hiển thị" rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị.' }, { min: 2, max: 80, message: 'Tên phải có từ 2 đến 80 ký tự.' }]}><Input autoComplete="off" /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email.' }, { type: 'email', message: 'Email không hợp lệ.' }]}><Input autoComplete="off" /></Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}><Select options={[{ value: 'user', label: 'Người dùng' }, { value: 'mod', label: 'Kiểm duyệt viên' }]} /></Form.Item>
          <Form.Item name="temporaryPassword" label="Mật khẩu ban đầu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }, { min: 8, max: 72, message: 'Mật khẩu phải có từ 8 đến 72 ký tự.' }]}><Input.Password autoComplete="new-password" /></Form.Item>
          <Form.Item name="confirmPassword" label="Xác nhận mật khẩu" dependencies={['temporaryPassword']} rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu.' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('temporaryPassword') === value ? Promise.resolve() : Promise.reject(new Error('Mật khẩu xác nhận không khớp.')) } })]}><Input.Password autoComplete="new-password" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={roleTarget ? `Thay đổi vai trò của ${roleTarget.displayName}` : 'Thay đổi vai trò'} open={Boolean(roleTarget)} okText="Lưu thay đổi" cancelText="Hủy" confirmLoading={submitting} onOk={handleRoleChange} onCancel={() => setRoleTarget(null)}>
        <Alert type="warning" showIcon message="Người dùng sẽ bị đăng xuất khỏi các phiên hiện tại sau khi đổi vai trò." />
        <Form form={roleForm} layout="vertical" className={styles.modalForm}>
          <Form.Item name="role" label="Vai trò mới" rules={[{ required: true }]}><Select options={[{ value: 'user', label: 'Người dùng' }, { value: 'mod', label: 'Kiểm duyệt viên' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={lockTarget ? `Khóa tài khoản ${lockTarget.displayName}` : 'Khóa tài khoản'} open={Boolean(lockTarget)} okText="Xác nhận khóa" cancelText="Hủy" okButtonProps={{ danger: true }} confirmLoading={submitting} onOk={handleLock} onCancel={() => setLockTarget(null)}>
        <Form form={lockForm} layout="vertical">
          <Form.Item name="reason" label="Lý do khóa" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do khóa.' }, { max: 500, message: 'Lý do không được vượt quá 500 ký tự.' }]}><Input.TextArea rows={4} placeholder="Mô tả lý do khóa tài khoản" /></Form.Item>
        </Form>
      </Modal>
    </main>
  )
}
