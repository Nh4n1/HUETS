import styles from '../../../pages/HomePage.module.css'

export function LocationSkeleton() {
  return (
    <div className={styles.locationCard} aria-hidden="true">
      <div className={`${styles.locationImage} ${styles.skeleton}`} />
      <div className={styles.locationBody}>
        <div className={`${styles.skeletonLine} ${styles.skeletonWide}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
      </div>
    </div>
  )
}
