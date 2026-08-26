// app/router.jsx
import { createBrowserRouter } from 'react-router'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ProfilePage } from '../features/auth/pages/ProfilePage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { RegisterVerificationPage } from '../features/auth/pages/RegisterVerificationPage'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'

import { SavedContentPage } from '../features/bookmarks/pages/SavedContentPage'

import { AdminOnlyRoute, AdminRoute } from '../features/admin/components/AdminRoute'
import { AdminCreateLocationPage } from '../features/admin/pages/location/AdminCreateLocationPage'
import { AdminLocationDetailPage } from '../features/admin/pages/location/AdminLocationDetailPage'
import { AdminEditLocationPage } from '../features/admin/pages/location/AdminEditLocationPage'
import { AdminLocationModerationPage } from '../features/admin/pages/location/AdminLocationModerationPage'
import { AdminLocationsPage } from '../features/admin/pages/location/AdminLocationsPage'
import { AdminItinerariesPage } from '../features/admin/pages/itinerary/AdminItinerariesPage'
import { AdminItineraryDetailPage } from '../features/admin/pages/itinerary/AdminItineraryDetailPage'
import { AdminOverviewPage } from '../features/admin/pages/overview/AdminOverviewPage'
import { AdminUsersPage } from '../features/admin/pages/user/AdminUsersPage'
import { AdminReviewsPage } from '../features/admin/pages/review/AdminReviewsPage'
import { AdminReportsPage } from '../features/reports/pages/AdminReportsPage'
import { AdminCategoriesPage } from '../features/admin/pages/reference/AdminCategoriesPage'
import { AdminTagGroupsPage } from '../features/admin/pages/reference/AdminTagGroupsPage'
import { AdminFeedbackPage } from '../features/admin/pages/feedback/AdminFeedbackPage'

import { HomePage } from '../pages/HomePage'
import { ExplorePage } from '../features/explore/pages/ExplorePage'

import { LocationDetailPage } from '../features/locations/pages/LocationDetailPage'
import { LocationsPage } from '../features/locations/pages/LocationsPage'
import { ContributeLocationPage } from '../features/locations/pages/ContributeLocationPage'
import { MyContributionsPage } from '../features/locations/pages/MyContributionsPage'
import { MyContributionDetailPage } from '../features/locations/pages/MyContributionDetailPage'
import { EditMyContributionPage } from '../features/locations/pages/EditMyContributionPage'
import { BusinessRegisterPage } from '../features/business/pages/BusinessRegisterPage'
import { BusinessCenterPage } from '../features/business/pages/BusinessCenterPage'
import { BusinessDashboardPage } from '../features/business/pages/BusinessDashboardPage'
import { BusinessLocationsPage } from '../features/business/pages/BusinessLocationsPage'
import { OwnershipDetailPage } from '../features/business/pages/OwnershipDetailPage'
import { BusinessRoute } from '../features/business/components/BusinessRoute'
import { AdminOwnershipsPage } from '../features/business/pages/AdminOwnershipsPage'
import { AdminOwnershipDetailPage } from '../features/business/pages/AdminOwnershipDetailPage'
import { OwnerVoucherListPage } from '../features/vouchers/pages/OwnerVoucherListPage'
import { OwnerVoucherCreatePage } from '../features/vouchers/pages/OwnerVoucherCreatePage'
import { OwnerVoucherDetailPage } from '../features/vouchers/pages/OwnerVoucherDetailPage'
import { PublicVoucherDetailPage } from '../features/vouchers/pages/PublicVoucherDetailPage'
import { PublicVoucherListPage } from '../features/vouchers/pages/PublicVoucherListPage'
import { VoucherWalletPage } from '../features/vouchers/pages/VoucherWalletPage'
import { VoucherClaimDetailPage } from '../features/vouchers/pages/VoucherClaimDetailPage'
import { OwnerDevicesPage } from '../features/redemption/pages/OwnerDevicesPage'
import { RedemptionSetupPage } from '../features/redemption/pages/RedemptionSetupPage'
import { RedemptionOperatorPage } from '../features/redemption/pages/RedemptionOperatorPage'

import { ItinerariesPage } from '../features/itineraries/pages/ItinerariesPage'
import { ItineraryDetailPage } from '../features/itineraries/pages/ItineraryDetailPage'
import { ItineraryEditorPage } from '../features/itineraries/pages/ItineraryEditorPage'
import { ItineraryCreateChoicePage } from '../features/itineraries/pages/ItineraryCreateChoicePage'
import { AIItineraryCreatePage } from '../features/itineraries/pages/AIItineraryCreatePage'
import { CommunityItinerariesPage } from '../features/itineraries/pages/CommunityItinerariesPage'
import { CommunityItineraryDetailPage } from '../features/itineraries/pages/ItineraryDetailPage'

import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'
import { BusinessLayout } from './layouts/BusinessLayout'
import { RedemptionLayout } from './layouts/RedemptionLayout'

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
        path: 'locations',
        Component: LocationsPage,
      },

      {
        path: 'locations/:locationId',
        Component: LocationDetailPage,
      },

      {
        path: 'explore',
        Component: ExplorePage,
      },

      {
        path: 'vouchers',
        Component: PublicVoucherListPage,
      },

      {
        path: 'vouchers/:voucherId',
        Component: PublicVoucherDetailPage,
      },

      {
        path: 'itineraries',
        Component: CommunityItinerariesPage,
      },

      {
        path: 'itineraries/:itineraryId',
        Component: CommunityItineraryDetailPage,
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
        path: 'register/verify',
        Component: RegisterVerificationPage,
      },

      {
        path: 'forgot-password',
        Component: ForgotPasswordPage,
      },

      {
        path: 'forgot-password/reset',
        Component: ResetPasswordPage,
      },

      {
        Component: ProtectedRoute,

        children: [
          {
            path: 'profile',
            Component: ProfilePage,
          },

          // FE-02 Bookmark
          {
            path: 'saved',
            Component: SavedContentPage,
          },

          {
            path: 'locations/contribute',
            Component: ContributeLocationPage,
          },

          {
            path: 'locations/mine',
            Component: MyContributionsPage,
          },

          {
            path: 'locations/mine/:locationId',
            Component: MyContributionDetailPage,
          },

          {
            path: 'locations/mine/:locationId/edit',
            Component: EditMyContributionPage,
          },

          {
            path: 'vouchers/mine',
            Component: VoucherWalletPage,
          },

          {
            path: 'vouchers/mine/:claimId',
            Component: VoucherClaimDetailPage,
          },

          {
            path: 'itineraries/mine',
            Component: ItinerariesPage,
          },

          {
            path: 'itineraries/new',
            Component: ItineraryCreateChoicePage,
          },

          {
            path: 'itineraries/new/manual',
            Component: ItineraryEditorPage,
          },

          {
            path: 'itineraries/new/ai',
            Component: AIItineraryCreatePage,
          },

          {
            path: 'itineraries/ai/:planId',
            Component: ItineraryEditorPage,
          },

          {
            path: 'itineraries/mine/:itineraryId',
            Component: ItineraryDetailPage,
          },

          {
            path: 'itineraries/mine/:itineraryId/edit',
            Component: ItineraryEditorPage,
          },
        ],
      },
    ],
  },

  {
    path: 'business',
    Component: ProtectedRoute,
    children: [
      {
        Component: BusinessRoute,
        children: [
          {
            Component: BusinessLayout,
            children: [
              { index: true, Component: BusinessDashboardPage },
              { path: 'register', Component: BusinessRegisterPage },
              { path: 'locations', Component: BusinessLocationsPage },
              { path: 'ownerships', Component: BusinessCenterPage },
              { path: 'ownerships/:ownershipId', Component: OwnershipDetailPage },
              { path: 'locations/:locationId/vouchers', Component: OwnerVoucherListPage },
              { path: 'locations/:locationId/vouchers/new', Component: OwnerVoucherCreatePage },
              { path: 'locations/:locationId/vouchers/:voucherId', Component: OwnerVoucherDetailPage },
              { path: 'locations/:locationId/devices', Component: OwnerDevicesPage },
            ],
          },
        ],
      },
    ],
  },

  {
    path: 'redeem',
    Component: RedemptionLayout,
    children: [
      { path: 'setup', Component: RedemptionSetupPage },
      { index: true, Component: RedemptionOperatorPage },
    ],
  },

  {
    path: 'admin',
    Component: AdminRoute,

    children: [
      {
        Component: AdminLayout,

        children: [
          {
            index: true,
            Component: AdminOverviewPage,
          },

          {
            path: 'locations',
            Component: AdminLocationsPage,
          },

          {
            path: 'locations/new',
            Component: AdminCreateLocationPage,
          },

          {
            path: 'locations/pending',
            Component: AdminLocationModerationPage,
          },

          {
            path: 'locations/:locationId',
            Component: AdminLocationDetailPage,
          },

          {
            path: 'locations/:locationId/edit',
            Component: AdminEditLocationPage,
          },

          {
            path: 'itineraries',
            Component: AdminItinerariesPage,
          },

          {
            path: 'itineraries/:itineraryId',
            Component: AdminItineraryDetailPage,
          },

          {
            Component: AdminOnlyRoute,
            children: [
              { path: 'users', Component: AdminUsersPage },
              { path: 'reference/categories', Component: AdminCategoriesPage },
              { path: 'reference/tag-groups', Component: AdminTagGroupsPage },
              { path: 'feedback', Component: AdminFeedbackPage },
              { path: 'location-ownerships', Component: AdminOwnershipsPage },
              { path: 'location-ownerships/:ownershipId', Component: AdminOwnershipDetailPage },
            ],
          },

          {
            path: 'reviews',
            Component: AdminReviewsPage,
          },

          {
            path: 'reports',
            Component: AdminReportsPage,
          },
        ],
      },
    ],
  },
])
