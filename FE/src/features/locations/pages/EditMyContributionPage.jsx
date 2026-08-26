import { ArrowLeftOutlined } from '@ant-design/icons'
import { Alert, App, Button, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getMyLocationApi, updateMyLocationApi } from '../api/myLocationsApi'
import { LocationSubmitForm } from '../components/LocationSubmitForm'
import styles from './LocationWorkflowPage.module.css'

export function EditMyContributionPage() {
  const { locationId } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    getMyLocationApi(locationId)
      .then((data) => active && setLocation(data))
      .catch((error) => active && setErrorMessage(
        error.response?.data?.message ?? 'Không thể tải địa điểm cần chỉnh sửa.',
      ))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [locationId])

  async function handleSubmit(payload) {
    return updateMyLocationApi(locationId, {
      ...payload,
      expectedStatus: location.status,
      expectedUpdatedAt: location.updatedAt,
    })
  }

  function handleSuccess(updatedLocation) {
    message.success('Đã cập nhật thông tin địa điểm.')
    navigate(`/locations/mine/${updatedLocation.id}`)
  }

  if (loading) return <Spin fullscreen tip="Đang tải địa điểm..." />
  const canEdit = ['pending', 'rejected'].includes(location?.status)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.backLink} to={`/locations/mine/${locationId}`}>
            <ArrowLeftOutlined /> Quay lại chi tiết đóng góp
          </Link>
          <Typography.Title level={2}>Chỉnh sửa địa điểm đã đóng góp</Typography.Title>
          <p>Cập nhật nội dung theo thông tin mới hoặc phản hồi của kiểm duyệt viên.</p>
        </div>
      </header>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      {location && !canEdit ? (
        <Alert
          type="warning"
          showIcon
          message="Không thể chỉnh sửa địa điểm ở trạng thái hiện tại."
          description="Bạn chỉ có thể sửa địa điểm đang chờ duyệt hoặc đã bị từ chối."
          action={<Link to={`/locations/mine/${locationId}`}><Button>Xem chi tiết</Button></Link>}
        />
      ) : null}
      {location && canEdit ? (
        <div className={styles.formShell}>
          <LocationSubmitForm
            mode="edit"
            initialLocation={location}
            submitLabel="Lưu thay đổi"
            reasonRequired={false}
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
          />
        </div>
      ) : null}
    </main>
  )
}
