import { AdvisingNote } from '../models/AdvisingNote.model.js';
import { AdvisingRequest } from '../models/AdvisingRequest.model.js';
import { User } from '../shared.js';

class AdvisingService {
  /**
   * Faculty creates a new advising note for a student.
   */
  async createNote(facultyId, { studentId, title, note, category, visibility, requiresFollowUp, followUpDate }) {
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student')
      throw { status: 404, message: 'Student not found' };

    return AdvisingNote.create({
      facultyId,
      studentId,
      title,
      note,
      category: category || 'academic',
      visibility: visibility || 'private',
      requiresFollowUp: !!requiresFollowUp,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    });
  }

  /**
   * Faculty retrieves all notes they have written about a particular student.
   */
  async getNotesForStudent(facultyId, studentId) {
    return AdvisingNote.find({ facultyId, studentId })
      .populate('studentId', 'name email rollNumber')
      .sort({ createdAt: -1 });
  }

  /**
   * Faculty retrieves all notes across all their advisees.
   */
  async getAllMyNotes(facultyId) {
    return AdvisingNote.find({ facultyId })
      .populate('studentId', 'name email rollNumber division semester')
      .sort({ createdAt: -1 });
  }

  /**
   * A student can see only the notes the faculty has chosen to share with them.
   */
  async getSharedNotesForStudent(studentId) {
    return AdvisingNote.find({ studentId, visibility: 'shared' })
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Faculty can mark a follow-up as done.
   */
  async markFollowUpDone(noteId, facultyId) {
    const note = await AdvisingNote.findById(noteId);
    if (!note) throw { status: 404, message: 'Note not found' };
    if (note.facultyId.toString() !== facultyId.toString())
      throw { status: 403, message: 'Not authorized' };
    note.followUpDone = true;
    await note.save();
    return note;
  }

  /**
   * Get all follow-up items that are pending for this faculty member.
   */
  async getPendingFollowUps(facultyId) {
    return AdvisingNote.find({
      facultyId,
      requiresFollowUp: true,
      followUpDone: false,
    })
      .populate('studentId', 'name email rollNumber')
      .sort({ followUpDate: 1 });
  }

  async createStudentRequest(studentId, { facultyId, message }) {
    const faculty = await User.findById(facultyId);
    if (!faculty || !['faculty', 'hod', 'dean', 'superadmin'].includes(faculty.role)) {
      throw { status: 404, message: 'Faculty not found or invalid role' };
    }
    return AdvisingRequest.create({ studentId, facultyId, message });
  }

  async getStudentRequests(studentId) {
    return AdvisingRequest.find({ studentId })
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 });
  }

  async getFacultyRequests(facultyId) {
    return AdvisingRequest.find({ facultyId })
      .populate('studentId', 'name email enrollmentNo semester division')
      .sort({ createdAt: -1 });
  }

  async updateRequest(requestId, facultyId, { status, facultyReply }) {
    const request = await AdvisingRequest.findById(requestId);
    if (!request) throw { status: 404, message: 'Request not found' };
    if (request.facultyId.toString() !== facultyId.toString()) throw { status: 403, message: 'Not authorized' };
    if (status) request.status = status;
    if (facultyReply) request.facultyReply = facultyReply;
    await request.save();
    return request;
  }
}

export const advisingService = new AdvisingService();
