import { EnvironmentOutlined, StarOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Pagination, Rate, Skeleton, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getMyReviewsApi } from '../../api/authApi'
import styles from '../../pages/ProfilePage.module.css'

const PAGE_SIZE = 5
const REVIEW_STATUS = {
  active: { label: 'Đang hiển thị', color: 'green' },
  hidden: { label: 'Đã bị ẩn', color: 'orange' },
}

function ReviewItem({ review }) {
  const status = REVIEW_STATUS[review.status]
  const locationName = review.location.name

  return (
    <article className={styles.reviewItem}>
      {review.location.coverImageUrl ? (
        <img
          className={styles.reviewImage}
          src={review.location.coverImageUrl}
          alt=""
          loading="lazy"
        />
      ) : (
        <span className={styles.reviewImageFallback} aria-hidden="true">
          <EnvironmentOutlined />
        </span>
      )}

      <div className={styles.reviewBody}>
        <div className={styles.reviewTitleRow}>
          <div>
            {review.location.status === 'approved' ? (
              <Link className={styles.reviewLocation} to={`/locations/${review.location.id}`}>
                {locationName}
              </Link>
            ) : (
              <strong className={styles.reviewLocation}>{locationName}</strong>
            )}
            <div className={styles.reviewRating}>
              <Rate disabled value={review.rating} />
              <span>{new Date(review.updatedAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
          <Tag color={status?.color}>{status?.label ?? review.status}</Tag>
        </div>

        <p className={review.comment ? styles.reviewComment : styles.reviewCommentEmpty}>
          {review.comment || 'Không có nhận xét.'}
        </p>
        {review.status === 'hidden' && review.hiddenReason ? (
          <Alert
            className={styles.hiddenReason}
            type="warning"
            showIcon
            message={`Lý do ẩn: ${review.hiddenReason}`}
          />
        ) : null}
        {review.isEdited ? <small className={styles.editedLabel}>Đã chỉnh sửa</small> : null}
      </div>
    </article>
  )
}

export function ProfileReviews() {
  const [reviews, setReviews] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    getMyReviewsApi({ page, pageSize: PAGE_SIZE })
      .then(({ data, meta }) => {
        if (!active) return
        setReviews(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error.response?.data?.message ?? 'Không thể tải danh sách đánh giá.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [page, reloadKey])

  function retry() {
    setLoading(true)
    setErrorMessage('')
    setReloadKey((value) => value + 1)
  }

  function changePage(nextPage) {
    setLoading(true)
    setErrorMessage('')
    setPage(nextPage)
  }

  return (
    <Card className={styles.reviewsCard} bordered={false}>
      <div className={styles.reviewsHeader}>
        <div className={styles.cardHeading}>
          <span className={styles.headingIcon} aria-hidden="true"><StarOutlined /></span>
          <div>
            <Typography.Title level={3}>Đánh giá của tôi</Typography.Title>
            <p>Xem lại những địa điểm bạn đã đánh giá trên HueTrip.</p>
          </div>
        </div>
        <Tag className={styles.reviewCount}>{total} đánh giá</Tag>
      </div>

      {errorMessage ? (
        <Alert
          showIcon
          type="error"
          message={errorMessage}
          action={<Button size="small" onClick={retry}>Thử lại</Button>}
        />
      ) : null}

      {loading ? (
        <div className={styles.reviewSkeletons}>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      ) : null}

      {!loading && !errorMessage && reviews.length === 0 ? (
        <Empty description="Bạn chưa đánh giá địa điểm nào." />
      ) : null}

      {!loading && !errorMessage && reviews.length > 0 ? (
        <div className={styles.reviewList}>
          {reviews.map((review) => <ReviewItem review={review} key={review.id} />)}
        </div>
      ) : null}

      {total > PAGE_SIZE ? (
        <Pagination
          className={styles.reviewPagination}
          current={page}
          pageSize={PAGE_SIZE}
          total={total}
          showSizeChanger={false}
          onChange={changePage}
        />
      ) : null}
    </Card>
  )
}
