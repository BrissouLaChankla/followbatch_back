const mongoose = require('mongoose');


const studentFeelingSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'students' },
    comment: { type: String, default: ""},
    is_in_difficulty: { type: Boolean, default: false },
});

const daySchema = mongoose.Schema({
    date: String,
    batch:{ type: mongoose.Schema.Types.ObjectId, ref: 'batchs' },
    teacher_rate: { type: Number, default: 3 },
    week:Number,
    global_comment: { type: String, default: '' },
    student_feeling: [studentFeelingSchema],
    prompt:{ type: String, default: '' }
});

const Day = mongoose.model('days', daySchema);

module.exports = Day;