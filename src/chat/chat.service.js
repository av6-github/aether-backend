import { ChatMessage } from '../models/ChatMessage.model.js';
import { AdvisingRequest } from '../models/AdvisingRequest.model.js';
import { User } from '../shared.js';

class ChatService {
  /**
   * Build a consistent roomId from two user IDs (always sorted so A_B == B_A)
   */
  static buildRoomId(idA, idB) {
    const sorted = [idA.toString(), idB.toString()].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  async sendMessage(senderId, senderRole, roomId, message) {
    const msg = await ChatMessage.create({ roomId, senderId, senderRole, message });
    return msg.populate('senderId', 'name role');
  }

  async getHistory(roomId, limit = 100) {
    return ChatMessage.find({ roomId })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  /**
   * Get all chat rooms a user has participated in,
   * with last message and the other participant's info.
   */
  async getInbox(userId) {
    // Find all distinct rooms this user has sent or received a message in
    const sent = await ChatMessage.distinct('roomId', { senderId: userId });
    const received = await ChatMessage.distinct('roomId', {
      roomId: { $in: sent.length > 0 ? { $nin: sent } : [] }
    });
    const allRooms = [...new Set([...sent])];

    const inbox = [];
    for (const roomId of allRooms) {
      const lastMsg = await ChatMessage.findOne({ roomId })
        .sort({ createdAt: -1 })
        .populate('senderId', 'name role');
      if (!lastMsg) continue;

      // Find the other participant from roomId (format: "id1_id2")
      const [idA, idB] = roomId.split('_');
      const otherId = idA === userId.toString() ? idB : idA;
      const other = await User.findById(otherId).select('name role semester division enrollmentNo');

      inbox.push({
        roomId,
        other,
        lastMessage: lastMsg.message,
        lastMessageAt: lastMsg.createdAt,
        lastSenderId: lastMsg.senderId?._id || lastMsg.senderId,
      });
    }

    return inbox.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }

  /**
   * Check if a student is allowed to initiate chat with a faculty.
   * Allowed if faculty sent a message to them first (faculty-initiated),
   * OR student has an accepted advising request with that faculty.
   */
  async studentCanChat(studentId, facultyId) {
    const roomId = ChatService.buildRoomId(studentId, facultyId);
    // Check if faculty sent first message
    const facultyMsg = await ChatMessage.findOne({ roomId, senderId: facultyId, senderRole: 'faculty' });
    if (facultyMsg) return true;

    // Check approved advising request
    const approvedRequest = await AdvisingRequest.findOne({
      studentId,
      facultyId,
      status: { $in: ['acknowledged', 'done'] }
    });
    return !!approvedRequest;
  }
}

export const chatService = new ChatService();
