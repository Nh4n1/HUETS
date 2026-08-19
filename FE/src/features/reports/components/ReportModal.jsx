import { Alert, Form, Input, Modal, Radio, message } from 'antd'
import { useEffect, useState } from 'react'
import { createReportApi } from '../api/reportApi'
import styles from './ReportModal.module.css'

const REASON_OPTIONS = [
  { value: 'spam', label: 'Spam / quảng cáo' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'incorrect_info', label: 'Thông tin sai lệch' },
  { value: 'offensive', label: 'Ngôn từ xúc phạm, gây khó chịu' },
  { value: 'other', label: 'Lý do khác' },
]

const TARGET_TITLES = {
  location: 'Báo cáo địa điểm',
  locationReview: 'Báo cáo đánh giá',
  itinerary: 'Báo cáo lịch trình',
}

export function ReportModal({ open, targetType, targetId, contextLabel, onClose }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [open, form])

  const handleCancel = () => {
    if (submitting) return
    onClose?.()
  }

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await createReportApi({
        targetType,
        targetId,
        reasonCode: values.reasonCode,
        detail: values.detail,
      })
      message.success('Cảm ơn bạn đã báo cáo. Đội ngũ HUETS sẽ xem xét sớm nhất có thể.')
      onClose?.()
    } catch (error) {
      if (error.response?.status === 409) {
        message.info(error.response?.data?.message ?? 'Bạn đã báo cáo nội dung này rồi.')
        onClose?.()
        return
      }
      message.error(error.response?.data?.message ?? 'Không thể gửi báo cáo. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={TARGET_TITLES[targetType] ?? 'Báo cáo nội dung'}
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      okText="Gửi báo cáo"
      cancelText="Hủy"
      okButtonProps={{ danger: true, loading: submitting }}
      cancelButtonProps={{ disabled: submitting }}
      destroyOnClose
    >
      {contextLabel ? (
        <Alert type="warning" showIcon message={contextLabel} className={styles.contextAlert} />
      ) : null}
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ reasonCode: 'spam' }}>
        <Form.Item
          name="reasonCode"
          label="Lý do báo cáo"
          rules={[{ required: true, message: 'Vui lòng chọn lý do.' }]}
        >
          <Radio.Group options={REASON_OPTIONS} className={styles.reasonGroup} />
        </Form.Item>
        <Form.Item name="detail" label="Mô tả thêm (không bắt buộc)">
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="Cho chúng tôi biết thêm chi tiết về vấn đề bạn gặp phải..."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}