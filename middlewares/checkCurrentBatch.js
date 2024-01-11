// middlewares/checkCurrentBatch.js
const Batch = require('../models/Batch'); // Assurez-vous que le chemin vers votre modèle Batch est correct

const checkCurrentBatch = (req, res, next) => {
    Batch.findOne({ is_current: true }).then(batch => {
        if (!batch) {
            return res.status(404).json({ message: "Pas de Batch current !" });
        }
        req.currentBatchId = batch._id;
        next();
    }).catch(error => {
        res.status(500).json({ message: "Erreur serveur", error: error });
    });
}

module.exports = checkCurrentBatch;
