import { Button, Checkbox, Drawer, Empty, Space, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import styles from '../../pages/reference/AdminReferencePage.module.css'

export function CategoryTagRulesEditor({ open, category, groups, saving, onClose, onSave }) {
  if (!open || !category) return null
  return <CategoryTagRulesEditorState key={category.code} category={category} groups={groups} saving={saving} onClose={onClose} onSave={onSave} />
}

function CategoryTagRulesEditorState({ category, groups, saving, onClose, onSave }) {
  const [allowed, setAllowed] = useState(() => new Set(category.allowedTagCodes))

  const catalogGroups = useMemo(() => groups.filter((group) => group.tags.length > 0), [groups])

  function toggleAllowed(code, checked) {
    setAllowed((current) => {
      const next = new Set(current)
      if (checked) next.add(code)
      else next.delete(code)
      return next
    })
  }

  return (
    <Drawer
      title={category ? `Quy tắc Tag · ${category.name}` : 'Quy tắc Tag'}
      open
      width={640}
      onClose={onClose}
      extra={(
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={() => onSave({
              allowedTagCodes: [...allowed],
            })}
          >
            Lưu quy tắc
          </Button>
        </Space>
      )}
    >
      <Typography.Paragraph type="secondary">
        Chọn các Tag được phép sử dụng với danh mục này.
      </Typography.Paragraph>
      {catalogGroups.length === 0 ? <Empty description="Chưa có Tag" /> : catalogGroups.map((group) => (
        <section className={styles.ruleGroup} key={group.code}>
          <div className={styles.ruleGroupTitle}>
            <strong>{group.name}</strong>
            <Space>
              <Tag>{group.selectionMode === 'single' ? 'Chọn một' : 'Chọn nhiều'}</Tag>
              {!group.isActive ? <Tag>Nhóm đã ngừng</Tag> : null}
            </Space>
          </div>
          {group.tags.map((tag) => (
            <div className={styles.ruleRow} key={tag.code}>
              <Checkbox
                checked={allowed.has(tag.code)}
                disabled={!tag.isActive && !allowed.has(tag.code)}
                onChange={(event) => toggleAllowed(tag.code, event.target.checked)}
              >
                {tag.name} <Typography.Text type="secondary">· {tag.code}</Typography.Text> {!tag.isActive ? <Tag>Đã ngừng</Tag> : null}
              </Checkbox>
            </div>
          ))}
        </section>
      ))}
    </Drawer>
  )
}
