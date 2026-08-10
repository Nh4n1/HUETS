import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../features/auth/context/useAuth'
import { CommunitySection } from '../features/home/components/CommunitySection'
import { DiscoverSection } from '../features/home/components/DiscoverSection'
import { FeaturedLocationsSection } from '../features/home/components/FeaturedLocationsSection'
import { HomeHero } from '../features/home/components/HomeHero'
import { HomePromiseBar } from '../features/home/components/HomePromiseBar'
import { JourneySection } from '../features/home/components/JourneySection'
import { getPublicLocationsApi } from '../features/locations/api/locationApi'
import styles from './HomePage.module.css'

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [locations, setLocations] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')
  const [activeCategory, setActiveCategory] = useState('')
  const [query, setQuery] = useState('')
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

  const scrollToFeatured = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const runSearch = (value) => {
    const normalizedQuery = value.trim()
    setQuery(value)
    navigate(normalizedQuery ? `/locations?q=${encodeURIComponent(normalizedQuery)}` : '/locations')
  }

  const handleSearch = (event) => {
    event.preventDefault()
    runSearch(query)
  }

  const handleCategory = (code, shouldScroll = false) => {
    setLoadStatus('loading')
    setActiveCategory(code)
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
