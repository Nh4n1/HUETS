import { Button } from 'antd'
import { useEffect, useRef, useState } from 'react'
import {
  getGoogleMapsMapId,
  loadMapsLibrary,
  loadMarkerLibrary,
  subscribeGoogleMapsAuthenticationFailure,
} from './googleMapsLoader'
import { detachAdvancedMarker, hasMapPosition } from './googleMapUtils'
import styles from './GoogleLocationMap.module.css'


export function GoogleLocationMap({ latitude, longitude, label }) {
  const canvasRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const initialPropsRef = useRef({ latitude, longitude, label })
  const [retryKey, setRetryKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')




  useEffect(() => {
    initialPropsRef.current = { latitude, longitude, label }
  }, [label, latitude, longitude])

  useEffect(() => {
    let active = true
    const unsubscribeAuthenticationFailure = subscribeGoogleMapsAuthenticationFailure((message) => {
      if (!active) return
      setLoading(false)
      setErrorMessage(message)
    })
    Promise.all([loadMapsLibrary(), loadMarkerLibrary()])
      .then(([{ Map }, { AdvancedMarkerElement }]) => {
        if (!active || !canvasRef.current) return
        const currentProps = initialPropsRef.current
        const position = { lat: currentProps.latitude, lng: currentProps.longitude }
        const map = new Map(canvasRef.current, {
          center: position,
          zoom: 16,
          mapId: getGoogleMapsMapId(),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          scrollwheel: false,
          gestureHandling: 'cooperative',
        })
        const marker = new AdvancedMarkerElement({ map, position, title: currentProps.label })
        mapRef.current = map
        markerRef.current = marker
        setLoading(false)
      })
      .catch((error) => {
        if (!active) return
        setLoading(false)
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải Google Maps.')
      })
    return () => {
      active = false
      unsubscribeAuthenticationFailure()
      detachAdvancedMarker(markerRef.current)
      markerRef.current = null
      mapRef.current = null
    }
  }, [retryKey])

  useEffect(() => {
    const position = { lat: latitude, lng: longitude }
    if (!hasMapPosition(position) || !mapRef.current || !markerRef.current) return
    markerRef.current.position = position
    mapRef.current.panTo(position)
  }, [latitude, longitude])

  return (
    <div className={styles.frame}>
      <div ref={canvasRef} className={styles.canvas} aria-label={`Bản đồ vị trí ${label}`} />
      {loading ? <div className={styles.overlay}>Đang tải Google Maps...</div> : null}
      {errorMessage ? (
        <div className={styles.overlay} role="alert">
          <span>{errorMessage}</span>
          <Button size="small" onClick={() => {
            setLoading(true)
            setErrorMessage('')
            setRetryKey((key) => key + 1)
          }}>Thử lại</Button>
        </div>
      ) : null}
    </div>
  )
}
