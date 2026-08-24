import { InboxOutlined } from '@ant-design/icons'
import { Alert, Button, Drawer, Form, Input, Result, Select, Space, Typography, Upload } from 'antd'
import { useState } from 'react'
import { deleteUploadedImageApi, uploadFileToCloudinary } from '../../../shared/api/uploadApi'
import { confirmFeedbackUploadsApi, createFeedbackApi, getFeedbackUploadSignatureApi } from '../api/feedbackApi'
import styles from './FeedbackDrawer.module.css'

const TYPES = [
  { value: 'bug', label: 'Báo lỗi website' },
  { value: 'suggestion', label: 'Góp ý chung' },
  { value: 'feature_request', label: 'Đề xuất tính năng' },
  { value: 'usability', label: 'Giao diện / trải nghiệm' },
  { value: 'data_feedback', label: 'Góp ý dữ liệu' },
  { value: 'other', label: 'Khác' },
]
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function FeedbackDrawer({ open, user, onClose }) {
  const [form] = Form.useForm()
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function close() {
    if (submitting) return
    onClose()
    reset()
  }

  function reset() {
    form.resetFields()
    setFiles([])
    setError('')
    setSubmitted(false)
  }

  async function submit(values) {
    setSubmitting(true)
    setError('')
    const uploadedPublicIds = []
    try {
      let imageAssetTokens = []
      if (files.length > 0) {
        const signature = await getFeedbackUploadSignatureApi()
        const results = []
        for (const item of files) {
          const result = await uploadFileToCloudinary(item.originFileObj, signature)
          results.push({ secureUrl: result.secure_url, publicId: result.public_id, bytes: result.bytes, format: result.format })
          uploadedPublicIds.push(result.public_id)
        }
        const confirmed = await confirmFeedbackUploadsApi(results)
        imageAssetTokens = confirmed.assets.map(({ assetToken }) => assetToken)
      }
      await createFeedbackApi({
        ...values,
        contactEmail: values.contactEmail || null,
        imageAssetTokens,
      })
      setSubmitted(true)
    } catch (requestError) {
      await Promise.allSettled(uploadedPublicIds.map((publicId) => deleteUploadedImageApi(publicId)))
      setError(requestError.response?.status === 429
        ? 'Bạn đã gửi nhiều góp ý trong thời gian ngắn. Vui lòng thử lại sau.'
        : requestError.response?.data?.message ?? 'Không thể gửi góp ý lúc này. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer title="Góp ý cho HueTrip" open={open} width={520} destroyOnHidden onClose={close}>
      {submitted ? (
        <Result
          status="success"
          title="Cảm ơn bạn đã góp ý"
          subTitle="Ý kiến của bạn đã được ghi nhận để HueTrip cải thiện."
          extra={<Space><Button onClick={close}>Đóng</Button><Button type="primary" onClick={reset}>Gửi góp ý khác</Button></Space>}
        />
      ) : (
        <Form form={form} layout="vertical" initialValues={{ type: 'suggestion' }} onFinish={submit}>
          <Typography.Paragraph type="secondary">
            Chia sẻ lỗi, đề xuất hoặc trải nghiệm của bạn về website HueTrip. Để báo cáo một nội dung cụ thể, hãy dùng chức năng Báo cáo tại nội dung đó.
          </Typography.Paragraph>
          <Form.Item name="type" label="Bạn muốn góp ý về điều gì?" rules={[{ required: true }]}>
            <Select options={TYPES} />
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, whitespace: true }, { min: 5 }, { max: 150 }]}>
            <Input showCount maxLength={150} />
          </Form.Item>
          <Form.Item name="description" label="Nội dung" rules={[{ required: true, whitespace: true }, { min: 10 }, { max: 3000 }]}>
            <Input.TextArea rows={6} showCount maxLength={3000} />
          </Form.Item>
          {user ? (
            <Form.Item label="Ảnh minh họa" extra="Tối đa 3 ảnh JPG, PNG hoặc WebP · 5 MB/ảnh">
              <Upload.Dragger
                multiple
                accept="image/jpeg,image/png,image/webp"
                fileList={files}
                beforeUpload={() => false}
                onChange={({ fileList }) => {
                  setError('')
                  const next = fileList.slice(0, 3)
                  const invalid = next.find(({ originFileObj }) => !IMAGE_TYPES.includes(originFileObj?.type) || originFileObj?.size > MAX_IMAGE_BYTES)
                  if (invalid) {
                    setError('Ảnh chỉ hỗ trợ JPG, PNG, WebP và không vượt quá 5 MB.')
                    return
                  }
                  setFiles(next)
                }}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p>Chọn hoặc kéo ảnh vào đây</p>
              </Upload.Dragger>
            </Form.Item>
          ) : (
            <Alert className={styles.guestNotice} type="info" showIcon message="Guest có thể gửi góp ý không kèm ảnh. Đăng nhập nếu bạn muốn gửi ảnh minh họa." />
          )}
          {!user ? (
            <Form.Item name="contactEmail" label="Email liên hệ" extra="Không bắt buộc; chỉ dùng khi bạn muốn nhận phản hồi." rules={[{ type: 'email' }]}>
              <Input type="email" />
            </Form.Item>
          ) : null}
          {error ? <Alert type="error" showIcon message={error} className={styles.error} /> : null}
          <div className={styles.actions}><Button onClick={close}>Hủy</Button><Button type="primary" htmlType="submit" loading={submitting}>Gửi góp ý</Button></div>
        </Form>
      )}
    </Drawer>
  )
}
