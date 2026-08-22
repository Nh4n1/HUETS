import { Alert, Button, Input, Modal, Rate, Select, Space, Table, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getAdminReviewsApi, setAdminReviewStatusApi } from '../../api/adminReviewsApi'
import styles from '../AdminPage.module.css'

const PAGE_SIZE = 20
const STATUS = {
  active: { label: 'Đang hiển thị', color: 'green' },
  hidden: { label: 'Đã ẩn', color: 'orange' },
  deleted: { label: 'User đã xóa', color: 'default' },
}

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [hideTarget, setHideTarget] = useState(null)
  const [hideReason, setHideReason] = useState('')

  useEffect(() => {
    let active = true
    getAdminReviewsApi({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then(({ data, meta }) => {
        if (!active) return
        setReviews(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => {
        if (active) setErrorMessage(error.response?.data?.message ?? 'Không thể tải danh sách đánh giá.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, status, reloadKey])

  const reload = () => {
    setLoading(true)
    setReloadKey((value) => value + 1)
  }

  const restoreReview = async (review) => {
    try {
      await setAdminReviewStatusApi(review.id, { status: 'active' })
      message.success('Đã khôi phục đánh giá.')
      reload()
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể khôi phục đánh giá.')
    }
  }

  const hideReview = async () => {
    if (!hideReason.trim()) {
      message.warning('Vui lòng nhập lý do ẩn.')
      return
    }
    try {
      await setAdminReviewStatusApi(hideTarget.id, { status: 'hidden', reason: hideReason.trim() })
      message.success('Đã ẩn đánh giá.')
      setHideTarget(null)
      setHideReason('')
      reload()
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể ẩn đánh giá.')
    }
  }

  const columns = [
    {
      title: 'Địa điểm',
      key: 'location',
      render: (_, record) => (
        <Link to={`/locations/${record.location.id}`} target="_blank">{record.location.name}</Link>
      ),
    },
    {
      title: 'Người đánh giá',
      key: 'author',
      render: (_, record) => (
        <div><strong>{record.author.displayName}</strong><br /><small>{record.author.email}</small></div>
      ),
    },
    { title: 'Điểm', dataIndex: 'rating', key: 'rating', render: (value) => <Rate disabled value={value} /> },
    {
      title: 'Nội dung',
      dataIndex: 'comment',
      key: 'comment',
      render: (value, record) => (
        <span>{value || 'Không có nhận xét'}{record.isEdited ? ' · Đã chỉnh sửa' : ''}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <Tag color={STATUS[value]?.color}>{STATUS[value]?.label ?? value}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'active'
            ? <Button size="small" danger onClick={() => setHideTarget(record)}>Ẩn</Button>
            : null}
          {record.status === 'hidden'
            ? <Button size="small" onClick={() => restoreReview(record)}>Khôi phục</Button>
            : null}
        </Space>
      ),
    },
  ]

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Nội dung cộng đồng</span>
          <Typography.Title level={2}>Quản lý đánh giá</Typography.Title>
          <p>Ẩn các đánh giá vi phạm và khôi phục khi nội dung đã được xác minh.</p>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Bộ lọc đánh giá">
        <Typography.Text type="secondary">{total} đánh giá</Typography.Text>
        <Select
          value={status}
          className={styles.select}
          onChange={(value) => { setLoading(true); setPage(1); setStatus(value) }}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Đang hiển thị' },
            { value: 'hidden', label: 'Đã ẩn' },
            { value: 'deleted', label: 'User đã xóa' },
          ]}
        />
      </section>

      {errorMessage
        ? <Alert type="error" showIcon message={errorMessage} action={<Button onClick={reload}>Thử lại</Button>} />
        : null}

      <section className={styles.contentCard}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={reviews}
          columns={columns}
          scroll={{ x: 950 }}
          locale={{ emptyText: 'Không có đánh giá phù hợp.' }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: (value) => { setLoading(true); setPage(value) },
          }}
        />
      </section>

      <Modal
        title="Ẩn đánh giá"
        open={Boolean(hideTarget)}
        okText="Ẩn đánh giá"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        onOk={hideReview}
        onCancel={() => { setHideTarget(null); setHideReason('') }}
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          placeholder="Lý do ẩn (bắt buộc)"
          value={hideReason}
          onChange={(event) => setHideReason(event.target.value)}
        />
      </Modal>
    </main>
  )
}
