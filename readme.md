# Express-advanced-user-skeleton

This project is for every web developer using Nodejs. Express, MongoDB, who wants to start a project, but, don't want to waste time on writing the logic behind managing users.

When starting some personal projects that share the same "user" entity, i found that it could be useful to have some "reusable" code, that could be easily used as "base" for managing users and also applies some best practise techniques.

The user have authentication abilities using Json WebToken. Some Authorization functionalities are available too.

## Project Features
This project focus on giving "user management" out of the box to reuse in future projects. To do so, many "best practises" were implemented, which resulted in having a bunch of files, which, in first sight, could be overwhelming. For this reason, this readme. is fragmented in the upcoming sections:

1. `Project Structure`
2. `Error Handling`
3. `Common features` && `Managing User entity`
4. `Security practise`
5. `Authenticating users` && `Authorization`
6. `Installation`
7. `Usage`
8. `Contributing`

## 1. Project Structure
```bash
.
├── app.js # The Expess configuration with all the "Middlewares" and "Routes".
├── _bin
│   └── www # The server to be run. Create the server with configuration from app.js object.
├── _controllers
│   ├── authcontroller.js # handler for authentication/authorization/signup/login/forget-reset-update password
│   ├── errorcontroller.js # the Global error handling controller ( middleware)
│   ├── handleFactory.js # Factory handler to reuse the same basic CRUD functions with different entities (user...etc)
│   └── usercontroller.js # Crud operations on any user, current user and managing photo uploading/resizing
├── _models
│   └── userModel.js # Mongoose Schema model of a User with hashed password of course
├── _public # The public folder containing resources/assets
│   ├── _img
│   │    └──_users # Folder containing users uploaded photo
│   └──  ...
├── _routes
│   └── userRoutes.js # REST Endpoints that leads to userController handlers
├── utils # a set functionalities that can be reused in a lot of project
│   ├── apiFeatures.js
│   ├── appError.js # Extends the Built-in "Error" class. This is the Error object to send to the Global Error handler
│   │── catchAsync.js # a Wrapper for async/await functions to catch async/await erorrs and send them to the Global Error handler
│   └── email.scss # Class to send fake emails in development or real emails in production mode.
├── _views
│   ├── _emails
│   │    ├──*.pug # Pug files template for emails sending
│   │    └──...
│   └──...
└── config.env # Create this file in the root of the project, it will store the configuration parameters of the project
```


## 2. Error Handling
The error handling strategy is important, especially when you have to deal with a lot of promises, async/await in different files. One of the best strategies, is to centralized the handling of errors by having a Global Handling Errors Middleware.

In addition, we have to distinguish between "operational errors" and "logical errors". The first ones concern the errors that we can predict to occur, eg: request to non existent route (404). The logical errors are the ones we can't predict and generally causes (500) errors.

A good practise is to have different error handling strategy depending on the environment: *production* or *development*.

It is also recommended to catch any uncaughtRejection (promises) or uncaughtException (errors).

---

### A. Global Error Handling `errorcontroller.js`
The global handler error is a middleware with a 4th parameter (error). It could only be one Global Error handler in express and its signature is: `(err, req, res, next) => {...}`. It has 2 different behaviours: `sendErrorDev(err, req, res)` and `sendErrorDev(err, req, res)`, depending on the running environment, one of them is triggered.  

The Global Error handler receives all the `AppError` objects that are created when there is operational errors (created by user) or logical errors.

### B. Handling uncaughtException and unhandledRejection
Some errors fire these 2 events: `uncaughtException` and `unhandledRejection`. They are defined in the server (`bin/www`), using `process.on('FIRED_EVENT', callback)`.

N.B: `process.on('unhandledRejection', callback)` must be on top to be able to catch every error.

```
process.on('uncaughtException', err => {
  console.log('UNHANDLED EXCEPTION! 💥💥💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTIONS! 💥💥💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
```

### C. Handling async/await errors for requests/response
The middleware: `catchAsync(req, res, next)` is a wrapper around functions that send responses and have async-await operations in them. With this wrapper, we don't need to wrap the function with try & catch blocks. You'll only have to wrap the function with `catchAsync`

An example will be shown in Section 3.B.

```javascript
module.exports = catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
```


## 3. Common features
This section concerns the functionalities that can be used simply with other entities/collections than "User". It will focus mainly on 2 files:
1. `apiFeatures.js`
2. `handleFactory.js`


### a) apiFeatures.js
---
APIFeatures is a class that return an object containing a `Mongoose.query` object. It has also 4 different functions which are: `filter()` `sort()` `limiteFields()` `paginate()`. All of them return an instance of the same object which means that we can chain them.

The power of this class is that it can be used with any Mongoose.Model.

Exemple of instantiation:
```javascript
    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query;
```
Here, the `APIFeatures` constructor takes as first argument: `Model.find()` which is a query Mongoose query object. The second parameter is the query object that comes with the request (`req.query`).

Then, we call:
1. `filter()`: 

Accept filters as queryString in the request: `domain.com/api/users?age=25&city=New+York`.
 The `filter()` function is advanced, and can handle queryString for operations like:

* Equality `request?field=value`; 
* Greater than/Greater than or equal `request?field[gt]=value` `request?field[gte]=`;
* Lesser than/Lesser than or equal `request?field[lt]=value` `request?field[lte]=`;

2. `sort()`:
Allow to sort the result in ascending/descending order.

* Asc: `request?sort=field`
* Desc: `request?sort=-field`
* Multiple sort: `request?sort=field1,field2,-field3`

3. `limitFields()`:
Allow to do a `project` on the resulting set. In other words, it allows to select what fields to output in result.

* Select fields: `request?fields=field1,field2,field3`: Will output a result with only "field1 field2 and field3" in the result.
* Select All except: `request?fields=-field1,-field2...`: Will output a result with all the fields except for "field1 and field2" in the result.

3. `pagination()`:
Allow to do a get a subset of the resulting set, depending on the parameters used. It takes as parameter: `page` and `limit`.

* Select fields: `request?page=2&limit=10`: Will output a result with values starting from the 11th element to the 20th. (Starts at page 2, not 1).

### b) handleFactory.js

```javascript
exports.getAll = (Model) => catchAsync(async (req, res, next) => {/* code that handles getAll depending on he Model */}
exports.getOne = (Model) => catchAsync(async (req, res, next) => {/* code that handles getOne depending on he Model */}
exports.createOne = (Model) => catchAsync(async (req, res, next) => {/* code that handles createOne depending on he Model */}
exports.updateOne = (Model) => catchAsync(async (req, res, next) => {/* code that handles updateOne depending on he Model */}
exports.deleteOne = (Model) => catchAsync(async (req, res, next) => {/* code that handles deleteOne depending on he Model */}
```
---
The handleFactory is a group of generic functions, that takes as a parameter, the `Model`, which could by any model defined using `Mongoose.model`; in our case, it is the User Model. It helps getting `CRUD operations` done quickly, so we don't have to re-write the same logic for each Model.

For example, here's what the main CRUD operations in userController looks like:

```
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.createUser = factory.createOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
```

## 4. Security practises
Security is essential in every web project. Many parts of an application could be vulnerable. This is the reason behind the usage of the coming packages. Please, for more information, visit the used package:

```javascript
const helmet = require('helmet'); // Use a lot of others packages, essentially to protect Http headers
const hpp = require('hpp'); // Protect against "http parameters pollution"
const xss = require('xss-clean'); // sanitize user input coming from POST body, GET queries, and url params
const mongoSanitize = require('express-mongo-sanitize'); // sanitize mongodb queries from potential injections
const rateLimit = require('express-rate-limit'); // Basic rate-limiting middleware for Express. Use to limit 
// repeated requests to public APIs and/or endpoints such as password reset
```

## 5. Authenticating users && Authorization
The process of authenticating is performed with a JWT (Json WebToken).

* It could be used in the `http authorization` header, or:
* Using an HttpOnly secure cookie set with the value of the JWT.

The `authController.js` is dedicated for all operations that need authentication from user. These operations includes:

```javascript
protect /* A middleware that can be run before handler functions that can only be run by logged in users */
restrictTo('role1', 'role2'...) /* A middleware to restrict access to a resource, only for listed roles */
signup /* A function to signup user. After signing up, send a welcome email to  */
login /* A function to login user == authenticate user*/
logout
forgotPassword /*When user hit this route, an email with a Reset token is sent to him*/
resetPasswortd /* Function used with the resetToken, to changeuser password*/
updateMyPassword /* Function to update user password */
```
Using `protect` and `restrictTo()` middlewares to guarantee that a resources is accessed either by, a logged in user, or an authorized user.
Exemple:

```javascript
/*updateMyPassword can only by done by a logged in user, beause preceeded by "authcontroller.protect" middleware*/
router.patch('/updateMyPassword', authController.protect, authController.updateMyPassword);
/*getAllUsers can be accessible only for logged in user, and only the "admin" can have access to it*/
router.get('/', authController.protect, authController.protect, restrictTo('admin'), userController.getAllUsers)
```

## 6. Installation

```bash
git clone https://github.com/Infouzi/Express-Advanced-user-skeleton.git # to pull the project

npm install #to install dependencies shown in package.json
```

## 7. Usage

```bash
create a config.env file in the root of the project and define theses variables

NODE_ENV=development
DATABASE=#link-to-your-online-database (eg. create one free in Atlas)
DATABASE_LOCAL=mongodb://localhost:27017/skeleton #skeleton is the name of the databse. You can use yours.
DATABASE_USER=#user-of-distant-database
DATABASE_PASSWORD=#password-of-distant-database
PORT=8000 #or any other port

JWT_SECRET=#your-super-secret-jwt-password-must-kept-secret
JWT_EXPIRES_IN=90d #read documentation of jwt to know what period to choose
JWT_COOKIE_EXPIRES_IN=90 #cookie validity

#development mails
#using mailtrap service, it has a free option.  It catches the mail you send from the web application (using nodemailer)
#which is destined to the subscribed user.
#Create an account there, then paste your mailtrap username/password.
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=#your-mailtrap-username
EMAIL_PASSWORD=#your-mailtrap-password

EMAIL_FROM=#define your email if you want

#production mails
#Using sendgrid service. A little bit more complex to configure than mailtrap. However, it lets you send "Real email"
#to the subscribed user.
SENDGRID_USERNAME=#your-sendgrid-username
SENDGRID_PASSWORD=#your-sendgrid-token-or-password
```

## 8. Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change or add.

I'm open to optimize the project as much as it could be.

## More information
A special thanks to Udemy instructor [Jonas Schmedtmann](https://www.udemy.com/user/jonasschmedtmann/) for his incredible course on NodeJs. It is really helpful to see the bigger picture of it, and learn the best practises with a great project.

This project is based essentially on what is shown in his course. Go and check it if you have time, it is amazing.

## License
[MIT](https://choosealicense.com/licenses/mit/)