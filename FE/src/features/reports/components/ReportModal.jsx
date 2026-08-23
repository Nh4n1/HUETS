import { Alert, App, Form, Input, Modal, Radio, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { createReportApi } from '../api/reportApi'
import {
  getReportErrorFeedback,
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASON_OPTIONS,
  REPORT_TARGETS,
  validateReportDetail,
} from '../reportDomain'
import styles from './ReportModal.module.css'

export function ReportModal({
  open,
  targetType,
  targetId,
  contextLabel,
  onClose,
  onSubmitted,
  onUnavailable,
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const reasonCode = Form.useWatch('reasonCode', form)
  const hasValidTarget = Boolean(REPORT_TARGETS[targetType] && targetId)

  useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [open, targetId, targetType, form])

  const handleCancel = () => {
    if (submitting) return
    onClose?.()
  }

  const handleSubmit = async (values) => {
    if (submitting) return
    if (!hasValidTarget) {
      message.error('Không xác định được nội dung cần báo cáo.')
      return
    }

    setSubmitting(true)
    try {
      const report = await createReportApi({
        targetType,
        targetId,
        reasonCode: values.reasonCode,
        detail: values.detail,
      })
      message.success('Cảm ơn bạn. Báo cáo đã được ghi nhận và sẽ được xem xét.')
      onSubmitted?.(report)
      onClose?.()
    } catch (error) {
      const feedback = getReportErrorFeedback(error)
      message.open({ type: feedback.type, content: feedback.message })

      if (feedback.markSubmitted) {
        onSubmitted?.({ targetType, targetId, duplicate: true })
      }
      if (feedback.disableTarget) onUnavailable?.()
      if (feedback.closeModal) onClose?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={REPORT_TARGETS[targetType]?.title ?? 'Báo cáo nội dung'}
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      okText="Gửi báo cáo"
      cancelText="Hủy"
      okButtonProps={{ danger: true, loading: submitting, disabled: !hasValidTarget || !reasonCode }}
      cancelButtonProps={{ disabled: submitting }}
      closable={!submitting}
      keyboard={!submitting}
      maskClosable={!submitting}
      destroyOnHidden
    >
      {contextLabel ? (
        <Alert
          type="warning"
          showIcon
          message={contextLabel}
          description="Chỉ báo cáo nội dung vi phạm. Các báo cáo không chính xác có thể làm chậm quá trình xử lý."
          className={styles.contextAlert}
        />
      ) : null}
      <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={false}>
        <Form.Item
          name="reasonCode"
          label="Lý do báo cáo"
          rules={[{ required: true, message: 'Vui lòng chọn lý do.' }]}
        >
          <Radio.Group className={styles.reasonGroup} aria-label="Lý do báo cáo">
            {REPORT_REASON_OPTIONS.map((option) => (
              <Radio className={styles.reasonOption} value={option.value} key={option.value}>
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="detail"
          label={reasonCode === 'other' ? 'Mô tả thêm (bắt buộc)' : 'Mô tả thêm (không bắt buộc)'}
          dependencies={['reasonCode']}
          rules={[
            ({ getFieldValue }) => ({
              validator: (_, value) => {
                const validationMessage = validateReportDetail(getFieldValue('reasonCode'), value)
                return validationMessage
                  ? Promise.reject(new Error(validationMessage))
                  : Promise.resolve()
              },
            }),
          ]}
        >
          <Input.TextArea
            rows={4}
            maxLength={REPORT_DETAIL_MAX_LENGTH}
            showCount
            placeholder={reasonCode === 'other'
              ? 'Mô tả rõ vấn đề để đội ngũ có thể xem xét...'
              : 'Cung cấp thêm chi tiết giúp chúng tôi xử lý chính xác hơn...'}
          />
        </Form.Item>
        <Typography.Paragraph type="secondary" className={styles.privacyNote}>
          Danh tính người báo cáo không hiển thị cho chủ nội dung.
        </Typography.Paragraph>
      </Form>
    </Modal>
  )
}
