// app/router.jsx
import { createBrowserRouter } from 'react-router'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { ProfilePage } from '../pages/ProfilePage'
import { RegisterPage } from '../pages/RegisterPage'
import { AppLayout } from '../shared/components/layout/AppLayout'
import { HomePage } from '../shared/components/HomePage'

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
