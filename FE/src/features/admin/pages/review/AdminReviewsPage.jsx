import { EyeInvisibleOutlined, ReloadOutlined, SearchOutlined, StarFilled } from '@ant-design/icons'
import { Alert, App, Avatar, Button, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getAdminReviewsApi, setAdminReviewStatusApi } from '../../api/adminReviewsApi'
import styles from './AdminReviewsPage.module.css'

const PAGE_SIZE = 20
const STATUS = {
  active: { label: 'Đang hiển thị', color: 'green' },
  hidden: { label: 'Đã ẩn', color: 'orange' },
  deleted: { label: 'Người dùng đã xóa', color: 'default' },
}

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—'
const errorText = (error, fallback) => error.response?.data?.message ?? fallback

export function AdminReviewsPage() {
  const { message, modal } = App.useApp()
  const [reviews, setReviews] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [rating, setRating] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [hideTarget, setHideTarget] = useState(null)
  const [hideReason, setHideReason] = useState('')

  useEffect(() => {
    let active = true
    getAdminReviewsApi({ page, pageSize: PAGE_SIZE, q: search || undefined, rating: rating || undefined, status: status || undefined })
      .then(({ data, meta }) => {
        if (!active) return
        setReviews(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => {
        if (active) setErrorMessage(errorText(error, 'Không thể tải danh sách đánh giá.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, rating, reloadKey, search, status])

  function updateFilter(setter, currentValue, value) {
    if (currentValue === value && page === 1) return
    setLoading(true)
    setPage(1)
    setter(value)
  }

  function applySearch() {
    const value = searchInput.trim()
    if (value === search && page === 1) return
    setLoading(true)
    setPage(1)
    setSearch(value)
  }

  function handleSearchInputChange(event) {
    const value = event.target.value
    setSearchInput(value)
    if (value === '' && search !== '') {
      setLoading(true)
      setPage(1)
      setSearch('')
    }
  }

  function resetFilters() {
    setLoading(true)
    setPage(1)
    setSearchInput('')
    setSearch('')
    setRating('')
    setStatus('')
  }

  function reload() {
    setLoading(true)
    setReloadKey((value) => value + 1)
  }

  function restoreReview(review) {
    modal.confirm({
      title: 'Khôi phục đánh giá?',
      content: `Đánh giá của ${review.author.displayName} tại “${review.location.name}” sẽ được hiển thị công khai và tính lại vào điểm trung bình.`,
      okText: 'Khôi phục',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await setAdminReviewStatusApi(review.id, { status: 'active' })
          message.success('Đã khôi phục đánh giá.')
          reload()
        } catch (error) {
          message.error(errorText(error, 'Không thể khôi phục đánh giá.'))
        }
      },
    })
  }

  async function hideReview() {
    if (!hideReason.trim()) {
      message.warning('Vui lòng nhập lý do ẩn.')
      return
    }
    try {
      setSubmitting(true)
      await setAdminReviewStatusApi(hideTarget.id, { status: 'hidden', reason: hideReason.trim() })
      message.success('Đã ẩn đánh giá.')
      setHideTarget(null)
      setHideReason('')
      reload()
    } catch (error) {
      message.error(errorText(error, 'Không thể ẩn đánh giá.'))
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Địa điểm', key: 'location', width: 210,
      render: (_, record) => (
        <div className={styles.locationCell}>
          <Link to={`/locations/${record.location.id}`} target="_blank" rel="noreferrer">{record.location.name}</Link>
          <span>Xem bài viết công khai</span>
        </div>
      ),
    },
    {
      title: 'Người đánh giá', key: 'author', width: 210,
      render: (_, record) => (
        <div className={styles.authorCell}>
          <Avatar size={34} src={record.author.avatarUrl || undefined}>{record.author.displayName?.charAt(0)?.toUpperCase()}</Avatar>
          <div><strong>{record.author.displayName}</strong><span>{record.author.email}</span></div>
        </div>
      ),
    },
    {
      title: 'Điểm', dataIndex: 'rating', key: 'rating', width: 82, align: 'center',
      render: (value) => <span className={styles.rating}><StarFilled /> {value}</span>,
    },
    {
      title: 'Nội dung đánh giá', dataIndex: 'comment', key: 'comment', width: 300,
      render: (value, record) => (
        <div className={styles.commentCell}>
          <span className={!value ? styles.emptyComment : undefined}>{value || 'Không có nhận xét'}</span>
          <small>{formatDateTime(record.updatedAt)}{record.isEdited ? ' · Đã chỉnh sửa' : ''}</small>
        </div>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 145,
      render: (value, record) => (
        <div className={styles.statusCell}>
          <Tag color={STATUS[value]?.color}>{STATUS[value]?.label ?? value}</Tag>
          {value === 'hidden' && record.hiddenReason
            ? <Tooltip title={record.hiddenReason}><span>Lý do: {record.hiddenReason}</span></Tooltip>
            : null}
        </div>
      ),
    },
    {
      title: 'Thao tác', key: 'actions', width: 112, fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'active'
            ? <Button size="small" danger icon={<EyeInvisibleOutlined />} onClick={() => setHideTarget(record)}>Ẩn</Button>
            : null}
          {record.status === 'hidden'
            ? <Button size="small" onClick={() => restoreReview(record)}>Khôi phục</Button>
            : null}
          {record.status === 'deleted' ? <Typography.Text type="secondary">—</Typography.Text> : null}
        </Space>
      ),
    },
  ]

  const hasFilters = Boolean(search || rating || status)

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Nội dung cộng đồng</span>
          <Typography.Title level={2}>Quản lý đánh giá</Typography.Title>
          <p>Mỗi đánh giá được đặt trong ngữ cảnh bài viết tương ứng để kiểm duyệt chính xác và minh bạch.</p>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Bộ lọc đánh giá">
        <div className={styles.filters}>
          <div className={styles.search}>
            <Input
              className={styles.searchInput}
              placeholder="Tìm địa điểm, người dùng hoặc nội dung"
              value={searchInput}
              onChange={handleSearchInputChange}
              onPressEnter={applySearch}
            />
            <Button
              className={styles.searchButton}
              icon={<SearchOutlined />}
              aria-label="Tìm kiếm đánh giá"
              onClick={applySearch}
            />
          </div>
          <Select value={rating} className={styles.select} onChange={(value) => updateFilter(setRating, rating, value)} options={[{ value: '', label: 'Tất cả số sao' }, ...[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} sao` }))]} />
          <Select value={status} className={styles.select} onChange={(value) => updateFilter(setStatus, status, value)} options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Đang hiển thị' },
            { value: 'hidden', label: 'Đã ẩn' },
            { value: 'deleted', label: 'Người dùng đã xóa' },
          ]} />
        </div>
        {hasFilters
          ? <Button type="text" onClick={resetFilters}>Xóa bộ lọc</Button>
          : <Button type="text" icon={<ReloadOutlined />} onClick={reload}>Làm mới</Button>}
      </section>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} action={<Button onClick={reload}>Thử lại</Button>} /> : null}

      <section className={styles.contentCard}>
        <div className={styles.tableHeading}>
          <div><strong>Danh sách đánh giá</strong><span>{total} kết quả{hasFilters ? ' phù hợp bộ lọc' : ''}</span></div>
        </div>
        <Table className={styles.table} rowKey="id" loading={loading} dataSource={reviews} columns={columns} scroll={{ x: 1060 }} locale={{ emptyText: hasFilters ? 'Không có đánh giá phù hợp bộ lọc.' : 'Chưa có đánh giá.' }} pagination={{ current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false, showTotal: (value) => `${value} đánh giá`, onChange: (value) => { setLoading(true); setPage(value) } }} />
      </section>

      <Modal title="Ẩn đánh giá" open={Boolean(hideTarget)} okText="Ẩn đánh giá" cancelText="Hủy" confirmLoading={submitting} okButtonProps={{ danger: true }} onOk={hideReview} onCancel={() => { if (!submitting) { setHideTarget(null); setHideReason('') } }}>
        {hideTarget ? (
          <div className={styles.moderationContext}>
            <strong>{hideTarget.location.name}</strong>
            <span>{hideTarget.author.displayName} · {hideTarget.rating} sao</span>
            <p>{hideTarget.comment || 'Không có nhận xét'}</p>
          </div>
        ) : null}
        <Typography.Paragraph type="secondary">Đánh giá bị ẩn sẽ không còn hiển thị công khai và không được tính vào điểm trung bình.</Typography.Paragraph>
        <Input.TextArea rows={3} maxLength={500} showCount autoFocus placeholder="Lý do ẩn (bắt buộc)" value={hideReason} onChange={(event) => setHideReason(event.target.value)} />
      </Modal>
    </main>
  )
}
