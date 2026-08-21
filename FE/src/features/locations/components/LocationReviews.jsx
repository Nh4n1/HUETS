import { Avatar, Button, Empty, Form, Input, Popconfirm, Rate, message } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/context/useAuth'
import {
  deleteMyLocationReviewApi,
  getLocationReviewsApi,
  getMyLocationReviewApi,
  saveLocationReviewApi,
} from '../api/locationApi'
import styles from './LocationReviews.module.css'

export function LocationReviews({ locationId, onSummaryChange }) {
  const { user, isAuthenticated } = useAuth()
  const [form] = Form.useForm()
  const [reviews, setReviews] = useState([])
  const [ownReview, setOwnReview] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadReviews = () => {
    setLoading(true)
    return getLocationReviewsApi(locationId, { page: 1, pageSize: 10 })
      .then((result) => {
        setReviews(result.data)
        setPagination(result.meta)
      })
      .catch(() => message.error('Không thể tải danh sách đánh giá.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    getLocationReviewsApi(locationId, { page: 1, pageSize: 10 })
      .then((result) => {
        if (!active) return
        setReviews(result.data)
        setPagination(result.meta)
      })
      .catch(() => { if (active) message.error('Không thể tải danh sách đánh giá.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [locationId])

  useEffect(() => {
    form.setFieldsValue({ rating: ownReview?.rating ?? 0, comment: ownReview?.comment ?? '' })
  }, [ownReview, form])

  useEffect(() => {
    let active = true
    if (!isAuthenticated) {
      return () => { active = false }
    }

    getMyLocationReviewApi(locationId)
      .then((result) => { if (active) setOwnReview(result) })
      .catch(() => { if (active) message.error('Không thể tải đánh giá của bạn.') })
    return () => { active = false }
  }, [locationId, isAuthenticated, form])

  const submit = async (values) => {
    setSaving(true)
    try {
      const result = await saveLocationReviewApi(locationId, values)
      onSummaryChange(result.ratingSummary)
      const [myReview] = await Promise.all([
        getMyLocationReviewApi(locationId),
        loadReviews(),
      ])
      setOwnReview(myReview)
      message.success('Đã lưu đánh giá của bạn.')
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
      await loadReviews()
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
      const result = await getLocationReviewsApi(locationId, { page: nextPage, pageSize: 10 })
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

  const communityReviews = reviews.filter((review) => review.userId !== user?.id)

  return (
    <section className={styles.reviews}>
      <span className={styles.eyebrow}>Cộng đồng</span>
      <h2>Đánh giá địa điểm</h2>
      {isAuthenticated ? (
        <Form form={form} layout="vertical" onFinish={submit} className={styles.form}>
          <div className={styles.formHeader}>
            <h3>Đánh giá của bạn</h3>
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
          <Form.Item name="rating" label="Trải nghiệm của bạn" rules={[{ required: true, type: 'number', min: 1, message: 'Vui lòng chọn số sao.' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Chia sẻ cảm nhận (không bắt buộc)">
            <Input.TextArea rows={3} maxLength={1000} showCount placeholder="Điều gì khiến địa điểm này đáng ghé thăm?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Lưu đánh giá</Button>
        </Form>
      ) : <p className={styles.loginHint}><Link to="/login">Đăng nhập</Link> để viết đánh giá.</p>}

      <h3 className={styles.communityTitle}>Đánh giá từ cộng đồng</h3>
      <div className={styles.list} aria-busy={loading}>
        {!loading && communityReviews.length === 0 ? <Empty description="Chưa có đánh giá nào khác" /> : communityReviews.map((review) => (
          <article key={review.id} className={styles.item}>
            <Avatar src={review.author.avatarUrl} icon={<UserOutlined />} />
            <div>
              <div className={styles.itemHeader}><strong>{review.author.displayName}</strong><Rate disabled value={review.rating} /></div>
              {review.comment ? <p>{review.comment}</p> : null}
              <time>{new Date(review.updatedAt).toLocaleDateString('vi-VN')}</time>
            </div>
          </article>
        ))}
        {!loading && pagination.page < pagination.totalPages ? (
          <Button className={styles.loadMore} loading={loadingMore} onClick={loadMore}>
            Xem thêm đánh giá
          </Button>
        ) : null}
      </div>
    </section>
  )
}
