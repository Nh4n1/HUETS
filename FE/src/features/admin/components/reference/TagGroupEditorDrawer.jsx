import { Button, Drawer, Form, Input, InputNumber, Select, Space } from 'antd'
import { useEffect } from 'react'
import { TAXONOMY_CODE_RULES } from './taxonomyError'

export function TagGroupEditorDrawer({ open, group, saving, onClose, onSave }) {
  const [form] = Form.useForm()
  const editing = Boolean(group)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(group ?? { code: '', name: '', selectionMode: 'multiple', sortOrder: 0 })
  }, [form, group, open])

  return (
    <Drawer
      title={editing ? 'Chỉnh sửa nhóm Tag' : 'Thêm nhóm Tag'}
      open={open}
      width={500}
      destroyOnHidden
      onClose={onClose}
      extra={<Space><Button onClick={onClose}>Hủy</Button><Button type="primary" loading={saving} onClick={() => form.submit()}>Lưu</Button></Space>}
    >
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="code" label="Code" rules={TAXONOMY_CODE_RULES}><Input disabled={editing} placeholder="accessibility" /></Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input /></Form.Item>
        <Form.Item name="selectionMode" label="Cách chọn" rules={[{ required: true }]}>
          <Select disabled={editing} options={[{ value: 'multiple', label: 'Chọn nhiều' }, { value: 'single', label: 'Chọn một' }]} />
        </Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự" rules={[{ required: true }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Drawer>
  )
}
