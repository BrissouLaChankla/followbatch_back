const mongoose = require('mongoose');

const batchSchema = mongoose.Schema({
 number: Number,
 is_current:{ type: Boolean, default: false }
});

const Batch = mongoose.model('batchs', batchSchema);

module.exports = Batch;