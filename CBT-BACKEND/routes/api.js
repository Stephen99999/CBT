const express = require('express');
const router = express.Router();

// Middleware
const authMiddleware = require('../middleware/auth'); 

// Controllers
const authController = require('../controllers/authController');
const courseController = require('../controllers/courseController');
const questionController = require('../controllers/questionController');
const quizController = require('../controllers/quizController'); // Import the new controller
const userController = require('../controllers/userController'); // Uncomment if you have this

// ==========================================
// AUTH ROUTES
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getMe);

// ==========================================
// COURSE ROUTES
// ==========================================
// Public: View courses
router.get('/courses', courseController.index);
router.get('/courses/:id', courseController.show);

// Protected: Manage Courses (Admin)
router.post('/courses', authMiddleware, courseController.store);
router.get('/myCourses', authMiddleware, courseController.myCourses);
router.put('/courses/:id', authMiddleware, courseController.update);
router.delete('/courses/:id', authMiddleware, courseController.destroy);

// Protected: Enrollment
// Specific endpoint for enrolling to avoid conflict with update
router.post('/courses/:id/enroll', authMiddleware, courseController.enroll); 

// ==========================================
// QUESTION ROUTES
// ==========================================


// Get questions for a specific course (For taking the quiz)
// This matches the frontend call: getQuestionsByCourse(courseId)
router.get('/courses/:courseId/questions', authMiddleware, questionController.getByCourse); 

router.post('/questions', authMiddleware, questionController.store);
router.put('/questions/:id', authMiddleware, questionController.update);
router.delete('/questions/:id', authMiddleware, questionController.destroy);

// ==========================================
// QUIZ ATTEMPT ROUTES (NEW)
// ==========================================

// 1. Start a Quiz (Creates a new attempt)
router.post('/attempts', authMiddleware, quizController.startquiz);

// 2. End a Quiz (Updates the attempt with score & completion time)
// We use PUT because we are updating an existing resource
router.put('/attempts/complete', authMiddleware, quizController.endQuiz);

// 3. View History
router.get('/attempts/me', authMiddleware, quizController.getMyAttempts); // Student history
router.get('/attempts', authMiddleware, quizController.getAllAttempts);   // Admin view

// ==========================================
// USER ROUTES (For Admin Dashboard)
// ==========================================
router.get('/users', authMiddleware, userController.index);
router.delete('/users/:id', authMiddleware, userController.destroy);

module.exports = router;