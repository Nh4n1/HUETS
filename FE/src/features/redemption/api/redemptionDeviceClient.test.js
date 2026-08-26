import { afterEach, describe, expect, it } from 'vitest'
import { setAccessToken } from '../../../shared/api/httpClient'
import { redemptionDeviceClient } from './redemptionDeviceClient'

const originalAdapter = redemptionDeviceClient.defaults.adapter

afterEach(() => {
  redemptionDeviceClient.defaults.adapter = originalAdapter
  setAccessToken(null)
})

describe('redemption device HTTP client', () => {
  it('uses credentials but never attaches the User access token', async () => {
    setAccessToken('user-access-token')
    let capturedConfig
    redemptionDeviceClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await redemptionDeviceClient.get('/redeem-device/session')
    expect(redemptionDeviceClient.defaults.withCredentials).toBe(true)
    expect(capturedConfig.headers.Authorization).toBeUndefined()
  })
})
