var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
const flash = require('connect-flash')
const session = require('express-session')
require('dotenv').config()

var indexRouter = require('./routes/index')
var dashboard = require('./routes/dashboard')
const auth = require('./routes/auth')

var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.engine('ejs', require('express-ejs-extend'))
app.set('view engine', 'ejs')

// middleware
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
app.use(
  session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 1000 }
  })
)
app.use(flash())

// 之後要做到每個人登入有自己的資料
const authCheck = (req, res, next) => {
  const uid = req.session.uid

  if (uid === process.env.FIREBASE_USER_UID) return next()
  if (uid && uid !== process.env.FIREBASE_USER_UID)
    req.flash('emailError', '非此 app 用戶')

  res.redirect('/auth/login')
}

// routes
app.use('/', indexRouter)
app.use('/dashboard', authCheck, dashboard)
app.use('/auth', auth)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
