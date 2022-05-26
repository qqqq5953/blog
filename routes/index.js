const express = require('express')
const router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
const pagination = require('../modules/pagination')

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')
let paginatedArticles_global = []
let categories_global
let page_global

/* GET home page. */
router.get('/', function (req, res) {
  req.session.destroy()

  const getCategories = async () => {
    const snapshot = await categoriesRef.once('value')
    categories_global = snapshot.val()
  }

  const getArticlesByUpdateTime = async () => {
    const articles = []
    const snapshot = await articlesRef.orderByChild('updateTime').once('value')
    snapshot.forEach((childSnapshot) => {
      if ('public' === childSnapshot.val().status) {
        articles.push(childSnapshot.val())
      }
    })
    return articles.reverse()
  }

  const renderData = async () => {
    await getCategories()
    const articles = await getArticlesByUpdateTime()
    const pageNumber = parseInt(req.query.page) || 1
    const { paginatedArticles, page } = pagination(articles, pageNumber)
    paginatedArticles_global = []
    paginatedArticles_global = paginatedArticles
    page_global = page

    res.render('index', {
      categories: categories_global,
      articles: paginatedArticles_global,
      page,
      striptags,
      isSorted: false
    })
  }

  renderData()
})

router.get('/:id', async (req, res) => {
  const id = req.params.id
  await filterByCategory(req, id)

  res.render('index', {
    categories: categories_global,
    articles: paginatedArticles_global,
    page: page_global,
    striptags,
    isSorted: true,
    id
  })
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

async function filterByCategory(req, categoryId) {
  const articlesSnapshot = await articlesRef
    .orderByChild('category')
    .equalTo(categoryId)
    .once('value')

  const articles = []
  articlesSnapshot.forEach((childSnapshot) => {
    articles.push(childSnapshot.val())
  })

  const pageNumber = parseInt(req.query.page) || 1
  const { paginatedArticles, page } = pagination(articles, pageNumber)

  paginatedArticles_global = []
  paginatedArticles_global = paginatedArticles
  page_global = page
}

module.exports = router
