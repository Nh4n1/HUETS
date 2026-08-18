import { App, Alert, Typography } from 'antd'
import { useNavigate } from 'react-router'
import { LocationSubmitForm } from '../components/LocationSubmitForm'

export function ContributeLocationPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  function handleSuccess() {
    message.success('Cảm ơn bạn đã đóng góp! Địa điểm sẽ được hiển thị sau khi quản trị viên duyệt.')
    navigate('/locations')
  }

  return (
    <main className="page-container" style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <Typography.Title level={2}>Đóng góp địa điểm mới</Typography.Title>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        message="Địa điểm bạn gửi sẽ vào hàng chờ kiểm duyệt"
        description="Sau khi quản trị viên duyệt, địa điểm sẽ hiển thị công khai trên HueTrip."
      />

      <LocationSubmitForm submitLabel="Gửi đóng góp" onSuccess={handleSuccess} />
    </main>
  )
}