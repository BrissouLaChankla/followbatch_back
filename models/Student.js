const mongoose = require('mongoose');

const studentSchema = mongoose.Schema({
 firstname: String,
 lastname: String,
 batch: { type: mongoose.Schema.Types.ObjectId, ref: 'batchs' },
});

const Student = mongoose.model('students', studentSchema);

module.exports = Student;