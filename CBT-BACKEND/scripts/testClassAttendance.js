// E2E verification for classController (run: node scripts/testClassAttendance.js)
// Creates throwaway test users/class, exercises mark-attendance checks, then cleans up.
const db = require('../models');
const controller = require('../controllers/classController');
const { Sequelize, Class, User } = db;
const Op = db.Sequelize ? require('sequelize').Op : null;

const mkRes = () => {
  const r = { code: null, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  return r;
};

const call = (fn, req) => {
  const res = mkRes();
  return fn(req, res).then(() => res);
};

(async () => {
  let users, cls;
  try {
    // 0. Cleanup any leftovers from earlier failed runs
    await User.destroy({ where: { matric_no: { [Op.like]: 'E2E-%' } } });
    await Class.destroy({ where: { name: 'E2E Test Class' } });

    console.log('1. Models loaded:', Object.keys(db).filter(k => typeof db[k] === 'function').join(', '));

    // 2. Attendance table + unique index exist
    const [idx] = await db.sequelize.query("SELECT indexname FROM pg_indexes WHERE tablename = 'Attendances'");
    console.log('2. Attendances indexes:', idx.map(i => i.indexname).join(', '));

    // 3. Test data
    const ts = Date.now();
    users = await Promise.all([
      User.create({ name: 'E2EAdmin', matric_no: 'E2E-ADMIN-' + ts, password: 'x', role: 'admin' }),
      User.create({ name: 'E2EStu1', matric_no: 'E2E-S1-' + ts, password: 'x', role: 'student' }),
      User.create({ name: 'E2EStu2', matric_no: 'E2E-S2-' + ts, password: 'x', role: 'student' }),
    ]);
    const [admin, s1, s2] = users;

    // Store via the actual controller (admin flow)
    const rStore = await call(controller.store, {
      user: { id: admin.id, role: 'admin' },
      body: {
        name: 'E2E Test Class',
        start_time: new Date(Date.now() - 5 * 60 * 1000), // started 5 min ago
        duration_minutes: 60,
        latitude: 6.6825, longitude: 3.4548,
        allowed_radius: 100
      }
    });
    console.log('3. Create class (admin):', rStore.code, rStore.body.msg || rStore.body.error);
    cls = rStore.body.class;

    // Missing location -> 400
    const rNoLoc = await call(controller.store, {
      user: { id: admin.id, role: 'admin' },
      body: { name: 'NoLoc', start_time: new Date() }
    });
    console.log('   Create class without location:', rNoLoc.code, rNoLoc.body.msg || rNoLoc.body.error);

    // Non-admin -> 403
    const rNoAuth = await call(controller.store, {
      user: { id: s1.id, role: 'student' },
      body: { name: 'NotAdmin', start_time: new Date(), latitude: 1, longitude: 1 }
    });
    console.log('   Create class as student:', rNoAuth.code, rNoAuth.body.error || rNoAuth.body.error);

    const reqFor = (user, coords) => ({
      user: { id: user.id },
      params: { id: String(cls.id) },
      body: coords
    });

    // 4. Student ~30m away -> 201 success
    const r1 = await call(controller.markAttendance, reqFor(s1, { latitude: 6.68276, longitude: 3.45497 }));
    console.log('4. Nearby student marks:', r1.code, r1.body.msg || r1.body.error);
    console.log('   recorded distance:', r1.body.attendance && r1.body.attendance.distance_meters, 'm');

    // 5. Student ~1.8km away -> 403 too far
    const r2 = await call(controller.markAttendance, reqFor(s2, { latitude: 6.695, longitude: 3.47 }));
    console.log('5. Far student marks:', r2.code, r2.body.msg || r2.body.error, '(allowed:', r2.body.allowed_radius_meters + 'm)');

    // 6. Duplicate -> 400
    const r3 = await call(controller.markAttendance, reqFor(s1, { latitude: 6.68276, longitude: 3.45497 }));
    console.log('6. Duplicate marks:', r3.code, r3.body.msg || r3.body.error);

    // 7. Admin attendee list
    const r4 = await call(controller.getAttendance, { user: { id: admin.id, role: 'admin' }, params: { id: String(cls.id) } });
    console.log('7. Attendee list:', r4.body.map(a => a.student.name + ' @ ' + a.distance_meters + 'm').join('; '));

    // 8. Before-class check: class that starts in the future
    const futureCls = await Class.create({
      admin_id: admin.id, name: 'E2E Future Class',
      start_time: new Date(Date.now() + 2 * 3600 * 1000),
      duration_minutes: 60, latitude: 6.6825, longitude: 3.4548, allowed_radius: 100
    });
    const r5 = await call(controller.markAttendance, {
      user: { id: s2.id }, params: { id: String(futureCls.id) },
      body: { latitude: 6.6825, longitude: 3.4548 }
    });
    console.log('8. Attendance before start:', r5.code, r5.body.msg || r5.body.error);
    await futureCls.destroy();

    console.log('ALL CHECKS COMPLETE ✅');
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    // 9. Cleanup
    try {
      if (cls) await cls.destroy();
      if (users) await Promise.all(users.map(u => u.destroy()));
      await Class.destroy({ where: { name: { [Op.like]: 'E2E %' } } });
      await User.destroy({ where: { matric_no: { [Op.like]: 'E2E-%' } } });
      console.log('Test data cleaned up.');
    } catch (e2) {
      console.error('Cleanup warning:', e2.message);
    }
    await db.sequelize.close();
  }
})();
