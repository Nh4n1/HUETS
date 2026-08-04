import { Button, Typography } from 'antd'
import { Link } from 'react-router'

export function HomePage() {
  return (
    <main className="hero-page">
      <Typography.Title>Khám phá Huế cùng HueTrip</Typography.Title>
      <Typography.Paragraph type="secondary">
        Đăng nhập để lưu địa điểm và xây dựng lịch trình của riêng bạn.
      </Typography.Paragraph>
      <Link to="/login">
        <Button type="primary" size="large">
          Bắt đầu
        </Button>
      </Link>
    </main>
  )
}
