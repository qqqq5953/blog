const express = require('express')
const router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
const pagination = require('../modules/pagination')

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')

/* GET home page. */
router.get('/', async (req, res) => {
  const getCategoryId = async (categoryQuery) => {
    const categorySnapshot = await categoriesRef
      .orderByChild('name')
      .equalTo(categoryQuery)
      .once('value')

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

      if (userArticlesRefs.val() == null) continue

      const userArticles = Object.values(userArticlesRefs.val())
      articles.push(...userArticles)
    }
    return articles
  }

  const getAllArticles = async () => {
    const sortAllArticlesByUpdateTime = require('../modules/sortAllArticlesByUpdateTime')

    const articlesOfUsersSnapshot = await articlesRef.once('value')
    const usersId = Object.keys(articlesOfUsersSnapshot.val())

    // 呈現所有文章
    const articles = []
    for (let i = 0; i < usersId.length; i++) {
      const userArticlesRefs = articlesRef.child(usersId[i])
      const userArticles = await sortAllArticlesByUpdateTime(
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

    const getCategories = require('../modules/getCategories')
    const categories = await getCategories(categoriesRef)
    const pageNumber = parseInt(req.query.page) || 1
    const { paginatedArticles, page } = pagination(articles, pageNumber)

    res.render('index', {
      articles: paginatedArticles,
      categoryQueryString: categoryQuery ? `category=${categoryQuery}&` : '',
      categories,
      originalUrl: req.originalUrl.split('?')[0],
      page,
      striptags
    })
  }

  renderArticles()
})

router.post('/:id', async (req, res) => {
  const id = req.params.id
  res.redirect(`/${id}`)
})

router.get('/post/:id', function (req, res, next) {
  let categories = {}
  let article = {}
  const id = req.params.id

  const getCategory = async () => {
    const snapshot = await categoriesRef.once('value')
    categories = snapshot.val()
  }

  const getArticle = async () => {
    const snapshot = await articlesRef.child(id).once('value')
    article = snapshot.val()
  }

  const renderData = async () => {
    await getCategory()
    await getArticle()

    // check if article exists
    if (!article) {
      res.render('error', { errorMessage: 'The article does not exist' })
      return
    }

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
