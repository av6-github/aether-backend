import { Batch } from '../models/Batch.model.js';
import { User } from '../shared.js';
import { Notice } from '../models/Notice.model.js';
import { notificationService } from '../notifications/notification.service.js';

class BatchService {
  /**
   * HOD / superadmin creates a batch and assigns a faculty member.
   */
  async create(actor, data) {
    const { name, facultyId, semester, division, academicYear, studentIds } = data;

    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== 'faculty')
      throw { status: 400, message: 'facultyId must belong to a faculty member' };

    const batch = await Batch.create({
      name,
      facultyId,
      departmentId: actor.departmentId,
      semester,
      division,
      academicYear,
      studentIds: studentIds || [],
    });

    return batch.populate([
      { path: 'facultyId', select: 'name email' },
      { path: 'studentIds', select: 'name email enrollmentNo division' },
    ]);
  }

  /**
   * Get all batches assigned to the requesting faculty member.
   */
  async getMyBatches(facultyId) {
    return Batch.find({ facultyId })
      .populate('studentIds', 'name email enrollmentNo division')
      .sort({ createdAt: -1 });
  }

  /**
   * Get all batches where the requesting student is a member.
   */
  async getStudentBatches(studentId) {
    return Batch.find({ studentIds: studentId })
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Get a single batch (for any faculty in the department or the assigned faculty).
   */
  async getById(batchId, actorId, actorRole) {
    const batch = await Batch.findById(batchId)
      .populate('facultyId', 'name email')
      .populate('studentIds', 'name email enrollmentNo division');
    if (!batch) throw { status: 404, message: 'Batch not found' };
    if (
      actorRole !== 'hod' &&
      actorRole !== 'dean' &&
      actorRole !== 'superadmin' &&
      batch.facultyId._id.toString() !== actorId
    ) {
      throw { status: 403, message: 'You do not have access to this batch' };
    }
    return batch;
  }

  /**
   * HOD adds or removes students from a batch.
   */
  async updateStudents(batchId, studentIds) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw { status: 404, message: 'Batch not found' };
    batch.studentIds = studentIds;
    await batch.save();
    return batch.populate('studentIds', 'name email enrollmentNo division');
  }

  /**
   * Faculty sends a notice to their batch — creates a Notice document
   * visible to the exact set of student IDs in this batch.
   */
  async sendBatchNotice(batchId, facultyId, { title, body, priority }) {
    const batch = await Batch.findById(batchId).populate('studentIds', '_id');
    if (!batch) throw { status: 404, message: 'Batch not found' };
    if (batch.facultyId.toString() !== facultyId)
      throw { status: 403, message: 'Only the assigned faculty can send notices to this batch' };

    // Create a notice — store batchId in metadata so the student filter works
    const notice = await Notice.create({
      title,
      body,
      publishedBy: facultyId,
      departmentId: batch.departmentId,
      priority: priority || 'medium',
      // targetDivisions/Semesters empty means "evaluate by batchId" on read
      targetDivisions: [batch.division],
      targetSemesters: [batch.semester],
      batchId: batch._id,
    });

    // Push a push notification to each student in the batch
    await Promise.all(batch.studentIds.map(s =>
      notificationService.send(s._id, {
        title: `[${batch.name}] ${title}`,
        body,
        type: 'batch_notice',
        metadata: { batchId: batch._id, noticeId: notice._id },
      }).catch(console.error)
    ));

    return notice;
  }

  /**
   * List all batches for a department (HOD view).
   */
  async listByDepartment(departmentId, academicYear) {
    const query = { departmentId };
    if (academicYear) query.academicYear = academicYear;
    return Batch.find(query)
      .populate('facultyId', 'name email')
      .populate('studentIds', 'name enrollmentNo')
      .sort({ name: 1 });
  }
}

export const batchService = new BatchService();
