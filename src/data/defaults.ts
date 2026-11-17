import type {
  DirectoryEmployee,
  ExtractionResult,
  RuleCheckItem,
  SampleTranscript,
} from '../types/project.ts';

export const FORBIDDEN_FEATURES: readonly string[] = [
  'payments',
  'payment gateways',
  'inventory integration',
  'maps',
  'driver tracking',
  'real-email sending',
];

export const FORBIDDEN_PATTERNS: ReadonlyArray<{ label: string; regex: RegExp }> = [
  {
    label: 'payments / payment gateways',
    regex: /\b(payment|payments|payment\s+gateway|payment\s+gateways|stripe|paypal|checkout\s+billing)\b/i,
  },
  {
    label: 'inventory integration',
    regex: /\b(inventory\s+integration|inventory\s+sync|warehouse\s+inventory)\b/i,
  },
  {
    label: 'maps',
    regex: /\b(map|maps|google\s+maps|mapbox|leaflet\s+map|geospatial\s+map)\b/i,
  },
  {
    label: 'driver tracking',
    regex: /\b(driver\s+tracking|gps\s+tracking|live\s+driver|fleet\s+tracking)\b/i,
  },
  {
    label: 'real-email sending',
    regex: /\b(real[- ]email\s+sending|send\s+real\s+emails|smtp\s+email\s+dispatch|transactional\s+email\s+sending)\b/i,
  },
];

export const DEFAULT_DIRECTORY: DirectoryEmployee[] = [
  {
    id: 'ADMIN',
    name: 'Admin',
    email: 'admin@novaworks.example',
    role: 'ADMIN',
    specialization: 'Administrator',
    skills: ['Company overview', 'transcript creation'],
  },
  {
    id: 'PM01',
    name: 'Ayesha Khan',
    email: 'ayesha@novaworks.example',
    role: 'MANAGER',
    specialization: 'Web PM',
    skills: ['Web projects', 'client coordination'],
  },
  {
    id: 'PM02',
    name: 'Bilal Ahmed',
    email: 'bilal@novaworks.example',
    role: 'MANAGER',
    specialization: 'Mobile PM',
    skills: ['Mobile projects', 'delivery planning'],
  },
  {
    id: 'PM03',
    name: 'Hina Malik',
    email: 'hina@novaworks.example',
    role: 'MANAGER',
    specialization: 'AI PM',
    skills: ['AI projects', 'requirement review'],
  },
  {
    id: 'DEV01',
    name: 'Ali Raza',
    email: 'ali@novaworks.example',
    role: 'AGENT',
    specialization: 'Full-Stack',
    skills: ['React', 'frontend integration'],
  },
  {
    id: 'DEV02',
    name: 'Hamza Shah',
    email: 'hamza@novaworks.example',
    role: 'AGENT',
    specialization: 'Full-Stack',
    skills: ['Node.js', 'databases', 'APIs'],
  },
  {
    id: 'DEV03',
    name: 'Sara Noor',
    email: 'sara@novaworks.example',
    role: 'AGENT',
    specialization: 'App Developer',
    skills: ['Flutter', 'mobile UI'],
  },
  {
    id: 'DEV04',
    name: 'Usman Tariq',
    email: 'usman@novaworks.example',
    role: 'AGENT',
    specialization: 'App Developer',
    skills: ['Flutter', 'integration', 'testing'],
  },
  {
    id: 'DEV05',
    name: 'Zain Abbas',
    email: 'zain@novaworks.example',
    role: 'AGENT',
    specialization: 'AI Developer',
    skills: ['LLMs', 'extraction', 'prompts'],
  },
  {
    id: 'DEV06',
    name: 'Maryam Asif',
    email: 'maryam@novaworks.example',
    role: 'AGENT',
    specialization: 'AI Developer',
    skills: ['Retrieval', 'document processing'],
  },
];

export const SAMPLE_TRANSCRIPTS: SampleTranscript[] = [
  {
    id: 'novaworks-delivery-planning',
    title: 'Client Delivery Planning (3 Projects)',
    client: 'UrbanCart, QuickServe, HelpDeskPro',
    date: '2026-10-07',
    summary:
      'Full supplied 60-minute meeting transcript with 3 projects, 12 tasks, revised dates/hours/owners, and excluded features.',
    transcript: `Meeting: NovaWorks Client Delivery Planning
Date: 7 October 2026 | Scheduled duration: 60 minutes
Participants: Ayesha, Bilal, Hina, Ali, Hamza, Sara, Usman, Zain, Maryam

09:00-09:04 | Opening and company workflow
Ayesha: Good morning. We have three client engagements to plan today: UrbanCart Clothing's website, QuickServe's customer mobile app, and HelpDeskPro's AI support assistant. Please keep these as three separate projects. A combined project would make client reporting confusing.
Bilal: We should finish with a project manager, deadline, task owner, and estimated hours for every piece of work. The estimate is effort, not the number of days between today and the delivery date.
Hina: Agreed. Please use our supplied team directory. Accounts can already be created with a setup script. We are not hiring anyone for this delivery cycle. Record developer work only in the estimated hours. We do not need management-hour estimates.
Ayesha: Keep this version simple. We need project details, assigned people, deadlines, and estimated hours. Cost calculation and progress monitoring are outside this challenge.

09:04-09:08 | UrbanCart project scope
Ayesha: First project is UrbanCart Website, for client UrbanCart Clothing. I'll manage it. They need a responsive website where customers can browse products, view product details, and add items to a demo cart. We initially discussed 18 October as the delivery date.
Ali: Do they need a real checkout, payment gateway, and stock integration?
Ayesha: No. For this phase the cart is a demo. Real payments and inventory integration are not included. The client wants to review the buying experience before funding those integrations.
Hamza: So the API scope is product data and a basic cart endpoint, without payment processing?
Ayesha: Correct. Don't add a payment task or an inventory task. The description should make the demo scope clear.

09:08-09:12 | UrbanCart frontend assignment
Ali: I can own the product catalog interface: product listing, a product detail screen, and responsive layout. Put that down as 12 estimated hours, due on 12 October.
Ayesha: Please call that task Product catalog UI. We also need the demo cart interface as a separate task so we can track it separately.
Ali: Yes. Demo cart UI will take 8 hours, due 15 October. That covers adding and removing items, quantities, and a visible total. I am the owner of both frontend tasks.
Bilal: Are these two separate tasks rather than a single 20-hour frontend task?
Ayesha: Exactly. Two tasks, same owner, with the deadlines we just agreed. We need that separation in the task list.

09:12-09:16 | UrbanCart backend and delivery correction
Hamza: For Product and cart APIs, I estimate 14 hours. I own it, and the deadline is 14 October. I will provide product responses and the demo cart endpoints Ali needs.
Ayesha: Good. After that, Ali owns Website integration and testing. Let's start with a six-hour estimate and a 17 October deadline.
Ali: Six hours is reasonable for connecting the screens and checking the demo flow. But please move that task to 19 October. I need a little more calendar space after the API work.
Ayesha: Accepted. Website integration and testing is 6 hours, due 19 October. Also, the client has just confirmed that final project delivery can be 20 October. That replaces the earlier 18 October date. The final UrbanCart project deadline is 20 October.
Hamza: So the final website plan has four tasks, and the new deadline is 20 October. No payment gateway in this phase.
Ayesha: Correct.

09:16-09:20 | QuickServe scope and manager
Bilal: The second project is QuickServe Mobile App, for client QuickServe Services. I am the project manager. The client needs a customer app for signing in, requesting a service, and seeing the request's current status.
Sara: Android only for the demonstration, or do we need separate native apps?
Bilal: A Flutter app demo is enough. We don't need separate Android and iOS development tasks. The project deadline is 24 October.
Usman: What about live maps, driver tracking, and payments?
Bilal: Exclude them. This version is customer login, service booking, and booking status. Those other features may be future work, but they must not appear as tasks in the current project.

09:20-09:24 | QuickServe screen work
Sara: I'll own Login and profile screens. That is 8 hours, due 12 October. It includes the customer login interface and a basic profile screen.
Bilal: Please keep that as one task. We don't need to split every field into its own task.
Sara: The second task is Service booking screens. I'll own that too. I estimate 12 hours, due 17 October. The customer selects a service, enters the request details, and sees a confirmation screen.
Hina: So Sara has two tasks, and both are mobile UI work. The API work is separate.
Bilal: Right. The transcript shouldn't turn these into generic web frontend tasks. This project is the mobile app.

09:24-09:28 | QuickServe API assignment
Hamza: I can build Booking and account APIs for the app. The endpoint scope is basic customer account handling, service requests, and request status. Put me as the owner.
Bilal: What's the effort estimate and delivery date?
Hamza: 16 hours, due 16 October. That's separate from the 14-hour UrbanCart API task. Please don't merge those just because I own both.
Usman: I need those responses for mobile integration, but we can use sample responses while Hamza works.
Bilal: Good. This is still one API task under QuickServe. There is no new shared platform project.

09:28-09:32 | QuickServe integration estimate correction
Usman: I will own Mobile integration and testing. Initially I would put it at 8 hours, due 22 October.
Sara: Can that cover the booking status screen, error states, and testing login through booking? Eight sounds a little tight.
Usman: You're right. Make the final estimate 10 hours. Keep the task deadline at 22 October. I will connect the mobile UI to the API, display request status, and test the whole customer flow.
Bilal: Final agreement: Mobile integration and testing, Usman, 10 hours, 22 October. QuickServe still delivers on 24 October. Don't keep the earlier eight-hour estimate.
Ayesha: That's four tasks for QuickServe as well. We are not adding maps or payment tasks.

09:32-09:36 | HelpDeskPro scope and manager
Hina: Third project is HelpDeskPro AI Assistant, for client HelpDeskPro Solutions. I am managing it. They want a support assistant that answers questions from a supplied FAQ document and passes unresolved questions to a human team.
Zain: Does the assistant need to send emails or connect to a real ticketing service?
Hina: No external message sending is required. Human escalation can be a saved record in the demo. We are building a support proof of concept, not integrating their full support system.
Maryam: We should keep an explicit boundary that the assistant uses the FAQ content instead of guessing unsupported answers.
Hina: Agreed. The project deadline is 22 October. We will test it with some questions that aren't in the document too.

09:36-09:40 | HelpDeskPro document work
Maryam: I'll own FAQ document processing. It should prepare the supplied FAQ so the assistant can retrieve relevant content. I estimate 10 hours, due 13 October.
Hina: Please make the task description clear: prepare and retrieve from the FAQ. Don't make a separate task for every FAQ topic.
Zain: I can then own Assistant answer generation. I'll use the prepared content, connect the model, and handle the response structure.
Hina: Give us the estimate and date for that task.
Zain: 14 hours, due 17 October. If the FAQ doesn't support an answer, the assistant should say it cannot resolve the question rather than inventing a response.

09:40-09:44 | HelpDeskPro escalation
Zain: The next task is Human escalation flow. I can own it as well: save unresolved questions so they can be reviewed by a person. The estimate is 6 hours, due 18 October.
Bilal: Are you assigning those escalated questions to another employee now?
Hina: No, not as new project tasks from this planning meeting. The feature is a saved escalation record in the client's demo. Keep our development task assigned to Zain.
Ayesha: The distinction matters. Discussion of end users should not create employees in our own company directory.
Hina: Exactly. Also, the client mentioned someone called Kamran who may supply a document later. Kamran is not a NovaWorks employee. Do not add him to our team or assign development work to him.

09:44-09:48 | HelpDeskPro testing owner correction
Hina: For Assistant evaluation and testing, I was initially considering Zain as the owner. We need to test FAQ answers, unsupported questions, and the escalation path.
Maryam: I can own that instead. It would be better if someone other than the answer-generation developer checks the results.
Hina: Agreed. Replace the earlier suggestion: Maryam is the final owner of Assistant evaluation and testing.
Maryam: Put the estimate at 8 hours, due 21 October. I'll include normal questions and missing-answer cases. That is separate from my ten-hour FAQ document task.
Hina: Confirmed: Maryam, 8 hours, 21 October. Final HelpDeskPro deadline stays 22 October.

09:56-10:00 | Final recap
Ayesha: Final recap: UrbanCart Website, client UrbanCart Clothing, manager Ayesha, deadline 20 October. Ali owns Product catalog UI: 12 hours, 12 October. Ali owns Demo cart UI: 8 hours, 15 October. Hamza owns Product and cart APIs: 14 hours, 14 October. Ali owns Website integration and testing: 6 hours, 19 October.
Bilal: QuickServe Mobile App, client QuickServe Services, manager Bilal, deadline 24 October. Sara owns Login and profile screens: 8 hours, 12 October. Sara owns Service booking screens: 12 hours, 17 October. Hamza owns Booking and account APIs: 16 hours, 16 October. Usman owns Mobile integration and testing: 10 hours, 22 October.
Hina: HelpDeskPro AI Assistant, client HelpDeskPro Solutions, manager Hina, deadline 22 October. Maryam owns FAQ document processing: 10 hours, 13 October. Zain owns Assistant answer generation: 14 hours, 17 October. Zain owns Human escalation flow: 6 hours, 18 October. Maryam owns Assistant evaluation and testing: 8 hours, 21 October.
Ayesha: Those are the final decisions. Keep the rejected features out. The company already has its nine employees. Create three projects with twelve tasks, then show them in the CRM. That's all for this meeting.`,
  },
  {
    id: 'swift-dispatch',
    title: 'SwiftDispatch Web & Mobile',
    client: 'Kamran (SwiftDispatch)',
    date: '2026-11-10',
    summary:
      'Scoping call with client Kamran; drops payments, maps, driver tracking, inventory integration, and real-email sending.',
    transcript: `Meeting: SwiftDispatch Customer Portal Kickoff
Date: November 10, 2026
Attendees:
- Kamran (Client, SwiftDispatch Logistics)
- Ayesha Khan (Web PM, NovaWorks)
- Ali Raza (Full-Stack Developer, NovaWorks)
- Hamza Shah (Full-Stack Developer, NovaWorks)
- Sara Noor (App Developer, NovaWorks)

Ayesha Khan: Thanks for joining, Kamran. Let's lock down scope, ownership, and exact 2026 deadlines for the SwiftDispatch Customer Web Portal. I'll serve as the project manager on NovaWorks' side.

Kamran: Great. Initially we floated integrating Stripe payment gateways and automated payments inside the portal, plus live maps and driver tracking so customers see vans moving. Honestly, our leadership cut that budget for Phase 1. So let's drop payments, payment gateways, maps, and driver tracking completely—do NOT include them.

Hamza Shah: Understood. What about syncing with your warehouse ERP for inventory integration, and sending real-email sending notifications via SMTP when orders change?

Kamran: Skip inventory integration and real-email sending as well. Those are rejected for this release. Just store status notifications in the in-app activity feed. Also, I'll review the copy on my end, so don't assign any NovaWorks engineering tasks to me—I'm strictly the client stakeholder.

Ayesha Khan: Clear. Let's confirm the approved deliverables and effort hours:
1. Hamza Shah will build the Node.js REST API, database schema for shipment requests, status history, and in-app activity logs.
Hamza Shah: That's 32 hours of backend engineering effort—even though it spans a full week on the calendar, the coding effort is 32 hours. Target completion is December 4, 2026.

2. Ali Raza will implement the React customer portal dashboard, request submission form, and live status table with frontend API integration.
Ali Raza: I'll need 28 effort hours. I'll wrap up by December 11, 2026.

3. Sara Noor will design and build the companion Flutter mobile status-viewer UI screens for customers checking shipments on iOS and Android.
Sara Noor: Put me down for 18 hours of mobile UI effort, finishing by December 15, 2026.

Ayesha Khan: Perfect. So we agree on December 18, 2026 as the final agreed project deadline for the SwiftDispatch Customer Web Portal. Let's get started.`,
  },
];

export const CRITICAL_RULES_SPEC = [
  {
    ruleNumber: 1,
    title: 'Active Directory Exclusive Assignment',
    description:
      'ONLY assign tasks and projects to users present in the Active Directory. Never invent employees and never assign clients (such as Kamran) as managers or task assignees.',
  },
  {
    ruleNumber: 2,
    title: 'Required Project Schema',
    description:
      'Extract exact project fields: name, clientName, description, managerId, and deadline (the final agreed project deadline).',
  },
  {
    ruleNumber: 3,
    title: 'Required Task Schema',
    description:
      'Extract exact task fields for each deliverable: title, description, assigneeId, deadline, and estimatedHours.',
  },
  {
    ruleNumber: 4,
    title: 'Rejected Features Exclusion',
    description:
      'Ignore all rejected or out-of-scope features discussed in the meeting. Never create tasks for: payments, payment gateways, inventory integration, maps, driver tracking, or real-email sending.',
  },
  {
    ruleNumber: 5,
    title: '2026 ISO Date Discipline',
    description:
      'All project and task deadlines must fall in 2026 using strict YYYY-MM-DD formatting.',
  },
  {
    ruleNumber: 6,
    title: 'Effort Hours (Not Calendar Days)',
    description:
      'estimatedHours must represent actual effort in hours as a positive number, never calendar days.',
  },
  {
    ruleNumber: 7,
    title: 'Exact Directory ID Mapping',
    description:
      'Use the exact employee ID string from the Active Directory (e.g., PM01, DEV01) for managerId and assigneeId fields—never full names or emails.',
  },
];

function isValid2026Date(dateStr: string): boolean {
  if (!/^2026-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === 2026 &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function auditExtraction(
  result: ExtractionResult,
  directory: DirectoryEmployee[]
): RuleCheckItem[] {
  const validIds = new Set(directory.map((emp) => emp.id));
  const projects = Array.isArray(result.projects) ? result.projects : [];
  const allTasks = projects.flatMap((p) => (Array.isArray(p.tasks) ? p.tasks : []));

  const invalidManagers = projects.filter((p) => !validIds.has(p.managerId));
  const invalidAssignees = allTasks.filter((t) => !validIds.has(t.assigneeId));
  const rule1Passed =
    projects.length > 0 &&
    invalidManagers.length === 0 &&
    invalidAssignees.length === 0;
  const rule1Detail =
    projects.length === 0
      ? 'No projects were extracted.'
      : rule1Passed
        ? `All ${projects.length} project manager(s) and ${allTasks.length} task assignee(s) match exact Active Directory IDs.`
        : invalidManagers.length > 0
          ? `Unknown managerId(s): ${invalidManagers.map((p) => p.managerId || '(empty)').join(', ')}.`
          : `${invalidAssignees.length} task(s) reference unknown assigneeId: ${invalidAssignees.map((t) => t.assigneeId || '(empty)').join(', ')}.`;

  const incompleteProjects = projects.filter(
    (p) =>
      !p.name?.trim() ||
      !p.clientName?.trim() ||
      !p.description?.trim() ||
      !p.managerId?.trim() ||
      !p.deadline?.trim()
  );
  const rule2Passed = projects.length > 0 && incompleteProjects.length === 0;

  const incompleteTasks = allTasks.filter(
    (t) =>
      !t.title?.trim() ||
      !t.description?.trim() ||
      !t.assigneeId?.trim() ||
      !t.deadline?.trim() ||
      typeof t.estimatedHours !== 'number'
  );
  const rule3Passed = allTasks.length > 0 && incompleteTasks.length === 0;

  const excludedTerm =
    '(?:(?:any|real|live|automated|external|third[- ]party|full)\\s+)*(?:payment\\s+gateways?|payment\\s+processing|payments?|stripe|paypal|checkout\\s+billing|inventory\\s+integration|inventory\\s+sync|warehouse\\s+inventory|stock\\s+integration|google\\s+maps?|mapbox|leaflet\\s+maps?|geospatial\\s+maps?|maps?|driver\\s+tracking|gps\\s+tracking|live\\s+driver|fleet\\s+tracking|real[- ]email\\s+sending|send\\s+real\\s+emails|smtp\\s+email\\s+dispatch|transactional\\s+email\\s+sending)';
  const flaggedTasks: Array<{ title: string; hit: string }> = [];
  for (const task of allTasks) {
    const rawCombined = `${task.title} ${task.description}`;
    const combined = rawCombined
      .replace(
        new RegExp(
          `\\b(?:no|not|without|excluding|excludes|exclude|skip|skipped|skips|drop|dropped|drops|ignore|ignored|ignores|reject|rejected|omits?|omitted|free\\s+of)\\s+${excludedTerm}(?:(?:\\s*,\\s*(?:or|and)?|\\s+(?:or|and))\\s+${excludedTerm})*`,
          'gi'
        ),
        ''
      )
      .replace(
        new RegExp(
          `${excludedTerm}(?:(?:\\s*,\\s*(?:or|and)?|\\s+(?:or|and))\\s+${excludedTerm})*\\s+(?:is|are)?\\s*(?:not\\s+included|not\\s+required|excluded|out\\s+of\\s+scope|rejected|omitted|dropped|skipped)`,
          'gi'
        ),
        ''
      );
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(combined)) {
        flaggedTasks.push({ title: task.title, hit: pattern.label });
      }
    }
  }
  const rule4Passed = flaggedTasks.length === 0;

  const badProjectDates = projects.filter((p) => !isValid2026Date(p.deadline));
  const badTaskDates = allTasks.filter((t) => !isValid2026Date(t.deadline));
  const rule5Passed =
    projects.length > 0 &&
    badProjectDates.length === 0 &&
    badTaskDates.length === 0;

  const badHours = allTasks.filter(
    (t) =>
      typeof t.estimatedHours !== 'number' ||
      !Number.isFinite(t.estimatedHours) ||
      t.estimatedHours <= 0
  );
  const rule6Passed = allTasks.length > 0 && badHours.length === 0;

  const rule7Passed =
    projects.length > 0 &&
    projects.every((p) => validIds.has(p.managerId)) &&
    allTasks.every((t) => validIds.has(t.assigneeId));

  return [
    {
      id: 'rule-1',
      ruleNumber: 1,
      label: 'Active Directory Exclusive Assignment',
      passed: rule1Passed,
      detail: rule1Detail,
    },
    {
      id: 'rule-2',
      ruleNumber: 2,
      label: 'Project Metadata Completeness',
      passed: rule2Passed,
      detail: rule2Passed
        ? `Extracted ${projects.length} project(s): ${projects.map((p) => `"${p.name}"`).join(', ')}.`
        : projects.length === 0
          ? 'No projects were extracted.'
          : `${incompleteProjects.length} project(s) are missing required fields.`,
    },
    {
      id: 'rule-3',
      ruleNumber: 3,
      label: 'Task Schema Completeness',
      passed: rule3Passed,
      detail: rule3Passed
        ? `All ${allTasks.length} extracted tasks include title, description, assigneeId, deadline, and estimatedHours.`
        : allTasks.length === 0
          ? 'No tasks were extracted.'
          : `${incompleteTasks.length} task(s) are missing required fields.`,
    },
    {
      id: 'rule-4',
      ruleNumber: 4,
      label: 'Rejected Feature Exclusion',
      passed: rule4Passed,
      detail: rule4Passed
        ? 'Zero tasks reference payments, payment gateways, inventory integration, maps, driver tracking, or real-email sending.'
        : `Detected excluded scope in task(s): ${flaggedTasks.map((f) => `"${f.title}" (${f.hit})`).join('; ')}.`,
    },
    {
      id: 'rule-5',
      ruleNumber: 5,
      label: '2026 YYYY-MM-DD Deadlines',
      passed: rule5Passed,
      detail: rule5Passed
        ? `All ${projects.length} project deadline(s) and ${allTasks.length} task deadline(s) are valid 2026 YYYY-MM-DD dates.`
        : badProjectDates.length > 0
          ? `Invalid or non-2026 project deadline(s): ${badProjectDates.map((p) => p.deadline || '(empty)').join(', ')}.`
          : `${badTaskDates.length} task(s) have invalid or non-2026 dates.`,
    },
    {
      id: 'rule-6',
      ruleNumber: 6,
      label: 'Effort Hours Estimation',
      passed: rule6Passed,
      detail: rule6Passed
        ? `Total estimated effort across ${allTasks.length} tasks is ${allTasks.reduce((sum, t) => sum + t.estimatedHours, 0)} hours.`
        : 'One or more tasks have invalid or non-positive estimatedHours.',
    },
    {
      id: 'rule-7',
      ruleNumber: 7,
      label: 'Exact Directory ID Mapping',
      passed: rule7Passed,
      detail: rule7Passed
        ? 'All managerId and assigneeId fields strictly match Active Directory IDs.'
        : 'One or more ID fields do not match exact Active Directory ID strings.',
    },
  ];
}
