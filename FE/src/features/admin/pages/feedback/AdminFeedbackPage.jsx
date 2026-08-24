import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, App, Button, Descriptions, Drawer, Form, Image, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { getAdminFeedbackApi, getAdminFeedbackDetailApi, updateAdminFeedbackApi } from '../../api/adminFeedbackApi'
import styles from './AdminFeedbackPage.module.css'

const TYPE_LABELS = {
  bug: 'Lỗi website', suggestion: 'Góp ý', feature_request: 'Tính năng', usability: 'Giao diện / UX', data_feedback: 'Dữ liệu', other: 'Khác',
}
const STATUS = {
  new: { label: 'Mới', color: 'blue' }, reviewing: { label: 'Đang xem', color: 'gold' }, resolved: { label: 'Đã xử lý', color: 'green' }, closed: { label: 'Đã đóng', color: 'default' },
}
const NEXT_STATUSES = {
  new: ['new', 'reviewing', 'closed'], reviewing: ['reviewing', 'resolved', 'closed'], resolved: ['resolved'], closed: ['closed'],
}
const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'

export function AdminFeedbackPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({ q: '', type: undefined, status: undefined })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const response = await getAdminFeedbackApi({ ...filters, q: filters.q || undefined, page, pageSize: meta.pageSize })
      setRows(response.data)
      setMeta(response.meta)
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Không thể tải danh sách góp ý.')
    } finally {
      setLoading(false)
    }
  }, [filters, meta.pageSize])

  useEffect(() => {
    const timeout = setTimeout(() => load(1), 250)
    return () => clearTimeout(timeout)
  }, [filters, load])

  async function openDetail(id) {
    try {
      setDetailLoading(true)
      const data = await getAdminFeedbackDetailApi(id)
      setDetail(data)
      form.setFieldsValue({ status: data.status, adminNote: data.adminNote ?? '' })
    } catch (requestError) {
      message.error(requestError.response?.data?.message ?? 'Không thể tải chi tiết góp ý.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function save(values) {
    try {
      setSaving(true)
      const updated = await updateAdminFeedbackApi(detail.id, values)
      setDetail(updated)
      form.setFieldsValue({ status: updated.status, adminNote: updated.adminNote ?? '' })
      message.success('Đã cập nhật góp ý.')
      await load()
    } catch (requestError) {
      message.error(requestError.response?.data?.message ?? 'Không thể cập nhật góp ý.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Loại', dataIndex: 'type', width: 140, render: (value) => TYPE_LABELS[value] ?? value },
    { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
    { title: 'Người gửi', dataIndex: 'sender', width: 160, render: (sender) => sender.type === 'guest' ? 'Guest' : sender.displayName },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (value) => <Tag color={STATUS[value]?.color}>{STATUS[value]?.label}</Tag> },
    { title: 'Ảnh', dataIndex: 'imageCount', width: 70 },
    { title: 'Ngày gửi', dataIndex: 'createdAt', width: 170, render: formatDate },
  ]

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>HueTrip Admin</span><Typography.Title level={2}>Góp ý người dùng</Typography.Title><Typography.Text type="secondary">Theo dõi lỗi, đề xuất và phản hồi về sản phẩm HueTrip.</Typography.Text></div><Button icon={<ReloadOutlined />} loading={loading} onClick={() => load(meta.page)}>Tải lại</Button></header>
      <section className={styles.toolbar}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm tiêu đề hoặc nội dung" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
        <Select allowClear placeholder="Loại góp ý" value={filters.type} onChange={(type) => setFilters((current) => ({ ...current, type }))} options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <Select allowClear placeholder="Trạng thái" value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} options={Object.entries(STATUS).map(([value, item]) => ({ value, label: item.label }))} />
      </section>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <section className={styles.card}><Table rowKey="id" loading={loading} dataSource={rows} columns={columns} onRow={(record) => ({ onClick: () => openDetail(record.id) })} rowClassName={styles.clickableRow} pagination={{ current: meta.page, pageSize: meta.pageSize, total: meta.total, showSizeChanger: false, onChange: load }} scroll={{ x: 850 }} /></section>
      <Drawer title="Chi tiết góp ý" open={Boolean(detail) || detailLoading} loading={detailLoading} width={620} onClose={() => setDetail(null)}>
        {detail ? <>
          <Descriptions column={1} size="small" items={[
            { key: 'type', label: 'Loại', children: TYPE_LABELS[detail.type] },
            { key: 'sender', label: 'Người gửi', children: detail.sender.type === 'guest' ? 'Guest' : `${detail.sender.displayName} · ${detail.sender.email ?? ''}` },
            { key: 'contact', label: 'Email liên hệ', children: detail.contactEmail ?? '—' },
            { key: 'created', label: 'Ngày gửi', children: formatDate(detail.createdAt) },
          ]} />
          <Typography.Title level={4}>{detail.title}</Typography.Title>
          <Typography.Paragraph className={styles.description}>{detail.description}</Typography.Paragraph>
          {detail.images.length ? <Image.PreviewGroup><Space wrap>{detail.images.map((image) => <Image key={image.url} width={120} height={90} className={styles.image} src={image.url} />)}</Space></Image.PreviewGroup> : null}
          <Form className={styles.form} form={form} layout="vertical" onFinish={save}>
            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}><Select options={NEXT_STATUSES[detail.status].map((value) => ({ value, label: STATUS[value].label }))} /></Form.Item>
            <Form.Item name="adminNote" label="Ghi chú Admin" rules={[{ max: 2000 }]}><Input.TextArea rows={5} showCount maxLength={2000} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Lưu thay đổi</Button>
          </Form>
        </> : null}
      </Drawer>
    </main>
  )
}
