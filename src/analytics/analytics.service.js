import { Attendance, SyllabusProgress, Issue, EventRequest, User, Timetable } from '../shared.js';
import mongoose from 'mongoose';

class AnalyticsService {

  // ─── Department Attendance Analytics ────────────────────────────────────
  async getAttendanceStats(departmentId) {
    const deptId = new mongoose.Types.ObjectId(departmentId);

    // Overall average attendance % across all sessions in the department
    const sessions = await Attendance.find({ departmentId: deptId }).lean();

    let totalStudentSlots = 0;
    let presentCount = 0;

    const subjectMap = {};

    for (const session of sessions) {
      const subKey = session.subjectId?.toString();
      if (!subjectMap[subKey]) subjectMap[subKey] = { total: 0, present: 0 };

      for (const record of session.records) {
        totalStudentSlots++;
        subjectMap[subKey].total++;
        if (record.status === 'present' || record.status === 'late') {
          presentCount++;
          subjectMap[subKey].present++;
        }
      }
    }

    const overallPercent = totalStudentSlots === 0 ? 0 :
      Math.round((presentCount / totalStudentSlots) * 100);

    // Students below 75% threshold
    const studentAttendance = await Attendance.aggregate([
      { $match: { departmentId: deptId } },
      { $unwind: '$records' },
      { $group: {
        _id: '$records.studentId',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0] } }
      }},
      { $project: {
        studentId: '$_id',
        percentage: { $multiply: [{ $divide: ['$present', '$total'] }, 100] }
      }},
      { $match: { percentage: { $lt: 75 } } },
      { $count: 'count' }
    ]);

    return {
      overallPercent,
      totalSessions: sessions.length,
      studentsBelow75: studentAttendance[0]?.count || 0,
    };
  }

  // ─── Syllabus Completion Analytics ───────────────────────────────────────
  async getSyllabusStats(departmentId, academicYear) {
    const deptId = new mongoose.Types.ObjectId(departmentId);
    const trackers = await SyllabusProgress.find({
      departmentId: deptId,
      academicYear
    }).populate('subjectId', 'name code').lean();

    const subjects = trackers.map(t => ({
      subject: t.subjectId?.name || 'Unknown',
      code: t.subjectId?.code,
      completionPercent: t.completionPercent || 0,
      totalTopics: t.topics?.length || 0,
      doneTopics: t.topics?.filter(tp => tp.status === 'done').length || 0
    }));

    const avg = subjects.length === 0 ? 0 :
      Math.round(subjects.reduce((s, x) => s + x.completionPercent, 0) / subjects.length);

    return { averageCompletion: avg, subjects };
  }

  // ─── Issue Analytics ────────────────────────────────────────────────────
  async getIssueStats() {
    const [total, open, inProgress, resolved, byCategory] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'open' }),
      Issue.countDocuments({ status: 'in_progress' }),
      Issue.countDocuments({ status: 'resolved' }),
      Issue.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    return { total, open, inProgress, resolved, byCategory };
  }

  // ─── Event Analytics ────────────────────────────────────────────────────
  async getEventStats(departmentId) {
    const filter = departmentId ? { departmentId: new mongoose.Types.ObjectId(departmentId) } : {};

    const [total, pending, approved, rejected] = await Promise.all([
      EventRequest.countDocuments(filter),
      EventRequest.countDocuments({ ...filter, currentStage: { $in: ['council', 'hod', 'dean'] } }),
      EventRequest.countDocuments({ ...filter, currentStage: 'approved' }),
      EventRequest.countDocuments({ ...filter, currentStage: 'rejected' })
    ]);

    return { total, pending, approved, rejected };
  }

  // ─── HOD Dashboard Overview (combines all) ──────────────────────────────
  async getHodDashboard(departmentId, academicYear = '2026-2027') {
    const [attendance, syllabus, issues, events] = await Promise.all([
      this.getAttendanceStats(departmentId),
      this.getSyllabusStats(departmentId, academicYear),
      this.getIssueStats(),
      this.getEventStats(departmentId)
    ]);

    return { attendance, syllabus, issues, events };
  }

  // ─── Dean-level College-wide Overview ───────────────────────────────────
  async getDeanDashboard() {
    const [totalStudents, totalFaculty, issues, events] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      this.getIssueStats(),
      this.getEventStats(null)
    ]);

    return { totalStudents, totalFaculty, issues, events };
  }
}

export const analyticsService = new AnalyticsService();
