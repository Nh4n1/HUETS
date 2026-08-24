import { Drawer, Form, Input, InputNumber, Space, Button } from 'antd'
import { useEffect } from 'react'
import { TAXONOMY_CODE_RULES } from './taxonomyError'

export function CategoryEditorDrawer({ open, category, saving, onClose, onSave }) {
  const [form] = Form.useForm()
  const editing = Boolean(category)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(category ?? {
      code: '',
      name: '',
      description: '',
      sortOrder: 0,
    })
  }, [category, form, open])

  return (
    <Drawer
      title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
      open={open}
      width={520}
      destroyOnHidden
      onClose={onClose}
      extra={(
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>Lưu</Button>
        </Space>
      )}
    >
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="code" label="Code" rules={TAXONOMY_CODE_RULES}>
          <Input disabled={editing} placeholder="wellness_spa" />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[
          { required: true, whitespace: true, message: 'Vui lòng nhập tên danh mục.' },
          { max: 100, message: 'Tên không được vượt quá 100 ký tự.' },
        ]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả" rules={[{ max: 500 }]}>
          <Input.TextArea rows={4} showCount maxLength={500} />
        </Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự" rules={[{ required: true }]}>
          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
