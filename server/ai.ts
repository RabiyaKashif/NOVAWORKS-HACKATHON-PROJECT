import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { PublicUser } from './auth.ts';
import type { ExtractionResult } from '../src/types/project.ts';

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      timeout: 25000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const EXTRACTION_SYSTEM_INSTRUCTION = `You are an AI Project Manager for NovaWorks Technologies. Your task is to read a meeting transcript and extract project and task details into a strict JSON format.

CRITICAL RULES:
1. ONLY assign tasks and projects to the users provided in the Active Directory. Do not invent new employees (e.g., Kamran or any external client stakeholder is a client, not an employee).
2. A project's managerId MUST be a user whose role is MANAGER. A task's assigneeId MUST be a user whose role is AGENT.
3. Extract each Project: name, clientName, description, managerId, final agreed deadline, and its tasks array.
4. Extract Tasks for each project: title, description, assigneeId, deadline, and estimatedHours. Keep separate tasks distinct even if owned by the same developer.
5. ALWAYS honor final revised/corrected decisions and recaps over earlier tentative dates, hours, or owners discussed earlier in the meeting.
6. IGNORE all rejected features discussed in the meeting. Do NOT create tasks for: payments, payment gateways, inventory integration, maps, driver tracking, or real-email sending. Also ignore any other explicitly rejected/cancelled features mentioned in the transcript.
7. All deadlines must be in 2026, using the format YYYY-MM-DD, and each task deadline must be on or before its parent project deadline.
8. The estimate is effort in hours (numeric, positive), not calendar days.
9. Use each employee's exact ID string from the Active Directory for 'managerId' and 'assigneeId'.

Output strictly valid JSON conforming to the response schema.`;

export async function extractProjectsFromTranscript(
  transcript: string,
  directory: PublicUser[]
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'PLACEHOLDER_API_KEY') {
    throw Object.assign(
      new Error(
        'GEMINI_API_KEY is not configured in the environment. Please check the Settings > Secrets panel.'
      ),
      { status: 500 }
    );
  }

  // Never send passwords or unnecessary sensitive fields to the AI
  const aiDirectory = directory.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    specialization: u.specialization,
    skills: u.skills,
  }));

  const userPrompt = `ACTIVE DIRECTORY (use ONLY these exact "id" values; managerId must have role MANAGER and assigneeId must have role AGENT):
${JSON.stringify(aiDirectory, null, 2)}

MEETING TRANSCRIPT:
${transcript.trim()}

Return ONLY valid JSON matching this exact structure:
{
  "projects": [
    {
      "name": "Extracted project name",
      "clientName": "Extracted client",
      "description": "Brief scope",
      "managerId": "VALID_MANAGER_ID",
      "deadline": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "Extracted task",
          "description": "Brief task scope",
          "assigneeId": "VALID_AGENT_ID",
          "deadline": "YYYY-MM-DD",
          "estimatedHours": 12
        }
      ]
    }
  ]
}`;

  const ai = getAiClient();
  const attemptModels = [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ] as const;
  let lastError: unknown;
  let rawText = '';

  for (let i = 0; i < attemptModels.length; i += 1) {
    const attempt = i + 1;
    const modelName = attemptModels[i];
    const attemptStart = Date.now();
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projects: {
                type: Type.ARRAY,
                description: 'List of approved projects extracted from the transcript.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Extracted project name.' },
                    clientName: { type: Type.STRING, description: 'Extracted client name.' },
                    description: {
                      type: Type.STRING,
                      description: 'Brief approved scope, excluding rejected features.',
                    },
                    managerId: {
                      type: Type.STRING,
                      description: 'Exact MANAGER ID from the Active Directory.',
                    },
                    deadline: {
                      type: Type.STRING,
                      description: 'Final agreed project deadline in 2026 using YYYY-MM-DD format.',
                    },
                    tasks: {
                      type: Type.ARRAY,
                      description: 'Approved tasks only. Must exclude all rejected features.',
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING, description: 'Extracted task title.' },
                          description: { type: Type.STRING, description: 'Brief task scope.' },
                          assigneeId: {
                            type: Type.STRING,
                            description: 'Exact AGENT ID from the Active Directory.',
                          },
                          deadline: {
                            type: Type.STRING,
                            description:
                              'Final agreed task deadline in 2026 using YYYY-MM-DD format (<= project deadline).',
                          },
                          estimatedHours: {
                            type: Type.NUMBER,
                            description: 'Final agreed effort in hours (not calendar days).',
                          },
                        },
                        required: [
                          'title',
                          'description',
                          'assigneeId',
                          'deadline',
                          'estimatedHours',
                        ],
                      },
                    },
                  },
                  required: [
                    'name',
                    'clientName',
                    'description',
                    'managerId',
                    'deadline',
                    'tasks',
                  ],
                },
              },
            },
            required: ['projects'],
          },
        },
      });

      rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw Object.assign(
          new Error('The AI model returned an empty response. Please try again.'),
          { status: 502 }
        );
      }
      console.log(
        `[AI] ${modelName} succeeded on attempt ${attempt} in ${Date.now() - attemptStart}ms`
      );
      lastError = undefined;
      break;
    } catch (err: unknown) {
      lastError = err;
      const normalized = normalizeGeminiError(err);
      console.warn(
        `[AI] ${modelName} attempt ${attempt} failed (${normalized.status}) in ${Date.now() - attemptStart}ms: ${normalized.message}`
      );
      const isRetryable =
        normalized.status === 503 ||
        normalized.status === 429 ||
        normalized.status === 502 ||
        normalized.status === 504 ||
        normalized.status === 408;

      if (!isRetryable || attempt === attemptModels.length) {
        throw Object.assign(new Error(normalized.message), { status: normalized.status });
      }

      const backoffMs = attempt * 1200 + Math.floor(Math.random() * 400);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  if (lastError) {
    const normalized = normalizeGeminiError(lastError);
    throw Object.assign(new Error(normalized.message), { status: normalized.status });
  }

  const parsed = JSON.parse(rawText) as ExtractionResult;
  return {
    projects: Array.isArray(parsed.projects)
      ? parsed.projects.map((proj) => ({
          name: String(proj?.name ?? '').trim(),
          clientName: String(proj?.clientName ?? '').trim(),
          description: String(proj?.description ?? '').trim(),
          managerId: String(proj?.managerId ?? '').trim(),
          deadline: String(proj?.deadline ?? '').trim(),
          tasks: Array.isArray(proj?.tasks)
            ? proj.tasks.map((task) => ({
                title: String(task?.title ?? '').trim(),
                description: String(task?.description ?? '').trim(),
                assigneeId: String(task?.assigneeId ?? '').trim(),
                deadline: String(task?.deadline ?? '').trim(),
                estimatedHours: Number(task?.estimatedHours ?? 0),
              }))
            : [],
        }))
      : [],
  };
}

function normalizeGeminiError(err: unknown): { status: number; message: string } {
  const errObj = err as { status?: number; code?: number; message?: string };
  let status =
    typeof errObj?.status === 'number' && errObj.status >= 400
      ? errObj.status
      : typeof errObj?.code === 'number' && errObj.code >= 400
        ? errObj.code
        : 500;
  let message =
    typeof errObj?.message === 'string' && errObj.message.trim()
      ? errObj.message.trim()
      : 'Failed to communicate with Gemini API.';

  // Unwrap JSON-formatted SDK error strings like {"error":{"code":503,"message":"...","status":"UNAVAILABLE"}}
  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number' && parsed.error.code >= 400) {
          status = parsed.error.code;
        }
        if (parsed.error.message) {
          message = parsed.error.message;
        }
      }
    } catch {
      // Keep original string if not valid JSON
    }
  }

  if (status === 503) {
    message = `Gemini AI service temporarily unavailable (503): ${message}`;
  } else if (status === 429) {
    message = `Gemini AI rate limit reached (429): ${message}`;
  } else if (status === 400 || status === 403) {
    message = `${message} Please verify GEMINI_API_KEY in Settings > Secrets.`;
  }

  return { status, message };
}
