import { Alert, App, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LocationSubmitForm } from '../../../locations/components/LocationSubmitForm'
import {
  getAdminLocationByIdApi,
  updateAdminLocationApi,
} from '../../api/adminLocationsApi'
import styles from '../AdminPage.module.css'

export function AdminEditLocationPage() {
  const { locationId } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    getAdminLocationByIdApi(locationId)
      .then((data) => {
        if (active) setLocation(data)
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error.response?.data?.message ?? 'Không thể tải địa điểm cần chỉnh sửa.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [locationId])

  async function handleSubmit(payload) {
    return updateAdminLocationApi(locationId, {
      ...payload,
      expectedUpdatedAt: location.updatedAt,
    })
  }

  function handleSuccess(updatedLocation) {
    message.success('Cập nhật địa điểm thành công.')
    navigate(`/admin/locations/${updatedLocation.id}`)
  }

  if (loading) return <Spin fullscreen tip="Đang tải địa điểm..." />

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <Link className={styles.backLink} to={`/admin/locations/${locationId}`}>
            ← Quay lại chi tiết
          </Link>
          <Typography.Title level={2}>Chỉnh sửa địa điểm</Typography.Title>
          <p>Cập nhật thông tin, vị trí, giờ hoạt động và hình ảnh địa điểm.</p>
        </div>
      </header>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      {location ? (
        <div className={styles.formShell}>
          <LocationSubmitForm
            mode="edit"
            initialLocation={location}
            submitLabel="Lưu thay đổi"
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
          />
        </div>
      ) : null}
    </main>
  )
}
