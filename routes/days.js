var express = require('express');
var router = express.Router();
const moment = require('moment');
const OpenAI = require('openai');
const Airtable = require('airtable');
const convertDateToISO = require("../modules/formatDates");

const checkCurrentBatch = require('../middlewares/checkCurrentBatch');

const Day = require('../models/Day');
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

    const newData = {
        date: req.body.date,
        teacher_rate: req.body.teacher_rate,
        batch: req.currentBatchId,
        global_comment: req.body.global_comment,
        student_feeling: studentsFeelings
    }
    console.log(newData)


    Day.findOneAndUpdate({ date: req.body.date }, newData, { upsert: true, new: true, })
        .then(() => {
            return res.json('Succesfully saved.');
        })

});



router.get('/weekcron', function (req, res) {
    const date = req.params['date'] + req.params[0];
    Generation.findOne().then(gen => {

        // can't generate before waiting 8h
        const eightHoursAgo = moment().subtract(8, 'hours');
        const canGenerate = moment(gen.lastWeekGeneration).isBefore(eightHoursAgo);


        if (canGenerate) {

            Day.find({ batch: req.currentBatchId })
                .populate("student_feeling.student")
                .then(async days => {
                    let daysIncluded = [];
                    let students = [];
                    let prompt = "";
                    for (let i = 1; i < 6; i++) {
                        let date = moment().subtract(i, 'days').format('DD/MM/YYYY');
                        daysIncluded.push(date);
                    }
                    const last5Days = days.filter(day => daysIncluded.includes(day.date));

                    last5Days.forEach(el => {
                        prompt += `DEBRIEF JOURNEE : ${el.prompt}  --   `
                    });
                    last5Days[0].student_feeling.forEach(eleve => {
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

                    Generation.updateOne({}, { lastWeekGeneration: new Date() }).then(() => {
                        res.json({ gptAnswer: chatCompletion.choices[0].message })
                    })
                    return;
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

                const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.STUDENT_AIRTABLE_BASE);

                
                base('Daily standup Nice').select({
                    // Recherchez les enregistrements par date
                    filterByFormula: `FIND(${convertDateToISO(day.date)}, {Date})`
                }).eachPage(function page(records, fetchNextPage) {
                    records.forEach(function (record) {
                        // ID de l'enregistrement trouvé
                        var recordId = record.getId();

                        // Supposons que la cellule cible est dans une colonne nommée 'Colonne_Cible'
                        var updatedData = {};
                        updatedData['Notes journalières'] = 'Nouvelle valeur'; // Nouvelle valeur à insérer

                        // Mise à jour de l'enregistrement
                        base('Daily standup Nice').update(recordId, updatedData, function (err, record) {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            console.log(record.get('Notes journalières'));
                        });
                    });

                    fetchNextPage();

                }, function done(err) {
                    if (err) { console.error(err); return; }
                });
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
