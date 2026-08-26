export function canAccessBusinessWorkspace(user) {
  return user?.role === 'user'
}
