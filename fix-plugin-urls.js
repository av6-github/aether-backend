/**
 * fix-plugin-urls.js
 * One-time script: Updates plugin appUrls from localhost to the production Render URL.
 * Run with: node fix-plugin-urls.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/utils/db.js';
import { Plugin } from './src/shared.js';

const RENDER_BASE_URL = 'https://aether-sehack-server.onrender.com';

const URL_FIXES = [
  { slug: 'canteen-tracker', appUrl: `${RENDER_BASE_URL}/demo-canteen` },
];

async function fixPluginUrls() {
  console.log('🔧 Connecting to production DB...');
  await connectDB(process.env.MONGODB_URI);

  for (const fix of URL_FIXES) {
    const result = await Plugin.findOneAndUpdate(
      { slug: fix.slug },
      { appUrl: fix.appUrl },
      { new: true, upsert: false }
    );

    if (result) {
      console.log(`✅ Updated '${fix.slug}' → appUrl: ${result.appUrl}`);
    } else {
      console.warn(`⚠️  Plugin '${fix.slug}' not found in DB. Creating it...`);
      const created = await Plugin.create({
        slug: fix.slug,
        name: 'Canteen Tracker',
        description: 'View today\'s menu and track canteen queue in real-time.',
        appUrl: fix.appUrl,
        version: '1.0.0',
        allowedRoles: ['student'],
        requiresScopes: ['profile.read', 'notifications.write'],
        isActive: true,
      });
      console.log(`✅ Created '${fix.slug}' → appUrl: ${created.appUrl}`);
    }
  }

  console.log('\n🎉 Done! Rebuild or restart not needed — DB is updated live.');
  await mongoose.disconnect();
  process.exit(0);
}

fixPluginUrls().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
