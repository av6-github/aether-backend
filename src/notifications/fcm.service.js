import admin from 'firebase-admin';

class FCMService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  init() {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey || projectId === 'your-firebase-project-id') {
        console.warn('[FCM] Firebase credentials not configured or are placeholders. Push notifications disabled.');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.initialized = true;
      console.log('[FCM] Firebase Admin initialized for push notifications');
    } catch (err) {
      console.error('[FCM] Failed to initialize Firebase Admin:', err.message);
    }
  }

  /**
   * Send a push notification to a list of device tokens.
   */
  async sendPushNotification(tokens, payload) {
    if (!this.initialized) {
      console.log(`[FCM] Skipped sending push (not configured): "${payload.title}"`);
      return false;
    }

    if (!tokens || tokens.length === 0) return false;

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Cleanup expired/invalid tokens could be done here based on response.responses
      if (response.failureCount > 0) {
        console.warn(`[FCM] Push sent with ${response.failureCount} failures`);
      }

      return true;
    } catch (err) {
      console.error('[FCM] Error sending push notification:', err.message);
      return false;
    }
  }
}

export const fcmService = new FCMService();
