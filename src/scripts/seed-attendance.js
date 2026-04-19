import mongoose from 'mongoose';
// Import via shared.js so ALL models are registered before any populate() runs
import { User, Attendance, Department, Timetable } from '../shared.js';
import 'dotenv/config';

async function seedAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // ── 1. Get the first department ──────────────────────────────────────────
    const dept = await Department.findOne();
    if (!dept) { console.error('No department found'); process.exit(1); }
    console.log(`Department: ${dept.name} (${dept._id})`);

    // ── 2. Load ALL students grouped by division ─────────────────────────────
    const allStudents = await User.find({ role: 'student', departmentId: dept._id });
    console.log(`Students found: ${allStudents.length}`);

    // ── 3. Load ALL timetables for this department ───────────────────────────
    const timetables = await Timetable.find({ departmentId: dept._id })
      .populate('slots.subjectId', 'name')
      .populate('slots.facultyId', 'name');
    console.log(`Timetables found: ${timetables.length}`);

    if (timetables.length === 0) {
      console.error('No timetables found — cannot seed attendance. Upload a timetable first.');
      process.exit(1);
    }

    // ── 4. Wipe existing attendance so we start clean ────────────────────────
    const deleted = await Attendance.deleteMany({ departmentId: dept._id });
    console.log(`Cleared ${deleted.deletedCount} old attendance records.`);

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSessions = 0;
    let totalRecords = 0;

    // ── 5. Iterate last 30 days ───────────────────────────────────────────────
    for (let daysBack = 0; daysBack < 30; daysBack++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysBack);
      const dayName = DAYS[date.getDay()];

      // skip weekends
      if (dayName === 'Sunday' || dayName === 'Saturday') continue;

      // ── 6. Iterate every timetable ──────────────────────────────────────────
      for (const tt of timetables) {
        // Students for this division
        const divStudents = allStudents.filter(s => s.division === tt.division);
        if (divStudents.length === 0) continue;

        // Slots that run on this day
        const daySlots = (tt.slots || []).filter(s => s.day === dayName);
        if (daySlots.length === 0) continue;

        for (const slot of daySlots) {
          // Skip slots with no subject/faculty (bad data)
          if (!slot.subjectId || !slot.facultyId) continue;

          // Build a record for EVERY student in this division (present or absent)
          const records = divStudents.map(student => ({
            studentId: student._id,
            status: Math.random() > 0.25 ? 'present' : 'absent',
            remarks: '',
          }));

          try {
            await Attendance.create({
              timetableSlotRef: {
                timetableId: tt._id,
                day: slot.day,
                startTime: slot.startTime,
              },
              subjectId: slot.subjectId._id || slot.subjectId,
              facultyId: slot.facultyId._id || slot.facultyId,
              departmentId: dept._id,
              division: tt.division,
              date,
              records,
            });
            totalSessions++;
            totalRecords += records.length;
          } catch (err) {
            // Unique index violation — already exists, skip
            if (err.code === 11000) continue;
            throw err;
          }
        }
      }
    }

    console.log(`Done! Created ${totalSessions} sessions with ${totalRecords} student records total.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message || err);
    process.exit(1);
  }
}

seedAttendance();
