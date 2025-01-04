const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/mentor-student-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define Mongoose Schemas
const mentorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    expertise: { type: String, required: true },
});

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    course: { type: String, required: true },
    currentMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', default: null },
    previousMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', default: null },
});

// Create Mongoose Models
const Mentor = mongoose.model('Mentor', mentorSchema);
const Student = mongoose.model('Student', studentSchema);

// API to create a mentor
app.post('/create-mentor', async (req, res) => {
    const { name, expertise } = req.body;
    const mentor = new Mentor({ name, expertise });
    await mentor.save();
    res.json({ message: 'Mentor created successfully', mentor });
});

// API to create a student
app.post('/create-student', async (req, res) => {
    const { name, course } = req.body;
    const student = new Student({ name, course });
    await student.save();
    res.json({ message: 'Student created successfully', student });
});

// API to assign students to a mentor
app.post('/assign-students-to-mentor', async (req, res) => {
    const { mentorId, studentIds } = req.body;

    const mentor = await Mentor.findById(mentorId);
    if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
    }

    const updatedStudents = await Student.updateMany(
        { _id: { $in: studentIds }, currentMentor: null },
        { $set: { currentMentor: mentorId } }
    );

    if (updatedStudents.matchedCount === 0) {
        return res.status(400).json({ error: 'No valid students available for assignment' });
    }

    res.json({ message: 'Students assigned successfully', mentorId, studentIds });
});

// API to change the mentor for a particular student
app.post('/change-mentor', async (req, res) => {
    const { studentId, newMentorId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }

    const newMentor = await Mentor.findById(newMentorId);
    if (!newMentor) {
        return res.status(404).json({ error: 'Mentor not found' });
    }

    student.previousMentor = student.currentMentor;
    student.currentMentor = newMentorId;
    await student.save();

    res.json({ message: 'Mentor changed successfully', student });
});

// API to show all students for a particular mentor
app.get('/students/:mentorId', async (req, res) => {
    const mentorId = req.params.mentorId;

    const students = await Student.find({ currentMentor: mentorId }).populate('currentMentor');
    res.json({ mentorId, students });
});

// API to show the previously assigned mentor for a particular student
app.get('/previous-mentor/:studentId', async (req, res) => {
    const studentId = req.params.studentId;

    const student = await Student.findById(studentId).populate('previousMentor');
    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.previousMentor) {
        return res.json({ message: 'No previous mentor assigned', studentId });
    }

    res.json({ studentId, previousMentor: student.previousMentor });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
