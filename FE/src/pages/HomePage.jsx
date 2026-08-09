import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../features/auth/context/useAuth'
import { CommunitySection } from '../features/home/components/CommunitySection'
import { DiscoverSection } from '../features/home/components/DiscoverSection'
import { FeaturedLocationsSection } from '../features/home/components/FeaturedLocationsSection'
import { HomeHero } from '../features/home/components/HomeHero'
import { HomePromiseBar } from '../features/home/components/HomePromiseBar'
import { JourneySection } from '../features/home/components/JourneySection'
import { getPublicLocationsApi } from '../features/locations/api/locationApi'
import styles from './HomePage.module.css'

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function HomePage() {
  const { user } = useAuth()
  const [locations, setLocations] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')
  const [activeCategory, setActiveCategory] = useState('')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getPublicLocationsApi({
      page: 1,
      pageSize: 8,
      ...(activeCategory ? { categoryCode: activeCategory } : {}),
    })
      .then((payload) => {
        if (cancelled) return
        setLocations(payload.data ?? [])
        setLoadStatus('success')
      })
      .catch(() => {
        if (cancelled) return
        setLocations([])
        setLoadStatus('error')
      })

    return () => { cancelled = true }
  }, [activeCategory, reloadKey])

  const visibleLocations = useMemo(() => {
    if (!submittedQuery) return locations
    const searchValue = normalize(submittedQuery)

    return locations.filter((location) => normalize([
      location.name,
      location.category?.name,
      location.formattedAddress,
      ...(location.tagCodes ?? []),
    ].join(' ')).includes(searchValue))
  }, [locations, submittedQuery])

  const scrollToFeatured = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const runSearch = (value) => {
    setQuery(value)
    setSubmittedQuery(value.trim())
    scrollToFeatured()
  }

  const handleSearch = (event) => {
    event.preventDefault()
    runSearch(query)
  }

  const handleCategory = (code, shouldScroll = false) => {
    setLoadStatus('loading')
    setActiveCategory(code)
    setSubmittedQuery('')
    setQuery('')
    if (shouldScroll) scrollToFeatured()
  }

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
        onCategorySelect={handleCategory}
      />
      <HomePromiseBar />
      <DiscoverSection
        activeCategory={activeCategory}
        onCategorySelect={handleCategory}
      />
      <FeaturedLocationsSection
        locations={visibleLocations}
        loadStatus={loadStatus}
        submittedQuery={submittedQuery}
        onClearSearch={() => runSearch('')}
        onShowAll={() => handleCategory('')}
        onRetry={handleRetry}
      />
      <JourneySection isAuthenticated={Boolean(user)} />
      <CommunitySection isAuthenticated={Boolean(user)} />
    </main>
  )
}
