
const { User, Course } = require('../models'); // Adjust path as needed

exports.index = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }

        const students = await User.findAll({
            attributes: { exclude: ['password'] },
            // 2. Fetch the relationship
            include: [
                {
                    model: Course,
                    as: 'enrolled_courses', // This must match the alias in your User.js model association (e.g. User.belongsToMany(Course, { as: 'courses' }))
                    through: { attributes: [] } // Clean up output by hiding the join table data
                }
            ]
        });
        
        // 3. Map the data to match your Frontend expectation (enrolledCourses)
        const formattedStudents = students.map(student => {
            const s = student.toJSON();
            return {
                ...s,
                // If your association alias is 'courses', we map it to 'enrolledCourses' for the UI
                enrolledCourses: s.courses || s.enrolled_courses || [] 
            };
        });

        res.json(formattedStudents);
    } catch (err) {
        console.error(err); // Good for debugging
        res.status(500).json({ error: err.message });
    }
};

exports.destroy = async (req, res) => {
    try {
        // ERROR 1 FIX: Check role properly
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }

        const student = await User.findByPk(req.params.id);

        if (!student) {
            // ERROR 4 FIX: Use a custom string, 'err' doesn't exist here
            return res.status(404).json({ error: 'User not found' });
        }

        await student.destroy();
        res.json({ msg: 'Student deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};