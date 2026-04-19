import { SyllabusProgress, Subject, cacheDel } from '../shared.js';
import mongoose from 'mongoose';

class SyllabusService {
  /**
   * Faculty initializes the syllabus map for a subject they teach.
   */
  async initializeSyllabus(facultyId, departmentId, payload) {
    const { subjectId, semester, academicYear, topics } = payload;

    const subject = await Subject.findById(subjectId);
    if (!subject || subject.departmentId.toString() !== departmentId) {
      throw { status: 404, message: 'Subject not found in your department' };
    }

    const existing = await SyllabusProgress.findOne({ facultyId, subjectId, academicYear });
    if (existing) {
      throw { status: 409, message: 'Syllabus tracker already initialized for this academic year' };
    }

    // Use provided topics or fall back to subject's canonical syllabus
    const resolvedTopics = (topics && topics.length > 0)
      ? topics
      : subject.syllabusTopics.map(t => ({ name: t.name, status: 'pending' }));

    if (!resolvedTopics || resolvedTopics.length === 0) {
      throw { status: 400, message: 'No topics provided and this subject has no default syllabus defined.' };
    }

    const tracker = await SyllabusProgress.create({
      subjectId: new mongoose.Types.ObjectId(subjectId),
      facultyId: new mongoose.Types.ObjectId(facultyId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      semester: semester || subject.semester,
      academicYear,
      topics: resolvedTopics,
    });

    return tracker;
  }

  /**
   * Mark a specific topic as done.
   */
  async updateTopicCompletion(facultyId, trackerId, topicId, status, notes) {
    const tracker = await SyllabusProgress.findById(trackerId);
    if (!tracker) throw { status: 404, message: 'Tracker not found' };
    
    if (tracker.facultyId.toString() !== facultyId) {
      throw { status: 403, message: 'You can only update trackers assigned to you' };
    }

    const topic = tracker.topics.id(topicId);
    if (!topic) throw { status: 404, message: 'Topic not found in syllabus' };

    topic.status = status;
    if (status === 'done') topic.completedAt = new Date();
    if (notes !== undefined) topic.notes = notes;

    // The 'pre-save' hook in the Mongoose schema dynamically calculates the completionPercent mathematically
    await tracker.save();

    return tracker;
  }

  /**
   * Get all syllabus trackers owned by a faculty member.
   */
  async getMyTrackers(facultyId) {
    return SyllabusProgress.find({ facultyId })
      .populate('subjectId', 'name code')
      .sort({ createdAt: -1 });
  }

  /**
   * Get progress for students
   */
  async getStudentProgressOverview(departmentId, semester, academicYear) {
    // Build query — try exact match first, then progressively relax
    const baseQuery = { departmentId };
    if (semester) baseQuery.semester = semester;
    if (academicYear) baseQuery.academicYear = academicYear;

    let trackers = await SyllabusProgress.find(baseQuery)
      .populate('subjectId', 'name code')
      .populate('facultyId', 'name');

    // Fallback: if no results with semester+year, try just departmentId
    if (trackers.length === 0) {
      trackers = await SyllabusProgress.find({ departmentId })
        .populate('subjectId', 'name code')
        .populate('facultyId', 'name');
    }
    
    return trackers;
  }
}

export const syllabusService = new SyllabusService();
