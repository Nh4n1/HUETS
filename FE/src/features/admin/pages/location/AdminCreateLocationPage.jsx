import { App, Typography } from 'antd'
import { useNavigate } from 'react-router'
import { LocationSubmitForm } from '../../../locations/components/LocationSubmitForm'
import styles from '../AdminPage.module.css'

export function AdminCreateLocationPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  function handleSuccess() {
    message.success('Tạo địa điểm thành công.')
    navigate('/admin/locations')
  }

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Quản lý địa điểm</span>
          <Typography.Title level={2}>Thêm địa điểm mới</Typography.Title>
          <p>Điền thông tin theo từng nhóm để tạo một địa điểm đầy đủ và dễ khám phá.</p>
        </div>
      </header>
      <div className={styles.formShell}>
        <LocationSubmitForm submitLabel="Tạo địa điểm" onSuccess={handleSuccess} />
      </div>
    </main>
  )
}
