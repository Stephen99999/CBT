// controllers/quizController.js
const { quizAttempts, Course, User,Enrollment } = require('../models'); 


exports.getMyAttempts = async (req, res) => {
    try {
        const userId = req.user.id;

        const attempts = await quizAttempts.findAll({
            where: { user_id: userId },
            // Include Course info so the UI can show "Mathematics 101"
            include: [{
                model: Course,
                attributes: ['title', 'description'] 
            }],
            order: [['createdAt', 'DESC']] // Newest first
        });

        res.status(200).json(attempts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 2. Get ALL Attempts (For Admin Dashboard)
// ==========================================
exports.getAllAttempts = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }

        const attempts = await quizAttempts.findAll({
            include: [
                {
                    model: User,
                    attributes: ['name', 'matric_no'] // Show who took the quiz
                },
                {
                    model: Course,
                    attributes: ['title'] // Show which quiz they took
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(attempts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


exports.startquiz = async (req, res) => {
    try {
        const { courseId } = req.body; 
        const userId = req.user.id; 

        // 1. Enrollment Check
        const enrollment = await Enrollment.findOne({
            where: { user_id: userId, course_id: courseId }
        });

        if (!enrollment) {
            return res.status(403).json({ msg: 'You are not enrolled in this course' });
        }

        // 2. CHECK EXISTING ATTEMPT (New Logic)
        const existingAttempt = await quizAttempts.findOne({
            where: { user_id: userId, course_id: courseId }
        });

        if (existingAttempt) {
            return res.status(400).json({ 
                msg: 'You have already attempted this quiz.',
                attempt_id: existingAttempt.id // Optional: return the old ID
            });
        }

        // 3. CREATE the attempt
        await quizAttempts.create({
            user_id: userId,
            course_id: courseId,
            score: null,      
            updatedAt: null   
        });

        // 4. Fetch the record we just created
        const freshQuiz = await quizAttempts.findOne({
            where: { user_id: userId, course_id: courseId },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ 
            msg: "Quiz started", 
            attempt_id: freshQuiz.id 
        });

    } catch (err) {
        console.error("❌ Error in startquiz:", err);
        res.status(500).json({ error: err.message });
    }
};


exports.endQuiz = async (req, res) => {
    try {
        const { attempt_id, score } = req.body;
        const userId = req.user.id;

        // 1. Find the attempt
        const attempt = await quizAttempts.findOne({
            where: { 
                id: attempt_id,
                user_id: userId 
            }
        });

        if (!attempt) {
            return res.status(404).json({ msg: 'Quiz attempt not found' });
        }

        // 2. Check if already submitted
        if (attempt.score !== null) {
            return res.status(400).json({ msg: 'This quiz has already been submitted.' });
        }

        // ======================================================
        // 3. SERVER-SIDE TIME VALIDATION (The Anti-Cheat Logic)
        // ======================================================
        
        // Fetch the course to get the allowed time (in minutes)
        const course = await Course.findByPk(attempt.course_id);
        
        if (!course) {
            return res.status(404).json({ msg: 'Associated course not found' });
        }

        // Calculate time differnece
        const startTime = new Date(attempt.createdAt).getTime();
        const durationMs = Number(course.time_allowed) * 60 * 1000; // Convert minutes to MS
        const now = Date.now();
        
        // Add a "Grace Period" (e.g., 60 seconds) for network latency/slow internet
        // If you don't add this, users with slow internet might get rejected unfairly.
        const gracePeriodMs = 30 * 1000; 

        const allowedEndTime = startTime + durationMs + gracePeriodMs;

        if (now > allowedEndTime) {
            // OPTION A: Reject the submission completely
            // return res.status(400).json({ msg: "Time limit exceeded. Submission rejected." });

            // OPTION B (Recommended): Accept it but Force Score to 0
            // This prevents them from complaining "My internet died", 
            // but also ensures they don't get points for cheating.
            console.log(`⚠️ User ${userId} submitted late! Force failing.`);
            attempt.score = 0; 
            attempt.updatedAt = new Date();
            await attempt.save();
            return res.status(200).json({ msg: 'Time limit exceeded. Score recorded as 0.', score: 0 });
        }

        // ======================================================

        // 4. If time is valid, save the real score
        attempt.score = score;
        attempt.updatedAt = new Date();
        
        await attempt.save();

        res.status(200).json({ msg: 'Quiz submitted successfully', score: attempt.score });

    } catch (err) {
        console.error("❌ Error in endQuiz:", err);
        res.status(500).json({ error: err.message });
    }
};