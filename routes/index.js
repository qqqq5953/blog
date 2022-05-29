const express = require('express')
const router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
const pagination = require('../modules/pagination')

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')

/* GET home page. */
router.get('/', function (req, res) {
  req.session.destroy()

  const getCategories = require('../modules/getCategories')

  const sortAllArticlesByUpdateTime = require('../modules/sortAllArticlesByUpdateTime')

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
    const articlesSnapshot = await articlesRef
      .orderByChild('category')
      .equalTo(categoryId)
      .once('value')
    articlesSnapshot.forEach((childSnapshot) => {
      articles.push(childSnapshot.val())
    })
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
      articles = await sortAllArticlesByUpdateTime(
        articlesRef,
        (articleStatus = 'public')
      )
    }

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
