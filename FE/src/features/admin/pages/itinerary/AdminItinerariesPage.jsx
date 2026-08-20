import { Alert, Button, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { deleteAdminItineraryApi, getAdminItinerariesApi, moderateItineraryApi } from '../../api/adminItinerariesApi'
import styles from '../AdminPage.module.css'

const PAGE_SIZE = 12
const STATUS_TAG = { active: { label: 'Hiển thị', color: 'green' }, hidden: { label: 'Đã ẩn', color: 'orange' } }

export function AdminItinerariesPage() {
  const [itineraries, setItineraries] = useState([])
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
    getAdminItinerariesApi({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then(({ data, meta }) => {
        if (!active) return
        setItineraries(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => { if (active) setErrorMessage(error.response?.data?.message ?? 'Không thể tải danh sách lịch trình.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, status, reloadKey])

  const reload = () => { setLoading(true); setReloadKey((v) => v + 1) }

  const handleUnhide = async (record) => {
    try {
      await moderateItineraryApi(record.id, { status: 'active' })
      message.success('Đã hiện lại lịch trình.')
      reload()
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể cập nhật.')
    }
  }

  const confirmHide = async () => {
    if (!hideReason.trim()) { message.warning('Vui lòng nhập lý do ẩn.'); return }
    try {
      await moderateItineraryApi(hideTarget.id, { status: 'hidden', reason: hideReason.trim() })
      message.success('Đã ẩn lịch trình.')
      setHideTarget(null)
      setHideReason('')
      reload()
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể cập nhật.')
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteAdminItineraryApi(record.id)
      message.success('Đã xoá lịch trình.')
      reload()
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể xoá.')
    }
  }

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', render: (title, record) => <Link to={`/itineraries/${record.id}`} target="_blank">{title}</Link> },
    { title: 'Chủ sở hữu', key: 'owner', render: (_, record) => record.owner?.displayName ?? 'Không xác định' },
    { title: 'Hiển thị', dataIndex: 'visibility', key: 'visibility', render: (v) => (v === 'public' ? 'Công khai' : 'Riêng tư') },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v) => <Tag color={STATUS_TAG[v]?.color}>{STATUS_TAG[v]?.label ?? v}</Tag> },
    { title: 'Số ngày / điểm dừng', key: 'stats', render: (_, r) => `${r.dayCount} ngày · ${r.stopCount} điểm` },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'hidden' ? (
            <Button size="small" onClick={() => handleUnhide(record)}>Hiện lại</Button>
          ) : (
            <Button size="small" onClick={() => setHideTarget(record)}>Ẩn</Button>
          )}
          <Popconfirm title="Xoá lịch trình này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => handleDelete(record)}>
            <Button size="small" danger>Xoá</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Nội dung cộng đồng</span>
          <Typography.Title level={2}>Quản lý lịch trình</Typography.Title>
          <p>Theo dõi trạng thái hiển thị và xử lý các lịch trình do cộng đồng chia sẻ.</p>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Bộ lọc lịch trình">
        <Typography.Text type="secondary">{total} lịch trình</Typography.Text>
        <Select
          value={status}
          onChange={(v) => { setLoading(true); setPage(1); setStatus(v) }}
          className={styles.select}
          options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Hiển thị' }, { value: 'hidden', label: 'Đã ẩn' }]}
        />
      </section>

      {errorMessage ? <Alert className={styles.alert} type="error" showIcon message={errorMessage} action={<Button size="small" onClick={reload}>Thử lại</Button>} /> : null}

      <section className={styles.contentCard}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={itineraries}
          columns={columns}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có lịch trình phù hợp với bộ lọc.' }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total, showTotal: (v) => `${v} lịch trình`, showSizeChanger: false, onChange: (p) => { setLoading(true); setPage(p) } }}
        />
      </section>

      <Modal title="Ẩn lịch trình" open={!!hideTarget} onOk={confirmHide} onCancel={() => { setHideTarget(null); setHideReason('') }} okText="Ẩn" cancelText="Huỷ">
        <Input.TextArea rows={3} placeholder="Lý do ẩn (bắt buộc)" value={hideReason} onChange={(e) => setHideReason(e.target.value)} />
      </Modal>
    </main>
  )
}
