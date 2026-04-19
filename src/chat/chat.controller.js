import { chatService } from './chat.service.js';
import { pushToUser } from '../notifications/socket.server.js';

export const chatController = {
  // ── 1-1 Teacher-Student Chat ─────────────────────────────────────────────

  /**
   * Faculty or student: get/create the room between themselves and another user.
   * Returns { roomId, other } so the client knows which roomId to use.
   * GET /chat/room/:otherId
   */
  async getOrCreateRoom(req, res, next) {
    try {
      const roomId = chatService.constructor.buildRoomId(req.user.userId, req.params.otherId);
      const other = await (await import('../shared.js')).User.findById(req.params.otherId)
        .select('name email role subRole division semester enrollmentNo');
      if (!other) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { roomId, other } });
    } catch (err) { next(err); }
  },

  async getHistory(req, res, next) {
    try {
      const messages = await chatService.getHistory(req.params.roomId);
      res.json({ success: true, data: messages });
    } catch (err) { next(err); }
  },

  async sendMessage(req, res, next) {
    try {
      const { message } = req.body;
      if (!message?.trim()) {
        return res.status(400).json({ success: false, message: 'Message is required' });
      }

      const roomId = req.params.roomId;

      // Students can only chat if faculty initiated or advising request approved
      if (req.user.role === 'student') {
        const [idA, idB] = roomId.split('_');
        const facultyId = idA === req.user.userId.toString() ? idB : idA;
        const allowed = await chatService.studentCanChat(req.user.userId, facultyId);
        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: 'Chat is only available after your faculty messages you first, or your advising request is approved.',
          });
        }
      }

      const msg = await chatService.sendMessage(req.user.userId, req.user.role, roomId, message.trim());

      // ── Real-time: push 'chat:message' to the OTHER participant ──────────
      const [idA, idB] = roomId.split('_');
      const recipientId = idA === req.user.userId.toString() ? idB : idA;
      pushToUser(recipientId, 'chat:message', {
        roomId,
        message: {
          _id:        msg._id,
          roomId,
          senderId:   msg.senderId,
          senderRole: msg.senderRole,
          message:    msg.message,
          createdAt:  msg.createdAt,
        },
      });

      res.status(201).json({ success: true, data: msg });
    } catch (err) { next(err); }
  },

  async myInbox(req, res, next) {
    try {
      const inbox = await chatService.getInbox(req.user.userId);
      res.json({ success: true, data: inbox });
    } catch (err) { next(err); }
  },

  async canChat(req, res, next) {
    try {
      const allowed = await chatService.studentCanChat(req.user.userId, req.params.facultyId);
      res.json({ success: true, data: { allowed } });
    } catch (err) { next(err); }
  },

  // ── Coordination Rooms (Faculty group chat) ──────────────────────────────

  async createCoordinationRoom(req, res, next) {
    try {
      const { CoordinationRoom } = await import('../models/CoordinationRoom.model.js');
      const { name, members, subjectId } = req.body;
      if (!name || !Array.isArray(members)) {
        return res.status(400).json({ success: false, message: 'name and members[] are required' });
      }

      const allMembers = [...new Set([...members.map(String), req.user.userId.toString()])];

      const room = await CoordinationRoom.create({
        name,
        createdBy: req.user.userId,
        members: allMembers,
        subjectId: subjectId || undefined,
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
      if (!message?.trim()) {
        return res.status(400).json({ success: false, message: 'Message is required' });
      }

      const { CoordinationRoom } = await import('../models/CoordinationRoom.model.js');
      const { ChatMessage }      = await import('../models/ChatMessage.model.js');

      const room = await CoordinationRoom.findById(roomId);
      if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

      const isMember = room.members.some(m => m.toString() === req.user.userId.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Not a member of this room' });
      }

      const msg = await ChatMessage.create({
        roomId,
        senderId:   req.user.userId,
        senderRole: req.user.role,
        message:    message.trim(),
      });
      await msg.populate('senderId', 'name role');

      // Update room timestamp for sorting
      await CoordinationRoom.findByIdAndUpdate(roomId, { updatedAt: new Date() });

      // ── Real-time: push 'chat:group_message' to all members except sender ─
      const msgPayload = {
        roomId,
        message: {
          _id:        msg._id,
          roomId,
          senderId:   msg.senderId,
          senderRole: msg.senderRole,
          message:    msg.message,
          createdAt:  msg.createdAt,
        },
      };
      room.members.forEach(memberId => {
        if (memberId.toString() !== req.user.userId.toString()) {
          pushToUser(memberId.toString(), 'chat:group_message', msgPayload);
        }
      });

      res.status(201).json({ success: true, data: msg });
    } catch (err) { next(err); }
  },

  async getCoordinationHistory(req, res, next) {
    try {
      const { roomId } = req.params;
      const { ChatMessage }      = await import('../models/ChatMessage.model.js');
      const { CoordinationRoom } = await import('../models/CoordinationRoom.model.js');

      const room = await CoordinationRoom.findById(roomId);
      if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

      const isMember = room.members.some(m => m.toString() === req.user.userId.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Not a member of this room' });
      }

      const history = await ChatMessage.find({ roomId })
        .populate('senderId', 'name role')
        .sort({ createdAt: 1 })
        .limit(200);

      res.json({ success: true, data: history });
    } catch (err) { next(err); }
  },
};
