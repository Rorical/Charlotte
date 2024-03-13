export function uniqueByKey(array, key) {
  const seen = new Set()
  return array.filter((item) => {
    const k = item[key]
    return seen.has(k) ? false : seen.add(k)
  })
}

export function isSubs(list, target) {
  for (const str of list) {
    if (target.includes(str)) {
      return true
    }
  }
  return false
}
