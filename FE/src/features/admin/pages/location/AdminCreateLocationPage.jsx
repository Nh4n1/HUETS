import { App, Typography } from 'antd'
import { useNavigate } from 'react-router'
import { LocationSubmitForm } from '../../../locations/components/LocationSubmitForm'

export function AdminCreateLocationPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  function handleSuccess() {
    message.success('Tạo địa điểm thành công.')
    navigate('/admin/locations')
  }

  return (
    <main className="page-container">
      <Typography.Title level={2}>Thêm địa điểm mới</Typography.Title>

      <LocationSubmitForm submitLabel="Tạo địa điểm" onSuccess={handleSuccess} />
    </main>
  )
}