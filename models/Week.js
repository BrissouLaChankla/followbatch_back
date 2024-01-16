const mongoose = require('mongoose');

const weekSchema = mongoose.Schema({
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'batchs' },
    summary:{ type: String, default: "Pas encore généré..." },
    week:{type:Number}
});

const Week = mongoose.model('weeks', weekSchema);

module.exports = Week;