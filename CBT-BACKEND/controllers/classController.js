const { Class, Attendance, User } = require('../models');

// ==========================================
// Helpers
// ==========================================

// Haversine distance between two [lat, lng] points, in METERS
const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
};

// ==========================================
// CLASS CRUD
// ==========================================

// GET /api/classes  (list all classes)
exports.index = async (req, res) => {
  try {
    
    const classes = await Class.findAll({
      include: [
        { model: User, as: 'admin', attributes: ['id', 'name', 'matric_no'] }
      ],
      order: [['start_time', 'DESC']]
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/classes/:id
exports.show = async (req, res) => {
  try {
    const singleClass = await Class.findByPk(req.params.id, {
      include: [
        { model: User, as: 'admin', attributes: ['id', 'name', 'matric_no'] },
        { model: Attendance, as: 'attendances' }
      ]
    });
    if (!singleClass) return res.status(404).json({ msg: 'Class not found' });
    res.json(singleClass);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/classes  (Admin only)
// The admin sends their CURRENT location (latitude/longitude) in the body;
// only `allowed_radius` is configured manually.
exports.store = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const { name, start_time, duration_minutes, latitude, longitude, allowed_radius } = req.body;

    // Location MUST come in the request (admin's current location)
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        msg: 'latitude and longitude are required — send the admin\'s current location'
      });
    }

    // Sanity check on the radius
    if (allowed_radius !== undefined && allowed_radius <= 0) {
      return res.status(400).json({ msg: 'allowed_radius must be a positive number of meters' });
    }

    const newClass = await Class.create({
      name,
      start_time,
      duration_minutes,        // defaults to 60 if omitted
      latitude,
      longitude,
      allowed_radius,          // defaults to 100 if omitted
      admin_id: req.user.id
    });

    res.status(201).json({
      msg: 'Class created successfully',
      class: newClass
    });
  } catch (err) {
    console.error('❌ Error creating class:', err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/classes/:id  (Admin only)
exports.destroy = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }
    const singleClass = await Class.findByPk(req.params.id);
    if (!singleClass) return res.status(404).json({ msg: 'Class not found' });

    await singleClass.destroy();
    res.json({ msg: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// ATTENDANCE
// ==========================================

// POST /api/classes/:id/attendance
// Student marks attendance. Their location must be within the class's
// allowed_radius of the location the admin recorded when creating the class,
// and the class must be running (between start_time and start_time + duration).
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const classId = req.params.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        msg: 'latitude and longitude are required — send the student\'s current location'
      });
    }

    // 1. Does the class exist?
    const singleClass = await Class.findByPk(classId);
    if (!singleClass) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    // 2. Is the class running right now?
    //    (start_time .. start_time + duration_minutes)
    const now = new Date();
    const startedAt = new Date(singleClass.start_time);
    const endsAt = new Date(startedAt.getTime() + singleClass.duration_minutes * 60 * 1000);

    if (now < startedAt) {
      return res.status(400).json({
        msg: 'Class has not started yet.',
        starts_at: startedAt
      });
    }
    if (now > endsAt) {
      return res.status(400).json({
        msg: 'Class attendance window has closed.',
        ended_at: endsAt
      });
    }

    // 3. Is the student within the allowed radius?
    const distance = haversineMeters(
      singleClass.latitude, singleClass.longitude,
      latitude, longitude
    );

    if (distance > singleClass.allowed_radius) {
      return res.status(403).json({
        msg: 'You are too far from the class location to mark attendance.',
        your_distance_meters: Math.round(distance),
        allowed_radius_meters: singleClass.allowed_radius
      });
    }

    // 4. Duplicate check (unique per class + student)
    const existing = await Attendance.findOne({
      where: { class_id: classId, user_id: userId }
    });
    if (existing) {
      return res.status(400).json({ msg: 'You have already marked attendance for this class.' });
    }

    // 5. Save it
    const attendance = await Attendance.create({
      class_id: classId,
      user_id: userId,
      latitude,
      longitude,
      distance_meters: Math.round(distance * 100) / 100 // 2dp
    });

    res.status(201).json({
      msg: 'Attendance marked successfully!',
      ...attendance.toJSON()
    });
  } catch (err) {
    console.error('❌ Error marking attendance:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/classes/:id/attendance  (Admin: who attended a class)
exports.getAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }
    const attendances = await Attendance.findAll({
      where: { class_id: req.params.id },
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'matric_no'] }
      ]
    });
    res.json(attendances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/attendance/me  (Student: their own attendance history)
exports.myAttendance = async (req, res) => {
  try {
    const attendances = await Attendance.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Class, as: 'attended_class' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(attendances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
