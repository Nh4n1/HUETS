import { EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Space, Typography } from 'antd'
import { Link } from 'react-router'

export function AdminOverviewPage() {
  return (
    <main className="page-container">
      <Typography.Title level={2}>Tổng quan</Typography.Title>
      <Typography.Paragraph type="secondary">
        Chào mừng đến với trang quản trị HueTrip. Chọn một mục ở thanh điều
        hướng bên trái hoặc dùng thao tác nhanh bên dưới để bắt đầu.
      </Typography.Paragraph>

      <Space size="middle" wrap>
        <Card style={{ width: 280 }}>
          <Space direction="vertical">
            <EnvironmentOutlined style={{ fontSize: 24 }} />
            <Typography.Text strong>Địa điểm</Typography.Text>
            <Link to="/admin/locations">
              <Button>Xem tất cả địa điểm</Button>
            </Link>
          </Space>
        </Card>

        <Card style={{ width: 280 }}>
          <Space direction="vertical">
            <PlusOutlined style={{ fontSize: 24 }} />
            <Typography.Text strong>Thêm mới</Typography.Text>
            <Link to="/admin/locations/new">
              <Button type="primary">Thêm địa điểm mới</Button>
            </Link>
          </Space>
        </Card>
      </Space>
    </main>
  )
}
