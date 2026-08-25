export function getActiveCategories(categories = []) {
  return categories
    .filter((category) => category.isActive !== false)
    .sort((left, right) =>
      (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0)
      || left.name.localeCompare(right.name, 'vi'),
    )
}
