const getCategoriesInUse = async (categoriesRef, articles) => {
  const removeRepeatIds = (id) => [...new Set(id)]
  const repeatCategoryIds = articles.map((item) => item.category)
  const categoryIds = removeRepeatIds(repeatCategoryIds)

  const snapshot = await categoriesRef.once('value')
  const categories = snapshot.val()
  const categoriesInUse = categoryIds.reduce((obj, key) => {
    return Object.assign(obj, {
      [key]: categories[key]
    })
  }, {})

  // const entries = Object.entries(categories).filter((category) =>
  //   categoryIds.includes(category[0])
  // )
  // const categoriesInUse = Object.fromEntries(entries)
  // console.log('categoriesInUse', categoriesInUse)

  return categoriesInUse
}

module.exports = getCategoriesInUse
