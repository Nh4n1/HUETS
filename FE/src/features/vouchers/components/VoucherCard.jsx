import { Button, Card, Tag } from 'antd'
import { Link } from 'react-router'
import { formatVoucherBenefit, VOUCHER_STATUS } from '../voucherPresentation'
import styles from '../pages/VoucherPages.module.css'

export function VoucherCard({ voucher, owner = false, claim }) {
  const status = owner ? VOUCHER_STATUS[voucher.status] : null
  return (
    <Card className={styles.voucherCard} cover={voucher.imageUrl || voucher.location?.coverImageUrl ? <img src={voucher.imageUrl ?? voucher.location.coverImageUrl} alt={voucher.title} /> : null}>
      <div className={styles.cardBody}>
        <div>{status ? <Tag color={status.color}>{status.label}</Tag> : null}<span className={styles.benefit}>{formatVoucherBenefit(voucher.benefit)}</span></div>
        <h3>{voucher.title}</h3>
        <p>{voucher.description}</p>
        <div className={styles.meta}><span>Nhận đến {new Date(voucher.claimEndAt).toLocaleString('vi-VN')}</span><span>Sử dụng đến {new Date(voucher.redeemUntil).toLocaleString('vi-VN')}</span>{owner ? <span>{voucher.claimedCount}/{voucher.totalQuantity} lượt đã nhận · {voucher.redeemedCount} lượt sử dụng</span> : <span>Còn {voucher.remainingQuantity} suất</span>}</div>
        <Link to={owner ? `/business/locations/${voucher.locationId}/vouchers/${voucher.id}` : `/vouchers/${voucher.id}`}><Button type="primary" block>{owner ? 'Quản lý Voucher' : claim ? 'Đã nhận' : 'Xem và nhận Voucher'}</Button></Link>
      </div>
    </Card>
  )
}
