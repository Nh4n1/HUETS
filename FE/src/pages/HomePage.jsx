import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../features/auth/context/useAuth'
import { CommunitySection } from '../features/home/components/CommunitySection'
import { DiscoverSection } from '../features/home/components/DiscoverSection'
import { FeaturedLocationsSection } from '../features/home/components/FeaturedLocationsSection'
import { HomeHero } from '../features/home/components/HomeHero'
import { JourneySection } from '../features/home/components/JourneySection'
import { getPublicLocationsApi } from '../features/locations/api/locationApi'
import { getCategoriesApi } from '../shared/api/referenceApi'
import { getActiveCategories } from '../shared/config/categoryUtils'
import { pickDiverseLocations } from '../features/home/homeDiscovery'
import styles from './HomePage.module.css'

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [locations, setLocations] = useState([])
  const [categories, setCategories] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      getPublicLocationsApi({ page: 1, pageSize: 8, sortBy: 'recommended', includeVoucherSummary: true }),
      getCategoriesApi(),
    ])
      .then(([locationResult, categoryResult]) => {
        if (cancelled) return
        if (locationResult.status === 'fulfilled') {
          setLocations(pickDiverseLocations(locationResult.value.data ?? [], 4))
          setLoadStatus('success')
        } else {
          setLocations([])
          setLoadStatus('error')
        }
        setCategories(categoryResult.status === 'fulfilled'
          ? getActiveCategories(categoryResult.value).slice(0, 5)
          : [])
      })

    return () => { cancelled = true }
  }, [reloadKey])

  const runSearch = (value) => {
    const normalizedQuery = value.trim()
    setQuery(value)
    navigate(normalizedQuery ? `/locations?q=${encodeURIComponent(normalizedQuery)}` : '/locations')
  }

  const handleSearch = (event) => {
    event.preventDefault()
    runSearch(query)
  }

  const handleCategory = (code) => navigate(`/locations?categoryCode=${encodeURIComponent(code)}`)

  const handleRetry = () => {
    setLoadStatus('loading')
    setReloadKey((value) => value + 1)
  }

  return (
    <main className={styles.page}>
      <HomeHero
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onSuggestion={runSearch}
      />
      <DiscoverSection
        categories={categories}
        onCategorySelect={handleCategory}
      />
      <FeaturedLocationsSection
        locations={locations}
        loadStatus={loadStatus}
        onShowAll={() => navigate('/locations')}
        onRetry={handleRetry}
      />
      <JourneySection isAuthenticated={Boolean(user)} />
      <CommunitySection isAuthenticated={Boolean(user)} />
    </main>
  )
}
