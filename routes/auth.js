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

router.post('/signup', async (req, res) => {
  const userName = req.body.userName
  const email = req.body.email
  const password = req.body.password
  const confirmPassword = req.body.confirm_password

  if (password !== confirmPassword) {
    req.flash(
      'confirmPasswordError',
      'The password confirmation does not match.'
    )
    res.redirect('/auth/signup')
    return
  }

  try {
    const UserCredential = await fireAuth.createUserWithEmailAndPassword(
      email,
      password
    )

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
  } catch (error) {
    const errorCodeContent = 'auth/weak-password'
    sendErrorMessage(req, error, errorCodeContent)
    res.redirect('/auth/signup')
  }

  // fireAuth
  //   .createUserWithEmailAndPassword(email, password)
  //   .then((UserCredential) => {
  //     const usersRef = firebaseAdminDb.ref('users')
  //     const userRef = usersRef.push()
  //     const key = userRef.key
  //     const uid = UserCredential.user.uid
  //     const userInfo = {
  //       userName,
  //       email,
  //       uid
  //     }
  //     usersRef.child(uid).set(userInfo)
  //     res.redirect('/auth/login')
  //   })
  //   .catch((error) => {
  //     const errorCodeContent = 'auth/weak-password'
  //     sendErrorMessage(req, error, errorCodeContent)
  //     res.redirect('/auth/signup')
  //   })
})

router.get('/login', function (req, res, next) {
  res.render('login', {
    title: 'Express',
    invalidEmail: req.flash('invalidEmail'),
    emailError: req.flash('emailError'),
    passwordError: req.flash('passwordError')
  })
})

router.post('/login', async (req, res) => {
  const email = req.body.email
  const password = req.body.password

  try {
    const userCredential = await firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
    const user = userCredential.user
    req.session.uid = user.uid
    res.redirect('/dashboard')
    // res.redirect(`/dashboard/archives`)
  } catch (error) {
    const errorCodeContent = 'auth/wrong-password'
    sendErrorMessage(req, error, errorCodeContent)
    req.flash('invalidEmail', email)
    res.redirect('/auth/login')
  }
})

module.exports = router
