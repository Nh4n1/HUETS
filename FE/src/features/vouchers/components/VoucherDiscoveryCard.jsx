import { ArrowRightOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import {
  formatVoucherBenefit,
  formatVoucherDateTime,
  getViewerClaimPresentation,
  getVoucherConditionSummary,
} from '../voucherPresentation'
import styles from './VoucherDiscoveryCard.module.css'

export function VoucherDiscoveryCard({ voucher }) {
  const viewerState = getViewerClaimPresentation(voucher.viewerClaim)
  const condition = getVoucherConditionSummary(voucher.benefit)

  return (
    <article className={styles.card}>
      <Link className={styles.link} to={`/vouchers/${voucher.id}`}>
        <div className={styles.image}>
          <span className={styles.placeholder} aria-hidden="true"><EnvironmentOutlined /></span>
          {voucher.location?.coverImageUrl ? (
            <img src={voucher.location.coverImageUrl} alt={`Không gian tại ${voucher.location.name}`} loading="lazy" />
          ) : null}
          <span className={styles.benefit}>{formatVoucherBenefit(voucher.benefit)}</span>
        </div>
        <div className={styles.body}>
          <h3 className={styles.title}>{voucher.title}</h3>
          <p className={styles.location}>{voucher.location?.name}</p>
          {condition ? <p className={styles.condition}>{condition}</p> : null}
          <p className={styles.deadline}>Nhận đến {formatVoucherDateTime(voucher.claimEndAt)}</p>
          <span className={`${styles.action} ${viewerState ? styles.viewerAction : ''}`}>
            {viewerState ? `${viewerState.label} · ${viewerState.action}` : 'Xem ưu đãi'} <ArrowRightOutlined />
          </span>
        </div>
      </Link>
    </article>
  )
}
