import { InboxOutlined } from '@ant-design/icons'
import { Alert, App, Form, Input, Modal, Radio, Typography, Upload } from 'antd'
import { useEffect, useState } from 'react'
import { uploadFileToCloudinary } from '../../../shared/api/uploadApi'
import {
  confirmReportUploadsApi,
  createReportApi,
  deleteReportUploadedImageApi,
  getReportUploadSignatureApi,
} from '../api/reportApi'
import {
  getReportErrorFeedback,
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_IMAGE_TYPES,
  REPORT_MAX_IMAGE_BYTES,
  REPORT_MAX_IMAGES,
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
  const [files, setFiles] = useState([])
  const [imageError, setImageError] = useState('')
  const reasonCode = Form.useWatch('reasonCode', form)
  const hasValidTarget = Boolean(REPORT_TARGETS[targetType] && targetId)

  useEffect(() => {
    let active = true
    if (open) {
      form.resetFields()
      queueMicrotask(() => {
        if (!active) return
        setFiles([])
        setImageError('')
      })
    }
    return () => { active = false }
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
    setImageError('')
    const uploadedPublicIds = []
    try {
      let imageAssetTokens = []
      if (files.length > 0) {
        const signature = await getReportUploadSignatureApi()
        const results = []
        for (const item of files) {
          const result = await uploadFileToCloudinary(item.originFileObj, signature)
          results.push({ secureUrl: result.secure_url, publicId: result.public_id, bytes: result.bytes, format: result.format })
          uploadedPublicIds.push(result.public_id)
        }
        const confirmed = await confirmReportUploadsApi(results)
        imageAssetTokens = confirmed.assets.map(({ assetToken }) => assetToken)
      }
      const report = await createReportApi({
        targetType,
        targetId,
        reasonCode: values.reasonCode,
        detail: values.detail,
        imageAssetTokens,
      })
      message.success('Cảm ơn bạn. Báo cáo đã được ghi nhận và sẽ được xem xét.')
      onSubmitted?.(report)
      onClose?.()
    } catch (error) {
      await Promise.allSettled(uploadedPublicIds.map((publicId) => deleteReportUploadedImageApi(publicId)))
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
        <Form.Item
          label="Ảnh chứng cứ (không bắt buộc)"
          extra={`Tối đa ${REPORT_MAX_IMAGES} ảnh JPG, PNG hoặc WebP · 5 MB/ảnh`}
        >
          <Upload.Dragger
            multiple
            accept={REPORT_IMAGE_TYPES.join(',')}
            listType="picture"
            fileList={files}
            beforeUpload={() => false}
            disabled={submitting}
            onChange={({ fileList }) => {
              const next = fileList.slice(0, REPORT_MAX_IMAGES)
              const invalid = next.find(({ originFileObj }) => (
                !REPORT_IMAGE_TYPES.includes(originFileObj?.type)
                || originFileObj?.size > REPORT_MAX_IMAGE_BYTES
              ))
              if (invalid) {
                setImageError('Ảnh chỉ hỗ trợ JPG, PNG, WebP và không vượt quá 5 MB.')
                return
              }
              setImageError(fileList.length > REPORT_MAX_IMAGES
                ? `Chỉ có thể đính kèm tối đa ${REPORT_MAX_IMAGES} ảnh.`
                : '')
              setFiles(next)
            }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p>Chọn hoặc kéo ảnh chứng cứ vào đây</p>
          </Upload.Dragger>
          {imageError ? <Alert className={styles.imageError} type="error" showIcon message={imageError} /> : null}
        </Form.Item>
        <Typography.Paragraph type="secondary" className={styles.privacyNote}>
          Danh tính người báo cáo không hiển thị cho chủ nội dung.
        </Typography.Paragraph>
      </Form>
    </Modal>
  )
}
