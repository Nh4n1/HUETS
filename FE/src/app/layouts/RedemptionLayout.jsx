import { Outlet } from 'react-router'
import styles from '../../features/redemption/pages/RedemptionPages.module.css'

export function RedemptionLayout() {
  return <main className={styles.layout}><div className={styles.shell}><header className={styles.brand}><span>HueTrip</span><small>Thiết bị quầy</small></header><Outlet /></div></main>
}
