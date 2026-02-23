const { Question, Course, Enrollment,quizAttempts } = require('../models');
const { Sequelize } = require('sequelize');

// POST /api/questions (Create a question)
exports.store = async (req, res) => {
    try {

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }
        const { course_id, question_text, options, correct_answer } = req.body;

        // Verify course exists first
        const course = await Course.findByPk(course_id);
        if (!course) return res.status(404).json({ msg: 'Course not found' });

        const question = await Question.create({
            course_id,
            question_text,
            options, // Array will be auto-stringified by our Model Setter
            correct_answer
        });

        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getByCourse = async (req, res) => {
    try {
        
        const { courseId } = req.params;
        const questions = await Question.findAll({
            where: { course_id: courseId },
            order: Sequelize.literal('RANDOM()'), 
            // Limit the results to 20
            limit: 20,
        });
        
        if (!questions.length) {
            return res.status(404).json({ msg: 'No questions found for this course' });
        }

        res.status(200).json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/questions/:id
exports.update = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }
    try {
        const question = await Question.findByPk(req.params.id);
        if (!question) return res.status(404).json({ msg: 'Question not found' });

        await question.update(req.body);
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/questions/:id
exports.destroy = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }
    try {
        const question = await Question.findByPk(req.params.id);
        if (!question) return res.status(404).json({ msg: 'Question not found' });

        await question.destroy();
        res.json({ msg: 'Question deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


