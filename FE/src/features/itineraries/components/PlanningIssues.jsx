import { Alert } from 'antd'

export function PlanningIssues({ issues = [] }) {
  if (!issues.length) return null
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
      {issues.map((issue, index) => (
        <Alert
          key={`${issue.code}-${index}`}
          showIcon
          type={issue.level === 'error' ? 'error' : 'warning'}
          message={issue.message}
        />
      ))}
    </div>
  )
}
