import {
  clearAccessToken,
  httpClient,
  setAccessToken,
} from './httpClient'

export async function loginApi(credentials) {
  const response = await httpClient.post('/auth/login', credentials)
  setAccessToken(response.data.accessToken)
  return response.data.user
}

export async function registerApi(data) {
  const response = await httpClient.post('/auth/register', data)
  return response.data
}

export async function getMeApi() {
  const response = await httpClient.get('/me')
  return response.data
}

export async function logoutApi() {
  try {
    await httpClient.post('/auth/logout')
  } finally {
    clearAccessToken()
  }
}
