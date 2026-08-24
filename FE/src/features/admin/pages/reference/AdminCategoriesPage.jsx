import { EditOutlined, PlusOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons'
import { Alert, App, Button, Input, Select, Space, Switch, Table, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import {
  createAdminCategoryApi,
  getAdminCategoriesApi,
  getAdminTagGroupsApi,
  updateAdminCategoryApi,
  updateCategoryTagRulesApi,
} from '../../api/adminReferenceApi'
import { CategoryEditorDrawer } from '../../components/reference/CategoryEditorDrawer'
import { CategoryTagRulesEditor } from '../../components/reference/CategoryTagRulesEditor'
import { taxonomyErrorMessage } from '../../components/reference/taxonomyError'
import styles from './AdminReferencePage.module.css'

export function AdminCategoriesPage() {
  const { message, modal } = App.useApp()
  const [categories, setCategories] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [editor, setEditor] = useState({ open: false, category: null })
  const [rulesCategory, setRulesCategory] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [categoryData, groupData] = await Promise.all([
        getAdminCategoriesApi({ q: q || undefined, status }),
        getAdminTagGroupsApi(),
      ])
      setCategories(categoryData)
      setGroups(groupData)
      setError('')
    } catch (requestError) {
      setError(taxonomyErrorMessage(requestError, 'Không thể tải dữ liệu danh mục.'))
    } finally {
      setLoading(false)
    }
  }, [q, status])

  useEffect(() => {
    const timeout = setTimeout(load, 250)
    return () => clearTimeout(timeout)
  }, [load])

  async function saveCategory(values) {
    try {
      setSaving(true)
      if (editor.category) {
        await updateAdminCategoryApi(editor.category.code, {
          name: values.name,
          description: values.description,
          sortOrder: values.sortOrder,
        })
        message.success('Đã cập nhật danh mục.')
      } else {
        await createAdminCategoryApi({ ...values, allowedTagCodes: [] })
        message.success('Đã tạo danh mục.')
      }
      setEditor({ open: false, category: null })
      await load()
    } catch (requestError) {
      message.error(taxonomyErrorMessage(requestError, 'Không thể lưu danh mục.'))
    } finally {
      setSaving(false)
    }
  }

  async function setActive(category, isActive) {
    try {
      await updateAdminCategoryApi(category.code, { isActive })
      message.success(isActive ? 'Đã kích hoạt danh mục.' : 'Đã ngừng danh mục.')
      await load()
    } catch (requestError) {
      modal.error({
        title: 'Không thể thay đổi trạng thái',
        content: taxonomyErrorMessage(requestError, 'Không thể cập nhật danh mục.'),
      })
    }
  }

  async function saveRules(payload) {
    try {
      setSaving(true)
      await updateCategoryTagRulesApi(rulesCategory.code, payload)
      message.success('Đã cập nhật quy tắc Tag.')
      setRulesCategory(null)
      await load()
    } catch (requestError) {
      modal.error({
        title: 'Không thể lưu quy tắc',
        content: taxonomyErrorMessage(requestError, 'Không thể cập nhật quy tắc Tag.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Danh mục', dataIndex: 'name', render: (name, row) => <><strong>{name}</strong><br /><Typography.Text type="secondary">{row.code}</Typography.Text></> },
    { title: 'Thứ tự', dataIndex: 'sortOrder', width: 90 },
    { title: 'Sử dụng', dataIndex: 'locationUsageCount', width: 100 },
    { title: 'Tag', width: 130, render: (_, row) => `${row.allowedTagCount} cho phép` },
    { title: 'Trạng thái', dataIndex: 'isActive', width: 130, render: (active, row) => <Switch checked={active} checkedChildren="Bật" unCheckedChildren="Tắt" onChange={(checked) => setActive(row, checked)} /> },
    {
      title: 'Thao tác', width: 220, render: (_, row) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditor({ open: true, category: row })}>Sửa</Button>
          <Button size="small" icon={<TagsOutlined />} onClick={() => setRulesCategory(row)}>Quy tắc Tag</Button>
        </Space>
      ),
    },
  ]

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Dữ liệu tham chiếu</span><Typography.Title level={2}>Danh mục địa điểm</Typography.Title><Typography.Text type="secondary">Quản lý danh mục và các Tag được phép dùng tại runtime.</Typography.Text></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ open: true, category: null })}>Thêm danh mục</Button>
      </header>
      <div className={styles.toolbar}>
        <Input className={styles.search} allowClear prefix={<SearchOutlined />} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tên hoặc code" />
        <Select value={status} onChange={setStatus} options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Đã ngừng' }]} />
      </div>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      <section className={styles.card}>
        <Table rowKey="code" loading={loading} dataSource={categories} columns={columns} pagination={false} scroll={{ x: 900 }} locale={{ emptyText: 'Chưa có danh mục.' }} />
      </section>
      <CategoryEditorDrawer open={editor.open} category={editor.category} saving={saving} onClose={() => setEditor({ open: false, category: null })} onSave={saveCategory} />
      <CategoryTagRulesEditor open={Boolean(rulesCategory)} category={rulesCategory} groups={groups} saving={saving} onClose={() => setRulesCategory(null)} onSave={saveRules} />
    </main>
  )
}
