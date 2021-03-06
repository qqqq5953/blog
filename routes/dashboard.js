const express = require('express')
const router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const striptags = require('striptags')
const pagination = require('../modules/pagination')
let userName = ''

const categoriesRef = firebaseAdminDb.ref('/categories/')
const articlesRef = firebaseAdminDb.ref('/articles/')
const usersRef = firebaseAdminDb.ref('/users/')

router.get('/', (req, res) => {
  const uid = req.session.uid
  const userArticlesRefs = articlesRef.child(uid)
  const articleStatus = req.query.status || 'public'
  const deletedArticle = req.flash('delete')[0]

  const getCategoriesInUse = require('../modules/getCategoriesInUse')

  const sortArticlesByUpdateTime = require('../modules/sortArticlesByUpdateTime')

  const renderArticles = async () => {
    const articles = await sortArticlesByUpdateTime(
      userArticlesRefs,
      articleStatus
    )
    const categoriesInUse = await getCategoriesInUse(categoriesRef, articles)

    const categoryQuery = req.query.category
    const pageNumber = parseInt(req.query.page) || 1
    const { paginatedArticles, page } = pagination(articles, pageNumber)

    res.render('dashboard/archives', {
      categoryQueryString: categoryQuery ? `category=${categoryQuery}&` : '',
      articles: paginatedArticles,
      originalUrl: req.originalUrl.split('?')[0],
      categories: categoriesInUse,
      userName,
      page,
      striptags,
      articleStatus,
      deletedArticle
    })
  }

  renderArticles()
})

// articles
router
  .route('/article/create')
  .get(async (req, res) => {
    const categoriesSnapshot = await categoriesRef.once('value')
    const categories = categoriesSnapshot.val()
    const info = req.flash('info')[0]

    res.render('dashboard/article', {
      userName,
      categories,
      article: {},
      info
    })
  })
  .post((req, res) => {
    const data = req.body
    const uid = req.session.uid
    const userNewArticleRefs = articlesRef.child(uid).push()

    const updateTime = () => {
      const today = new Date()
      const dd = String(today.getDate()).padStart(2, '0')
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const yyyy = today.getFullYear()
      return yyyy + '-' + mm + '-' + dd
    }

    if (data.title === '' || data.content === '') return

    const newArticle = {
      ...data,
      id: userNewArticleRefs.key,
      updateTime: Date.now()
    }
    userNewArticleRefs.set(newArticle).then(() => {
      req.flash('info', { title: newArticle.title, message: '????????????' })
      res.redirect('/dashboard/article/create')
    })
  })

router.get('/article/:id', (req, res) => {
  const info = req.flash('info')[0]
  const id = req.params.id
  const uid = req.session.uid
  const userArticleRefs = articlesRef.child(uid)
  const articleSnapshot = userArticleRefs.child(id).once('value')
  const categoriesSnapshot = categoriesRef.once('value')

  Promise.all([categoriesSnapshot, articleSnapshot]).then((snapshots) => {
    const categories = snapshots[0].val()
    const article = snapshots[1].val()

    res.render('dashboard/article', {
      userName,
      categories,
      article,
      info
    })
  })
})

router.get('/article/preview/:id', (req, res) => {
  const id = req.params.id
  const uid = req.session.uid
  const userArticleRefs = articlesRef.child(uid)
  const articlesShapshot = userArticleRefs.child(id).once('value')
  const categoriesShapshot = categoriesRef.once('value')

  Promise.all([categoriesShapshot, articlesShapshot]).then((snapshots) => {
    const categories = snapshots[0].val()
    const article = snapshots[1].val()

    res.render('dashboard/preview', { userName, categories, article })
  })
})

router.post('/article/update/:id', (req, res) => {
  const id = req.params.id
  const data = req.body
  const uid = req.session.uid
  const userArticleRefs = articlesRef.child(uid)

  userArticleRefs
    .child(id)
    .update(data)
    .then(() => {
      req.flash('info', { title: data.title, message: '????????????' })
      res.redirect(`/dashboard/article/${id}`)
    })
})

router.post('/article/delete/:id', (req, res) => {
  const id = req.params.id
  const uid = req.session.uid
  const userArticleRefs = articlesRef.child(uid)

  const getDeleteArticle = async () => {
    const snapshot = await userArticleRefs.child(id).once('value')
    const deletedArticle = snapshot.val()
    req.flash('delete', { ...deletedArticle, message: '????????????' })
  }

  const deleteArticle = async () => {
    userArticleRefs.child(id).remove()
  }

  const processRequest = async () => {
    await getDeleteArticle()
    await deleteArticle()
    res.send('???????????????')
    res.end()
  }

  processRequest()
})

// category
router.get('/categories', function (req, res) {
  categoriesRef.once('value', (snapshot) => {
    const categories = snapshot.val()
    const alertMessages = req.flash('alert-message')
    const successMessages = req.flash('success-message')

    res.render('dashboard/categories', {
      userName,
      categories,
      alertMessages,
      successMessages
    })
  })
})

router.post('/categories/create', async (req, res, next) => {
  if (req.body.name === '' || req.body.path === '') {
    req.flash('alert-message', '???????????????????????????')
    res.redirect('/dashboard/categories')
    return
  }

  const data = req.body
  const name = data.name
  const path = data.path
  const id = data.id

  const categoriesSnapshot = await categoriesRef.once('value')
  const categoriesPathSnapshot = await categoriesRef
    .orderByChild('path')
    .equalTo(path)
    .once('value')
  const categoriesNameSnapshot = await categoriesRef
    .orderByChild('name')
    .equalTo(name)
    .once('value')
  const categories = categoriesSnapshot.val()
  const categoriesPath = categoriesPathSnapshot.val()
  const categoriesName = categoriesNameSnapshot.val()

  // ??????????????????????????????????????????????????????????????? ??? ????????????????????????
  if (
    (categoriesPath?.[id]?.path !== path ||
      categoriesPath?.[id]?.name !== name) &&
    categories?.[id]
  ) {
    const updateData = { name, path, id }
    categoriesRef.child(id).update(updateData)
    req.flash('success-message', '????????????')
    res.redirect('/dashboard/categories')
    return
  }

  // ????????????????????????????????????????????????
  if (categoriesPath !== null || categoriesName !== null) {
    req.flash('alert-message', '???????????????????????????')
    res.redirect('/dashboard/categories')
    return
  }

  const categoryRef = categoriesRef.push()
  categoryRef.set({ ...data, id: categoryRef.key })
  req.flash('success-message', '????????????')
  res.redirect('/dashboard/categories')
})

router.post('/categories/delete/:id', (req, res) => {
  const id = req.params.id
  categoriesRef.child(id).remove()

  req.flash('success-message', '??????????????????')
  res.redirect('/dashboard/categories')
})

router.get('/statistics', (req, res) => {
  const getUserName = async () => {
    const uid = req.session.uid
    console.log('uid', uid)

    if (!uid) {
      return (userName = 'no user')
    }

    const snapshot = await usersRef.child(uid).once('value')
    userName = snapshot.val().userName
  }

  const renderData = async () => {
    await getUserName()

    if (userName === 'no user') {
      return res.redirect('/auth/login')
    }

    res.render('dashboard/statistics', {
      userName
    })
  }

  renderData()
})

router.post('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

module.exports = router
