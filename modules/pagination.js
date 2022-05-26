const pagination = (articles, pageNumber) => {
  const totalArticles = articles.length
  const perpage = 3
  const pageTotal = Math.ceil(totalArticles / perpage)
  const currentPage =
    pageNumber > pageTotal ? (pageNumber = pageTotal) : pageNumber

  const minIndex = currentPage * perpage - perpage
  const maxIndex = currentPage * perpage

  const paginatedArticles = articles.slice(minIndex, maxIndex)

  const page = {
    currentPage,
    pageTotal,
    hasPrev: currentPage > 1,
    hasNext: currentPage < pageTotal
  }

  return { paginatedArticles, page }
}

module.exports = pagination
