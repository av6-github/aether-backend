import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatbotLog, Issue } from '../shared.js';
import { notificationService } from '../notifications/notification.service.js';
import { attendanceService } from '../attendance/attendance.service.js';
import { syllabusService } from '../syllabus/syllabus.service.js';
import { paymentService } from '../payments/payment.service.js';
import { aiConflictService } from '../ai/aiConflict.service.js';

// ─── Tool Definitions (Gemini Function Calling) ────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: 'get_my_attendance',
        description: 'Fetch the real attendance percentage and subject-wise breakdown for the currently logged-in student.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
      },
      {
        name: 'get_syllabus_overview',
        description: "Fetch syllabus completion progress for all subjects in the student's department.",
        parameters: {
          type: 'OBJECT',
          properties: {
            semester: { type: 'STRING', description: 'Semester number e.g. "1"' },
            academicYear: { type: 'STRING', description: 'Academic year e.g. "2026-2027"' }
          },
          required: ['semester', 'academicYear']
        }
      },
      {
        name: 'escalate_issue',
        description: 'Escalate a serious safety, facility, or disciplinary issue to an authority.',
        parameters: {
          type: 'OBJECT',
          properties: {
            to: { type: 'STRING', description: '"hod" or "council"' },
            summary: { type: 'STRING', description: 'Brief summary of the concern' }
          },
          required: ['to', 'summary']
        }
      },
      {
        name: 'get_pending_dues',
        description: 'Check if the student has any unpaid library fines, canteen bills, or lab dues.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
      },
      {
        name: 'predict_event_approval',
        description: 'Predict if an event booking will be approved and check for venue conflicts.',
        parameters: {
          type: 'OBJECT',
          properties: {
            venue: { type: 'STRING', description: 'Name of the venue' },
            startTime: { type: 'STRING', description: 'ISO start time string' },
            endTime: { type: 'STRING', description: 'ISO end time string' }
          },
          required: ['venue', 'startTime', 'endTime']
        }
      },
      {
        name: 'search_knowledge_base',
        description: 'Search the campus handbook for policies on leaves, club joining, and academic rules.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'The topic to search for' }
          },
          required: ['query']
        }
      },
      {
        name: 'trigger_ui_action',
        description: 'Provide an interactive button to the user to perform an action or navigate to a screen.',
        parameters: {
          type: 'OBJECT',
          properties: {
            type: { type: 'STRING', enum: ['navigate', 'action'] },
            screen: { type: 'STRING', description: 'Screen name to navigate to (e.g., MyDues, LeaveApplication, Timetable)' },
            label: { type: 'STRING', description: 'The text to show on the button' },
            params: { type: 'OBJECT', description: 'Optional params for navigation' }
          },
          required: ['type', 'screen', 'label']
        }
      }
    ]
  }
];

// ─── Simple RAG Knowledge Base ──────────────────────────────────────────────
const CAMPUS_HANDBOOK = [
  { topic: 'leaves', content: 'Students must apply for leave via the Aether app. Medical leaves for >3 days require a certificate. HOD is the final authority for department leaves.' },
  { topic: 'clubs', content: 'To join a club, navigate to the Marketplace, select the club, and click "Request to Join". You must provide a short pitch. Presidents approve requests.' },
  { topic: 'attendance', content: 'Minimum 75% attendance is required per subject to be eligible for end-semester exams. Dues must be cleared before hall tickets are issued.' },
  { topic: 'canteen', content: 'Canteen bills can be paid online via the Aether wallet/Razorpay. Unpaid bills will lead to a block on library services.' },
];

// ─── Tool Executor ──────────────────────────────────────────────────────────
async function executeTool(toolName, args, user) {
  switch (toolName) {
    case 'get_my_attendance': {
      const report = await attendanceService.getStudentReport(user.userId, user.departmentId);
      return JSON.stringify(report);
    }
    case 'get_syllabus_overview': {
      const data = await syllabusService.getStudentProgressOverview(
        user.departmentId, args.semester, args.academicYear
      );
      return JSON.stringify(data.map(t => ({
        subject: t.subjectId?.name,
        faculty: t.facultyId?.name,
        completion: (t.completionPercent || 0) + '%'
      })));
    }
    case 'escalate_issue': {
      // 1. Auto-create a tracked Issue ticket in the issues collection
      await Issue.create({
        reportedBy: user.userId,
        title: `[AI Escalation] ${args.summary.substring(0, 80)}`,
        description: `Automatically escalated from AI chatbot.\n\nOriginal query: ${args.summary}`,
        category: args.to === 'hod' ? 'maintenance' : 'disciplinary',
        status: 'open'
      });

      // 2. Notify the student
      await notificationService.send(user.userId, {
        title: 'Issue Escalated',
        body: `Your concern was escalated to ${args.to.toUpperCase()} and logged as a ticket. Summary: ${args.summary}`,
        type: 'chatbot_escalation'
      });
      return JSON.stringify({ success: true, escalatedTo: args.to });
    }
    case 'get_pending_dues': {
      const data = await paymentService.getTotalOutstanding(user.userId);
      return JSON.stringify(data);
    }
    case 'predict_event_approval': {
      const suggestions = await aiConflictService.suggestAlternativeSlots(args.venue, args.startTime, args.endTime);
      return JSON.stringify({
        hasConflict: suggestions && suggestions.length > 0,
        suggestions,
        note: 'High lead time increases approval chance.'
      });
    }
    case 'search_knowledge_base': {
      const results = CAMPUS_HANDBOOK.filter(h => h.topic.includes(args.query.toLowerCase()) || h.content.toLowerCase().includes(args.query.toLowerCase()));
      return JSON.stringify(results.length ? results : { message: 'No specific rule found in handbook.' });
    }
    case 'trigger_ui_action': {
      // This is a "virtual" tool that we intercept in the chat loop
      return JSON.stringify({ status: 'ui_action_queued', ...args });
    }
    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

// ─── Gemini Setup ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Aether, the intelligent campus AI assistant.
You have access to real campus data tools. Use them when asked about personal data or campus procedures.
- Use get_my_attendance for questions about attendance.
- Use get_syllabus_overview for syllabus progress.
- Use get_pending_dues for library fines, canteen bills, or payment status.
- Use predict_event_approval for checking if a venue is free for an event.
- Use search_knowledge_base for "how-to" questions (e.g., joining clubs, leave rules).
- Use trigger_ui_action to help the user navigate to a relevant screen (e.g., screen="MyDues" if they have dues).
- Use escalate_issue for safety or facility emergencies.
- Be concise, friendly, and helpful. Always present tool results in a human-friendly way.`;

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw { status: 503, message: 'AI service not configured. Set GEMINI_API_KEY.' };
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools,
      systemInstruction: SYSTEM_PROMPT
    });
  }
  return model;
}

class ChatbotService {
  async chat(user, query) {
    const aiModel = getModel();
    const chat = aiModel.startChat({ history: [] });

    // ── Exponential backoff helper ──────────────────────────────────────────
    const sendWithRetry = async (message, maxRetries = 3) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await chat.sendMessage(message);
        } catch (err) {
          const is429 = err?.status === 429 || err?.message?.includes('429');
          if (is429 && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500; // 1s, 2s, 4s + jitter
            console.warn(`[Chatbot] Gemini rate limited. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            // Not a 429 or exhausted retries — surface a clean error
            if (is429) throw { status: 429, message: 'AI service is temporarily overloaded. Please try again in a moment.' };
            throw err;
          }
        }
      }
    };

    let response = await sendWithRetry(query);
    let finalText = '';
    let escalated = false;
    let escalatedTo = null;
    let uiAction = null;

    // Agentic loop — keep going until no more function calls
    while (true) {
      const parts = response.response.candidates?.[0]?.content?.parts || [];
      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length === 0) {
        finalText = response.response.text();
        break;
      }

      // Execute tools and send results back to Gemini
      const toolResults = await Promise.all(
        functionCalls.map(async part => {
          const { name, args } = part.functionCall;
          if (name === 'escalate_issue') { escalated = true; escalatedTo = args.to; }
          
          const result = await executeTool(name, args, user);
          
          // If the AI called trigger_ui_action, capture it for the final response
          if (name === 'trigger_ui_action') {
            uiAction = { type: args.type, screen: args.screen, label: args.label, params: args.params };
          }
          
          return { functionResponse: { name, response: { result } } };
        })
      );

      response = await sendWithRetry(toolResults);
    }

    const classification = escalated ? 'escalation' : (query.length < 60 ? 'basic' : 'procedural');
    const log = await ChatbotLog.create({
      userId: user.userId,
      query,
      response: finalText,
      classification,
      escalated,
      escalatedTo: escalatedTo || undefined
    });

    return { 
      response: finalText, 
      classification, 
      escalated, 
      escalatedTo, 
      uiAction, 
      logId: log._id 
    };
  }

  async getHistory(userId) {
    return ChatbotLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('query response classification escalated createdAt');
  }
}

export const chatbotService = new ChatbotService();
