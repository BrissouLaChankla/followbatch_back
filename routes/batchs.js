var express = require('express');
var router = express.Router();
const checkCurrentBatch = require('../middlewares/checkCurrentBatch');

const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Day = require('../models/Day');


router.use(checkCurrentBatch);

router.get('/all/:date*', function (req, res) {

    // Tous les élèves du Batch en cours
    Student.find({ batch: req.currentBatchId }).then(students => {
        const date = req.params['date'] + req.params[0];
        const studentsFeelings = [];

        for (let i = 0; i < students.length; i++) {
            studentsFeelings.push({
                student: students[i]._id,
            })
        }


        const newData = {
            date: date,
            batch: req.currentBatchId,
            student_feeling: studentsFeelings
        }
        console.log(newData)

        Batch.find().then(batchs => {

            Day.findOne({ date: date }).populate('student_feeling.student')
                .then((data) => {
                    if (data) {
                        // console.log(data);
                        return res.json(
                            {
                                infoBatch: data,
                                allBatchs: batchs
                            })
                    } else {
                        const newDay = new Day(newData);
                        newDay.save()
                            .then(batchCreated => {
                                return res.json(
                                    {
                                        infoBatch: batchCreated,
                                        allBatchs: batchs
                                    })
                            })
                    }
                });

        })

    });
});



router.post('/store', function (req, res) {

    const newBatch = new Batch({
        number: req.body.number
    });

    newBatch.save().then(() => {
        res.json({ result: true })
    })

});

module.exports = router;
