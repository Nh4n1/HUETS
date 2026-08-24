import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Collapse, Space, Spin, Switch, Tag, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import {
  createAdminTagApi,
  createAdminTagGroupApi,
  getAdminTagGroupsApi,
  updateAdminTagApi,
  updateAdminTagGroupApi,
} from '../../api/adminReferenceApi'
import { TagEditorModal } from '../../components/reference/TagEditorModal'
import { TagGroupEditorDrawer } from '../../components/reference/TagGroupEditorDrawer'
import { taxonomyErrorMessage } from '../../components/reference/taxonomyError'
import styles from './AdminReferencePage.module.css'

export function AdminTagGroupsPage() {
  const { message, modal } = App.useApp()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [groupEditor, setGroupEditor] = useState({ open: false, group: null })
  const [tagEditor, setTagEditor] = useState({ open: false, group: null, tag: null })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setGroups(await getAdminTagGroupsApi())
      setError('')
    } catch (requestError) {
      setError(taxonomyErrorMessage(requestError, 'Không thể tải nhóm Tag.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getAdminTagGroupsApi()
      .then((data) => {
        if (!active) return
        setGroups(data)
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(taxonomyErrorMessage(requestError, 'Không thể tải nhóm Tag.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function saveGroup(values) {
    try {
      setSaving(true)
      if (groupEditor.group) {
        await updateAdminTagGroupApi(groupEditor.group.code, { name: values.name, sortOrder: values.sortOrder })
        message.success('Đã cập nhật nhóm Tag.')
      } else {
        await createAdminTagGroupApi(values)
        message.success('Đã tạo nhóm Tag.')
      }
      setGroupEditor({ open: false, group: null })
      await load()
    } catch (requestError) {
      message.error(taxonomyErrorMessage(requestError, 'Không thể lưu nhóm Tag.'))
    } finally {
      setSaving(false)
    }
  }

  async function setGroupActive(group, isActive) {
    try {
      await updateAdminTagGroupApi(group.code, { isActive })
      message.success('Đã cập nhật trạng thái nhóm Tag.')
      await load()
    } catch (requestError) {
      modal.error({ title: 'Không thể thay đổi trạng thái', content: taxonomyErrorMessage(requestError, 'Không thể cập nhật nhóm Tag.') })
    }
  }

  async function saveTag(values) {
    try {
      setSaving(true)
      if (tagEditor.tag) {
        await updateAdminTagApi(tagEditor.group.code, tagEditor.tag.code, { name: values.name, isActive: values.isActive })
        message.success('Đã cập nhật Tag.')
      } else {
        await createAdminTagApi(tagEditor.group.code, { code: values.code, name: values.name })
        message.success('Đã thêm Tag.')
      }
      setTagEditor({ open: false, group: null, tag: null })
      await load()
    } catch (requestError) {
      modal.error({ title: 'Không thể lưu Tag', content: taxonomyErrorMessage(requestError, 'Không thể lưu Tag.') })
    } finally {
      setSaving(false)
    }
  }

  const items = groups.map((group) => ({
    key: group.code,
    label: (
      <div>
        <strong>{group.name}</strong>
        <div className={styles.groupMeta}>
          <Typography.Text type="secondary">{group.code}</Typography.Text>
          <Tag>{group.selectionMode === 'single' ? 'Chọn một' : 'Chọn nhiều'}</Tag>
          <Tag color={group.isActive ? 'green' : 'default'}>{group.isActive ? 'Đang hoạt động' : 'Đã ngừng'}</Tag>
        </div>
      </div>
    ),
    extra: (
      <Space onClick={(event) => event.stopPropagation()}>
        <Switch size="small" checked={group.isActive} onChange={(checked) => setGroupActive(group, checked)} />
        <Button size="small" icon={<EditOutlined />} onClick={() => setGroupEditor({ open: true, group })}>Sửa nhóm</Button>
      </Space>
    ),
    children: (
      <div>
        <div className={styles.tagList}>
          {group.tags.map((tag) => (
            <div className={styles.tagRow} key={tag.code}>
              <div><strong>{tag.name}</strong><br /><Typography.Text type="secondary">{tag.code}</Typography.Text></div>
              <Space><Tag color={tag.isActive ? 'green' : 'default'}>{tag.isActive ? 'Hoạt động' : 'Đã ngừng'}</Tag><Button size="small" onClick={() => setTagEditor({ open: true, group, tag })}>Sửa</Button></Space>
            </div>
          ))}
        </div>
        <Button style={{ marginTop: 14 }} icon={<PlusOutlined />} onClick={() => setTagEditor({ open: true, group, tag: null })}>Thêm Tag</Button>
      </div>
    ),
  }))

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Dữ liệu tham chiếu</span><Typography.Title level={2}>Nhóm Tag và Tag</Typography.Title><Typography.Text type="secondary">Quản lý catalog đặc điểm dùng cho địa điểm và tìm kiếm.</Typography.Text></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setGroupEditor({ open: true, group: null })}>Thêm nhóm</Button>
      </header>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      <section className={styles.card}><Spin spinning={loading}><Collapse items={items} bordered={false} size="large" ghost /></Spin></section>
      <TagGroupEditorDrawer open={groupEditor.open} group={groupEditor.group} saving={saving} onClose={() => setGroupEditor({ open: false, group: null })} onSave={saveGroup} />
      <TagEditorModal open={tagEditor.open} tag={tagEditor.tag} saving={saving} onClose={() => setTagEditor({ open: false, group: null, tag: null })} onSave={saveTag} />
    </main>
  )
}
