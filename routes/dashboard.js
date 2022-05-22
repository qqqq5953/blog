const express = require('express')
const router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
let userName = ''

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')
const usersRef = firebaseAdminDb.ref('/users/')

router.get('/', (req, res, next) => {
  const getUserName = async () => {
    const uid = req.session.uid
    const snapshot = await usersRef.child(uid).once('value')
    userName = snapshot.val().userName
  }

  const renderData = async () => {
    await getUserName()
    res.render('dashboard/index', {
      userName
    })
  }

  renderData()
})

router.get('/article/create', function (req, res, next) {
  categoriesRef.once('value').then((snapshot) => {
    const categories = snapshot.val()
    res.render('dashboard/article', {
      userName,
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
      res.render('dashboard/article', { userName, categories, article })
    })
})

router.get('/archives', function (req, res, next) {
  let categories = {}
  const articles = []
  const status = req.query.status || 'public'

  const getCategories = async () => {
    const snapshot = await categoriesRef.once('value')
    categories = snapshot.val()
  }

  const getArticlesByUpdateTime = async () => {
    const snapshot = await articlesRef.orderByChild('updateTime').once('value')
    snapshot.forEach((childSnapshot) => {
      // 決定是草稿還是公開文章
      if (status === childSnapshot.val().status) {
        articles.push(childSnapshot.val())
      }
    })
    articles.reverse()
  }

  const renderData = async () => {
    await getCategories()
    await getArticlesByUpdateTime()
    res.render('dashboard/archives', {
      userName,
      categories,
      articles,
      striptags,
      status
    })
  }

  renderData()

  // categoriesRef
  //   .once('value')
  //   .then((snapshot) => {
  //     categories = snapshot.val()
  //     return articlesRef.orderByChild('updateTime').once('value')
  //   })
  //   .then((snapshot) => {
  //     const articles = []
  //     snapshot.forEach((childSnapshot) => {
  //       articles.push(childSnapshot.val())
  //     })
  //     // Object.values(snapshot.val()).forEach((item) => {
  //     //   articles.push(item)
  //     // })
  //     articles.reverse()
  //     res.render('dashboard/archives', {
  //       title: 'Express',
  //       categories,
  //       articles
  //     })
  //   })
})

router.get('/categories', function (req, res, next) {
  categoriesRef.once('value', (snapshot) => {
    const categories = snapshot.val()
    const alertMessages = req.flash('info')

    res.render('dashboard/categories', {
      userName,
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
  // const updateTime = Math.floor(Date.now() / 1000)
  const updateTime = () => {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    return yyyy + '-' + mm + '-' + dd
  }

  data.id = key
  data.updateTime = updateTime()
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

router.post('/article/delete/:id', (req, res) => {
  const id = req.params.id
  articlesRef.child(id).remove()

  res.send('文章已刪除')
  res.end()
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
  const id = req.params.id
  categoriesRef.child(id).remove()

  req.flash('info', '欄位刪除成功')
  res.redirect('/dashboard/categories')
})

module.exports = router
