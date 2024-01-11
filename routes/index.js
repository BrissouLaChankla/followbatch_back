var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/login', function (req, res) {

  if (req.body.password === process.env.PASSWORD_ACCESS) {
    res.json({ result: true, password:process.env.PASSWORD_ACCESS });
  } else {
    res.json({ result: false });
  }


});

router.post('/checkpass', function (req, res) {

  if (req.body.password === process.env.PASSWORD_ACCESS) {
    res.json({ result: true});
  } else {
    res.json({ result: false });
  }


});

module.exports = router;
