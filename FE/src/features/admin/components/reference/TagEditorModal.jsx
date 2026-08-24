import { Form, Input, Modal, Switch } from 'antd'
import { useEffect } from 'react'
import { TAXONOMY_CODE_RULES } from './taxonomyError'

export function TagEditorModal({ open, tag, saving, onClose, onSave }) {
  const [form] = Form.useForm()
  const editing = Boolean(tag)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(tag ?? { code: '', name: '', isActive: true })
  }, [form, open, tag])

  return (
    <Modal
      title={editing ? 'Chỉnh sửa Tag' : 'Thêm Tag'}
      open={open}
      okText={editing ? 'Lưu' : 'Thêm'}
      cancelText="Hủy"
      confirmLoading={saving}
      destroyOnHidden
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="code" label="Code" rules={TAXONOMY_CODE_RULES}><Input disabled={editing} placeholder="child_friendly" /></Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input /></Form.Item>
        {editing ? <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item> : null}
      </Form>
    </Modal>
  )
}
