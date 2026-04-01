// middleware.js
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const helmetMiddleware = helmet();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});

module.exports = {
  helmet: helmetMiddleware,
  apiLimiter,
  // deviceFraudMiddleware পরে লাগলে যোগ করবেন
};
