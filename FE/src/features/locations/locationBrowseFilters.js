export function parseCodeList(value = '') {
  return [...new Set(String(value).split(',').map((code) => code.trim()).filter(Boolean))]
}

export function replaceTagGroupSelection(currentCodes, group, selectedCodes) {
  const groupCodes = new Set((group.tags ?? []).map((tag) => tag.code))
  return [
    ...currentCodes.filter((code) => !groupCodes.has(code)),
    ...selectedCodes.filter(Boolean),
  ]
}

export function buildBrowseFilterItems({ categoryCode, wardCode, tagCodes, categories, wards, tagGroups }) {
  const categoryNames = new Map(categories.map((item) => [item.code, item.name]))
  const wardNames = new Map(wards.map((item) => [item.code, item.name]))
  const tagNames = new Map(tagGroups.flatMap((group) => group.tags.map((tag) => [tag.code, tag.name])))
  return [
    ...(categoryCode ? [{ type: 'category', code: categoryCode, label: categoryNames.get(categoryCode) ?? categoryCode }] : []),
    ...(wardCode ? [{ type: 'ward', code: wardCode, label: wardNames.get(wardCode) ?? wardCode }] : []),
    ...tagCodes.map((code) => ({ type: 'tag', code, label: tagNames.get(code) ?? code })),
  ]
}

export function removeBrowseFilter(searchParams, filter) {
  const next = new URLSearchParams(searchParams)
  next.delete('page')
  if (filter.type === 'category') {
    next.delete('categoryCode')
    next.delete('tagCodes')
  }
  if (filter.type === 'ward') next.delete('wardCode')
  if (filter.type === 'tag') {
    const remaining = parseCodeList(next.get('tagCodes')).filter((code) => code !== filter.code)
    if (remaining.length) next.set('tagCodes', remaining.join(','))
    else next.delete('tagCodes')
  }
  return next
}

export function buildBrowseResetParams(sortBy) {
  const next = new URLSearchParams()
  if (sortBy && sortBy !== 'recommended') next.set('sortBy', sortBy)
  return next
}
