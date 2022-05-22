var express = require('express')
var router = express.Router()
const firebaseAdminDb = require('../connection/firebase_admin')
const firebase = require('../connection/firebase_client')
const fireAuth = firebase.auth()
require('dotenv').config()

// function
const sendErrorMessage = (req, error, errorCodeContent) => {
  const errorCode = error.code
  const errorMessage = error.message

  if (errorCode === errorCodeContent) {
    req.flash('passwordError', errorMessage)
  } else {
    req.flash('emailError', errorMessage)
  }
}

// routers
router.get('/signup', (req, res, next) => {
  res.render('signup', {
    title: 'Express',
    emailError: req.flash('emailError'),
    passwordError: req.flash('passwordError'),
    confirmPasswordError: req.flash('confirmPasswordError')
  })
})

router.post('/signup', (req, res, next) => {
  const userName = req.body.userName
  const email = req.body.email
  const password = req.body.password
  const confirmPassword = req.body.confirm_password

  if (password !== confirmPassword) {
    req.flash('confirmPasswordError', '兩次密碼不同')
    res.redirect('/auth/signup')
    return
  }

  fireAuth
    .createUserWithEmailAndPassword(email, password)
    .then((UserCredential) => {
      const usersRef = firebaseAdminDb.ref('users')
      const userRef = usersRef.push()
      const key = userRef.key
      const uid = UserCredential.user.uid
      const userInfo = {
        userName,
        email,
        uid
      }
      usersRef.child(uid).set(userInfo)
      res.redirect('/auth/login')
    })
    .catch((error) => {
      const errorCodeContent = 'auth/weak-password'
      sendErrorMessage(req, error, errorCodeContent)
      res.redirect('/auth/signup')
    })
})

router.get('/login', function (req, res, next) {
  res.render('login', {
    title: 'Express',
    emailError: req.flash('emailError'),
    passwordError: req.flash('passwordError')
  })
})

router.post('/login', function (req, res, next) {
  const email = req.body.email
  const password = req.body.password

  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // login success
      const user = userCredential.user
      req.session.uid = user.uid
      // req.session.email = user.email

      res.redirect('/dashboard')
      // res.redirect(`/dashboard/${user.uid}`)
    })
    .catch((error) => {
      const errorCodeContent = 'auth/wrong-password'
      sendErrorMessage(req, error, errorCodeContent)
      res.redirect('/auth/login')
    })
})

module.exports = router
