const express = require('express');
const emailRouter = express.Router();

emailRouter.route('/email').post(function (req, res) {
  console.log("<email route>", req.body);
});

module.exports = emailRouter;