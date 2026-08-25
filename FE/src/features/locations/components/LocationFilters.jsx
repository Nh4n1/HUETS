import { FilterOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, Drawer, Radio, Select, Spin } from 'antd'
import styles from './LocationFilters.module.css'

function ReferenceFields({ categoryCode, wardCode, categories, wards, referencesLoading, onCategoryChange, onWardChange }) {
  return <>
    <section className={styles.filterSection}>
      <span className={styles.filterSectionTitle}>Danh mục</span>
      <Select value={categoryCode || undefined} loading={referencesLoading} allowClear showSearch optionFilterProp="label"
        placeholder="Tất cả danh mục" options={categories.map((item) => ({ value: item.code, label: item.name }))}
        onChange={onCategoryChange} />
    </section>
    <section className={styles.filterSection}>
      <span className={styles.filterSectionTitle}>Khu vực</span>
      <Select value={wardCode || undefined} loading={referencesLoading} allowClear showSearch optionFilterProp="label"
        placeholder="Toàn thành phố Huế" options={wards.map((item) => ({ value: item.code, label: item.name }))}
        onChange={onWardChange} />
    </section>
  </>
}

function BrowseFilterFields({ categoryCode, requiredTagCodes, tagGroups, tagsLoading, onBrowseTagGroupChange, ...referenceProps }) {
  return (
    <div className={styles.fields}>
      <ReferenceFields categoryCode={categoryCode} {...referenceProps} />
      <section className={styles.filterSection}>
        <span className={styles.filterSectionTitle}>Đặc điểm</span>
        {!categoryCode ? <p className={styles.tagHint}>Chọn danh mục để xem các đặc điểm phù hợp.</p> : null}
        {tagsLoading ? <Spin size="small" /> : null}
        {!tagsLoading && categoryCode ? tagGroups.map((group) => {
          const groupCodes = new Set(group.tags.map((tag) => tag.code))
          const selected = requiredTagCodes.filter((code) => groupCodes.has(code))
          return (
            <div className={styles.tagGroup} key={group.code}>
              <div className={styles.tagGroupHeading}>
                <strong>{group.name}</strong>
                {group.selectionMode === 'single' && selected.length ? (
                  <button type="button" onClick={() => onBrowseTagGroupChange(group, [])}>Bỏ chọn</button>
                ) : null}
              </div>
              {group.selectionMode === 'single' ? (
                <Radio.Group value={selected[0]} onChange={(event) => onBrowseTagGroupChange(group, [event.target.value])}>
                  <div className={styles.tagChoices}>{group.tags.map((tag) => <Radio key={tag.code} value={tag.code}>{tag.name}</Radio>)}</div>
                </Radio.Group>
              ) : (
                <Checkbox.Group value={selected} onChange={(codes) => onBrowseTagGroupChange(group, codes)}>
                  <div className={styles.tagChoices}>{group.tags.map((tag) => <Checkbox key={tag.code} value={tag.code}>{tag.name}</Checkbox>)}</div>
                </Checkbox.Group>
              )}
            </div>
          )
        }) : null}
      </section>
    </div>
  )
}

function SearchCriteriaFields({ categoryCode, wardCode, requiredTagCodes, preferredTagCodes, categories, wards,
  tagOptions, referencesLoading, tagsLoading, onCategoryChange, onWardChange, onRequiredTagsChange, onPreferredTagsChange }) {
  return (
    <div className={styles.fields}>
      <ReferenceFields categoryCode={categoryCode} wardCode={wardCode} categories={categories} wards={wards}
        referencesLoading={referencesLoading} onCategoryChange={onCategoryChange} onWardChange={onWardChange} />
      <section className={styles.filterSection}>
        <span className={styles.filterSectionTitle}>Tiêu chí tìm kiếm</span>
        <label><span>Đặc điểm bắt buộc</span><Select mode="multiple" value={requiredTagCodes} loading={tagsLoading}
          disabled={!categoryCode} maxTagCount="responsive" placeholder={categoryCode ? 'Địa điểm phải có…' : 'Chọn danh mục trước'}
          options={tagOptions} onChange={onRequiredTagsChange} /></label>
        <label><span>Đặc điểm ưu tiên</span><Select mode="multiple" value={preferredTagCodes} loading={tagsLoading}
          disabled={!categoryCode} maxTagCount="responsive" placeholder={categoryCode ? 'Có thì xếp hạng cao hơn…' : 'Chọn danh mục trước'}
          options={tagOptions} onChange={onPreferredTagsChange} /></label>
      </section>
    </div>
  )
}

export function LocationFilters({ mode, open, activeFilterCount, referenceError, onClose, onReset, ...fieldProps }) {
  const fields = mode === 'browse' ? <BrowseFilterFields {...fieldProps} /> : <SearchCriteriaFields {...fieldProps} />
  return <>
    <aside className={styles.desktopPanel} aria-label={mode === 'browse' ? 'Bộ lọc địa điểm' : 'Tiêu chí tìm kiếm'}>
      <div className={styles.heading}><span className={styles.headingIcon}><FilterOutlined /></span>
        <div><span>{mode === 'browse' ? 'Tinh chỉnh kết quả' : 'Điều chỉnh yêu cầu'}</span><strong>Bộ lọc</strong></div>
        {activeFilterCount > 0 ? <button type="button" onClick={onReset}>Đặt lại</button> : null}
      </div>
      {referenceError ? <Alert type="warning" showIcon title={referenceError} /> : null}{fields}
    </aside>
    <Drawer className={styles.mobileDrawer} title={`Bộ lọc${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
      placement="bottom" size="min(80svh, 38rem)" open={open} onClose={onClose}
      extra={activeFilterCount > 0 ? <Button type="link" onClick={onReset}>Đặt lại</Button> : null}
      footer={<Button type="primary" block onClick={onClose}>Xem kết quả</Button>}>
      {referenceError ? <Alert type="warning" showIcon title={referenceError} /> : null}{fields}
    </Drawer>
  </>
}
