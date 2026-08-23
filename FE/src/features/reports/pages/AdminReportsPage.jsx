import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FlagOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  getAdminReportByIdApi,
  getAdminReportsApi,
  updateAdminReportStatusApi,
} from '../api/reportApi'
import {
  getReportTargetLink,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGETS,
} from '../reportDomain'
import styles from './AdminReportsPage.module.css'

const PAGE_SIZE = 20

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—'

const getErrorMessage = (error, fallback) => error.response?.data?.message ?? fallback

function StatusTag({ status }) {
  const presentation = REPORT_STATUSES[status] ?? { label: status || 'Không xác định', color: 'default' }
  return <Tag color={presentation.color}>{presentation.label}</Tag>
}

function TargetSummary({ report, compact = false }) {
  const target = REPORT_TARGETS[report.targetType]
  const targetLink = getReportTargetLink(report)
  const label = report.targetSnapshot?.label || `${target?.label ?? 'Nội dung'} #${report.targetId?.slice(-6) ?? ''}`
  const excerpt = report.targetSnapshot?.excerpt

  return (
    <div className={styles.targetSummary}>
      <Tag>{target?.label ?? report.targetType}</Tag>
      {targetLink ? <Link to={targetLink}>{label}</Link> : <strong>{label}</strong>}
      {!compact && excerpt ? <Typography.Paragraph ellipsis={{ rows: 2 }}>{excerpt}</Typography.Paragraph> : null}
    </div>
  )
}

export function AdminReportsPage() {
  const { message } = App.useApp()
  const [reports, setReports] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('pending')
  const [targetType, setTargetType] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedReport, setSelectedReport] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [decisionStatus, setDecisionStatus] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const detailRequestRef = useRef(0)

  useEffect(() => {
    let active = true
    getAdminReportsApi({
      page,
      pageSize: PAGE_SIZE,
      status: status || undefined,
      targetType: targetType || undefined,
      reasonCode: reasonCode || undefined,
      q: search || undefined,
    })
      .then((payload) => {
        if (!active) return
        setReports(payload.data ?? [])
        setTotal(payload.meta?.total ?? 0)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setReports([])
        setTotal(0)
        setErrorMessage(getErrorMessage(error, 'Không thể tải hàng chờ báo cáo.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [page, reasonCode, reloadKey, search, status, targetType])

  const changeFilter = (setter, value) => {
    setLoading(true)
    setPage(1)
    setter(value)
  }

  const reload = () => {
    setLoading(true)
    setReloadKey((value) => value + 1)
  }

  const applySearch = () => {
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) {
      reload()
      return
    }
    setLoading(true)
    setPage(1)
    setSearch(nextSearch)
  }

  const openReport = async (report) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setSelectedReport(report)
    setDetailLoading(true)
    try {
      const detail = await getAdminReportByIdApi(report.id)
      if (detailRequestRef.current === requestId) setSelectedReport(detail)
    } catch (error) {
      if (detailRequestRef.current === requestId) {
        message.error(getErrorMessage(error, 'Không thể tải chi tiết báo cáo.'))
      }
    } finally {
      if (detailRequestRef.current === requestId) setDetailLoading(false)
    }
  }

  const openDecision = (nextStatus) => {
    setDecisionStatus(nextStatus)
    setResolutionNote('')
  }

  const submitDecision = async () => {
    const note = resolutionNote.trim()
    if (note.length < 5) {
      message.warning('Vui lòng ghi kết luận ít nhất 5 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      const updatedReport = await updateAdminReportStatusApi(selectedReport.id, {
        status: decisionStatus,
        resolutionNote: note,
        expectedUpdatedAt: selectedReport.updatedAt,
      })
      setSelectedReport((current) => ({
        ...updatedReport,
        reporter: updatedReport.reporter ?? current?.reporter ?? null,
      }))
      setDecisionStatus(null)
      setResolutionNote('')
      message.success(decisionStatus === 'resolved' ? 'Đã kết luận báo cáo.' : 'Đã bỏ qua báo cáo.')
      reload()
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể cập nhật báo cáo.'))
      if (error.response?.data?.code === 'STALE_RESOURCE') {
        setDecisionStatus(null)
        await openReport(selectedReport)
        reload()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Nội dung',
      key: 'target',
      render: (_, report) => <TargetSummary report={report} compact />,
    },
    {
      title: 'Lý do',
      dataIndex: 'reasonCode',
      key: 'reasonCode',
      width: 190,
      render: (value) => REPORT_REASONS[value] ?? value,
    },
    {
      title: 'Người báo cáo',
      key: 'reporter',
      width: 190,
      render: (_, report) => (
        <div className={styles.reporter}>
          <strong>{report.reporter?.displayName ?? 'Thành viên HUETS'}</strong>
          <span>{report.reporter?.email ?? report.reporterId}</span>
        </div>
      ),
    },
    {
      title: 'Gửi lúc',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 145,
      render: formatDateTime,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value) => <StatusTag status={value} />,
    },
    {
      title: '',
      key: 'actions',
      width: 64,
      render: (_, report) => (
        <Button type="text" icon={<EyeOutlined />} aria-label="Xem chi tiết báo cáo" onClick={() => openReport(report)} />
      ),
    },
  ]

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>An toàn cộng đồng</span>
          <Typography.Title level={2}>Báo cáo nội dung</Typography.Title>
          <Typography.Paragraph>
            Kiểm tra phản ánh từ người dùng và lưu lại kết luận xử lý minh bạch.
          </Typography.Paragraph>
        </div>
        <div className={styles.queueCount}>
          <FlagOutlined />
          <strong>{total}</strong>
          <span>{status === 'pending' ? 'báo cáo đang chờ' : 'kết quả'}</span>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Bộ lọc báo cáo">
        <Input
          allowClear
          className={styles.search}
          prefix={<SearchOutlined />}
          placeholder="Tìm theo nội dung báo cáo..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onClear={() => {
            setSearchInput('')
            if (search !== '' || page !== 1) changeFilter(setSearch, '')
          }}
          onPressEnter={applySearch}
        />
        <Select
          value={status}
          aria-label="Trạng thái báo cáo"
          onChange={(value) => changeFilter(setStatus, value)}
          options={[
            ...Object.entries(REPORT_STATUSES).map(([value, item]) => ({ value, label: item.label })),
          ]}
        />
        <Select
          value={targetType}
          aria-label="Loại nội dung"
          onChange={(value) => changeFilter(setTargetType, value)}
          options={[
            { value: '', label: 'Tất cả nội dung' },
            ...Object.entries(REPORT_TARGETS).map(([value, item]) => ({ value, label: item.label })),
          ]}
        />
        <Select
          value={reasonCode}
          aria-label="Lý do báo cáo"
          onChange={(value) => changeFilter(setReasonCode, value)}
          options={[
            { value: '', label: 'Tất cả lý do' },
            ...Object.entries(REPORT_REASONS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={applySearch}>Tìm</Button>
        <Button icon={<ReloadOutlined />} onClick={reload}>Làm mới</Button>
      </section>

      {errorMessage ? <Alert showIcon type="error" message={errorMessage} action={<Button onClick={reload}>Thử lại</Button>} /> : null}

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={reports}
          loading={loading}
          scroll={{ x: 900 }}
          onRow={(report) => ({ onDoubleClick: () => openReport(report) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (value) => `${value} báo cáo`,
            onChange: (nextPage) => {
              setLoading(true)
              setPage(nextPage)
            },
          }}
        />
      </section>

      <Drawer
        title="Chi tiết báo cáo"
        width={600}
        open={Boolean(selectedReport)}
        loading={detailLoading}
        onClose={() => {
          if (submitting) return
          detailRequestRef.current += 1
          setDetailLoading(false)
          setSelectedReport(null)
        }}
        extra={selectedReport?.status === 'pending' ? (
          <Space>
            <Button icon={<CloseCircleOutlined />} onClick={() => openDecision('dismissed')}>Bỏ qua</Button>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => openDecision('resolved')}>Kết luận</Button>
          </Space>
        ) : null}
      >
        {selectedReport ? (
          <div className={styles.detail}>
            <div className={styles.detailHeading}>
              <StatusTag status={selectedReport.status} />
              <TargetSummary report={selectedReport} />
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Lý do">
                {REPORT_REASONS[selectedReport.reasonCode] ?? selectedReport.reasonCode}
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả">
                {selectedReport.detail || 'Không có mô tả bổ sung.'}
              </Descriptions.Item>
              <Descriptions.Item label="Người báo cáo">
                <strong>{selectedReport.reporter?.displayName ?? 'Thành viên HUETS'}</strong>
                {selectedReport.reporter?.email ? ` · ${selectedReport.reporter.email}` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian gửi">{formatDateTime(selectedReport.createdAt)}</Descriptions.Item>
            </Descriptions>

            {selectedReport.resolution?.handledAt ? (
              <Alert
                showIcon
                type={selectedReport.status === 'resolved' ? 'success' : 'info'}
                message={selectedReport.status === 'resolved' ? 'Báo cáo đã được xử lý' : 'Báo cáo đã được bỏ qua'}
                description={(
                  <>
                    <p>{selectedReport.resolution.note}</p>
                    <small>{formatDateTime(selectedReport.resolution.handledAt)}</small>
                  </>
                )}
              />
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Modal
        title={decisionStatus === 'resolved' ? 'Kết luận báo cáo' : 'Bỏ qua báo cáo'}
        open={Boolean(decisionStatus)}
        okText={decisionStatus === 'resolved' ? 'Xác nhận đã xử lý' : 'Xác nhận bỏ qua'}
        cancelText="Hủy"
        okButtonProps={{ danger: decisionStatus === 'dismissed', loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        onOk={submitDecision}
        onCancel={() => { if (!submitting) setDecisionStatus(null) }}
        destroyOnHidden
      >
        <Typography.Paragraph>
          Ghi lại kết quả kiểm tra để những quản trị viên khác có thể theo dõi quyết định này.
        </Typography.Paragraph>
        <Input.TextArea
          autoFocus
          rows={4}
          maxLength={1000}
          showCount
          value={resolutionNote}
          onChange={(event) => setResolutionNote(event.target.value)}
          placeholder="Kết quả xác minh và hành động đã thực hiện..."
        />
      </Modal>
    </main>
  )
}
