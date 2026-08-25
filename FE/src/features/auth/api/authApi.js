import {
  clearAccessToken,
  httpClient,
  setAccessToken,
} from '../../../shared/api/httpClient'

export async function loginApi(credentials) {
  const response = await httpClient.post('/auth/login', credentials)
  setAccessToken(response.data.accessToken)
  return response.data.user
}

export async function registerApi(data) {
  const response = await httpClient.post('/auth/register', data)
  return response.data
}

export async function verifyRegistrationApi(data) {
  const response = await httpClient.post('/auth/register/verify', data)
  return response.data
}

export async function resendRegistrationCodeApi(data) {
  const response = await httpClient.post('/auth/register/resend', data)
  return response.data
}

export async function forgotPasswordApi(data) {
  const response = await httpClient.post('/auth/forgot-password', data)
  return response.data
}

export async function resendPasswordResetCodeApi(data) {
  const response = await httpClient.post('/auth/forgot-password/resend', data)
  return response.data
}

export async function resetPasswordApi(data) {
  const response = await httpClient.post('/auth/reset-password', data)
  return response.data
}

export async function getMeApi() {
  const response = await httpClient.get('/me')
  return response.data
}

export async function updateProfileApi(data) {
  const response = await httpClient.patch('/me', data)
  return response.data
}

export async function getMyReviewsApi(params = {}) {
  const response = await httpClient.get('/me/reviews', { params })
  return {
    data: response.data.data,
    meta: response.data.meta,
  }
}

export async function logoutApi() {
  try {
    await httpClient.post('/auth/logout')
  } finally {
    clearAccessToken()
  }
}
