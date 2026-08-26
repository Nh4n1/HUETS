import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Radio, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import { formatVoucherBenefit } from '../voucherPresentation'
import styles from '../pages/VoucherPages.module.css'

export function VoucherForm({ initialVoucher, loading, onSave }) {
  const [form] = Form.useForm()
  const benefit = Form.useWatch('benefit', form)

  useEffect(() => {
    if (!initialVoucher) return
    form.setFieldsValue({
      ...initialVoucher,
      claimStartAt: dayjs(initialVoucher.claimStartAt),
      claimEndAt: dayjs(initialVoucher.claimEndAt),
      redeemUntil: dayjs(initialVoucher.redeemUntil),
    })
  }, [form, initialVoucher])

  async function submit(publish) {
    const values = await form.validateFields()
    await onSave({
      ...values,
      claimStartAt: values.claimStartAt.toISOString(),
      claimEndAt: values.claimEndAt.toISOString(),
      redeemUntil: values.redeemUntil.toISOString(),
    }, publish)
  }

  return (
    <Form form={form} layout="vertical" initialValues={{ benefit: { type: 'percentage' }, totalQuantity: 50 }}>
      <div className={styles.formGrid}>
        <div className={styles.formStack}>
          <Card title="Nội dung Voucher">
            <Form.Item name="title" label="Tên Voucher" rules={[{ required: true, whitespace: true }, { min: 5, max: 120 }]}><Input /></Form.Item>
            <Form.Item name="description" label="Mô tả ngắn" rules={[{ required: true, whitespace: true }, { max: 300 }]}><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="imageUrl" label="URL ảnh (tùy chọn)" rules={[{ type: 'url', warningOnly: true }]}><Input placeholder="Để trống để dùng ảnh Location" /></Form.Item>
            <Form.Item name={['benefit', 'type']} label="Loại ưu đãi" rules={[{ required: true }]}><Radio.Group options={[{ value: 'percentage', label: 'Phần trăm' }, { value: 'fixed_amount', label: 'Số tiền cố định' }]} /></Form.Item>
            <Form.Item name={['benefit', 'value']} label="Giá trị ưu đãi" rules={[{ required: true }]}><InputNumber min={1} max={benefit?.type === 'percentage' ? 100 : undefined} addonAfter={benefit?.type === 'percentage' ? '%' : 'VND'} style={{ width: '100%' }} /></Form.Item>
            {benefit?.type === 'percentage' ? <Form.Item name={['benefit', 'maxDiscountAmount']} label="Giảm tối đa"><InputNumber min={0} addonAfter="VND" style={{ width: '100%' }} /></Form.Item> : null}
            <Form.Item name={['benefit', 'minOrderAmount']} label="Đơn hàng tối thiểu"><InputNumber min={0} addonAfter="VND" style={{ width: '100%' }} /></Form.Item>
          </Card>
          <Card title="Phát hành và sử dụng">
            <Form.Item name="claimStartAt" label="Bắt đầu nhận" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="claimEndAt" label="Kết thúc nhận" dependencies={['claimStartAt']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || !getFieldValue('claimStartAt') || value.isAfter(getFieldValue('claimStartAt')) ? Promise.resolve() : Promise.reject(new Error('Phải sau thời gian bắt đầu.')) } })]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="redeemUntil" label="Sử dụng đến" dependencies={['claimEndAt']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || !getFieldValue('claimEndAt') || !value.isBefore(getFieldValue('claimEndAt')) ? Promise.resolve() : Promise.reject(new Error('Không được trước thời gian kết thúc nhận.')) } })]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="totalQuantity" label="Tổng số lượng" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Giới hạn mỗi User"><Input value="1 VoucherClaim" disabled /></Form.Item>
            <Form.Item name="terms" label="Điều kiện sử dụng" rules={[{ required: true, whitespace: true }, { min: 20, max: 2000 }]}><Input.TextArea rows={6} /></Form.Item>
          </Card>
        </div>
        <Card title="Xem trước" style={{ position: 'sticky', top: 16 }}>
          <Typography.Title level={3}>{Form.useWatch('title', form) || 'Tên Voucher'}</Typography.Title>
          <Typography.Title level={4} type="success">{formatVoucherBenefit(benefit) || 'Quyền lợi ưu đãi'}</Typography.Title>
          <Typography.Paragraph>{Form.useWatch('description', form) || 'Mô tả ngắn sẽ hiển thị tại đây.'}</Typography.Paragraph>
          <Alert type="info" showIcon message="Sau khi có User nhận, quyền lợi, điều kiện và hạn sử dụng sẽ bị khóa." />
        </Card>
      </div>
      <div className={styles.actions} style={{ marginTop: 16 }}>
        <Button loading={loading} onClick={() => submit(false)}>Lưu bản nháp</Button>
        <Button type="primary" loading={loading} onClick={() => submit(true)}>Lưu và phát hành</Button>
      </div>
    </Form>
  )
}
