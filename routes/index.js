const express = require('express')
const router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
const pagination = require('../modules/pagination')

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')
const usersRef = firebaseAdminDb.ref('/users/')
let articlesForFilteringCategories = []

/* GET home page. */
router.get('/', async (req, res) => {
  const getCurrentUserName = async () => {
    const uid = req.session.uid
    if (uid == null) {
      return null
    } else {
      const user = await usersRef.child(uid).once('value')
      return user.val().userName
    }
  }

  const getCategoryId = async (categoryQuery) => {
    const categorySnapshot = await categoriesRef
      .orderByChild('name')
      .equalTo(categoryQuery)
      .once('value')

    // 避免 query value 被輸入不存在的 categoryQuery
    if (categorySnapshot.val() == null) return
    return Object.values(categorySnapshot.val())[0].id
  }

  const getArticlesByCategoryId = async (categoryId) => {
    const articles = []
    const articlesOfUsersSnapshot = await articlesRef.once('value')
    const usersId = Object.keys(articlesOfUsersSnapshot.val())

    for (let i = 0; i < usersId.length; i++) {
      const userArticlesRefs = await articlesRef
        .child(usersId[i])
        .orderByChild('category')
        .equalTo(categoryId)
        .once('value')

      if (userArticlesRefs.val() == null) {
        continue
      }

      const userArticles = Object.values(userArticlesRefs.val())
      articles.push(...userArticles)
    }
    return articles
  }

  const getSingleUserArticles = async (userArticlesRefs, articleStatus) => {
    const articles = []
    const articlesSnapshot = await userArticlesRefs.once('value')
    articlesSnapshot.forEach((childSnapshot) => {
      if (articleStatus === childSnapshot.val().status) {
        articles.push(childSnapshot.val())
      }
    })
    return articles
  }

  const getAllArticles = async () => {
    const articlesOfUsersSnapshot = await articlesRef.once('value')
    const usersId = Object.keys(articlesOfUsersSnapshot.val())

    // 呈現所有文章
    const articles = []
    for (let i = 0; i < usersId.length; i++) {
      const userArticlesRefs = articlesRef.child(usersId[i])
      const userArticles = await getSingleUserArticles(
        userArticlesRefs,
        'public'
      )
      articles.push(...userArticles)
    }
    return articles
  }

  const renderArticles = async () => {
    let articles = []
    const categoryQuery = req.query.category

    if (categoryQuery) {
      const categoryId = await getCategoryId(categoryQuery)
      if (!categoryId) return res.redirect('/')
      articles = await getArticlesByCategoryId(categoryId)
    } else {
      articles = await getAllArticles()
      articlesForFilteringCategories = await getAllArticles()
    }

    // 日期排序由近到遠
    articles.sort((a, b) => {
      return b.updateTime - a.updateTime
    })

    // unix stamp 轉成 yyyy-mm-dd 格式
    const changeDateFormat = require('../modules/changeDateFormat')
    articles.forEach((item) => {
      console.log(item.updateTime)
      item.updateTime = changeDateFormat(item.updateTime)
    })

    const getCategoriesInUse = require('../modules/getCategoriesInUse')
    const categoriesInUse = await getCategoriesInUse(
      categoriesRef,
      articlesForFilteringCategories
    )
    const userName = await getCurrentUserName()
    const pageNumber = parseInt(req.query.page) || 1
    const { paginatedArticles, page } = pagination(articles, pageNumber)

    res.render('index', {
      articles: paginatedArticles,
      categoryQueryString: categoryQuery ? `category=${categoryQuery}&` : '',
      categories: categoriesInUse,
      page,
      striptags,
      userName,
      query: req.query,
      originalUrl: req.originalUrl.split('?')[0] //pagination 用
    })
  }

  renderArticles()
})

router.get('/post/:id', (req, res) => {
  const id = req.params.id

  const getCategory = async () => {
    const snapshot = await categoriesRef.once('value')
    const categories = snapshot.val()
    return categories
  }

  const getArticle = async () => {
    let article = null
    const users = await usersRef.once('value')
    const usersKey = Object.keys(users.val())

    for (let i = 0; i < usersKey.length; i++) {
      const key = usersKey[i]
      const snapshot = await articlesRef.child(key).once('value')
      if (!snapshot.val()[id]) continue
      article = snapshot.child(id).val()
    }

    return article
  }

  const renderData = async () => {
    const categories = await getCategory()
    const article = await getArticle()

    // check if article exists
    if (article == null) {
      res.render('error', { errorMessage: 'The article does not exist' })
      return
    }

    // unix stamp 轉成 yyyy-mm-dd 格式
    const changeDateFormat = require('../modules/changeDateFormat')
    article.updateTime = changeDateFormat(article.updateTime)

    res.render('post', {
      title: 'Express',
      categories,
      article,
      striptags
    })
  }

  renderData()
})

module.exports = router
