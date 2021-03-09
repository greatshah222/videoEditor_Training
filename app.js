const path = require('path');

const express = require('express');

const morgan = require('morgan');
const cons = require('consolidate');

const viewRouter = require('./router/viewRouter');

const app = express();

// setting template engine
app.engine('html', cons.swig);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// static file
app.use(express.static(path.join(__dirname, 'public')));

// logger for development purpose
app.use(morgan('dev'));
app.use(express.json());

// app.use(function (req, res, next) {
//   Website you wish to allow to connect
//   res.setHeader('Access-Control-Allow-Origin', '*');

//   Request methods you wish to allow
//   res.setHeader(
//     'Access-Control-Allow-Methods',
//     'GET, POST, OPTIONS, PUT, PATCH, DELETE'
//   );

//   Request headers you wish to allow
//   res.setHeader(
//     'Access-Control-Allow-Headers',
//     'X-Requested-With,content-type'
//   );

//   Set to true if you need the website to include cookies in the requests sent
//   to the API (e.g. in case you use sessions)
//   res.setHeader('Access-Control-Allow-Credentials', true);

//   Pass to next layer of middleware
//   next();
// });
app.use((req, res, next) => {
  console.log(' Hello from the middleware 👑');
  // we need to call next else the request will be stocked
  next();
});

app.use('/', viewRouter);

module.exports = app;
