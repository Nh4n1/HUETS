import { App, Alert, Button, Card, Descriptions, Form, Image, Input, Modal, Select, Skeleton, Tag, Timeline, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { approveOwnershipApi, getAdminOwnershipApi, rejectOwnershipApi, revokeOwnershipApi } from '../api/adminOwnershipApi'
import { BusinessStatusTag } from '../components/BusinessStatusTag'
import { RELATIONSHIP_LABEL } from '../ownershipPresentation'
import styles from './AdminOwnershipPages.module.css'

const REASONS = [
  { value: 'insufficient_evidence', label: 'Bằng chứng chưa đủ' },
  { value: 'information_mismatch', label: 'Thông tin không khớp' },
  { value: 'cannot_contact', label: 'Không thể liên hệ' },
  { value: 'duplicate_or_conflicting_claim', label: 'Claim trùng hoặc xung đột' },
  { value: 'suspected_fraud', label: 'Nghi ngờ gian lận' },
  { value: 'other', label: 'Lý do khác' },
]

export function AdminOwnershipDetailPage() {
  const { ownershipId } = useParams()
  const { message, modal } = App.useApp()
  const [reviewForm] = Form.useForm()
  const [ownership, setOwnership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [reviewAction, setReviewAction] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setOwnership(await getAdminOwnershipApi(ownershipId)); setErrorMessage('') }
    catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể tải hồ sơ ownership.') }
    finally { setLoading(false) }
  }, [ownershipId])
  useEffect(() => { Promise.resolve().then(load) }, [load])

  const approveDisabled = ownership?.status !== 'pending' || ownership?.location?.status !== 'approved' || ownership?.location?.isDeleted || ownership?.applicant?.status !== 'active' || ownership?.conflicts?.some((item) => item.status === 'verified')

  async function approve() {
    modal.confirm({ title: 'Xác minh quyền quản lý?', content: 'Quyết định này chỉ xác minh quyền quản lý trên HueTrip, không phải chứng nhận sở hữu pháp lý.', okText: 'Xác minh ownership', onOk: async () => { setActing(true); try { await approveOwnershipApi(ownershipId); message.success('Đã xác minh ownership.'); await load() } catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể approve ownership.') } finally { setActing(false) } } })
  }

  async function submitReview() {
    const values = await reviewForm.validateFields()
    setActing(true)
    try {
      if (reviewAction === 'reject') await rejectOwnershipApi(ownershipId, values)
      else await revokeOwnershipApi(ownershipId, values)
      message.success(reviewAction === 'reject' ? 'Đã yêu cầu applicant bổ sung.' : 'Đã thu hồi ownership.')
      setReviewAction(null)
      reviewForm.resetFields()
      await load()
    } catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể cập nhật ownership.') }
    finally { setActing(false) }
  }

  if (loading) return <main className={styles.page}><Skeleton active paragraph={{ rows: 12 }} /></main>
  if (!ownership) return <main className={styles.page}><Alert type="error" showIcon message={errorMessage} /></main>

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span>Hồ sơ ownership</span><Typography.Title level={2}>{ownership.location?.name}</Typography.Title><BusinessStatusTag ownership={ownership} /></div><Link to="/admin/location-ownerships"><Button>Về hàng chờ</Button></Link></header>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      <div className={styles.detailGrid}>
        <div className={styles.mainColumn}>
          <Card title="1. Thông tin và trạng thái Location" extra={<Link to={`/admin/locations/${ownership.locationId}`}>Mở hồ sơ Location</Link>}>
            <Descriptions column={1} items={[
              { key: 'location', label: 'Địa điểm', children: ownership.location?.name },
              { key: 'address', label: 'Địa chỉ', children: ownership.location?.formattedAddress },
              { key: 'status', label: 'Kiểm duyệt Location', children: <Tag color={ownership.location?.status === 'approved' ? 'success' : 'warning'}>{ownership.location?.status}</Tag> },
              { key: 'mode', label: 'Nguồn', children: ownership.locationMode === 'new' ? 'Location mới trong wizard' : 'Location đã có' },
            ]} />
            {ownership.location?.status !== 'approved' ? <Alert type="warning" showIcon message="Ownership chỉ có thể approve sau khi Location được duyệt công khai. Hai quyết định vẫn độc lập." /> : null}
          </Card>
          <Card title="2. Ownership, liên hệ và bằng chứng">
            <Descriptions column={1} items={[
              { key: 'applicant', label: 'Applicant', children: `${ownership.applicant?.displayName} · ${ownership.applicant?.email}` },
              { key: 'relationship', label: 'Quan hệ', children: RELATIONSHIP_LABEL[ownership.relationship] },
              { key: 'contact', label: 'Liên hệ hồ sơ', children: `${ownership.contactName} · ${[ownership.contactPhone, ownership.contactEmail].filter(Boolean).join(' · ')}` },
              { key: 'note', label: 'Giải thích', children: ownership.note },
            ]} />
            <Image.PreviewGroup><div className={styles.evidenceGrid}>{ownership.evidenceImages?.map((image) => <Image key={image.publicId ?? image.url} src={image.url} alt="Bằng chứng ownership hạn chế truy cập" />)}</div></Image.PreviewGroup>
          </Card>
          <Card title="Lịch sử review"><Timeline items={[...(ownership.reviewHistory ?? [])].reverse().map((item) => ({ children: <div><strong>{item.action}</strong><div>{new Date(item.actedAt).toLocaleString('vi-VN')}</div>{item.reason ? <p>{item.reason}</p> : null}</div> }))} /></Card>
        </div>
        <Card className={styles.actionCard} title="Quyết định Admin">
          {ownership.conflicts?.length ? <Alert type="warning" showIcon message={`${ownership.conflicts.length} claim đang cạnh tranh cho Location này.`} /> : null}
          {ownership.status === 'pending' ? <><Button block type="primary" disabled={approveDisabled} loading={acting} onClick={approve}>Xác minh ownership</Button><Button block danger onClick={() => setReviewAction('reject')}>Từ chối / yêu cầu bổ sung</Button></> : null}
          {ownership.status === 'verified' ? <Button block danger onClick={() => setReviewAction('revoke')}>Thu hồi ownership</Button> : null}
          {approveDisabled && ownership.status === 'pending' ? <Typography.Paragraph type="secondary">Không thể approve khi Location chưa public-valid, applicant không active hoặc đã có owner khác.</Typography.Paragraph> : null}
        </Card>
      </div>
      <Modal title={reviewAction === 'reject' ? 'Từ chối ownership' : 'Thu hồi ownership'} open={Boolean(reviewAction)} okText="Xác nhận" cancelText="Hủy" okButtonProps={{ danger: true, loading: acting }} onOk={submitReview} onCancel={() => setReviewAction(null)}>
        <Form form={reviewForm} layout="vertical"><Form.Item name="reasonCode" label="Nhóm lý do" rules={[{ required: true, message: 'Vui lòng chọn nhóm lý do.' }]}><Select options={REASONS} /></Form.Item><Form.Item name="reason" label="Giải thích cho User" rules={[{ required: true, whitespace: true, min: 10, message: 'Giải thích cần ít nhất 10 ký tự.' }, { max: 2000 }]}><Input.TextArea rows={5} /></Form.Item></Form>
      </Modal>
    </main>
  )
}
