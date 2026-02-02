const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. GET THE KEY: Grab token from header
    const token = req.header('x-auth-token');

    // 2. CHECK IF KEY EXISTS
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // 3. VERIFY THE KEY IS VALID (The actual "Auth Check")
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. ATTACH USER TO REQUEST (Vital Step!)
        // This is how 'req.user.id' becomes available in your controller later
        req.user = decoded.user; 
        
        // 5. OPEN THE GATE
        next(); 
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};