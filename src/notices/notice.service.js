import { Notice } from '../models/Notice.model.js';
import { User } from '../shared.js';
import mongoose from 'mongoose';

class NoticeService {
  /**
   * Faculty/HOD publishes a notice to specific divisions/semesters within their dept.
   */
  async publish(actor, { title, body, priority, targetDivisions, targetSemesters, expiresAt }) {
    const notice = await Notice.create({
      publishedBy: actor.userId,
      departmentId: actor.departmentId,
      title,
      body,
      priority: priority || 'medium',
      targetDivisions: targetDivisions || [],
      targetSemesters: targetSemesters || [],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    return notice;
  }

  /**
   * Students and faculty get notices that are relevant to their department/division/semester.
   * Active, non-expired notices only.
   */
  async getForUser(user) {
    const now = new Date();
    const query = {
      departmentId: new mongoose.Types.ObjectId(user.departmentId),
      isActive: true,
      $or: [{ expiresAt: { $gte: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }],
    };

    // If the user is a student, further filter by their division and semester
    if (user.role === 'student') {
      if (user.division) {
        query.$and = [
          {
            $or: [
              { targetDivisions: { $size: 0 } },  // broadcast to all
              { targetDivisions: user.division },
            ],
          },
        ];
      }
    }

    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const notices = await Notice.find(query)
      .populate('publishedBy', 'name role subRole')
      .sort({ createdAt: -1 })
      .limit(50);

    return notices.sort((a, b) =>
      (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0)
    );
  }

  /**
   * Faculty/HOD can retrieve notices they personally published.
   */
  async getMyNotices(userId) {
    return Notice.find({ publishedBy: userId, isActive: true })
      .sort({ createdAt: -1 });
  }

  /**
   * Delete (soft-delete) a notice — only the publisher can do this.
   */
  async delete(noticeId, userId) {
    const notice = await Notice.findById(noticeId);
    if (!notice) throw { status: 404, message: 'Notice not found' };
    if (notice.publishedBy.toString() !== userId.toString())
      throw { status: 403, message: 'Not authorized to delete this notice' };
    notice.isActive = false;
    await notice.save();
    return { success: true };
  }
}

export const noticeService = new NoticeService();
