const { where } = require('sequelize');
const { Course, Enrollment, User } = require('../models');
const { sequelize } = require('../models');

// GET /api/courses
exports.index = async (req, res) => {
    try {
       
        let whereCondition = { is_available: true };

       
        if (req.user && req.user.role === 'admin') {
            whereCondition = {}; // Remove restrictions, show hidden courses too
        }

        const courses = await Course.findAll({
            where: whereCondition, 
            attributes: {
                
                include: [
                    [
                        // This writes a raw SQL subquery to count enrollments
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM "Enrollments" AS enrollment
                            WHERE
                                enrollment.course_id = "Course"."id"
                        )`),
                        'totalEnrollments'
                    ]
                ]
            },
           
             order: [['createdAt', 'DESC']] 
        });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// controllers/courseController.js

exports.myCourses = async (req, res) => {
    try {
        const userId = req.user.id; 
        console.log("🔍 DEBUG: Fetching courses for User ID:", userId);

        const enrollments = await Enrollment.findAll({
            where: { user_id: userId } 
        });

        if (enrollments.length === 0) {
            return res.json([]);
        }

        const courseIds = enrollments.map(e => e.course_id);

        // 👇 FIX IS HERE: Add "raw: true" and "nest: true"
        const courses = await Course.findAll({
            where: {
                id: courseIds,
                is_available: true
            },
            raw: true, // Returns plain JSON data, not Sequelize instances
            nest: true 
        });

        
        res.json(courses);

    } catch (err) {

        res.status(500).json({ error: err.message });
    }
};

// GET /api/courses/:id
exports.show = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: ['questions']
        });
        if (!course) return res.status(404).json({ msg: 'Course not found' });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/courses
exports.store = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }
        const course = await Course.create({
            ...req.body,
        });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/courses/:id
exports.update = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ msg: 'Course not found' });

        // Update fields
        await course.update(req.body);
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/courses/:id
exports.destroy = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ msg: 'Course not found' });

        await course.destroy();
        res.json({ msg: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }


    
};


exports.enroll = async (req, res) => {
    try {
        // 1. Get User ID from the Auth Middleware (req.user)
        // This confirms the user is authenticated.
        const userId = req.user.id;

        // 2. Get Course ID from the Request Body
        const course_id = req.params.id;

        // Validation: Did they actually send a course ID?
        if (!course_id) {
            return res.status(400).json({ msg: "Course ID is required" });
        }

        // 3. Check if the Course actually exists
        // (Laravel: Course::find($id))
        const course = await Course.findByPk(course_id);
        if (!course) {
            return res.status(404).json({ msg: "Course not found" });
        }

        // 4. Check for Duplicate Enrollment
        // (Laravel: $user->courses()->where(...)->exists())
        const existingEnrollment = await Enrollment.findOne({
            where: { 
                user_id: userId, 
                course_id: course_id 
            }
        });

        if (existingEnrollment) {
            return res.status(400).json({ msg: "You are already enrolled in this course." });
        }

        // 5. Create the Enrollment
        // (Laravel: $user->courses()->attach($course_id))
        const newEnrollment = await Enrollment.create({
            user_id: userId,
            course_id: course_id,
            progress: 0, // Default start
            grade: null
        });

        res.status(201).json({
            msg: "Enrolled successfully!",
            enrollment: newEnrollment
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.toggleAvailability = async (req, res) => {
    try {
        const { id } = req.params; // Get course ID from URL

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }

        // 1. Find the course
        const course = await Course.findByPk(id);

        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        // 2. Toggle the boolean
        course.is_available = !course.is_available;
        
        // 3. Save changes
        await course.save();

        res.status(200).json({ 
            msg: `Course is now ${course.is_available ? 'Available' : 'Hidden'}`, 
            course: {
                id: course.id,
                title: course.title,
                is_available: course.is_available
            }
        });

    } catch (err) {
        console.error("❌ Error toggling availability:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.toggleShowResult = async (req, res) => {
    try {
        const { id } = req.params; // Get course ID from URL

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }

        // 1. Find the course
        const course = await Course.findByPk(id);

        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        // 2. Toggle the boolean
        course.show_result = !course.show_result;
        
        // 3. Save changes
        await course.save();

        res.status(200).json({ 
            msg: `Course is now ${course.show_result ? 'Show Result' : 'Hide Result'}`, 
            course: {
                id: course.id,
                title: course.title,
                show_result: course.show_result
            }
        });

    } catch (err) {
        console.error("❌ Error toggling show result:", err);
        res.status(500).json({ error: err.message });
    }
};