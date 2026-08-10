import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { getCategoriesApi, getTagsByCategoryApi, getWardsApi } from '../../../shared/api/referenceApi'
import { searchPublicLocationsApi } from '../api/locationApi'
import { LocationFilters } from '../components/LocationFilters'
import { LocationResults } from '../components/LocationResults'
import { LocationSearchHero } from '../components/LocationSearchHero'
import styles from './LocationsPage.module.css'

const PAGE_SIZE = 12

function getErrorMessage(error, fallback) {
  return error.response?.data?.message ?? fallback
}

export function LocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const categoryCode = searchParams.get('categoryCode') ?? ''
  const wardCode = searchParams.get('wardCode') ?? ''
  const tagCodesParam = searchParams.get('tagCodes') ?? ''
  const selectedTagCodes = useMemo(() => tagCodesParam.split(',').filter(Boolean), [tagCodesParam])
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)

  const [locations, setLocations] = useState([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 })
  const [loadedRequestKey, setLoadedRequestKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const requestKey = `${page}|${query}|${categoryCode}|${wardCode}|${tagCodesParam}|${reloadKey}`
  const [categories, setCategories] = useState([])
  const [wards, setWards] = useState([])
  const [tagGroups, setTagGroups] = useState([])
  const [loadedTagCategory, setLoadedTagCategory] = useState('')
  const [referencesLoading, setReferencesLoading] = useState(true)
  const [referenceError, setReferenceError] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([getCategoriesApi(), getWardsApi()])
      .then(([categoryData, wardData]) => {
        if (!active) return
        setCategories(categoryData)
        setWards(wardData)
        setReferenceError('')
      })
      .catch((error) => {
        if (!active) return
        setReferenceError(getErrorMessage(error, 'Không thể tải danh mục và phường/xã.'))
      })
      .finally(() => {
        if (active) setReferencesLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!categoryCode) return () => { active = false }

    getTagsByCategoryApi(categoryCode)
      .then((result) => {
        if (active) setTagGroups(result.groups ?? [])
      })
      .catch((error) => {
        if (!active) return
        setReferenceError(getErrorMessage(error, 'Không thể tải bộ lọc đặc điểm.'))
      })
      .finally(() => {
        if (active) setLoadedTagCategory(categoryCode)
      })
    return () => { active = false }
  }, [categoryCode])

  useEffect(() => {
    let active = true
    searchPublicLocationsApi({
      page,
      pageSize: PAGE_SIZE,
      ...(query ? { q: query } : {}),
      ...(categoryCode ? { categoryCode } : {}),
      ...(wardCode ? { wardCode } : {}),
      ...(selectedTagCodes.length ? { tagCodes: selectedTagCodes.join(',') } : {}),
    })
      .then((payload) => {
        if (!active) return
        setLocations(payload.data ?? [])
        setMeta(payload.meta ?? { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 })
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setLocations([])
        setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách địa điểm.'))
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey)
      })
    return () => { active = false }
  }, [categoryCode, page, query, requestKey, selectedTagCodes, tagCodesParam, wardCode])

  const tagOptions = useMemo(() => tagGroups.flatMap((group) => (
    group.tags.map((tag) => ({ value: tag.code, label: tag.name }))
  )), [tagGroups])
  const loading = loadedRequestKey !== requestKey
  const tagsLoading = Boolean(categoryCode) && loadedTagCategory !== categoryCode

  function updateSearchParams(updates) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      const shouldDelete = value === undefined
        || value === null
        || value === ''
        || (Array.isArray(value) && value.length === 0)
      if (shouldDelete) next.delete(key)
      else next.set(key, Array.isArray(value) ? value.join(',') : String(value))
    })
    setSearchParams(next)
  }

  function handleSearch(value) {
    updateSearchParams({ q: value.trim(), page: undefined })
  }

  function clearFilters() {
    updateSearchParams({
      categoryCode: undefined,
      wardCode: undefined,
      tagCodes: undefined,
      page: undefined,
    })
  }

  const activeFilterCount = Number(Boolean(categoryCode))
    + Number(Boolean(wardCode))
    + selectedTagCodes.length
  const hasCriteria = Boolean(query || activeFilterCount)

  return (
    <main className={styles.page}>
      <LocationSearchHero key={query} query={query} onSearch={handleSearch} />

      <div className={styles.content}>
        <LocationFilters
          open={filterDrawerOpen}
          activeFilterCount={activeFilterCount}
          referenceError={referenceError}
          categoryCode={categoryCode}
          wardCode={wardCode}
          selectedTagCodes={selectedTagCodes}
          categories={categories}
          wards={wards}
          tagOptions={tagOptions}
          referencesLoading={referencesLoading}
          tagsLoading={tagsLoading}
          onClose={() => setFilterDrawerOpen(false)}
          onReset={clearFilters}
          onCategoryChange={(value) => {
            setTagGroups([])
            setLoadedTagCategory('')
            updateSearchParams({ categoryCode: value, tagCodes: undefined, page: undefined })
          }}
          onWardChange={(value) => updateSearchParams({ wardCode: value, page: undefined })}
          onTagsChange={(value) => updateSearchParams({ tagCodes: value, page: undefined })}
        />

        <LocationResults
          query={query}
          locations={locations}
          meta={meta}
          page={page}
          pageSize={PAGE_SIZE}
          loading={loading}
          errorMessage={errorMessage}
          activeFilterCount={activeFilterCount}
          hasCriteria={hasCriteria}
          onOpenFilters={() => setFilterDrawerOpen(true)}
          onRetry={() => setReloadKey((value) => value + 1)}
          onResetCriteria={() => setSearchParams({})}
          onPageChange={(nextPage) => {
            updateSearchParams({ page: nextPage === 1 ? undefined : nextPage })
            document.getElementById('location-results-heading')?.scrollIntoView({ behavior: 'smooth' })
          }}
        />
      </div>
    </main>
  )
}
