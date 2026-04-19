import { chatService } from './chat.service.js';

export const chatController = {
  async getHistory(req, res, next) {
    try {
      const messages = await chatService.getHistory(req.params.roomId);
      res.json({ success: true, data: messages });
    } catch (err) { next(err); }
  },

  async sendMessage(req, res, next) {
    try {
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });
      
      // If student is sending, verify they have permission
      if (req.user.role === 'student') {
        const [idA, idB] = req.params.roomId.split('_');
        const facultyId = idA === req.user.userId.toString() ? idB : idA;
        const allowed = await chatService.studentCanChat(req.user.userId, facultyId);
        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: 'You can only reply once faculty has messaged you, or after your advising request is approved.'
          });
        }
      }
      
      const msg = await chatService.sendMessage(req.user.userId, req.user.role, req.params.roomId, message.trim());
      res.status(201).json({ success: true, data: msg });
    } catch (err) { next(err); }
  },

  async myInbox(req, res, next) {
    try {
      const inbox = await chatService.getInbox(req.user.userId);
      res.json({ success: true, data: inbox });
    } catch (err) { next(err); }
  },

  // --- Coordination Rooms ---

  async createCoordinationRoom(req, res, next) {
    try {
      const { CoordinationRoom } = await import('../models/CoordinationRoom.model.js');
      const { name, members, subjectId } = req.body;
      
      const allMembers = [...new Set([...members, req.user.userId])];
      
      const room = await CoordinationRoom.create({
        name,
        createdBy: req.user.userId,
        members: allMembers,
        subjectId: subjectId || undefined
      });
      res.status(201).json({ success: true, data: room });
    } catch (err) { next(err); }
  },

  async getCoordinationRooms(req, res, next) {
    try {
      const { CoordinationRoom } = await import('../models/CoordinationRoom.model.js');
      const rooms = await CoordinationRoom.find({ members: req.user.userId })
        .populate('members', 'name email role')
        .populate('subjectId', 'name code')
        .sort({ updatedAt: -1 });
      res.json({ success: true, data: rooms });
    } catch (err) { next(err); }
  },

  async sendCoordinationMessage(req, res, next) {
    try {
      const { roomId } = req.params;
      const { message } = req.body;
      const { CoordinationRoom } = await import('../models/CoordinationRoom.model.js');
      const { ChatMessage } = await import('../models/ChatMessage.model.js');
      const { pushToUser } = await import('../notifications/socket.server.js');
      
      const room = await CoordinationRoom.findById(roomId);
      if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
      if (!room.members.includes(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Not a member of this room' });
      }

      const msg = await ChatMessage.create({
        roomId,
        senderId: req.user.userId,
        senderRole: req.user.role,
        message
      });
      await msg.populate('senderId', 'name role');

      // Update room timestamp for sorting
      room.updatedAt = new Date();
      await room.save();

      // Broadcast to all members except sender
      room.members.forEach(memberId => {
        if (memberId.toString() !== req.user.userId.toString()) {
          pushToUser(memberId.toString(), 'new_group_message', { roomId, message: msg });
        }
      });

      res.status(201).json({ success: true, data: msg });
    } catch (err) { next(err); }
  },

  async getCoordinationHistory(req, res, next) {
    try {
      const { roomId } = req.params;
      const { ChatMessage } = await import('../models/ChatMessage.model.js');
      const { CoordinationRoom } = await import('../models/CoordinationRoom.model.js');
      
      const room = await CoordinationRoom.findById(roomId);
      if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
      if (!room.members.includes(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Not a member of this room' });
      }

      const history = await ChatMessage.find({ roomId })
        .populate('senderId', 'name role')
        .sort({ createdAt: 1 })
        .limit(100);
        
      res.json({ success: true, data: history });
    } catch (err) { next(err); }
  },

  async canChat(req, res, next) {
    try {
      const allowed = await chatService.studentCanChat(req.user.userId, req.params.facultyId);
      res.json({ success: true, data: { allowed } });
    } catch (err) { next(err); }
  },
};
