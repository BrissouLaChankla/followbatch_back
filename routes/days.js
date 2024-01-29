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



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});


router.use(checkCurrentBatch);

router.get('/all', function (req, res) {
    Day.find()
        .populate("batch")
        .then(days => {
            res.json({ days });
        })
})


router.post('/store', function (req, res) {
    const today = new Date().getDay();
    if (today === 0 || today === 6) {
        res.json("Pas de store les week-end!")
        return;
    }

    const studentsFeelings = [];

    for (const key in req.body) {
        if (Object.hasOwnProperty.call(req.body, key)) {
            if (key.startsWith('comment_', 0)) {
                let newStu = {
                    student: key.substring('comment_'.length),
                    comment: req.body[key],
                    is_in_difficulty: false
                }
                let diffVal = "is_in_difficulty_" + key.substring('comment_'.length)
                if (req.body[diffVal]) {
                    newStu.is_in_difficulty = true;
                }
                studentsFeelings.push(newStu)
            }
        }
    }

    Day.find({ bath: req.currentBatchId }).then(days => {

        let week = 0;

        if (days.length < 6) {
            week = 1
        } else if (days.length < 11) {
            week = 2
        } else if (days.length < 16) {
            week = 3
        } else if (days.length < 21) {
            week = 4
        } else if (days.length < 26) {
            week = 5
        } else if (days.length < 31) {
            week = 6
        } else if (days.length < 36) {
            week = 7
        } else if (days.length < 41) {
            week = 8
        } else if (days.length < 46) {
            week = 9
        } else {
            week = 10
        }

        const newData = {
            date: req.body.date,
            teacher_rate: req.body.teacher_rate,
            batch: req.currentBatchId,
            week,
            global_comment: req.body.global_comment,
            student_feeling: studentsFeelings
        }
        console.log(newData)


        Day.findOneAndUpdate({ date: req.body.date }, newData, { upsert: true, new: true, })
            .then(() => {
                return res.json('Succesfully saved.');
            })
    })

});



router.get('/weekcron/:week', function (req, res) {
    Week.findOne({week:req.params.week}).then(weekGen => {


        if (!weekGen) {

            Day.find({ batch: req.currentBatchId, week: req.params.week })
                .populate("student_feeling.student")
                .then(async days => {
                    let students = [];
                    let prompt = "";
                  
                    
                    

                    days.forEach(el => {
                        prompt += `DEBRIEF JOURNEE : ${el.prompt}  --   `
                    });
                    days[0].student_feeling.forEach(eleve => {
                        students.push(` ${eleve.student.firstname} ${eleve.student.lastname}`)
                    })

                    let promptTosend = `Je suis enseignant et je vais t'envoyer le résumé de plusieurs journées, ces résumés vont contenir mon ressenti mais aussi parfois des remarques pour certains de mes élèves dont je citerai le nom. 
                    Je veux que tu me produises un résumé global et concis de ces 5 derniers jours puis que tu ailles à la ligne et que tu crées un résumé court pour chacun de mes élèves (avec un retour à la ligne à chaque fois également). Si tu n'obtiens aucune information sur un élève à travers mes résumés, tu peux écrire 'RAS'. Veuillez ne pas inclure de commentaires généraux ni de préambule dans la réponse. Fournissez uniquement le résumé global des cinq derniers jours et les résumés individuels pour chacun de mes élèves.
                    
                    Voici la liste de mes élèves : ${students}         
                    _______________________________
                    
                    Et voici mes résumés : ${prompt}
                    _______________________________`

                    const chatCompletion = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: [{
                            "role": "system",
                            "content": promptTosend
                        }],
                    });

                    Week.find({ batch: req.currentBatchId }).then(() => {

                        const newWeek = new Week({
                            batch: req.currentBatchId,
                            summary: chatCompletion.choices[0].message.content,
                            week: req.params.week
                        });

                        newWeek.save().then(() => {
                            Generation.updateOne({}, { lastWeekGeneration: new Date() }).then(() => {
                                res.json({ result: true, gptAnswer: chatCompletion.choices[0].message })
                                return;
                            })
                        })

                    })


                });


        } else {
            // Heure actuelle
            let maintenant = moment();

            // Durée de 8 heures en millisecondes
            let huitHeures = 8 * 60 * 60 * 1000;

            // Calculer la différence de temps depuis la dernière action
            let tempsEcoule = maintenant.diff(moment(gen.lastWeekGeneration));

            let tempsRestant = huitHeures - tempsEcoule;
            let duree = moment.duration(tempsRestant);


            res.json({ message: `Désolé, tu dois encore attendre ${duree.hours()} heures et ${duree.minutes()} minutes avant le prochain prompt` })
        }
    })
});

router.get('/generatedaily/:date*', function (req, res) {
    const date = req.params['date'] + req.params[0];

    Day.findOne({ date: date, batch: req.currentBatchId })
        .populate("student_feeling.student")
        .then(day => {
            if (!day) {
                res.json({ message: 'Désolé, cette journée n\'a pas été remplie !' })
                return;
            }
            let dayAppreciation = "bonne";
            switch (day.teacher_rate) {
                case 2:
                    dayAppreciation = "mitigée";
                    break;
                case 1:
                    dayAppreciation = "difficile";
                    break;
                default:
                    break;
            }

            // Filtre tous ceux sans commentaires
            const comments = day.student_feeling.filter(feelings => feelings.comment !== "");

            let studentsMsg = "";

            comments.forEach(msg => {
                studentsMsg += `${msg.student.firstname} : ${msg.comment} | `;
            });

            const message = `${day.global_comment} ${studentsMsg}Pour les autres élèves RAS 🫡 Globalement la journée a été ${dayAppreciation}`

            Day.updateOne({ _id: day.id }, { prompt: message }).then(data => {

                return res.json({ data });

            })

        })


});






router.get('/:date*', function (req, res) {
    const date = req.params['date'] + req.params[0];

    Day.findOne({ date: date, batch: req.currentBatchId })
        .populate('student_feeling.student')
        .then(data => {
            res.json(data)
        })
});

module.exports = router;
