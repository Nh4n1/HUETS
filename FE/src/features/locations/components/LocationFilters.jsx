import { FilterOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, Collapse, Drawer, Radio, Select, Spin } from 'antd'
import {
  clearTagGroup,
  getSelectedCodesForGroup,
  getTagState,
  setTagRequired,
} from '../locationFilterState'
import styles from './LocationFilters.module.css'

function ReferenceFields({
  categoryCode,
  wardCode,
  categories,
  wards,
  referencesLoading,
  onCategoryChange,
  onWardChange,
}) {
  return (
    <div className={styles.basicFilters}>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>Danh mục</span>
        <Select
          value={categoryCode || undefined}
          loading={referencesLoading}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Tất cả danh mục"
          options={categories.map((item) => ({ value: item.code, label: item.name }))}
          onChange={onCategoryChange}
        />
      </div>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>Khu vực</span>
        <Select
          value={wardCode || undefined}
          loading={referencesLoading}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Toàn thành phố Huế"
          options={wards.map((item) => ({ value: item.code, label: item.name }))}
          onChange={onWardChange}
        />
      </div>
    </div>
  )
}

function TagChoice({ mode, group, tag, state, requiredTagCodes, preferredTagCodes, onTagStateChange }) {
  const stateBadge = mode === 'search' && state !== 'none' ? (
    <span className={`${styles.tagState} ${state === 'required' ? styles.requiredBadge : styles.preferredBadge}`}>
      {state === 'required' ? 'Bắt buộc' : 'Ưu tiên'}
    </span>
  ) : null

  if (group.selectionMode === 'single') {
    return (
      <div className={`${styles.tagChoice} ${state === 'preferred' ? styles.preferredChoice : ''}`}>
        <Radio value={tag.code}>
          <span className={styles.tagChoiceText}>{tag.name}</span>
        </Radio>
        {stateBadge}
      </div>
    )
  }

  return (
    <div className={`${styles.tagChoice} ${state === 'preferred' ? styles.preferredChoice : ''}`}>
      <Checkbox
        checked={state === 'required'}
        indeterminate={state === 'preferred'}
        onChange={() => onTagStateChange(setTagRequired({
          requiredTagCodes,
          preferredTagCodes,
          group,
          code: tag.code,
        }))}
      >
        <span className={styles.tagChoiceText}>{tag.name}</span>
      </Checkbox>
      {stateBadge}
    </div>
  )
}

function FeatureFields({
  mode,
  categoryCode,
  requiredTagCodes,
  preferredTagCodes,
  tagGroups,
  tagsLoading,
  tagError,
  onTagStateChange,
}) {
  const hasSelectedTags = requiredTagCodes.length + preferredTagCodes.length > 0

  const items = tagGroups.map((group) => {
    const selectedCodes = getSelectedCodesForGroup(requiredTagCodes, preferredTagCodes, group)
    return {
      key: group.code,
      label: (
        <div className={styles.tagGroupHeading}>
          <strong>{group.name}</strong>
          {group.selectionMode === 'single' && selectedCodes.length ? (
            <button
              type="button"
              className={styles.singleGroupClear}
              onClick={(event) => {
                event.stopPropagation()
                onTagStateChange(clearTagGroup({ requiredTagCodes, preferredTagCodes, group }))
              }}
            >
              Bỏ chọn
            </button>
          ) : selectedCodes.length ? <span>{selectedCodes.length}</span> : null}
        </div>
      ),
      children: group.selectionMode === 'single' ? (
        <Radio.Group
          className={styles.tagChoices}
          value={selectedCodes[0]}
          onChange={(event) => onTagStateChange(setTagRequired({
            requiredTagCodes,
            preferredTagCodes,
            group,
            code: event.target.value,
          }))}
        >
          {group.tags.map((tag) => (
            <TagChoice
              key={tag.code}
              mode={mode}
              group={group}
              tag={tag}
              state={getTagState(requiredTagCodes, preferredTagCodes, tag.code)}
              requiredTagCodes={requiredTagCodes}
              preferredTagCodes={preferredTagCodes}
              onTagStateChange={onTagStateChange}
            />
          ))}
        </Radio.Group>
      ) : (
        <div className={styles.tagChoices}>
          {group.tags.map((tag) => (
            <TagChoice
              key={tag.code}
              mode={mode}
              group={group}
              tag={tag}
              state={getTagState(requiredTagCodes, preferredTagCodes, tag.code)}
              requiredTagCodes={requiredTagCodes}
              preferredTagCodes={preferredTagCodes}
              onTagStateChange={onTagStateChange}
            />
          ))}
        </div>
      ),
    }
  })

  return (
    <section className={styles.featureSection}>
      <span className={styles.filterLabel}>Đặc điểm</span>
      <div className={styles.featureScroller}>
        {!categoryCode ? (
          <p className={styles.tagHint}>
            Chọn danh mục để xem và thêm đặc điểm.
            {hasSelectedTags ? ' Các tiêu chí hiện có vẫn đang được áp dụng.' : ''}
          </p>
        ) : null}
        {tagsLoading ? <div className={styles.tagLoading}><Spin size="small" /> Đang tải đặc điểm…</div> : null}
        {tagError ? <Alert type="warning" showIcon title={tagError} /> : null}
        {!tagsLoading && categoryCode && !tagError && tagGroups.length ? (
          <Collapse
            key={categoryCode}
            ghost
            defaultActiveKey={tagGroups.slice(0, 1).map((group) => group.code)}
            items={items}
          />
        ) : null}
        {!tagsLoading && categoryCode && !tagError && !tagGroups.length ? (
          <p className={styles.tagHint}>Danh mục này chưa có đặc điểm để lọc.</p>
        ) : null}
      </div>
    </section>
  )
}

function FilterFields(props) {
  return (
    <div className={styles.fields}>
      <ReferenceFields {...props} />
      <FeatureFields {...props} />
    </div>
  )
}

export function LocationFilters({
  mode,
  open,
  activeFilterCount,
  referenceError,
  onClose,
  onReset,
  ...fieldProps
}) {
  const resetLabel = mode === 'search' ? 'Xóa tìm kiếm' : 'Đặt lại'
  const eyebrow = mode === 'search' ? 'Tiêu chí tìm kiếm' : 'Tinh chỉnh kết quả'

  return (
    <>
      <aside className={styles.desktopPanel} aria-label={mode === 'browse' ? 'Bộ lọc địa điểm' : 'Tiêu chí tìm kiếm'}>
        <div className={styles.heading}>
          <span className={styles.headingIcon}><FilterOutlined /></span>
          <div><span>{eyebrow}</span><strong>Bộ lọc</strong></div>
          {activeFilterCount > 0 ? <button type="button" onClick={onReset}>{resetLabel}</button> : null}
        </div>
        {referenceError ? <Alert type="warning" showIcon title={referenceError} /> : null}
        <FilterFields mode={mode} {...fieldProps} />
      </aside>
      <Drawer
        className={styles.mobileDrawer}
        title={`Bộ lọc${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
        placement="bottom"
        size="min(80svh, 38rem)"
        open={open}
        onClose={onClose}
        extra={activeFilterCount > 0 ? <Button type="link" onClick={onReset}>{resetLabel}</Button> : null}
        footer={<Button type="primary" block onClick={onClose}>Xem kết quả{activeFilterCount ? ` (${activeFilterCount})` : ''}</Button>}
      >
        {referenceError ? <Alert type="warning" showIcon title={referenceError} /> : null}
        <FilterFields mode={mode} {...fieldProps} />
      </Drawer>
    </>
  )
}
