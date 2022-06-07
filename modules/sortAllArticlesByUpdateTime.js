const sortAllArticlesByUpdateTime = async (userArticleRefs, articleStatus) => {
  const articles = []
  const articlesSnapshot = await userArticleRefs
    .orderByChild('updateTime')
    .once('value')
  articlesSnapshot.forEach((childSnapshot) => {
    if (articleStatus === childSnapshot.val().status) {
      articles.push(childSnapshot.val())
    }
  })
  return articles.reverse()
}

module.exports = sortAllArticlesByUpdateTime
