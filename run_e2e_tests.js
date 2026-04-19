import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
const DEFAULT_PASSWORD = 'Aether@2026';

const users = {
  student: { email: 'comps.1@student.spit.ac.in', token: '' },
  faculty: { email: 'pramod_bide@spit.ac.in', token: '' },
  hod: { email: 'surekha_dholay@spit.ac.in', token: '' },
  dean: { email: 'sudhir_dhage@spit.ac.in', token: '' },
  council: { email: 'aparna.jha@student.spit.ac.in', token: '' }
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS : ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ FAIL : ${name}`);
    console.error(`          ${error.response?.data?.message || error.message}`);
    failed++;
  }
}

async function loginAll() {
  console.log('--- 🔑 AUTHENTICATION TESTS ---');
  for (const role in users) {
    await test(`Login as ${role} (${users[role].email})`, async () => {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: users[role].email,
        password: DEFAULT_PASSWORD
      });
      if (!res.data.data.accessToken) throw new Error('No token received');
      users[role].token = res.data.data.accessToken;
    });
  }
}

function authHeader(role) {
  return { headers: { Authorization: `Bearer ${users[role].token}` } };
}

async function runTests() {
  console.log('🚀 Starting Aether API E2E Tests...\n');

  try {
    // 1. Auth Tests
    await loginAll();

    console.log('\n--- 📅 TIMETABLE & SCHEDULING TESTS ---');
    await test('Student: Fetch My Timetable', async () => {
      const res = await axios.get(`${API_URL}/timetable/me`, authHeader('student'));
      if (!res.data.data) throw new Error('No timetable data returned');
    });

    await test('Student: Fetch Vacant Rooms', async () => {
      const res = await axios.get(`${API_URL}/timetable/vacant?time=09:00&day=Monday`, authHeader('student'));
      if (!res.data.data) throw new Error('No vacant rooms returned');
    });

    console.log('\n--- 🎫 EVENT & APPROVAL WORKFLOW TESTS ---');
    let eventId = null;
    await test('Council: Submit New Event', async () => {
      const res = await axios.post(`${API_URL}/events`, {
        title: 'E2E Test Hackathon',
        description: 'Testing the approvals engine',
        venue: 'Auditorium',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
        facultyAdvisorId: '661fae4e0000000000000000' // mock id, backend validates via jwt mostly or actual objectId
      }, authHeader('council'));
      eventId = res.data.data._id;
    });

    await test('HOD: View Pending Approvals', async () => {
      const res = await axios.get(`${API_URL}/events/pending`, authHeader('hod'));
      if (!Array.isArray(res.data.data)) throw new Error('Approvals should be an array');
    });

    console.log('\n--- 📊 ANALYTICS & DASHBOARD TESTS ---');
    await test('HOD: Fetch Department Analytics', async () => {
      const res = await axios.get(`${API_URL}/analytics/hod/dashboard`, authHeader('hod'));
      if (!res.data.data.attendance) throw new Error('Missing attendance stats');
    });

    await test('Dean: Fetch College Analytics', async () => {
      const res = await axios.get(`${API_URL}/analytics/dean/dashboard`, authHeader('dean'));
      if (!res.data.data.totalStudents) throw new Error('Missing dean stats');
    });

    console.log('\n--- 🚨 ISSUES & RESOLUTION TESTS ---');
    await test('HOD: Fetch Heatmap', async () => {
      const res = await axios.get(`${API_URL}/issues/heatmap`, authHeader('hod'));
      if (!Array.isArray(res.data.data)) throw new Error('Heatmap should be an array');
    });

    console.log('\n--- 🤖 AI CHATBOT TESTS ---');
    await test('Student: Chatbot History', async () => {
      const res = await axios.get(`${API_URL}/chatbot/history`, authHeader('student'));
      if (!Array.isArray(res.data.data)) throw new Error('History should be an array');
    });

  } catch (error) {
    console.error('Fatal Test Runner Error:', error.message);
  } finally {
    console.log('\n' + '='.repeat(40));
    console.log(`🎯 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('='.repeat(40) + '\n');
  }
}

runTests();
