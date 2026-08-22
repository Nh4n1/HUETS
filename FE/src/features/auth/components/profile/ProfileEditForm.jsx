import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import styles from '../../pages/ProfilePage.module.css'

export function ProfileEditForm({ form, submitting, errorMessage, onCancel, onSubmit }) {
  return (
    <Card className={styles.editCard} bordered={false}>
      <Typography.Title level={3}>Cập nhật hồ sơ</Typography.Title>

      {errorMessage ? (
        <Alert className={styles.formAlert} showIcon type="error" message={errorMessage} />
      ) : null}

      <Form form={form} layout="vertical" onFinish={onSubmit} disabled={submitting}>
        <Form.Item
          name="displayName"
          label="Tên hiển thị"
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập tên hiển thị.' },
            {
              min: 2,
              transform: (value) => value?.trim(),
              message: 'Tên hiển thị phải có ít nhất 2 ký tự.',
            },
            {
              max: 80,
              transform: (value) => value?.trim(),
              message: 'Tên hiển thị không được vượt quá 80 ký tự.',
            },
          ]}
        >
          <Input maxLength={80} showCount autoComplete="name" />
        </Form.Item>

        <Form.Item
          name="bio"
          label="Giới thiệu"
          rules={[{ max: 500, message: 'Giới thiệu không được vượt quá 500 ký tự.' }]}
        >
          <Input.TextArea
            rows={5}
            maxLength={500}
            showCount
            placeholder="Chia sẻ đôi nét về bạn..."
          />
        </Form.Item>

        <div className={styles.formActions}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Lưu thay đổi
          </Button>
        </div>
      </Form>
    </Card>
  )
}
