var express = require('express')
var router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')

router.get('/article/create', function (req, res, next) {
  categoriesRef.once('value').then((snapshot) => {
    const categories = snapshot.val()
    res.render('dashboard/article', {
      title: 'Express',
      categories,
      article: {}
    })
  })
})

router.get('/article/:id', function (req, res, next) {
  console.log('here')
  const id = req.params.id
  let categories = {}

  categoriesRef
    .once('value')
    .then((snapshot) => {
      categories = snapshot.val()
      return articlesRef.child(id).once('value')
    })
    .then((snapshot) => {
      const article = snapshot.val()
      res.render('dashboard/article', { title: 'Express', categories, article })
    })
})

router.get('/archives', function (req, res, next) {
  res.render('dashboard/archives', { title: 'Express' })
})

router.get('/categories', function (req, res, next) {
  categoriesRef.once('value', (snapshot) => {
    const categories = snapshot.val()
    const alertMessages = req.flash('info')

    res.render('dashboard/categories', {
      title: 'Express',
      categories,
      alertMessages
    })
  })
})

// articles
router.post('/article/create', (req, res) => {
  const data = req.body
  const articleRef = articlesRef.push()
  const key = articleRef.key
  const updateTime = Math.floor(Date.now() / 1000)

  data.id = key
  data.updateTime = updateTime
  articleRef.set(data)
  res.redirect(`/dashboard/article/${key}`)

  console.log(data)
})

router.post('/article/update/:id', function (req, res, next) {
  const id = req.params.id
  const data = req.body

  articlesRef
    .child(id)
    .update(data)
    .then(() => {
      res.redirect(`/dashboard/article/${id}`)
    })
})

// category
router.post('/categories/create', (req, res) => {
  const data = req.body
  const categoryRef = categoriesRef.push()
  const key = categoryRef.key
  data.id = key

  // 判斷是否已有相同路徑
  ;(async () => {
    const snapshot = await categoriesRef
      .orderByChild('path')
      .equalTo(data.path)
      .once('value')

    if (snapshot.val() !== null) {
      req.flash('info', '已有相同路徑')
      res.redirect('/dashboard/categories')
      return
    }

    categoryRef.set(data).then(() => {
      res.redirect('/dashboard/categories')
    })
  })()
})

router.post('/categories/delete/:id', (req, res) => {
  const id = req.params.id.substring(1)
  categoriesRef.child(id).remove()

  req.flash('info', '欄位刪除成功')
  res.redirect('/dashboard/categories')
})

module.exports = router
