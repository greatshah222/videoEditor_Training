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

app.use('/', viewRouter);

module.exports = app;
