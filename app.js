// Load required packeges
const express = require('express');
const app = express();
const path = require('path');
const dotenv = require(`dotenv`);
const morgan = require(`morgan`);
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: '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'
  }
}));


// Add config files
const connectDB = require(`./config/db`);

// Read body of request
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');


// using dotenv
dotenv.config({path: `./config/config.env`});

// use morgan
if(process.env.NODE_ENV === `development`) {
  app.use(morgan(`dev`));
}

// Connect to mongodb
connectDB();

// Save sessions to mongodb
let store = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: 'mySessions'
});

// Connect to session
app.use(require('express-session')({
    secret: 'This is secret',
    store: store,
    resave: false,
    saveUninitialized: false
}));

// Setup csrf tokens
app.use(csrf());
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Access to public folder
app.use(express.static(path.join(__dirname, 'public')));

// Add routes files
app.get('/users/login', (req, res, next) => {
  try {
    console.log(req.session.csrfSecret);
    res.status(200).render('login');
  } 
  catch (error) {
    return next(error);
  }
});



app.get('/users/register', (req, res, next) => {
  try {
    console.log(req.session.csrfSecret);
    res.status(200).render('signup');
  } 
  catch (error) {
    return next(error);
  }
});


app.get('/reset', (req, res, next) => {
  console.log(req.session.csrfSecret);
  res.status(200).render('reset-password');
});


app.get('/', (req, res, next) => {
  try {
    console.log(req.session.csrfSecret);
    res.status(200).send('<h1> Welcome back mahmoud serag </h1>');
  } 
  catch (error) {
    return next(error);
  }
});


app.post('/users/login', (req, res, next) => {
  try {
    console.log(req.session.csrfSecret);
    if (req.body.email === req.session.user.email && req.body.password === req.session.user.password) {
      res.status(300).redirect('/');
    }
    else {
      res.status(400).redirect('/users/login');
    }
  }
  catch (error) {
    return next(error);
  }
});


app.post('/users/register', (req, res, next) => {
  try {
    console.log(req.session.csrfSecret);
    req.session.user = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      confirmedPassword: req.body.password2
    };
    res.status(300).redirect('/users/login');
  } 
  catch (error) {
    return next(error);
  }
});


app.post('/reset', (req, res, next) => {
  try {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        console.log(err);
        return res.status(300).redirect('/reset');
      }
      const token = buffer.toString('hex');
      req.session.user.resetToken = token;
      req.session.user.resetTokenExpiration = Date.now() + 3600000;
      if (req.session.user.email.toString() != req.body.email.toString()) {
        return res.status(300).redirect('/reset');
      }
      transporter.sendMail({
        to: req.body.email,
        from: 'mahmoudsrag16@gmail.com',
        subject: 'Password reset',
        html: `
          <h1 style="text-align: center; color: white; background-color: gray; padding: 5px; width: 530px">You requested a password reset</h1>
          <h1>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</h1>
        `
      });
      res.status(200).send(`<div style="color: black; font-size: 50px; text-align: center; margin-top: 50px;"> <p1> In progress to reset your password <br> Check your fucken mail please </p1> </div>`);
    });
  }
  catch (error) {
    return next(error);
  }
});


app.get('/reset/:token', (req, res, next) => {
  try {
    if (req.session.user.resetToken === req.params.token && req.session.user.resetTokenExpiration > Date.now()) {
      res.status(200).render('update-password');
    }
    else {
      res.status(300).redirect('/');
    }
  }
  catch (error) {
    return next(error);
  }
});


app.post('/new-password', (req, res, next) => {
  req.session.user.resetToken = undefined;
  req.session.user.resetTokenExpiration = undefined;
  req.session.user.password = req.body.password;
  req.session.user.confirmedPassword = req.body.password;
  console.log(req.session.user.password, req.session.user.confirmedPassword);
  res.status(201).redirect('/users/login');
});

// Connect to server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`listening to server in ${process.env.NODE_ENV} mode on port ${port}...`);
});

// handle crash server error
process.on('unhandledRejection', (reason, promise) => {
    console.log(`ERROR: ${reason}`);
    server.close(() => process.exit(1));
});