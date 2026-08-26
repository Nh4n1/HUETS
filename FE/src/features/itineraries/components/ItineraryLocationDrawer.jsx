import { Drawer } from 'antd'
import { LocationPicker } from './LocationPicker'

export function ItineraryLocationDrawer({ open, intent, disabledIds, onClose, onSelect }) {
  const replacing = intent?.type === 'replace'
  return (
    <Drawer
      title={replacing ? 'Đổi địa điểm' : 'Thêm địa điểm'}
      open={open}
      width={520}
      destroyOnHidden
      onClose={onClose}
    >
      <LocationPicker
        disabledIds={disabledIds}
        onChange={onSelect}
      />
    </Drawer>
  )
}
