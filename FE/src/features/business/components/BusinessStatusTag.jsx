import { Tag } from 'antd'
import { getDerivedOwnershipState } from '../ownershipPresentation'

export function BusinessStatusTag({ ownership }) {
  const state = getDerivedOwnershipState(ownership)
  return <Tag color={state.color}>{state.label}</Tag>
}
