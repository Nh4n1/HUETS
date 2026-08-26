import { Alert, Button } from 'antd'
import { CameraOutlined } from '@ant-design/icons'
import { useEffect, useId, useState } from 'react'

export function QrScanner({ active, onScan }) {
  const reactId = useId()
  const elementId = `qr-scanner-${reactId.replace(/:/g, '')}`
  const [errorMessage, setErrorMessage] = useState('')
  const [starting, setStarting] = useState(false)
  const [startKey, setStartKey] = useState(0)

  useEffect(() => {
    if (!active || startKey === 0) return undefined
    let scanner
    let mounted = true
    import('html5-qrcode').then(async ({ Html5Qrcode }) => {
      if (!mounted) return
      scanner = new Html5Qrcode(elementId)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (!mounted) return
          await scanner.stop().catch(() => {})
          onScan(decodedText)
        },
        () => {},
      )
      if (mounted) { setErrorMessage(''); setStarting(false) }
    }).catch(() => {
      if (mounted) { setErrorMessage('Không thể mở camera. Hãy cấp quyền camera hoặc dùng mã chữ.'); setStarting(false) }
    })
    return () => { mounted = false; if (scanner?.isScanning) scanner.stop().catch(() => {}) }
  }, [active, elementId, onScan, startKey])

  return <div style={{ display: 'grid', gap: 12 }}>{errorMessage ? <Alert type="warning" showIcon message={errorMessage} /> : null}<div id={elementId} /><Button icon={<CameraOutlined />} loading={starting} onClick={() => { setStarting(true); setStartKey((value) => value + 1) }}>Mở camera quét QR</Button></div>
}
