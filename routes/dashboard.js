const express = require('express')
const router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
let userName

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')
const usersRef = firebaseAdminDb.ref('/users/')

router.get('/', (req, res) => {
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

router.get('/archives', function (req, res) {
  const deletedArticle = req.flash('delete')[0]
  console.log('deleteMessage', deletedArticle)

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
      status,
      deletedArticle
    })
  }

  renderData()
})

router.get('/categories', function (req, res) {
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
router
  .route('/article/create')
  .get((req, res) => {
    categoriesRef.once('value').then((snapshot) => {
      const categories = snapshot.val()
      res.render('dashboard/article', {
        userName,
        categories,
        article: {}
      })
    })
  })
  .post((req, res) => {
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

router.get('/article/:id', (req, res) => {
  const id = req.params.id
  const categoriesSnapshot = categoriesRef.once('value')
  const articleSnapshot = articlesRef.child(id).once('value')

  Promise.all([categoriesSnapshot, articleSnapshot]).then((snapshots) => {
    const categories = snapshots[0].val()
    const article = snapshots[1].val()

    res.render('dashboard/article', { userName, categories, article })
  })
})

router.get('/article/preview/:id', (req, res) => {
  const id = req.params.id
  const categoriesShapshot = categoriesRef.once('value')
  const articlesShapshot = articlesRef.child(id).once('value')

  Promise.all([categoriesShapshot, articlesShapshot]).then((snapshots) => {
    const categories = snapshots[0].val()
    const article = snapshots[1].val()

    res.render('dashboard/preview', { userName, categories, article })
  })
})

router.post('/article/update/:id', (req, res) => {
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

  const getDeleteArticle = async () => {
    const snapshot = await articlesRef.child(id).once('value')
    const deletedArticle = snapshot.val()
    req.flash('delete', { ...deletedArticle, message: '刪除成功' })
  }

  const deleteArticle = async () => {
    articlesRef.child(id).remove()
  }

  const processRequest = async () => {
    await getDeleteArticle()
    await deleteArticle()
    res.send('文章已刪除')
    res.end()
  }

  processRequest()
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
