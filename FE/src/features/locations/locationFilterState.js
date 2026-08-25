function normalizeTagState(requiredTagCodes = [], preferredTagCodes = []) {
  const required = new Set(requiredTagCodes)
  const preferred = new Set(preferredTagCodes.filter((code) => !required.has(code)))
  return { required, preferred }
}

export function getTagState(requiredTagCodes, preferredTagCodes, code) {
  if (requiredTagCodes.includes(code)) return 'required'
  if (preferredTagCodes.includes(code)) return 'preferred'
  return 'none'
}

export function setTagRequired({ requiredTagCodes, preferredTagCodes, group, code }) {
  const { required, preferred } = normalizeTagState(requiredTagCodes, preferredTagCodes)
  const currentState = required.has(code) ? 'required' : preferred.has(code) ? 'preferred' : 'none'

  if (currentState === 'required') {
    required.delete(code)
  } else {
    if (group.selectionMode === 'single') {
      for (const tag of group.tags ?? []) {
        required.delete(tag.code)
        preferred.delete(tag.code)
      }
    }
    preferred.delete(code)
    required.add(code)
  }

  return { requiredTagCodes: [...required], preferredTagCodes: [...preferred] }
}

export function toggleTagPriority({ requiredTagCodes, preferredTagCodes, code }) {
  const { required, preferred } = normalizeTagState(requiredTagCodes, preferredTagCodes)
  if (required.has(code)) {
    required.delete(code)
    preferred.add(code)
  } else if (preferred.has(code)) {
    preferred.delete(code)
    required.add(code)
  }
  return { requiredTagCodes: [...required], preferredTagCodes: [...preferred] }
}

export function removeSelectedTag({ requiredTagCodes, preferredTagCodes, code }) {
  return {
    requiredTagCodes: requiredTagCodes.filter((item) => item !== code),
    preferredTagCodes: preferredTagCodes.filter((item) => item !== code),
  }
}

export function clearTagGroup({ requiredTagCodes, preferredTagCodes, group }) {
  const groupCodes = new Set((group.tags ?? []).map((tag) => tag.code))
  return {
    requiredTagCodes: requiredTagCodes.filter((code) => !groupCodes.has(code)),
    preferredTagCodes: preferredTagCodes.filter((code) => !groupCodes.has(code)),
  }
}

export function getSelectedCodesForGroup(requiredTagCodes, preferredTagCodes, group) {
  const selected = new Set([...requiredTagCodes, ...preferredTagCodes])
  return (group.tags ?? []).map((tag) => tag.code).filter((code) => selected.has(code))
}

export function buildSearchFilterItems(interpretation) {
  if (!interpretation) return []
  return [
    ...(interpretation.category
      ? [{ type: 'category', code: interpretation.category.code, label: interpretation.category.name }]
      : []),
    ...(interpretation.ward
      ? [{ type: 'ward', code: interpretation.ward.code, label: interpretation.ward.name }]
      : []),
    ...(interpretation.requiredTags ?? []).map((tag) => ({
      type: 'required', code: tag.code, label: tag.name, priority: 'required',
    })),
    ...(interpretation.preferredTags ?? []).map((tag) => ({
      type: 'preferred', code: tag.code, label: tag.name, priority: 'preferred',
    })),
    ...(interpretation.openCondition
      ? [{ type: 'opening', code: 'opening-hours', label: interpretation.openCondition.label }]
      : []),
  ]
}
