var express = require('express')
var router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
const pagination = require('../modules/pagination')

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')

/* GET home page. */
router.get('/', function (req, res, next) {
  let categories = {}
  let articlesArray = []
  let pageObject = {}
  const articles = []
  const pageNumber = parseInt(req.query.page) || 1

  const getCategories = async () => {
    const snapshot = await categoriesRef.once('value')
    categories = snapshot.val()
  }

  const getArticlesByUpdateTime = async () => {
    const snapshot = await articlesRef.orderByChild('updateTime').once('value')
    snapshot.forEach((childSnapshot) => {
      if ('public' === childSnapshot.val().status) {
        articles.push(childSnapshot.val())
      }
    })
    articles.reverse()
  }

  const renderData = async () => {
    await getCategories()
    await getArticlesByUpdateTime()

    const { paginatedArticles, page } = pagination(
      articles,
      pageNumber,
      articlesArray,
      pageObject
    )

    res.render('index', {
      title: 'Express',
      categories,
      articles: paginatedArticles,
      page,
      striptags
    })
  }

  renderData()
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
