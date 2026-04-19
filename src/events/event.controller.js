import { eventService } from './event.service.js';

export const eventController = {
  async submitEvent(req, res, next) {
    try {
      const event = await eventService.createRequest(req.user, req.body);
      res.status(201).json({ success: true, message: 'Event submitted to HOD', data: event });
    } catch (err) { next(err); }
  },

  async getPending(req, res, next) {
    try {
      const requests = await eventService.getPendingRequests(req.user.role, req.user.departmentId);
      res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (err) { next(err); }
  },

  async reviewEvent(req, res, next) {
    try {
      const { status, comment } = req.body;
      const event = await eventService.processApproval(req.params.id, req.user, status, comment);
      res.status(200).json({ success: true, message: `Event ${status} at ${req.user.role} stage`, data: event });
    } catch (err) { next(err); }
  },

  async myRequests(req, res, next) {
    try {
      const requests = await eventService.getMyEvents(req.user.userId);
      res.status(200).json({ success: true, data: requests });
    } catch (err) { next(err); }
  },

  async getAllEvents(req, res, next) {
    try {
      const events = await eventService.getAllEvents();
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  },

  async myApprovals(req, res, next) {
    try {
      const requests = await eventService.getMyApprovals(req.user.userId);
      res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (err) { next(err); }
  },

  // Single event detail with full chain + populated fields
  // Accessible to: the requester themselves, plus council/hod/dean/superadmin
  async getEventById(req, res, next) {
    try {
      const { EventRequest, User } = await import('../shared.js');
      const event = await EventRequest.findById(req.params.id)
        .populate('requestedBy', 'name email')
        .populate('departmentId', 'name')
        .populate('chain.userId', 'name role');
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      // Students can only view their own events
      const isOwner    = event.requestedBy?._id?.toString() === req.user.userId.toString()
                      || event.requestedBy?.toString() === req.user.userId.toString();
      const isReviewer = ['council', 'hod', 'dean', 'superadmin'].includes(req.user.role);
      if (!isOwner && !isReviewer) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      res.json({ success: true, data: event });
    } catch(err) { next(err); }
  },

  async getEventPdf(req, res, next) {
    try {
      const { EventRequest, User } = await import('../shared.js');
      const event = await EventRequest.findById(req.params.id);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      const reqUser = await User.findById(event.requestedBy);
      const { generateEventCertificate } = await import('../utils/pdf.util.js');

      const pdfBase64 = await generateEventCertificate(event, reqUser || { name: 'Unknown' });
      res.json({ success: true, data: pdfBase64 });
    } catch (err) { next(err); }
  }
};
