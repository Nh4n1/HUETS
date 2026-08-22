import { App, Alert, Typography } from 'antd'
import { useNavigate } from 'react-router'
import { LocationSubmitForm } from '../components/LocationSubmitForm'
import styles from './LocationWorkflowPage.module.css'

export function ContributeLocationPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  function handleSuccess() {
    message.success('Cảm ơn bạn đã đóng góp! Địa điểm sẽ được hiển thị sau khi quản trị viên duyệt.')
    navigate('/locations')
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Cùng xây bản đồ Huế</span>
          <Typography.Title level={2}>Đóng góp địa điểm mới</Typography.Title>
          <p>Chia sẻ một địa điểm hữu ích để cộng đồng có thêm trải nghiệm đáng nhớ.</p>
        </div>
      </header>

      <Alert
        type="info"
        showIcon
        message="Địa điểm bạn gửi sẽ vào hàng chờ kiểm duyệt"
        description="Sau khi quản trị viên duyệt, địa điểm sẽ hiển thị công khai trên HueTrip."
      />

      <div className={styles.formShell}>
        <LocationSubmitForm submitLabel="Gửi đóng góp" onSuccess={handleSuccess} />
      </div>
    </main>
  )
}
