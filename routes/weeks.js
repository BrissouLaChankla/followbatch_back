var express = require('express');
var router = express.Router();
const moment = require('moment');
const OpenAI = require('openai');
const Airtable = require('airtable');
const convertDateToISO = require("../modules/formatDates");

const checkCurrentBatch = require('../middlewares/checkCurrentBatch');

const Day = require('../models/Day');
const Week = require('../models/Week');
const Generation = require('../models/Generation');



router.use(checkCurrentBatch);

router.get('/all', function (req, res) {
    Week.find({batch:req.currentBatchId})
        .then(weeks => {
            res.json({ weeks });
        })
})


module.exports = router;
