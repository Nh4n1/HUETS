export function pickDiverseLocations(candidates = [], limit = 4) {
  const seenCategories = new Set()
  const selected = []

  candidates.forEach((location) => {
    const code = location.category?.code
    if (selected.length < limit && code && !seenCategories.has(code)) {
      seenCategories.add(code)
      selected.push(location)
    }
  })

  candidates.forEach((location) => {
    if (selected.length < limit && !selected.some((item) => item.id === location.id)) selected.push(location)
  })

  return selected
}
