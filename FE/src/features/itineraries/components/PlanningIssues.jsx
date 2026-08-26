import { ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons'
import styles from '../pages/Itinerary.module.css'

export function PlanningIssues({ issues = [], compact = true }) {
  if (!issues.length) return null
  return (
    <div className={compact ? styles.compactIssues : styles.planningIssues}>
      {issues.map((issue, index) => (
        <div className={issue.level === 'error' ? styles.issueError : styles.issueWarning} key={`${issue.code}-${index}`}>
          {issue.level === 'error' ? <ExclamationCircleOutlined /> : <WarningOutlined />}
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  )
}
