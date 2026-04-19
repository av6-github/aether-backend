import { Club } from '../models/Club.model.js';
import { User } from '../shared.js';
import { notificationService } from '../notifications/notification.service.js';

class ClubService {
  async create(actor, data) {
    const { name, description, category, facultyAdvisorId } = data;

    const existing = await Club.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) throw { status: 409, message: `A club named "${name}" already exists` };

    const advisor = await User.findById(facultyAdvisorId || actor.userId);
    if (!advisor || advisor.role !== 'faculty')
      throw { status: 400, message: 'A valid faculty advisor is required' };

    const club = await Club.create({
      name,
      description,
      category,
      facultyAdvisorId: advisor._id,
      departmentId: actor.departmentId,
      members: [{ userId: actor.userId, role: 'president', isActive: true }],
      logoUrl: data.logoUrl,
      instagramHandle: data.instagramHandle,
      email: data.email,
    });

    return club;
  }

  async list(category) {
    const query = { isActive: true };
    if (category) query.category = category;
    return Club.find(query)
      .populate('facultyAdvisorId', 'name email')
      .populate('departmentId', 'name')
      .sort({ name: 1 });
  }

  async getById(clubId) {
    const club = await Club.findById(clubId)
      .populate('facultyAdvisorId', 'name email')
      .populate('departmentId', 'name')
      .populate('members.userId', 'name email division')
      .populate('joinRequests.userId', 'name email division');
    if (!club || !club.isActive) throw { status: 404, message: 'Club not found' };
    return club;
  }

  /**
   * Student submits a join request — does NOT add directly as member.
   * President/advisor reviews via reviewJoinRequest().
   */
  async requestJoin(clubId, userId, message) {
    const club = await Club.findById(clubId);
    if (!club || !club.isActive) throw { status: 404, message: 'Club not found' };

    const alreadyMember = club.members.find(m => m.userId.toString() === userId && m.isActive);
    if (alreadyMember) throw { status: 409, message: 'You are already a member of this club' };

    const pendingReq = club.joinRequests.find(
      r => r.userId.toString() === userId && r.status === 'pending'
    );
    if (pendingReq) throw { status: 409, message: 'You already have a pending join request for this club' };

    club.joinRequests.push({ userId, message: message || '' });
    await club.save();

    // Notify president
    const president = club.members.find(m => m.role === 'president' && m.isActive);
    if (president) {
      const requester = await User.findById(userId).select('name');
      notificationService.send(president.userId, {
        title: `New Join Request — ${club.name}`,
        body: `${requester?.name || 'A student'} has requested to join ${club.name}.`,
        type: 'club_join_request',
        metadata: { clubId: club._id },
      }).catch(console.error);
    }

    return { requested: true, clubName: club.name };
  }

  /**
   * President or faculty advisor approves/rejects a join request.
   */
  async reviewJoinRequest(clubId, requestId, actorUser, decision) {
    const club = await Club.findById(clubId);
    if (!club || !club.isActive) throw { status: 404, message: 'Club not found' };

    const isAdvisor = club.facultyAdvisorId.toString() === actorUser.userId;
    const isPresident = club.members.some(
      m => m.userId.toString() === actorUser.userId && m.role === 'president' && m.isActive
    );
    const isCommitteeAdmin = actorUser.role === 'committee' && club.name.toLowerCase() === actorUser.name.toLowerCase();

    if (!isAdvisor && !isPresident && !isCommitteeAdmin)
      throw { status: 403, message: 'Only the club president, advisor, or committee admin can review join requests' };

    const request = club.joinRequests.id(requestId);
    if (!request) throw { status: 404, message: 'Join request not found' };
    if (request.status !== 'pending') throw { status: 400, message: 'This request has already been reviewed' };

    request.status = decision;
    request.reviewedBy = actorUser.userId;
    request.reviewedAt = new Date();

    if (decision === 'approved') {
      club.members.push({ userId: request.userId, role: 'member', isActive: true });
    }

    await club.save();

    // Notify the requester of the outcome
    notificationService.send(request.userId, {
      title: decision === 'approved' ? `Welcome to ${club.name}!` : `Join Request Update — ${club.name}`,
      body: decision === 'approved'
        ? `Your request to join ${club.name} has been approved.`
        : `Your request to join ${club.name} has been declined.`,
      type: 'club_join_reviewed',
      metadata: { clubId: club._id },
    }).catch(console.error);

    return { decision, clubName: club.name };
  }

  /**
   * Member leaves a club.
   */
  async leave(clubId, userId) {
    const club = await Club.findById(clubId);
    if (!club) throw { status: 404, message: 'Club not found' };

    const memberIdx = club.members.findIndex(m => m.userId.toString() === userId && m.isActive);
    if (memberIdx === -1) throw { status: 404, message: 'You are not an active member of this club' };

    const member = club.members[memberIdx];
    if (member.role === 'president') throw { status: 400, message: 'President must transfer role before leaving' };

    club.members[memberIdx].isActive = false;
    await club.save();
    return { success: true };
  }

  /**
   * Send a broadcast alert to all active club members (president or advisor only).
   */
  async sendAlert(clubId, actorUser, { title, body }) {
    const club = await Club.findById(clubId);
    if (!club || !club.isActive) throw { status: 404, message: 'Club not found' };

    const isAdvisor = club.facultyAdvisorId.toString() === actorUser.userId;
    const isPresident = club.members.some(
      m => m.userId.toString() === actorUser.userId && m.role === 'president' && m.isActive
    );
    const isCommitteeAdmin = actorUser.role === 'committee' && club.name.toLowerCase() === actorUser.name.toLowerCase();

    if (!isAdvisor && !isPresident && !isCommitteeAdmin)
      throw { status: 403, message: 'Only the club president, advisor, or committee admin can send alerts' };

    const activeMembers = club.members.filter(m => m.isActive && m.userId.toString() !== actorUser.userId);
    await Promise.all(activeMembers.map(m =>
      notificationService.send(m.userId, {
        title: `[${club.name}] ${title}`,
        body,
        type: 'club_alert',
        metadata: { clubId: club._id },
      }).catch(console.error)
    ));

    return { sent: activeMembers.length };
  }

  async getMyClubs(userId) {
    return Club.find({ 'members.userId': userId, 'members.isActive': true, isActive: true })
      .populate('facultyAdvisorId', 'name')
      .select('name category description members joinRequests');
  }

  /**
   * Get pending join requests for clubs where the user is president or advisor.
   */
  async getPendingRequestsForMyClubs(actorUser) {
    let query = { isActive: true };
    
    if (actorUser.role === 'committee') {
      query.name = new RegExp(`^${actorUser.name}$`, 'i');
    } else {
      query.$or = [
        { 'members': { $elemMatch: { userId: actorUser.userId, role: 'president', isActive: true } } },
        { facultyAdvisorId: actorUser.userId },
      ];
    }

    const clubs = await Club.find(query)
      .populate('joinRequests.userId', 'name email division')
      .select('name joinRequests');

    const pending = [];
    for (const club of clubs) {
      const reqs = club.joinRequests.filter(r => r.status === 'pending');
      if (reqs.length > 0) pending.push({ clubId: club._id, clubName: club.name, requests: reqs });
    }
    return pending;
  }
}

export const clubService = new ClubService();
