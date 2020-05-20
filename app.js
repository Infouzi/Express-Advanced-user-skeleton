const path = require('path');
const express = require('express');
const morgan = require('morgan');

const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');

const userRouter = require('./routes/userRoutes');

const app = express();

// 1) Middlewares

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

/**
 * serving static files
 */
app.use(express.static(path.join(__dirname, 'public')));
/**
 * set security http headers
 */
app.use(helmet());

// A) General Middleware
/**
 * Body parser, reading data from body into req.body
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Parse cookies
 */
app.use(cookieParser());

/**
 * log requests in Dev
 */
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// B) Other Security Middleware
/**
 * Limit requests from same IP
 */
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

/**
 * Data sanitization against NoSQL query Injection
 */
app.use(mongoSanitize());

/**
 * Avoid http parameter pollution
 */
app.use(
  hpp({
    whitelist: ['price'],
  })
);

/**
 * Avoid xss injection
 */
app.use(xss());

// C) Compression using gzip
app.use(compression());

// 2) Routes
app.use('/api/v1/users', userRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// 3) Global Error Handler
app.use(globalErrorHandler);

// 4) exports app
module.exports = app;
