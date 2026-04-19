import { Issue, User } from '../shared.js';

class IssueService {
  async raiseIssue(userId, data) {
    let locationObj;
    if (data.longitude && data.latitude) {
      locationObj = {
        type: 'Point',
        coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)]
      };
    }

    const issue = await Issue.create({
      reportedBy: userId,
      title: data.title,
      description: data.description,
      category: data.category,
      locationDesc: data.locationDesc,
      location: locationObj,
      mediaURLs: data.mediaURLs || [],
      status: 'open',
    });
    return issue;
  }

  async getMyIssues(userId) {
    return Issue.find({ reportedBy: userId }).sort({ createdAt: -1 });
  }

  async getAllIssues(role, categoryFilters) {
    let filter = {};
    if (categoryFilters && categoryFilters.length > 0) {
      filter.category = { $in: categoryFilters };
    }
    
    return Issue.find(filter)
      .populate('reportedBy', 'name email role')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
  }

  async processIssue(issueId, adminId, updates) {
    const issue = await Issue.findById(issueId);
    if (!issue) throw { status: 404, message: 'Issue not found' };

    if (updates.status) issue.status = updates.status;
    if (updates.adminResponse) {
      issue.adminResponse = updates.adminResponse;
      issue.assignedTo = adminId;
      if (updates.status === 'resolved') {
        issue.resolvedAt = new Date();
      }
    }

    await issue.save();
    return issue;
  }

  async getHeatmap() {
    // Returns issues that have a valid GeoJSON location
    return Issue.find({
      'location.coordinates': { $exists: true, $not: { $size: 0 } },
      status: { $in: ['open', 'in_progress'] }
    })
      .select('title category location status createdAt')
      .lean();
  }
}

export const issueService = new IssueService();
