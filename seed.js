/**
 * AETHER — Full Database Seed Script v4
 * - Real SPIT faculty, HODs, Deans
 * - Real Student Council 2025-26 & Committees
 * - 300 mock students
 * - Floors 1-6 rooms per spec (CR-101..103, floors 4-6: CR-401..410, Labs on each floor)
 * - Subjects with full syllabusTopics
 * - Pre-initialized SyllabusProgress for each faculty-subject pair
 * - Faculty advisory batches (20 students per batch)
 * - Timetable slots with slotType (lecture/lab)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './src/utils/db.js';
import {
  Department, User, Subject, Room, Timetable,
  EventRequest, Issue, Notification, SyllabusProgress, ChatbotLog, Batch
} from './src/shared.js';
import { LeaveRequest } from './src/models/LeaveRequest.model.js';
import { Club } from './src/models/Club.model.js';
import { AdvisingNote } from './src/models/AdvisingNote.model.js';
import { Notice } from './src/models/Notice.model.js';

const DEFAULT_PASSWORD = await bcrypt.hash('Aether@2026', 10);

// ─── Departments ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Computer Engineering',            code: 'COMPS', color: '#3b82f6' },
  { name: 'Computer Science & Engineering',  code: 'CSE',   color: '#8b5cf6' },
  { name: 'Electronics & Telecommunication', code: 'EXTC',  color: '#10b981' },
];

// ─── Faculty ─────────────────────────────────────────────────────────────────
const FACULTY_BY_DEPT = {
  COMPS: {
    hod: { name: 'Dr. Surekha Dholay', email: 'surekha_dholay@spit.ac.in' },
    faculty: [
      { name: 'Shri. Pramod Bide',    email: 'pramod_bide@spit.ac.in' },
      { name: 'Dr. K.K. Devadkar',    email: 'kailas_devadkar@spit.ac.in' },
      { name: 'Smt. Kiran Gawande',   email: 'kiran_gawande@spit.ac.in' },
    ]
  },
  CSE: {
    hod: { name: 'Dr. Sujata Kulkarni', email: 'sujata_kulkarni@spit.ac.in' },
    faculty: [
      { name: 'Shri. D.D. Ambawade',    email: 'dd_ambawade@spit.ac.in' },
      { name: 'Smt. Sheetal Chaudhari', email: 'sheetal_chaudhari@spit.ac.in' },
      { name: 'Smt. Aparna Halbe',      email: 'aparna_halbe@spit.ac.in' },
    ]
  },
  EXTC: {
    hod: { name: 'Dr. R.G. Sutar', email: 'rajendra_sutar@spit.ac.in' },
    faculty: [
      { name: 'Smt. Manisha Bansode', email: 'manisha_bansode@spit.ac.in' },
      { name: 'Dr. N.A. Bhagat',      email: 'narendra_bhagat@spit.ac.in' },
      { name: 'Dr. Amol Deshpande',   email: 'amol_deshpande@spit.ac.in' },
    ]
  }
};

// ─── Deans ───────────────────────────────────────────────────────────────────
const DEANS = [
  { name: 'Prof. Sudhir Dhage', email: 'sudhir_dhage@spit.ac.in', subRole: 'dean_admin' },
  { name: 'Prof. Y S Rao',      email: 'ysrao@spit.ac.in',         subRole: 'dean_academics' },
  { name: 'Dr. Kiran Talele',   email: 'kiran.talele@spit.ac.in',  subRole: 'dean_students' },
];

// ─── Student Council ─────────────────────────────────────────────────────────
const COUNCIL_MEMBERS = [
  { name: 'Aparna Jha',                email: 'aparna.jha@student.spit.ac.in',          subRole: 'general_secretary',  dept: 'EXTC' },
  { name: 'Yash Thakkar',              email: 'yash.thakkar@student.spit.ac.in',         subRole: 'finance_secretary',  dept: 'COMPS' },
  { name: 'Harshavardhan Singh Deora', email: 'harshavardhan.deora@student.spit.ac.in', subRole: 'sports_secretary',   dept: 'CSE' },
];

// ─── Committees ──────────────────────────────────────────────────────────────
const COMMITTEES = [
  { prefix: 'ecell',  dept: 'EXTC',  name: 'E-Cell SPIT',     desc: 'Entrepreneurship Cell',              category: 'entrepreneurship' },
  { prefix: 'csi',    dept: 'COMPS', name: 'CSI SPIT',         desc: 'Computer Society of India Chapter',  category: 'technical' },
  { prefix: 'cspit',  dept: 'CSE',   name: 'CSPIT',            desc: 'Computer Society SPIT',              category: 'technical' },
  { prefix: 'sports', dept: 'EXTC',  name: 'Sports Council',   desc: 'Official Sports Council',            category: 'sports' },
  { prefix: 'oculus', dept: 'COMPS', name: 'Oculus',           desc: 'Annual Techno-Cultural Fest',        category: 'technical' },
];

// ─── Subjects with full syllabusTopics ───────────────────────────────────────
const SUBJECTS = {
  COMPS: [
    {
      name: 'Data Structures', code: 'COMPS301', credits: 4, semester: 3,
      syllabusTopics: [
        { unit: 1, name: 'Introduction to Data Structures & Complexity Analysis' },
        { unit: 1, name: 'Arrays — Declaration, 1D & 2D Operations' },
        { unit: 2, name: 'Singly Linked List — Insertion, Deletion, Traversal' },
        { unit: 2, name: 'Doubly & Circular Linked List' },
        { unit: 3, name: 'Stack — Array & Linked List Implementation' },
        { unit: 3, name: 'Queue — Linear, Circular, Priority Queue' },
        { unit: 3, name: 'Deque & Applications (Expression Evaluation)' },
        { unit: 4, name: 'Binary Tree — Traversals (Inorder, Preorder, Postorder)' },
        { unit: 4, name: 'Binary Search Tree — Insert, Delete, Search' },
        { unit: 4, name: 'AVL Tree — Rotations & Balancing' },
        { unit: 5, name: 'Graph Representation — Adjacency Matrix & List' },
        { unit: 5, name: 'BFS & DFS Traversal' },
        { unit: 5, name: "Shortest Path — Dijkstra's & Bellman-Ford" },
        { unit: 6, name: 'Sorting — Bubble, Selection, Insertion, Merge, Quick' },
        { unit: 6, name: 'Searching — Linear & Binary Search' },
        { unit: 6, name: 'Hashing — Hash Functions, Collision Resolution' },
      ]
    },
    {
      name: 'Object Oriented Programming', code: 'COMPS302', credits: 4, semester: 3,
      syllabusTopics: [
        { unit: 1, name: 'OOP Paradigm — Classes, Objects, Encapsulation' },
        { unit: 1, name: 'Access Specifiers — Public, Private, Protected' },
        { unit: 2, name: 'Constructors & Destructors' },
        { unit: 2, name: 'Static Members & Friend Functions' },
        { unit: 3, name: 'Inheritance — Single, Multiple, Multilevel, Hierarchical' },
        { unit: 3, name: 'Virtual Base Class & Ambiguity Resolution' },
        { unit: 4, name: 'Polymorphism — Function Overloading & Overriding' },
        { unit: 4, name: 'Virtual Functions & Pure Virtual Functions' },
        { unit: 4, name: 'Runtime Polymorphism via vTable' },
        { unit: 5, name: 'Templates — Function & Class Templates' },
        { unit: 5, name: 'STL — Vectors, Lists, Maps, Sets' },
        { unit: 6, name: 'Exception Handling — try, catch, throw' },
        { unit: 6, name: 'File I/O — Streams, File Open/Close/Read/Write' },
      ]
    },
  ],
  CSE: [
    {
      name: 'Machine Learning', code: 'CSE301', credits: 4, semester: 3,
      syllabusTopics: [
        { unit: 1, name: 'Introduction to ML — Types, Applications, Workflow' },
        { unit: 1, name: 'Data Preprocessing — Normalisation, Encoding, Imputation' },
        { unit: 2, name: 'Linear Regression — Simple & Multiple' },
        { unit: 2, name: 'Logistic Regression & Sigmoid Function' },
        { unit: 2, name: 'Decision Trees & Random Forests' },
        { unit: 3, name: 'Support Vector Machines (SVM)' },
        { unit: 3, name: 'k-Nearest Neighbours (kNN)' },
        { unit: 4, name: 'Clustering — k-Means, DBSCAN' },
        { unit: 4, name: 'Dimensionality Reduction — PCA' },
        { unit: 5, name: 'Neural Networks — Perceptron, MLP, Activation Functions' },
        { unit: 5, name: 'Backpropagation & Gradient Descent' },
        { unit: 6, name: 'Model Evaluation — Accuracy, Precision, Recall, F1, ROC-AUC' },
        { unit: 6, name: 'Cross Validation & Hyperparameter Tuning' },
      ]
    },
    {
      name: 'Database Management Systems', code: 'CSE302', credits: 4, semester: 3,
      syllabusTopics: [
        { unit: 1, name: 'Introduction to DBMS — Architecture, Data Models' },
        { unit: 1, name: 'Entity-Relationship (ER) Model & ER Diagrams' },
        { unit: 2, name: 'Relational Model — Schemas, Keys, Constraints' },
        { unit: 2, name: 'Relational Algebra — Select, Project, Join, Union' },
        { unit: 3, name: 'SQL — DDL (CREATE, ALTER, DROP)' },
        { unit: 3, name: 'SQL — DML (SELECT, INSERT, UPDATE, DELETE)' },
        { unit: 3, name: 'SQL — Joins, Subqueries, Views, Indexes' },
        { unit: 4, name: 'Normalisation — 1NF, 2NF, 3NF, BCNF' },
        { unit: 5, name: 'Transactions — ACID Properties, Concurrency Control' },
        { unit: 5, name: 'Locking Protocols, Deadlock Detection & Recovery' },
        { unit: 6, name: 'NoSQL Databases — Document, Key-Value, Column-Family' },
        { unit: 6, name: 'MongoDB Basics — CRUD Operations, Aggregation' },
      ]
    },
  ],
  EXTC: [
    {
      name: 'Digital Electronics', code: 'EXTC301', credits: 4, semester: 3,
      syllabusTopics: [
        { unit: 1, name: 'Number Systems — Binary, Octal, Hexadecimal Conversions' },
        { unit: 1, name: "Boolean Algebra — Theorems, De Morgan's Laws" },
        { unit: 2, name: 'Logic Gates — AND, OR, NOT, NAND, NOR, XOR, XNOR' },
        { unit: 2, name: 'Combinational Circuit Design — SOP & POS, K-Map' },
        { unit: 3, name: 'Combinational Circuits — Half Adder, Full Adder, Subtractor' },
        { unit: 3, name: 'Multiplexer, Demultiplexer, Encoder, Decoder' },
        { unit: 4, name: 'Sequential Circuits — SR, JK, D, T Flip-Flops' },
        { unit: 4, name: 'Registers — SISO, SIPO, PISO, PIPO' },
        { unit: 5, name: 'Counters — Synchronous & Asynchronous, Mod-N Counter' },
        { unit: 5, name: 'Finite State Machines — Mealy & Moore Models' },
        { unit: 6, name: 'Memory Devices — ROM, RAM, EPROM, EEPROM' },
        { unit: 6, name: 'Programmable Logic Devices — PAL, PLA, FPGA Overview' },
      ]
    },
    {
      name: 'Analog Communication', code: 'EXTC302', credits: 4, semester: 3,
      syllabusTopics: [
        { unit: 1, name: 'Signals & Systems — Classification, Fourier Series' },
        { unit: 1, name: 'Signal Bandwidth, Power & Energy' },
        { unit: 2, name: 'Amplitude Modulation (AM) — DSB-FC, DSB-SC' },
        { unit: 2, name: 'SSB and VSB Modulation' },
        { unit: 2, name: 'AM Demodulation — Envelope Detector, Synchronous Detector' },
        { unit: 3, name: 'Frequency Modulation (FM) — Narrowband & Wideband' },
        { unit: 3, name: 'Phase Modulation (PM) & Angle Modulation Comparison' },
        { unit: 3, name: 'FM Demodulation — PLL, Slope Detector' },
        { unit: 4, name: 'Noise — Types, Gaussian Noise, SNR, Noise Figure' },
        { unit: 4, name: 'Noise Performance of AM & FM Systems' },
        { unit: 5, name: 'Superheterodyne Receiver — Components & Working' },
        { unit: 5, name: 'AGC, AFC, Image Frequency Rejection' },
      ]
    },
  ],
};

// ─── Rooms ────────────────────────────────────────────────────────────────────
// Floors 1-3: 3 classrooms per floor (CR-101..103, CR-201..203, CR-301..303)
// Floors 4-6: 10 classrooms per floor (CR-401..410, CR-501..510, CR-601..610)
// Labs: one per floor Lab-101..Lab-601
// Ground: Seminar Hall, Auditorium
function buildRooms() {
  const rooms = [];
  // Ground level
  rooms.push({ name: 'Seminar Hall', building: 'Main', floor: 0, capacity: 120, type: 'seminar_hall', floorPlanCoordinates: { x: 19.1249, y: 72.8464 } });
  rooms.push({ name: 'Auditorium',   building: 'Main', floor: 0, capacity: 500, type: 'auditorium',   floorPlanCoordinates: { x: 19.1249, y: 72.8464 } });
  // Floors 1-3: 3 classrooms + 1 lab each
  for (let fl = 1; fl <= 3; fl++) {
    for (let rm = 1; rm <= 3; rm++) {
      rooms.push({
        name: `CR-${fl}0${rm}`, building: 'Main', floor: fl,
        capacity: 60, type: 'classroom',
        floorPlanCoordinates: { x: 19.1249, y: 72.8464 }
      });
    }
    rooms.push({
      name: `Lab-${fl}01`, building: 'Main', floor: fl,
      capacity: 30, type: 'lab',
      floorPlanCoordinates: { x: 19.1249, y: 72.8464 }
    });
  }
  // Floors 4-6: 10 classrooms + 1 lab each
  for (let fl = 4; fl <= 6; fl++) {
    for (let rm = 1; rm <= 10; rm++) {
      rooms.push({
        name: `CR-${fl}${rm.toString().padStart(2, '0')}`,
        building: 'Main', floor: fl,
        capacity: 60, type: 'classroom',
        floorPlanCoordinates: { x: 19.1249, y: 72.8464 }
      });
    }
    rooms.push({
      name: `Lab-${fl}01`, building: 'Main', floor: fl,
      capacity: 30, type: 'lab',
      floorPlanCoordinates: { x: 19.1249, y: 72.8464 }
    });
  }
  return rooms;
}

// ─── Timetable time slots ─────────────────────────────────────────────────────
// Lectures: 1 hour each | Labs: 2 hours each
// College hours: 09:00 – 15:00
const LECTURE_SLOTS = [
  { startTime: '09:00', endTime: '10:00', slotType: 'lecture' },
  { startTime: '10:00', endTime: '11:00', slotType: 'lecture' },
  { startTime: '11:15', endTime: '12:15', slotType: 'lecture' }, // 15-min break
  { startTime: '13:00', endTime: '14:00', slotType: 'lecture' }, // lunch 12:15-13:00
  { startTime: '14:00', endTime: '15:00', slotType: 'lecture' },
];

const LAB_SLOTS = [
  { startTime: '09:00', endTime: '11:00', slotType: 'lab' },
  { startTime: '11:15', endTime: '13:15', slotType: 'lab' },
  { startTime: '13:00', endTime: '15:00', slotType: 'lab' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function buildTimetableSlots(subjects, facultyIds, classroomId, labRoomId) {
  const slots = [];
  let subIdx = 0;
  for (let d = 0; d < DAYS.length; d++) {
    // 3 lecture slots per day Mon–Fri
    for (let t = 0; t < 3; t++) {
      slots.push({
        day: DAYS[d],
        ...LECTURE_SLOTS[t],
        subjectId: subjects[subIdx % subjects.length],
        facultyId: facultyIds[subIdx % facultyIds.length],
        roomId: classroomId,
      });
      subIdx++;
    }
    // Add a lab slot on Monday and Wednesday
    if (d === 0 || d === 2) {
      slots.push({
        day: DAYS[d],
        ...LAB_SLOTS[1], // 11:15-13:15
        subjectId: subjects[subIdx % subjects.length],
        facultyId: facultyIds[subIdx % facultyIds.length],
        roomId: labRoomId,
      });
      subIdx++;
    }
  }
  return slots;
}

// ─── Name generator ───────────────────────────────────────────────────────────
const FIRST_NAMES = ['Aarav','Aditi','Akash','Anika','Ankit','Bhavna','Chirag','Deepika','Dev','Esha'];
const LAST_NAMES  = ['Sharma','Patil','Shah','Mehta','Joshi','Verma','Singh','Gupta','Kumar','Nair'];

function randomName(i, code) {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last  = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
  return { name: `${first} ${last}`, email: `${code.toLowerCase()}.${i + 1}@student.spit.ac.in` };
}

// ─── Main seed ────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Aether Full Database Seed v4');
  await connectDB(process.env.MONGODB_URI);

  console.log('🧹 Clearing existing data & indexes...');
  const models = [
    Department, User, Subject, Room, Timetable, EventRequest,
    Issue, Notification, SyllabusProgress, ChatbotLog, LeaveRequest,
    Club, AdvisingNote, Notice, Batch
  ];
  await Promise.all(models.map(m => m.collection.drop().catch(() => {})));

  // ── Departments ──────────────────────────────────────────────────────────
  const deptDocs = {};
  for (const d of DEPARTMENTS) deptDocs[d.code] = await Department.create(d);

  // ── Rooms ────────────────────────────────────────────────────────────────
  console.log('🏫 Seeding rooms (floors 1-6)...');
  const roomDocs = [];
  for (const r of buildRooms()) roomDocs.push(await Room.create(r));
  const roomMap = Object.fromEntries(roomDocs.map(r => [r.name, r]));

  // ── Deans ────────────────────────────────────────────────────────────────
  for (const dean of DEANS) {
    await User.create({
      name: dean.name, email: dean.email, passwordHash: DEFAULT_PASSWORD,
      role: 'dean', subRole: dean.subRole, departmentId: deptDocs['COMPS']._id
    });
  }

  const allFaculty = [], allStudents = [], allHods = [];

  for (const [code, data] of Object.entries(FACULTY_BY_DEPT)) {
    const dept = deptDocs[code];

    // HOD
    const hod = await User.create({
      name: data.hod.name, email: data.hod.email,
      passwordHash: DEFAULT_PASSWORD, role: 'hod', departmentId: dept._id
    });
    allHods.push(hod);

    // Faculty
    const facultyDocs = [];
    for (let i = 0; i < data.faculty.length; i++) {
      const f = data.faculty[i];
      const doc = await User.create({
        name: f.name, email: f.email, passwordHash: DEFAULT_PASSWORD,
        role: 'faculty', departmentId: dept._id,
        subRole: i === 0 ? 'timetable_coord' : null,
      });
      facultyDocs.push(doc);
      allFaculty.push(doc);
    }

    // Subjects (with syllabusTopics)
    const subjectDocs = [];
    for (const s of SUBJECTS[code]) {
      subjectDocs.push(await Subject.create({ ...s, departmentId: dept._id }));
    }

    // Classrooms (use floors 1-3 for the 3 depts)
    const floorOffset = ['COMPS','CSE','EXTC'].indexOf(code) + 1;
    const classroom = roomMap[`CR-${floorOffset}01`];
    const labRoom   = roomMap[`Lab-${floorOffset}01`];

    // Timetables for Div A & B
    for (let divIdx = 0; divIdx < 2; divIdx++) {
      const division = divIdx === 0 ? 'A' : 'B';
      const slots = buildTimetableSlots(
        subjectDocs.map(s => s._id),
        facultyDocs.map(f => f._id),
        classroom._id,
        labRoom._id,
      );
      await Timetable.create({
        departmentId: dept._id, division, semester: 3,
        academicYear: '2026-2027', uploadedBy: facultyDocs[0]._id,
        status: 'approved', slots,
      });
    }

    // Students — 100 per dept (50 Div-A, 50 Div-B)
    const deptStudents = [];
    for (let i = 0; i < 100; i++) {
      const { name, email } = randomName(i, code);
      const div = i < 50 ? 'A' : 'B';
      const student = await User.create({
        name, email, passwordHash: DEFAULT_PASSWORD,
        role: 'student', departmentId: dept._id,
        division: div, semester: 3,
        enrollmentNo: `${code}${2024}${String(i + 1).padStart(3, '0')}`,
      });
      allStudents.push(student);
      deptStudents.push(student);
    }

    // ── Faculty advisory batches (~20 students per batch) ─────────────────
    console.log(`📋 Seeding advisory batches for ${code}...`);
    for (let fi = 0; fi < facultyDocs.length; fi++) {
      for (let div = 0; div < 2; div++) {
        const divChar = div === 0 ? 'A' : 'B';
        const divStudents = deptStudents.filter(s => s.division === divChar);
        // Each faculty gets one batch from each division (~17-20 students each)
        const batchStudents = divStudents.slice(fi * 17, fi * 17 + 17);
        if (batchStudents.length === 0) continue;
        await Batch.create({
          name: `${code}-Sem3-Div${divChar}-Batch${fi + 1}`,
          facultyId: facultyDocs[fi]._id,
          departmentId: dept._id,
          semester: 3,
          division: divChar,
          academicYear: '2026-2027',
          studentIds: batchStudents.map(s => s._id),
        });
      }
    }

    // ── Pre-initialize SyllabusProgress for each faculty+subject ──────────
    console.log(`📚 Seeding syllabus progress for ${code}...`);
    for (const faculty of facultyDocs) {
      for (const subject of subjectDocs) {
        const topics = subject.syllabusTopics.map(t => ({ name: t.name, status: 'pending' }));
        await SyllabusProgress.create({
          subjectId: subject._id,
          facultyId: faculty._id,
          departmentId: dept._id,
          semester: subject.semester,
          academicYear: '2026-2027',
          topics,
        });
      }
    }
  }

  // ── Council ──────────────────────────────────────────────────────────────
  const allCouncil = [];
  for (const c of COUNCIL_MEMBERS) {
    const m = await User.create({
      name: c.name, email: c.email, passwordHash: DEFAULT_PASSWORD,
      role: 'council', subRole: c.subRole, departmentId: deptDocs[c.dept]._id,
      division: 'A', semester: 3,
      enrollmentNo: `COUNCIL${c.dept}${2024}${Math.floor(Math.random() * 900) + 100}`
    });
    allCouncil.push(m);
  }

  // ── Committee members (heads of clubs) ───────────────────────────────────
  const allCommitteeMembers = [];
  for (const c of COMMITTEES) {
    for (let i = 0; i < 2; i++) {
      const isHead = i === 0;
      const name = `${c.prefix.toUpperCase()} ${isHead ? 'Chairperson' : 'Vice-Chairperson'}`;
      const email = `${c.prefix}${isHead ? 'head' : 'vice'}@student.spit.ac.in`;
      const m = await User.create({
        name, email, passwordHash: DEFAULT_PASSWORD,
        role: 'student', subRole: 'committee_head',
        departmentId: deptDocs[c.dept]._id
      });
      allCommitteeMembers.push(m);
    }
  }

  // ── Superadmin ───────────────────────────────────────────────────────────
  await User.create({
    name: 'Super Admin', email: 'admin@spit.ac.in',
    passwordHash: DEFAULT_PASSWORD, role: 'superadmin',
    departmentId: deptDocs['COMPS']._id
  });

  // ── Clubs ────────────────────────────────────────────────────────────────
  console.log('🎉 Seeding Clubs...');
  const clubs = [];
  for (let i = 0; i < COMMITTEES.length; i++) {
    const c = COMMITTEES[i];
    const club = await Club.create({
      name: c.name,
      description: c.desc,
      category: c.category,
      departmentId: deptDocs[c.dept]._id,
      facultyAdvisorId: allFaculty[i % allFaculty.length]._id,
      members: [
        { userId: allCommitteeMembers[i * 2]._id,     role: 'president' },
        { userId: allCommitteeMembers[i * 2 + 1]._id, role: 'secretary' },
        { userId: allStudents[i * 3]._id,     role: 'member' },
        { userId: allStudents[i * 3 + 1]._id, role: 'member' },
      ],
    });
    clubs.push(club);
  }

  // ── Notices ──────────────────────────────────────────────────────────────
  console.log('📣 Seeding Notices...');
  await Notice.create({
    title: 'Welcome to Aether!',
    body: 'The unified campus OS is now live. Faculty: please initialize your syllabus trackers. Students: check your timetable and attendance.',
    publishedBy: allHods[0]._id,
    departmentId: deptDocs['COMPS']._id,
    priority: 'high',
    targetDivisions: [],
    targetSemesters: [],
  });
  await Notice.create({
    title: 'Mid-Term Exam Schedule',
    body: 'Mid-term exams begin Oct 15th. Attendance must be ≥75% to be eligible. Check seating on the portal.',
    publishedBy: allFaculty[0]._id,
    departmentId: deptDocs['COMPS']._id,
    priority: 'urgent',
    targetDivisions: ['A'],
    targetSemesters: [3],
  });

  // ── Events ──────────────────────────────────────────────────────────────
  console.log('📅 Seeding Events...');
  await EventRequest.create({
    title: 'Hackathon 2025',
    description: 'Annual 24-hour hackathon by CSI — open to all branches.',
    requestedBy: allCommitteeMembers[2]._id,
    expectedAttendance: 200,
    startTime: new Date(Date.now() + 86400000 * 5),
    endTime: new Date(Date.now() + 86400000 * 6),
    venue: roomMap['Seminar Hall'].name,
    departmentId: deptDocs['COMPS']._id,
    currentStage: 'approved',
    chain: [
      { role: 'council', status: 'approved', userId: allCouncil[0]._id, comment: 'Looks great' },
      { role: 'hod',     status: 'approved', userId: allHods[0]._id,    comment: 'Approved' },
      { role: 'dean',    status: 'approved', userId: null,              comment: 'Final approval granted' },
    ],
  });
  await EventRequest.create({
    title: 'Guest Lecture on Generative AI',
    description: 'Industry expert talk on the future of GenAI and LLMs.',
    requestedBy: allStudents[0]._id,
    expectedAttendance: 50,
    startTime: new Date(Date.now() + 86400000 * 10),
    endTime: new Date(Date.now() + 86400000 * 10 + 3600000 * 2),
    venue: roomMap['CR-101'].name,
    departmentId: deptDocs['COMPS']._id,
    currentStage: 'council',
    chain: [],
  });

  // ── Issues ──────────────────────────────────────────────────────────────
  console.log('🛠️ Seeding Issues...');
  await Issue.create({
    title: 'Projector not working in CR-101',
    description: 'HDMI cable seems broken — screen flickering.',
    category: 'maintenance', locationDesc: 'CR-101',
    reportedBy: allStudents[0]._id, status: 'open',
  });
  await Issue.create({
    title: 'WiFi down in Lab-101',
    description: 'Cannot connect to student network since morning.',
    category: 'it', locationDesc: 'Lab-101',
    reportedBy: allStudents[3]._id, status: 'in_progress',
  });

  // ── Advising Notes ───────────────────────────────────────────────────────
  console.log('📝 Seeding Advising Notes...');
  await AdvisingNote.create({
    studentId: allStudents[0]._id,
    facultyId: allFaculty[0]._id,
    title: 'Mid-Term Performance Review',
    note: 'Student is performing well but needs to focus more on tree traversals in Data Structures.',
    category: 'academic', visibility: 'shared',
    requiresFollowUp: true,
    followUpDate: new Date(Date.now() + 86400000 * 7),
  });

  // ── Leave Requests ───────────────────────────────────────────────────────
  console.log('🏖️ Seeding Leave Requests...');
  await LeaveRequest.create({
    facultyId: allFaculty[1]._id,
    departmentId: deptDocs['COMPS']._id,
    leaveType: 'casual',
    fromDate: new Date(Date.now() + 86400000 * 2),
    toDate: new Date(Date.now() + 86400000 * 3),
    reason: 'Attending a family function.',
    status: 'pending',
  });

  console.log('\n✅ Seed v4 Complete!');
  console.log('──────────────────────────────────────────');
  console.log('Default password for all accounts: Aether@2026');
  console.log('Superadmin: admin@spit.ac.in');
  console.log('──────────────────────────────────────────');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
