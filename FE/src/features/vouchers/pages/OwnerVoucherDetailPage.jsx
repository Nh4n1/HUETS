import { App, Alert, Button, Card, Descriptions, Skeleton, Statistic, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getOwnerVoucherApi, transitionVoucherApi, updateVoucherApi } from '../api/voucherApi'
import { VoucherForm } from '../components/VoucherForm'
import { formatVoucherBenefit, VOUCHER_STATUS } from '../voucherPresentation'
import styles from './VoucherPages.module.css'

export function OwnerVoucherDetailPage() {
  const { locationId, voucherId } = useParams()
  const { message, modal } = App.useApp()
  const [voucher, setVoucher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setVoucher(await getOwnerVoucherApi(locationId, voucherId))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải Voucher.')
    } finally {
      setLoading(false)
    }
  }, [locationId, voucherId])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  async function transition(action) {
    try {
      await transitionVoucherApi(locationId, voucherId, action)
      message.success('Đã cập nhật Voucher.')
      await load()
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể cập nhật Voucher.')
    }
  }

  async function save(payload, publish) {
    setSaving(true)
    try {
      await updateVoucherApi(locationId, voucherId, payload)
      if (publish) await transitionVoucherApi(locationId, voucherId, 'publish')
      message.success(publish ? 'Đã lưu và phát hành Voucher.' : 'Đã lưu thay đổi.')
      setEditing(false)
      await load()
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể lưu Voucher.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className={styles.page}><Skeleton active /></main>
  if (!voucher) return <main className={styles.page}><Alert type="error" showIcon message={errorMessage} /></main>
  if (editing) {
    return <main className={styles.page}><header className={styles.hero}><div><span className={styles.eyebrow}>Chỉnh sửa bản nháp</span><Typography.Title level={2}>{voucher.title}</Typography.Title></div><Button onClick={() => setEditing(false)}>Hủy chỉnh sửa</Button></header>{errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}<VoucherForm initialVoucher={voucher} loading={saving} onSave={save} /></main>
  }

  const status = VOUCHER_STATUS[voucher.status]
  return (
    <main className={styles.page}>
      <header className={styles.hero}><div><span className={styles.eyebrow}>{status.label}</span><Typography.Title level={2}>{voucher.title}</Typography.Title><p>{formatVoucherBenefit(voucher.benefit)}</p></div><Link to={`/business/locations/${locationId}/vouchers`}><Button>Về danh sách</Button></Link></header>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      <div className={styles.kpis}><Statistic title="Đã nhận" value={voucher.claimedCount} /><Statistic title="Đã sử dụng" value={voucher.redeemedCount} /><Statistic title="Còn suất" value={voucher.remainingQuantity} /><Statistic title="Tỷ lệ dùng" value={voucher.claimedCount ? Math.round(voucher.redeemedCount / voucher.claimedCount * 100) : 0} suffix="%" /></div>
      <div className={styles.detail}>
        <Card title="Nội dung và điều kiện"><Descriptions column={1} items={[{ key: 'benefit', label: 'Quyền lợi', children: formatVoucherBenefit(voucher.benefit) }, { key: 'description', label: 'Mô tả', children: voucher.description }, { key: 'terms', label: 'Điều kiện', children: voucher.terms }, { key: 'claim', label: 'Thời gian nhận', children: `${new Date(voucher.claimStartAt).toLocaleString('vi-VN')} – ${new Date(voucher.claimEndAt).toLocaleString('vi-VN')}` }, { key: 'redeem', label: 'Sử dụng đến', children: new Date(voucher.redeemUntil).toLocaleString('vi-VN') }]} /></Card>
        <Card title="Thao tác hợp lệ"><div className={styles.formStack}>
          {voucher.status === 'draft' ? <><Button onClick={() => setEditing(true)}>Chỉnh sửa bản nháp</Button><Button type="primary" onClick={() => modal.confirm({ title: 'Phát hành Voucher?', content: 'Sau khi có User nhận, quyền lợi sẽ bị khóa.', onOk: () => transition('publish') })}>Phát hành</Button></> : null}
          {voucher.status === 'active' ? <Button onClick={() => transition('pause')}>Tạm dừng phát hành</Button> : null}
          {voucher.status === 'paused' ? <Button type="primary" onClick={() => transition('resume')}>Tiếp tục phát hành</Button> : null}
          {['active', 'paused'].includes(voucher.status) ? <Button danger onClick={() => transition('end')}>Kết thúc vĩnh viễn</Button> : null}
          {voucher.status === 'ended' ? <Alert type="info" message="Voucher đã kết thúc và chỉ có thể xem." /> : null}
        </div></Card>
      </div>
    </main>
  )
}
