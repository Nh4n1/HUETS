import { App, Alert, Button, Card, Descriptions, Form, Image, Skeleton, Timeline, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  cancelOwnershipApi,
  getMyOwnershipApi,
  resubmitOwnershipApi,
  updateMyOwnershipApi,
  uploadOwnershipEvidenceFiles,
} from '../api/businessApi'
import { BusinessStatusTag } from '../components/BusinessStatusTag'
import { OwnershipEvidenceForm } from '../components/OwnershipEvidenceForm'
import { validateEvidenceFiles } from '../evidenceValidation'
import { getLatestReview, RELATIONSHIP_LABEL } from '../ownershipPresentation'
import styles from './BusinessPages.module.css'

const ACTION_LABEL = {
  submitted: 'Đã gửi yêu cầu', resubmitted: 'Đã gửi lại', approved: 'Admin đã xác minh', rejected: 'Admin yêu cầu bổ sung', revoked: 'Admin đã thu hồi', cancelled: 'Đã hủy yêu cầu',
}

export function OwnershipDetailPage() {
  const { ownershipId } = useParams()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [ownership, setOwnership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fileList, setFileList] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyOwnershipApi(ownershipId)
      setOwnership(data)
      form.setFieldsValue({
        relationship: data.relationship, contactName: data.contactName,
        contactPhone: data.contactPhone, contactEmail: data.contactEmail, note: data.note,
      })
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải yêu cầu ownership.')
    } finally { setLoading(false) }
  }, [form, ownershipId])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  async function handleResubmit(values) {
    if (!values.contactPhone?.trim() && !values.contactEmail?.trim()) {
      form.setFields([{ name: 'contactPhone', errors: ['Cần cung cấp ít nhất số điện thoại hoặc email.'] }])
      return
    }
    if (fileList.length) {
      const fileError = validateEvidenceFiles(fileList)
      if (fileError) { setErrorMessage(fileError); return }
    }
    setSaving(true)
    try {
      const assets = fileList.length ? await uploadOwnershipEvidenceFiles(fileList) : null
      await updateMyOwnershipApi(ownershipId, {
        ...values,
        ...(assets ? { evidenceAssetTokens: assets.map((asset) => asset.assetToken) } : {}),
      })
      await resubmitOwnershipApi(ownershipId)
      message.success('Đã bổ sung và gửi lại hồ sơ.')
      setFileList([])
      await load()
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể gửi lại hồ sơ.')
    } finally { setSaving(false) }
  }

  function handleCancel() {
    modal.confirm({ title: 'Hủy yêu cầu này?', okText: 'Hủy yêu cầu', okButtonProps: { danger: true }, cancelText: 'Đóng', onOk: async () => { await cancelOwnershipApi(ownershipId); message.success('Đã hủy yêu cầu.'); navigate('/business/ownerships') } })
  }

  if (loading) return <main className={styles.page}><Skeleton active paragraph={{ rows: 10 }} /></main>
  if (!ownership) return <main className={styles.page}><Alert type="error" showIcon message={errorMessage} /><Link to="/business/ownerships">Về hồ sơ xác minh</Link></main>
  const latestReview = getLatestReview(ownership)

  return (
    <main className={styles.page}>
      <header className={styles.hero}><div><span className={styles.eyebrow}>Hồ sơ ownership</span><Typography.Title level={2}>{ownership.location?.name}</Typography.Title><BusinessStatusTag ownership={ownership} /></div><Link to="/business/ownerships"><Button>Hồ sơ xác minh</Button></Link></header>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      {latestReview?.reason ? <Alert type={ownership.status === 'rejected' ? 'warning' : 'info'} showIcon message={latestReview.reasonCode} description={latestReview.reason} /> : null}
      <div className={styles.detailGrid}>
        <div className={styles.stepStack}>
          <Card title="Thông tin yêu cầu">
            <Descriptions column={1} size="small" items={[
              { key: 'relationship', label: 'Quan hệ', children: RELATIONSHIP_LABEL[ownership.relationship] },
              { key: 'contact', label: 'Người liên hệ', children: ownership.contactName },
              { key: 'channel', label: 'Kênh liên hệ', children: [ownership.contactPhone, ownership.contactEmail].filter(Boolean).join(' · ') },
              { key: 'note', label: 'Ghi chú', children: ownership.note },
            ]} />
          </Card>
          <Card title={`Ảnh bằng chứng (${ownership.evidenceImages?.length ?? 0})`}><Image.PreviewGroup><div className={styles.evidenceGrid}>{ownership.evidenceImages?.map((image) => <Image key={image.publicId ?? image.url} src={image.url} alt="Bằng chứng ownership" />)}</div></Image.PreviewGroup></Card>
          {ownership.status === 'rejected' ? (
            <Card title="Bổ sung và gửi lại">
              <Form form={form} layout="vertical" onFinish={handleResubmit}>
                <OwnershipEvidenceForm fileList={fileList} onFileListChange={setFileList} existingImages={ownership.evidenceImages} />
                <Button type="primary" htmlType="submit" loading={saving}>Cập nhật và gửi lại</Button>
              </Form>
            </Card>
          ) : null}
          {ownership.status === 'pending' ? <Button danger onClick={handleCancel}>Hủy yêu cầu đang xử lý</Button> : null}
        </div>
        <Card title="Lịch sử xử lý">
          <Timeline items={[...(ownership.reviewHistory ?? [])].reverse().map((item) => ({ color: item.action === 'approved' ? 'green' : item.action === 'rejected' || item.action === 'revoked' ? 'red' : 'blue', children: <div><strong>{ACTION_LABEL[item.action] ?? item.action}</strong><div>{new Date(item.actedAt).toLocaleString('vi-VN')}</div>{item.reason ? <p>{item.reason}</p> : null}</div> }))} />
        </Card>
      </div>
    </main>
  )
}
