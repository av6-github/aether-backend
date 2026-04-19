import cron from 'node-cron';
import { Attendance, User, Issue } from '../shared.js';
import mongoose from 'mongoose';

let cronStarted = false;

/**
 * Utility: compute overall department attendance % for today's sessions.
 */
async function getDeptAttendancePercent(departmentId) {
  const deptId = new mongoose.Types.ObjectId(departmentId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessions = await Attendance.find({ departmentId: deptId, date: { $gte: today } }).lean();
  let total = 0, present = 0;
  for (const s of sessions) {
    for (const r of s.records) {
      total++;
      if (r.status === 'present' || r.status === 'late') present++;
    }
  }
  return total === 0 ? null : Math.round((present / total) * 100);
}

/**
 * Fires a formatted notification to a list of user IDs.
 * Imported lazily to avoid circular-dependency at module load time.
 */
async function alertUsers(userIds, { title, body, type }) {
  const { notificationService } = await import('../notifications/notification.service.js');
  await Promise.all(
    userIds.map(id => notificationService.send(id, { title, body, type }).catch(() => {}))
  );
}

/**
 * Daily morning check — runs at 08:00 every day.
 * Alerts HODs and Deans if:
 *  - Yesterday's department-wide attendance was below 60%.
 *  - There are more than 5 open (unresolved) issues in the system.
 */
async function runDailyHealthCheck() {
  console.log('[Cron] Running daily health check...');

  try {
    // ── 1. Attendance Alert ─────────────────────────────────────────────────
    const { Department } = await import('../shared.js');
    const allDepts = await Department.find().lean();

    for (const dept of allDepts) {
      const pct = await getDeptAttendancePercent(dept._id.toString());
      if (pct !== null && pct < 60) {
        // Find HODs and Deans to notify
        const hods = await User.find({ role: 'hod', departmentId: dept._id }).select('_id');
        const deans = await User.find({ role: 'dean' }).select('_id');
        const targets = [...hods, ...deans].map(u => u._id);

        await alertUsers(targets, {
          title: `⚠️ Low Attendance Alert — ${dept.name}`,
          body: `Today's attendance in ${dept.name} is only ${pct}%, which is critically below the 60% threshold. Immediate review recommended.`,
          type: 'proactive_alert_attendance',
        });

        console.log(`[Cron] Attendance alert sent for ${dept.name} (${pct}%)`);
      }
    }

    // ── 2. Open Issues Alert ─────────────────────────────────────────────────
    const openIssueCount = await Issue.countDocuments({ status: 'open' });
    if (openIssueCount > 5) {
      const deans = await User.find({ role: 'dean' }).select('_id');
      await alertUsers(deans.map(d => d._id), {
        title: `📋 ${openIssueCount} Unresolved Issues Pending`,
        body: `There are currently ${openIssueCount} open facility/IT issues across the campus. Please review the issue dashboard.`,
        type: 'proactive_alert_issues',
      });
      console.log(`[Cron] Open issues alert sent to Deans (${openIssueCount} open)`);
    }

    console.log('[Cron] Daily health check complete.');
  } catch (err) {
    console.error('[Cron] Health check error:', err.message);
  }
}

/**
 * Initializes the cron scheduler.
 * Call once from src/index.js after DB connection.
 */
export function startCronJobs() {
  if (cronStarted) return;
  cronStarted = true;

  // Run daily at 08:00 AM server time
  cron.schedule('0 8 * * *', runDailyHealthCheck, {
    timezone: 'Asia/Kolkata',
  });

  console.log('[Cron] Proactive alert jobs scheduled (daily at 08:00 IST)');
}

// Expose for testing — allows triggering the check on demand
export { runDailyHealthCheck };
