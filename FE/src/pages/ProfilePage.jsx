import { Card, Descriptions, Typography } from 'antd'
import { useAuth } from '../auth/useAuth'

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <main className="page-container">
      <Typography.Title level={2}>Hồ sơ của tôi</Typography.Title>
      <Card>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Tên hiển thị">
            {user?.displayName}
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">{user?.role}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            {user?.status}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </main>
  )
}
