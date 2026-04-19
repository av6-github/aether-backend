import bcrypt from 'bcryptjs';
import { User, signAccessToken, signRefreshToken, verifyRefreshToken } from '../shared.js';

class AuthService {
  async register(data) {
    const existing = await User.findOne({ email: data.email });
    if (existing) throw { status: 409, message: 'Email already registered' };

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({ ...data, passwordHash });

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      subRole: user.subRole,
      departmentId: user.departmentId.toString(),
      division: user.division || null,
      semester: user.semester || null,
      enrollmentNo: user.enrollmentNo || null,
      email: user.email,
    };

    return {
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role, subRole: user.subRole,
        departmentId: user.departmentId,
        semester: user.semester,
        division: user.division,
        enrollmentNo: user.enrollmentNo,
      },
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken({ userId: tokenPayload.userId }),
    };
  }

  async login(email, password) {
    const user = await User.findOne({ email, isActive: true }).select('+passwordHash');
    if (!user) throw { status: 401, message: 'Invalid credentials' };

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw { status: 401, message: 'Invalid credentials' };

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      subRole: user.subRole,
      departmentId: user.departmentId.toString(),
      division: user.division || null,
      semester: user.semester || null,
      enrollmentNo: user.enrollmentNo || null,
      email: user.email,
    };

    return {
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role, subRole: user.subRole,
        departmentId: user.departmentId,
        semester: user.semester,
        division: user.division,
        enrollmentNo: user.enrollmentNo,
      },
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken({ userId: tokenPayload.userId }),
    };
  }

  async refreshTokens(token) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw { status: 401, message: 'Invalid or expired refresh token' };
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) throw { status: 401, message: 'User not found' };

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      subRole: user.subRole,
      departmentId: user.departmentId.toString(),
      division: user.division || null,
      semester: user.semester || null,
      enrollmentNo: user.enrollmentNo || null,
      email: user.email,
    };

    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken({ userId: tokenPayload.userId }),
    };
  }

  async updateSubRole(actorId, actorRole, userId, subRole) {
    if (!['council', 'hod', 'dean'].includes(actorRole)) {
      throw { status: 403, message: 'Not authorized to assign sub-roles' };
    }
    const user = await User.findByIdAndUpdate(
      userId, { subRole }, { new: true }
    );
    if (!user) throw { status: 404, message: 'User not found' };
    return user;
  }

  async registerPushToken(userId, token) {
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { pushTokens: token } },
      { new: true }
    );
  }
}

export const authService = new AuthService();
