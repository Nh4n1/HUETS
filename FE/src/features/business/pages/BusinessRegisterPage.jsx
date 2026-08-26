import { App, Alert, Button, Card, Checkbox, Empty, Form, Input, List, Skeleton, Steps, Typography } from 'antd'
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { LocationSubmitForm } from '../../locations/components/LocationSubmitForm'
import { getPublicLocationByIdApi, getPublicLocationsApi } from '../../locations/api/locationApi'
import { createOwnershipApi, uploadOwnershipEvidenceFiles } from '../api/businessApi'
import { OwnershipEvidenceForm } from '../components/OwnershipEvidenceForm'
import { validateEvidenceFiles } from '../evidenceValidation'
import { RELATIONSHIP_LABEL } from '../ownershipPresentation'
import styles from './BusinessPages.module.css'

function LocationSummary({ location }) {
  return (
    <div className={styles.locationSummary}>
      {location.coverImageUrl || location.images?.[0]?.url
        ? <img src={location.coverImageUrl ?? location.images[0].url} alt={location.name} />
        : <span className={styles.imageFallback}><EnvironmentOutlined /></span>}
      <div><strong>{location.name}</strong><span>{location.formattedAddress}</span></div>
    </div>
  )
}

export function BusinessRegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [claimForm] = Form.useForm()
  const [current, setCurrent] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [mode, setMode] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [newLocation, setNewLocation] = useState(null)
  const [claim, setClaim] = useState(null)
  const [fileList, setFileList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isAgreed, setIsAgreed] = useState(false)

  useEffect(() => {
    const locationId = searchParams.get('locationId')
    if (!locationId) return
    let active = true
    getPublicLocationByIdApi(locationId)
      .then((location) => {
        if (!active) return
        setMode('existing')
        setSelectedLocation(location)
        setCurrent(1)
      })
      .catch(() => setErrorMessage('Không thể chọn sẵn địa điểm này. Hãy tìm lại bên dưới.'))
    return () => { active = false }
  }, [searchParams])

  async function handleSearch() {
    const query = searchText.trim()
    if (!query) return
    setSearching(true)
    setSearched(true)
    setErrorMessage('')
    try {
      const response = await getPublicLocationsApi({ q: query, pageSize: 8 })
      setResults(response.data ?? [])
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tìm địa điểm.')
    } finally {
      setSearching(false)
    }
  }

  function chooseExisting(location) {
    setMode('existing')
    setSelectedLocation(location)
    setCurrent(1)
  }

  function chooseNew() {
    setMode('new')
    setSelectedLocation(null)
    setCurrent(1)
  }

  async function captureNewLocation(payload) {
    setNewLocation(payload)
    return { id: 'business-location-draft', ...payload }
  }

  async function handleEvidence(values) {
    if (!values.contactPhone?.trim() && !values.contactEmail?.trim()) {
      claimForm.setFields([{ name: 'contactPhone', errors: ['Cần cung cấp ít nhất số điện thoại hoặc email.'] }])
      return
    }
    const fileError = validateEvidenceFiles(fileList)
    if (fileError) {
      setErrorMessage(fileError)
      return
    }
    setUploading(true)
    setErrorMessage('')
    try {
      const assets = await uploadOwnershipEvidenceFiles(fileList)
      setClaim({ ...values, evidenceAssetTokens: assets.map((asset) => asset.assetToken) })
      setCurrent(3)
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải ảnh bằng chứng.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErrorMessage('')
    try {
      const payload = mode === 'existing'
        ? { locationMode: 'existing', locationId: selectedLocation.id, claim }
        : { locationMode: 'new', location: newLocation, claim }
      const ownership = await createOwnershipApi(payload)
      message.success('Đã gửi yêu cầu xác minh quyền quản lý.')
      navigate(`/business/ownerships/${ownership.id}`, { replace: true })
    } catch (error) {
      const data = error.response?.data
      setErrorMessage(data?.message ?? 'Không thể gửi yêu cầu ownership.')
      if (data?.details?.ownershipId) {
        setErrorMessage(<span>{data.message} <Link to={`/business/ownerships/${data.details.ownershipId}`}>Mở yêu cầu hiện tại</Link></span>)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span className={styles.eyebrow}>HueTrip Business</span><Typography.Title level={2}>Đăng ký địa điểm kinh doanh</Typography.Title><p>Quyền Business được xác minh riêng cho từng địa điểm.</p></div>
        <Link to="/business"><Button>Business Center</Button></Link>
      </header>
      <Steps current={current} responsive items={[
        { title: 'Tìm địa điểm' }, { title: 'Xác nhận địa điểm' }, { title: 'Bằng chứng' }, { title: 'Kiểm tra và gửi' },
      ]} />
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} closable onClose={() => setErrorMessage('')} /> : null}
      <Card className={styles.contentCard}>
        {current === 0 ? (
          <div className={styles.searchStep}>
            <Typography.Title level={3}>Tìm Location trên HueTrip trước</Typography.Title>
            <Input.Search prefix={<SearchOutlined />} value={searchText} onChange={(event) => setSearchText(event.target.value)} onSearch={handleSearch} enterButton="Tìm kiếm" size="large" loading={searching} />
            {searching ? <Skeleton active /> : (
              <List
                dataSource={results}
                locale={{ emptyText: searched ? <Empty description="Không tìm thấy địa điểm phù hợp" /> : 'Nhập tên hoặc địa chỉ để bắt đầu.' }}
                renderItem={(location) => <List.Item actions={[<Button key="select" type="primary" onClick={() => chooseExisting(location)}>Chọn địa điểm này</Button>]}><LocationSummary location={location} /></List.Item>}
              />
            )}
            {searched ? <Button size="large" onClick={chooseNew}>Không tìm thấy? Thêm địa điểm mới</Button> : null}
          </div>
        ) : null}
        {current === 1 && mode === 'existing' ? (
          <div className={styles.stepStack}>
            <Typography.Title level={3}>Xác nhận đúng địa điểm</Typography.Title>
            <LocationSummary location={selectedLocation} />
            <div className={styles.actions}><Button onClick={() => setCurrent(0)}>Chọn địa điểm khác</Button><Button type="primary" onClick={() => setCurrent(2)}>Tiếp tục</Button></div>
          </div>
        ) : null}
        {current === 1 && mode === 'new' ? (
          <div className={styles.stepStack}>
            <Alert type="info" showIcon message="Thông tin Location và quyền quản lý được gửi cùng một hành trình, nhưng Admin duyệt thành hai quyết định độc lập." />
            {newLocation ? (
              <div className={styles.actions}><Button onClick={() => setNewLocation(null)}>Nhập lại thông tin</Button><Button type="primary" onClick={() => setCurrent(2)}>Tiếp tục</Button></div>
            ) : <LocationSubmitForm submitLabel="Lưu thông tin và tiếp tục" onSubmit={captureNewLocation} onSuccess={() => setCurrent(2)} />}
          </div>
        ) : null}
        {current === 2 ? (
          <Form form={claimForm} layout="vertical" initialValues={{ relationship: 'owner' }} onFinish={handleEvidence}>
            <Typography.Title level={3}>Quan hệ và bằng chứng</Typography.Title>
            <OwnershipEvidenceForm fileList={fileList} onFileListChange={setFileList} />
            <div className={styles.actions}><Button onClick={() => setCurrent(1)}>Quay lại</Button><Button type="primary" htmlType="submit" loading={uploading}>Kiểm tra hồ sơ</Button></div>
          </Form>
        ) : null}
        {current === 3 ? (
          <div className={styles.stepStack}>
            <Typography.Title level={3}>Kiểm tra và gửi</Typography.Title>
            <Card size="small" title="Thông tin địa điểm">{mode === 'existing' ? <LocationSummary location={selectedLocation} /> : <><strong>{newLocation?.name}</strong><p>{newLocation?.addressLine}</p></>}</Card>
            <Card size="small" title="Quyền quản lý và bằng chứng">
              <p><strong>Quan hệ:</strong> {RELATIONSHIP_LABEL[claim?.relationship]}</p><p><strong>Người liên hệ:</strong> {claim?.contactName}</p><p><strong>Liên hệ:</strong> {[claim?.contactPhone, claim?.contactEmail].filter(Boolean).join(' · ')}</p><p><strong>Ghi chú:</strong> {claim?.note}</p><p><strong>Số ảnh:</strong> {fileList.length}</p>
            </Card>
            <Checkbox
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
            >
              Tôi xác nhận có quyền cung cấp các ảnh này cho mục đích xác minh quyền quản lý.
            </Checkbox>
            <div className={styles.actions}><Button type="primary" loading={submitting} disabled={!isAgreed} onClick={handleSubmit}>
              Gửi yêu cầu xác minh
            </Button></div>
          </div>
        ) : null}
      </Card>
    </main>
  )
}
