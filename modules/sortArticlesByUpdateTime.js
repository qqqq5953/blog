const sortArticlesByUpdateTime = async (userArticlesRefs, articleStatus) => {
  const articles = []
  const articlesSnapshot = await userArticlesRefs
    .orderByChild('updateTime')
    .once('value')
  articlesSnapshot.forEach((childSnapshot) => {
    if (articleStatus === childSnapshot.val().status) {
      articles.push(childSnapshot.val())
    }
  })
  return articles.reverse()
}

module.exports = sortArticlesByUpdateTime
