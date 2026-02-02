const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, matric_no, password } = req.body;

        // Check unique user
        let user = await User.findOne({ where: { matric_no } });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        user = await User.create({
            name,
            matric_no,
            password: hashedPassword,
            role: 'student'
        });

        // Generate Token
        // FIX: We wrap the id inside a 'user' object
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
            }
        );

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { matric_no, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { matric_no } });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        // Generate Token
        // FIX: We wrap the id inside a 'user' object here too
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                // Return user info along with token for the frontend context
                res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
            }
        );

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        // req.user is now guaranteed to exist because of the fix above
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};