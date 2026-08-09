export const initialAuthState = {
  user: null,
  loading: true,
  error: null,
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      }

    case 'LOGIN_SUCCESS':
      return {
        user: action.payload,
        loading: false,
        error: null,
      }

    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      }

    case 'RESTORE_SESSION':
      return {
        user: action.payload,
        loading: false,
        error: null,
      }

    case 'LOGOUT':
      return {
        user: null,
        loading: false,
        error: null,
      }

    case 'CLEAR_ERROR':
      if (!state.error) return state
      return {
        ...state,
        error: null,
      }

    default:
      return state
  }
}
