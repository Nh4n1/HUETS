import { SearchOutlined } from '@ant-design/icons'
import { Button, Input } from 'antd'
import { useState } from 'react'
import styles from './LocationSearchHero.module.css'

const SEARCH_SUGGESTIONS = ['Đặc sản Huế', 'Quán cà phê yên tĩnh', 'Đi chơi cùng gia đình']

export function LocationSearchHero({ query, loading, onSearch }) {
  const [value, setValue] = useState(query)

  function submitSearch(event) {
    event.preventDefault()
    if (loading) return
    onSearch(value)
  }

  function applySuggestion(suggestion) {
    if (loading) return
    setValue(suggestion)
    onSearch(suggestion)
  }

  return (
    <header className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>Khám phá theo cách của bạn</span>
          <h1>Tìm một góc Huế hợp với bạn</h1>
          <p>Tìm theo tên, khu vực hoặc trải nghiệm bạn đang mong muốn.</p>
        </div>
        <form className={styles.searchBar} onSubmit={submitSearch} role="search">
          <Input value={value} onChange={(event) => setValue(event.target.value)} prefix={<SearchOutlined />}
            placeholder="Ví dụ: Quán cà phê yên tĩnh có Wi-Fi" aria-label="Từ khóa tìm kiếm địa điểm" allowClear />
          <Button type="primary" htmlType="submit" loading={loading}>Tìm kiếm</Button>
        </form>
        <div className={styles.suggestions} aria-label="Gợi ý tìm kiếm">
          <span>Thử tìm:</span>
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <button key={suggestion} type="button" disabled={loading} onClick={() => applySuggestion(suggestion)}>{suggestion}</button>
          ))}
        </div>
      </div>
    </header>
  )
}
