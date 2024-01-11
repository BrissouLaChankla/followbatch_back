const mongoose = require('mongoose');

const generationSchema = mongoose.Schema({
 lastWeekGeneration: Date,
 lastDayGeneration: Date,
});

const Generation = mongoose.model('generations', generationSchema);

module.exports = Generation;