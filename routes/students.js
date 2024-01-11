const express = require('express');
const router = express.Router();

const Batch = require('../models/Batch');
const Student = require('../models/Student');

/* GET home page. */
router.get('/all/:batchNb', function (req, res) {

    Batch.findOne({ number: req.params.batchNb }).then(batch => {

        Student.find({ batch: batch._id }).then(data => {
            res.json({ value: data })
        })


    });


});

module.exports = router;
