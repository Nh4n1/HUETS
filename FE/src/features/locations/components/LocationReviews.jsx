import { FlagOutlined, UserOutlined } from '@ant-design/icons'
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Popconfirm,
  Rate,
  Select,
  Tooltip,
  message,
} from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/context/useAuth'
import { ReportModal } from '../../reports/components/ReportModal'
import {
  deleteMyLocationReviewApi,
  getLocationReviewsApi,
  getMyLocationReviewApi,
  saveLocationReviewApi,
} from '../api/locationApi'
import { hasReviewChanges, normalizeReviewFormValues } from '../reviewForm'
import styles from './LocationReviews.module.css'

const EMPTY_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

export function LocationReviews({ locationId, ratingSummary, onSummaryChange }) {
  const { user, isAuthenticated } = useAuth()
  const [form] = Form.useForm()
  const [reviews, setReviews] = useState([])
  const [ownReview, setOwnReview] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [ratingFilter, setRatingFilter] = useState(null)
  const [sortBy, setSortBy] = useState('newest')
  const [hasComment, setHasComment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const queryFor = (page) => ({
    page,
    pageSize: 10,
    sortBy,
    ...(ratingFilter ? { rating: ratingFilter } : {}),
    ...(hasComment ? { hasComment: true } : {}),
  })

  const reloadReviews = () => {
    setLoading(true)
    return getLocationReviewsApi(locationId, queryFor(1))
      .then((result) => {
        setReviews(result.data)
        setPagination(result.meta)
      })
      .catch(() => message.error('Không thể tải danh sách đánh giá.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    getLocationReviewsApi(locationId, {
      page: 1,
      pageSize: 10,
      sortBy,
      ...(ratingFilter ? { rating: ratingFilter } : {}),
      ...(hasComment ? { hasComment: true } : {}),
    })
      .then((result) => {
        if (!active) return
        setReviews(result.data)
        setPagination(result.meta)
      })
      .catch(() => { if (active) message.error('Không thể tải danh sách đánh giá.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [locationId, ratingFilter, sortBy, hasComment])

  useEffect(() => {
    form.setFieldsValue({ rating: ownReview?.rating ?? 0, comment: ownReview?.comment ?? '' })
  }, [ownReview, form])

  useEffect(() => {
    let active = true
    if (!isAuthenticated) return () => { active = false }

    getMyLocationReviewApi(locationId)
      .then((result) => { if (active) setOwnReview(result) })
      .catch(() => { if (active) message.error('Không thể tải đánh giá của bạn.') })
    return () => { active = false }
  }, [locationId, isAuthenticated])

  const submit = async (values) => {
    if (!hasReviewChanges(ownReview, values)) {
      message.info('Đánh giá của bạn chưa có thay đổi.')
      return
    }

    setSaving(true)
    try {
      const result = await saveLocationReviewApi(locationId, normalizeReviewFormValues(values))
      onSummaryChange(result.ratingSummary)
      const [myReview] = await Promise.all([
        getMyLocationReviewApi(locationId),
        reloadReviews(),
      ])
      setOwnReview(myReview)
      message.success(
        myReview?.status === 'hidden'
          ? 'Đã lưu thay đổi. Đánh giá vẫn đang bị ẩn.'
          : 'Đã lưu đánh giá của bạn.',
      )
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể lưu đánh giá.')
    } finally {
      setSaving(false)
    }
  }

  const removeOwnReview = async () => {
    setDeleting(true)
    try {
      const result = await deleteMyLocationReviewApi(locationId)
      setOwnReview(null)
      form.resetFields()
      onSummaryChange(result.ratingSummary)
      await reloadReviews()
      message.success(result.deleted ? 'Đã xóa đánh giá của bạn.' : 'Đánh giá đã được xóa trước đó.')
    } catch (error) {
      message.error(error.response?.data?.message ?? 'Không thể xóa đánh giá.')
    } finally {
      setDeleting(false)
    }
  }

  const loadMore = async () => {
    const nextPage = pagination.page + 1
    setLoadingMore(true)
    try {
      const result = await getLocationReviewsApi(locationId, queryFor(nextPage))
      setReviews((current) => {
        const existingIds = new Set(current.map((review) => review.id))
        return [...current, ...result.data.filter((review) => !existingIds.has(review.id))]
      })
      setPagination(result.meta)
    } catch {
      message.error('Không thể tải thêm đánh giá.')
    } finally {
      setLoadingMore(false)
    }
  }

  const distribution = ratingSummary?.distribution ?? EMPTY_DISTRIBUTION
  const reviewCount = ratingSummary?.count ?? 0

  return (
    <section className={styles.reviews}>
      <span className={styles.eyebrow}>Cộng đồng</span>
      <h2>Đánh giá địa điểm</h2>

      {isAuthenticated ? (
        <Form form={form} layout="vertical" onFinish={submit} className={styles.form}>
          <div className={styles.formHeader}>
            <div>
              <h3>Đánh giá của bạn</h3>
              {ownReview?.isEdited ? <span className={styles.editedLabel}>Đã chỉnh sửa</span> : null}
            </div>
            {ownReview ? (
              <Popconfirm
                title="Xóa đánh giá?"
                description="Điểm đánh giá của địa điểm sẽ được tính lại."
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={removeOwnReview}
              >
                <Button type="text" danger loading={deleting}>Xóa đánh giá</Button>
              </Popconfirm>
            ) : null}
          </div>
          {ownReview?.status === 'hidden' ? (
            <Alert
              className={styles.statusAlert}
              type="warning"
              showIcon
              message="Đánh giá đang bị ẩn"
              description={ownReview.hiddenReason ?? 'Vui lòng liên hệ quản trị viên để biết thêm chi tiết.'}
            />
          ) : null}
          <Form.Item
            name="rating"
            label="Trải nghiệm của bạn"
            rules={[{ required: true, type: 'number', min: 1, message: 'Vui lòng chọn số sao.' }]}
          >
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Chia sẻ cảm nhận (không bắt buộc)">
            <Input.TextArea
              rows={3}
              maxLength={1000}
              showCount
              placeholder="Điều gì khiến địa điểm này đáng ghé thăm?"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Lưu đánh giá</Button>
        </Form>
      ) : <p className={styles.loginHint}><Link to="/login">Đăng nhập</Link> để viết đánh giá.</p>}

      <div className={styles.summary}>
        <div className={styles.average}>
          <strong>{Number(ratingSummary?.average ?? 0).toFixed(1)}</strong>
          <Rate disabled allowHalf value={ratingSummary?.average ?? 0} />
          <span>{reviewCount} đánh giá</span>
        </div>
        <div className={styles.distribution}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const amount = distribution[rating] ?? 0
            const percentage = reviewCount === 0 ? 0 : (amount / reviewCount) * 100
            return (
              <button
                type="button"
                key={rating}
                className={ratingFilter === rating ? styles.distributionActive : ''}
                onClick={() => {
                  setLoading(true)
                  setRatingFilter((current) => current === rating ? null : rating)
                }}
                aria-pressed={ratingFilter === rating}
              >
                <span>{rating} sao</span>
                <i><b style={{ width: `${percentage}%` }} /></i>
                <em>{amount}</em>
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.listHeader}>
        <h3 className={styles.communityTitle}>Đánh giá từ cộng đồng</h3>
        <div className={styles.filters}>
          <Checkbox
            checked={hasComment}
            onChange={(event) => { setLoading(true); setHasComment(event.target.checked) }}
          >
            Có nhận xét
          </Checkbox>
          <Select
            value={sortBy}
            onChange={(value) => { setLoading(true); setSortBy(value) }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'oldest', label: 'Cũ nhất' },
              { value: 'highest', label: 'Điểm cao nhất' },
              { value: 'lowest', label: 'Điểm thấp nhất' },
            ]}
          />
        </div>
      </div>
      <div className={styles.list} aria-busy={loading}>
        {!loading && reviews.length === 0
          ? <Empty description="Không có đánh giá phù hợp" />
          : reviews.map((review) => (
            <article key={review.id} className={styles.item}>
              <Avatar src={review.author.avatarUrl} icon={<UserOutlined />} />
              <div>
                <div className={styles.itemHeader}>
                  <strong>
                    {review.author.displayName}
                    {review.userId === user?.id ? ' (Bạn)' : ''}
                  </strong>
                  <Rate disabled value={review.rating} />
                </div>
                {review.comment ? <p>{review.comment}</p> : null}
                <div className={styles.itemFooter}>
                  <time>
                    {new Date(review.updatedAt).toLocaleDateString('vi-VN')}
                    {review.isEdited ? ' · Đã chỉnh sửa' : ''}
                  </time>
                  {isAuthenticated && review.userId !== user?.id ? (
                    <Tooltip title="Báo cáo đánh giá này">
                      <Button
                        type="text"
                        size="small"
                        className={styles.reportButton}
                        icon={<FlagOutlined />}
                        onClick={() => setReportingReviewId(review.id)}
                      >
                        Báo cáo
                      </Button>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        {!loading && pagination.page < pagination.totalPages ? (
          <Button className={styles.loadMore} loading={loadingMore} onClick={loadMore}>
            Xem thêm đánh giá
          </Button>
        ) : null}
      </div>

      <ReportModal
        open={Boolean(reportingReviewId)}
        targetType="locationReview"
        targetId={reportingReviewId}
        contextLabel="Báo cáo đánh giá vi phạm quy định cộng đồng."
        onClose={() => setReportingReviewId(null)}
      />
    </section>
  )
}
