const getCategories = async (categoriesRef) => {
  const snapshot = await categoriesRef.once('value')
  const cattegories = snapshot.val()
  return cattegories
}

module.exports = getCategories
