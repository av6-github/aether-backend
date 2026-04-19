import { LeaveRequest } from '../models/LeaveRequest.model.js';
import { StudentLeave } from '../models/StudentLeave.model.js';
import { User } from '../shared.js';
import { notificationService } from '../notifications/notification.service.js';
import mongoose from 'mongoose';

class LeaveService {
  /**
   * Faculty submits a leave request to their HOD.
   */
  async apply(facultyId, data) {
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== 'faculty')
      throw { status: 403, message: 'Only faculty can apply for leave' };

    const { leaveType, fromDate, toDate, reason, substituteId, supportingDocNote } = data;

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) throw { status: 400, message: 'toDate must be after fromDate' };

    // Check for overlapping active leave requests
    const overlap = await LeaveRequest.findOne({
      facultyId,
      status: { $ne: 'rejected' },
      $or: [
        { fromDate: { $lte: to }, toDate: { $gte: from } }
      ]
    });
    if (overlap) throw { status: 409, message: 'You already have a leave request overlapping these dates' };

    const leave = await LeaveRequest.create({
      facultyId,
      departmentId: faculty.departmentId,
      leaveType,
      fromDate: from,
      toDate: to,
      reason,
      substituteId: substituteId || undefined,
      supportingDocNote: supportingDocNote || undefined,
      hodAction: { status: 'pending' }
    });

    // Notify HODs in this department immediately
    const hods = await User.find({ role: 'hod', departmentId: faculty.departmentId }).select('_id');
    hods.forEach(hod => {
      notificationService.send(hod._id, {
        title: 'Leave Request Pending Review',
        body: `${faculty.name} has applied for ${leaveType} leave from ${from.toDateString()} to ${to.toDateString()}. Please review and approve.`,
        type: 'leave_pending_review',
        metadata: { leaveId: leave._id }
      }).catch(console.error);
    });

    return leave;
  }

  /**
   * HOD fetches all pending leave requests for their department.
   */
  async getPendingForHOD(hodId) {
    const hod = await User.findById(hodId);
    if (!hod) throw { status: 404, message: 'HOD not found' };

    return LeaveRequest.find({
      departmentId: hod.departmentId,
      status: 'pending'
    })
      .populate('facultyId', 'name email employeeId')
      .populate('substituteId', 'name email')
      .sort({ fromDate: 1 });
  }

  /**
   * HOD approves or rejects a leave request.
   */
  async review(leaveId, hodId, status, comment) {
    const leave = await LeaveRequest.findById(leaveId).populate('facultyId', 'name email');
    if (!leave) throw { status: 404, message: 'Leave request not found' };
    if (leave.status !== 'pending') throw { status: 400, message: 'This leave request has already been processed' };

    const hod = await User.findById(hodId);
    if (!hod || hod.departmentId.toString() !== leave.departmentId.toString())
      throw { status: 403, message: 'Not authorized for this department' };

    leave.status = status;
    leave.hodAction = {
      hodId,
      status,
      comment: comment || '',
      decidedAt: new Date()
    };
    await leave.save();

    // Notify the faculty member of the decision
    const emoji = status === 'approved' ? '✅' : '❌';
    notificationService.send(leave.facultyId._id, {
      title: `${emoji} Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      body: `Your ${leave.leaveType} leave (${leave.fromDate.toDateString()} – ${leave.toDate.toDateString()}) has been ${status} by HOD.${comment ? ` Comment: ${comment}` : ''}`,
      type: 'leave_decision',
      metadata: { leaveId: leave._id }
    }).catch(console.error);

    return leave;
  }

  /**
   * Faculty views their own leave history.
   */
  async getMyLeaves(facultyId) {
    return LeaveRequest.find({ facultyId })
      .populate('substituteId', 'name email')
      .sort({ fromDate: -1 });
  }

  /**
   * HOD or Dean: get all leaves for a department (approved/rejected/pending).
   */
  async getDeptLeaves(departmentId, status) {
    const query = { departmentId: new mongoose.Types.ObjectId(departmentId) };
    if (status) query.status = status;

    return LeaveRequest.find(query)
      .populate('facultyId', 'name email employeeId')
      .populate('substituteId', 'name')
      .sort({ fromDate: -1 });
  }

  async applyStudentLeave(studentId, { facultyId, fromDate, toDate, reason, leaveType }) {
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== 'faculty') throw { status: 404, message: 'Faculty not found' };
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) throw { status: 400, message: 'toDate must be after fromDate' };
    return StudentLeave.create({ studentId, facultyId, fromDate: from, toDate: to, reason, leaveType: leaveType || 'personal' });
  }

  async getStudentMyLeaves(studentId) {
    return StudentLeave.find({ studentId })
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 });
  }

  async getStudentLeavesForFaculty(facultyId) {
    return StudentLeave.find({ facultyId })
      .populate('studentId', 'name email enrollmentNo division semester')
      .sort({ createdAt: -1 });
  }

  async reviewStudentLeave(facultyId, leaveId, { status, remarks }) {
    const leave = await StudentLeave.findById(leaveId);
    if (!leave) throw { status: 404, message: 'Leave not found' };
    if (leave.facultyId.toString() !== facultyId.toString()) throw { status: 403, message: 'Not authorized' };
    leave.status = status;
    if (remarks) leave.remarks = remarks;
    await leave.save();
    return leave;
  }
}

export const leaveService = new LeaveService();
