// app/router.jsx
import { createBrowserRouter } from 'react-router'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ProfilePage } from '../features/auth/pages/ProfilePage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { HomePage } from '../pages/HomePage'
import { AppLayout } from './layouts/AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: 'login',
        Component: LoginPage,
      },
      {
        path: 'register',
        Component: RegisterPage,
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: 'profile',
            Component: ProfilePage,
          },
        ],
      },
    ],
  },
])
