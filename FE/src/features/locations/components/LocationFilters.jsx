import { FilterOutlined } from '@ant-design/icons'
import { Alert, Button, Drawer, Select } from 'antd'
import styles from './LocationFilters.module.css'

function FilterFields({
  categoryCode,
  wardCode,
  selectedTagCodes,
  categories,
  wards,
  tagOptions,
  referencesLoading,
  tagsLoading,
  onCategoryChange,
  onWardChange,
  onTagsChange,
}) {
  return (
    <div className={styles.fields}>
      <label>
        <span>Danh mục</span>
        <Select
          value={categoryCode || undefined}
          loading={referencesLoading}
          allowClear
          placeholder="Tất cả danh mục"
          options={categories.map((category) => ({ value: category.code, label: category.name }))}
          onChange={onCategoryChange}
        />
      </label>

      <label>
        <span>Phường / xã</span>
        <Select
          value={wardCode || undefined}
          loading={referencesLoading}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Toàn thành phố Huế"
          options={wards.map((ward) => ({ value: ward.code, label: ward.name }))}
          onChange={onWardChange}
        />
      </label>

      <label>
        <span>Đặc điểm</span>
        <Select
          mode="multiple"
          value={selectedTagCodes}
          loading={tagsLoading}
          disabled={!categoryCode}
          maxTagCount="responsive"
          placeholder={categoryCode ? 'Chọn tối đa 10 đặc điểm' : 'Chọn danh mục trước'}
          options={tagOptions}
          onChange={onTagsChange}
        />
      </label>
    </div>
  )
}

export function LocationFilters({
  open,
  activeFilterCount,
  referenceError,
  onClose,
  onReset,
  ...fieldProps
}) {
  const fields = <FilterFields {...fieldProps} />

  return (
    <>
      <aside className={styles.desktopPanel} aria-label="Bộ lọc địa điểm">
        <div className={styles.heading}>
          <span className={styles.headingIcon}><FilterOutlined /></span>
          <div>
            <span>Tinh chỉnh kết quả</span>
            <strong>Bộ lọc</strong>
          </div>
          {activeFilterCount > 0 ? (
            <button type="button" onClick={onReset}>Đặt lại</button>
          ) : null}
        </div>

        {referenceError ? <Alert type="warning" showIcon message={referenceError} /> : null}
        {fields}
      </aside>

      <Drawer
        className={styles.mobileDrawer}
        title={`Bộ lọc${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
        placement="bottom"
        height="min(80svh, 38rem)"
        open={open}
        onClose={onClose}
        extra={activeFilterCount > 0 ? <Button type="link" onClick={onReset}>Đặt lại</Button> : null}
        footer={<Button type="primary" block onClick={onClose}>Xem kết quả</Button>}
      >
        {referenceError ? <Alert type="warning" showIcon message={referenceError} /> : null}
        {fields}
      </Drawer>
    </>
  )
}
