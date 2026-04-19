import { ChatMessage } from '../models/ChatMessage.model.js';
import { AdvisingRequest } from '../models/AdvisingRequest.model.js';
import { User } from '../shared.js';

class ChatService {
  /**
   * Build a consistent roomId from two user IDs (always sorted so A<->B == B<->A)
   */
  static buildRoomId(idA, idB) {
    const sorted = [idA.toString(), idB.toString()].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  async sendMessage(senderId, senderRole, roomId, message) {
    // Normalise role — ChatMessage enum only allows a subset
    const normRole = ['student', 'faculty', 'hod', 'dean', 'council', 'superadmin'].includes(senderRole)
      ? senderRole
      : 'faculty';
    const msg = await ChatMessage.create({ roomId, senderId, senderRole: normRole, message });
    return msg.populate('senderId', 'name role');
  }

  async getHistory(roomId, limit = 200) {
    return ChatMessage.find({ roomId })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  /**
   * Get all 1-1 chat rooms a user has participated in,
   * with the last message and the other participant's info.
   * Fixes: previous version only counted rooms where the user SENT a message,
   * missing rooms where they only received. Now we find all rooms containing their userId in the roomId string.
   */
  async getInbox(userId) {
    const userStr = userId.toString();

    // Find all distinct roomIds where this user participated (sent OR received)
    // roomId format: "smallerId_largerId" — user appears in the string
    const allRooms = await ChatMessage.distinct('roomId', {
      $or: [
        { senderId: userId },
        // Rooms where the user is the OTHER participant —
        // their id appears somewhere in the roomId string
        { roomId: new RegExp(userStr) },
      ],
    });

    const inbox = [];
    for (const roomId of allRooms) {
      // Skip coordination room IDs (they are MongoDB ObjectIds, not `id_id` format)
      if (!roomId.includes('_')) continue;

      const lastMsg = await ChatMessage.findOne({ roomId })
        .sort({ createdAt: -1 })
        .populate('senderId', 'name role');
      if (!lastMsg) continue;

      // Identify the other participant from the roomId
      const [idA, idB] = roomId.split('_');
      const otherId = idA === userStr ? idB : idA;

      const other = await User.findById(otherId).select('name email role subRole semester division enrollmentNo');

      inbox.push({
        roomId,
        other,
        lastMessage:   lastMsg.message,
        lastMessageAt: lastMsg.createdAt,
        lastSenderId:  lastMsg.senderId?._id || lastMsg.senderId,
        unread:        false, // placeholder — can be extended with read receipts
      });
    }

    return inbox.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }

  /**
   * Check if a student is allowed to initiate chat with a faculty.
   * Allowed if:
   *   (a) Faculty has already sent at least one message to the student, OR
   *   (b) Student has an acknowledged/done advising request with that faculty.
   */
  async studentCanChat(studentId, facultyId) {
    const roomId = ChatService.buildRoomId(studentId, facultyId);

    // (a) Has faculty already messaged them?
    const facultyMsg = await ChatMessage.findOne({ roomId, senderId: facultyId });
    if (facultyMsg) return true;

    // (b) Is there an acknowledged advising request?
    const approvedRequest = await AdvisingRequest.findOne({
      studentId,
      facultyId,
      status: { $in: ['acknowledged', 'done'] },
    });
    return !!approvedRequest;
  }
}

export const chatService = new ChatService();
