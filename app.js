
require('dotenv').config();

require('./models/connection');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var daysRouter = require('./routes/days');
var studentsRouter = require('./routes/students');
var batchsRouter = require('./routes/batchs');

var app = express();

const cors = require('cors');
app.use(cors());


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/days', daysRouter);
app.use('/students', studentsRouter);
app.use('/batchs', batchsRouter);

module.exports = app;
