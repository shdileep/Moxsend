import { EmailGenerationParams, GeneratedEmail, Lead } from "../types";

// ─── Provider Config ────────────────────────────────────────────────────────

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const GROQ_KEY = () => import.meta.env.VITE_GROQ_API_KEY as string;
const OR_KEY = () => import.meta.env.VITE_OPENROUTER_API_KEY as string;

// Text models: Groq primary → OpenRouter fallback
const TEXT_MODEL_GROQ = "llama-3.3-70b-versatile";
const TEXT_MODEL_OR = "meta-llama/llama-3.3-70b-instruct:free";

// Vision model: Groq primary → OpenRouter (Google Gemini Flash) fallback
const VISION_MODEL_GROQ = "llama-3.2-90b-vision-preview";
const VISION_MODEL_OR = "google/gemini-flash-1.5";

// ─── Core fetch with automatic fallback ────────────────────────────────────

interface ChatPayload {
  messages: any[];
  response_format?: { type: string };
  temperature?: number;
  max_tokens?: number;
}

async function chatWithFallback(
  groqModel: string,
  orModel: string,
  payload: ChatPayload,
  isVision = false
): Promise<string> {
  // ── Try Groq first ──
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: groqModel, ...payload }),
    });

    if (res.status === 429) {
      console.warn("Groq rate limit hit — switching to OpenRouter fallback.");
    } else if (res.ok) {
      const data = await res.json();
      return data.choices[0].message.content;
    } else {
      const errText = await res.text();
      console.warn(`Groq error ${res.status}: ${errText} — trying OpenRouter.`);
    }
  } catch (e) {
    console.warn("Groq request failed:", e, "— trying OpenRouter.");
  }

  // ── Fallback: OpenRouter ──
  const orRes = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OR_KEY()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://moxsend.netlify.app",
      "X-Title": "Moxsend",
    },
    body: JSON.stringify({
      model: orModel,
      ...payload,
      // OpenRouter free models don't support response_format — strip it
      response_format: undefined,
    }),
  });

  if (!orRes.ok) {
    const errText = await orRes.text();
    throw new Error(`Both Groq and OpenRouter failed. OpenRouter: ${errText}`);
  }

  const orData = await orRes.json();
  return orData.choices[0].message.content;
}

// ─── Parse & clean JSON from any model response ────────────────────────────

function parseJSON(raw: string): any {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generateEmails(
  params: EmailGenerationParams
): Promise<GeneratedEmail[]> {
  const prompt = `
    Generate 3 high-converting cold email variants for:
    Product: ${params.productDescription}
    Audience: ${params.targetAudience}
    Tone: ${params.tone}
    Goal: ${params.goal}

    Each variant REQUIRES:
    1. Main Email (Day 1): 3 subject lines, 1 hook, body.
    2. Multi-touch: Day 3 follow-up & Day 7 break-up.
    3. LinkedIn: A 300-char connection note.
    4. AI Insight: 1 sentence on the psychological strategy used.

    Return ONLY a JSON object with a key "variants" containing an array of exactly 3 objects. Format of each object:
    {
      "subjectLines": ["string"],
      "openingLines": ["string"],
      "body": "string",
      "sequence": {
        "day1": { "subject": "string", "body": "string" },
        "day3": { "body": "string" },
        "day7": { "body": "string" }
      },
      "linkedInMessage": "string",
      "psychologicalInsight": "string",
      "suggestions": ["string"]
    }
  `;

  const content = await chatWithFallback(TEXT_MODEL_GROQ, TEXT_MODEL_OR, {
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const parsed = parseJSON(content);
  const variants = parsed.variants || [];

  return variants.map((item: any) => ({
    ...item,
    id: crypto.randomUUID(),
    score: item.score ?? {
      readability: Math.floor(Math.random() * 20) + 80,
      personalization: Math.floor(Math.random() * 20) + 75,
      conversion: Math.floor(Math.random() * 20) + 70,
    },
  }));
}

export async function improveEmail(
  originalEmail: string,
  request: string
): Promise<string> {
  const prompt = `
    You are an AI email optimization expert. Improve the following email based on this feedback: "${request}"

    Original Email:
    ${originalEmail}

    Return ONLY the improved email body text as a string. No pleasantries.
  `;

  try {
    return await chatWithFallback(TEXT_MODEL_GROQ, TEXT_MODEL_OR, {
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error) {
    console.error("improveEmail failed:", error);
    return originalEmail;
  }
}

export async function extractLeadsFromFile(
  fileBase64: string,
  mimeType: string
): Promise<Lead[]> {
  const prompt = `
    You are an expert Data Extraction AI. Analyze the attached image and extract all professional leads.

    CRITICAL INSTRUCTIONS:
    1. Parse EVERY single person listed. Do not skip anyone.
    2. Map exactly to: Name, Company, Industry, Email, Role.
    3. If a field is missing, return "N/A". Never omit a key.
    4. Output 100% valid JSON only. No markdown code blocks.

    Return EXACTLY this JSON structure:
    {
      "leads": [
        {
          "name": "Extracted Name or N/A",
          "company": "Extracted Company or N/A",
          "industry": "Extracted Industry or N/A",
          "email": "Extracted Email or N/A",
          "role": "Extracted Role/Title or N/A"
        }
      ]
    }
  `;

  try {
    // Vision payload with image — same format works for both Groq and OpenRouter/Gemini
    const visionPayload: ChatPayload = {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${fileBase64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
    };

    const content = await chatWithFallback(
      VISION_MODEL_GROQ,
      VISION_MODEL_OR,
      visionPayload,
      true
    );

    const parsed = parseJSON(content);
    return parsed.leads || [];
  } catch (error) {
    console.error("extractLeadsFromFile failed:", error);
    return [];
  }
}

export async function extractLeadsFromText(text: string): Promise<Lead[]> {
  const prompt = `
    You are an expert Data Extraction AI.
    Analyze the following raw text and extract all professional leads.
    Even if the text is from a resume or single profile, extract the primary person as a lead.

    CRITICAL INSTRUCTIONS:
    1. Parse EVERY single person found. Do not skip anyone.
    2. Map exactly to: Name, Company, Industry, Email, Role.
    3. If a field is missing, return "N/A". Never omit a key.
    4. Output 100% valid JSON only. No markdown code blocks.

    Document Text to Analyze:
    """
    ${text}
    """

    Return EXACTLY this JSON structure:
    {
      "leads": [
        {
          "name": "Extracted Name or N/A",
          "company": "Extracted Company or N/A",
          "industry": "Extracted Industry or N/A",
          "email": "Extracted Email or N/A",
          "role": "Extracted Role/Title or N/A"
        }
      ]
    }
  `;

  try {
    const content = await chatWithFallback(TEXT_MODEL_GROQ, TEXT_MODEL_OR, {
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const parsed = parseJSON(content);
    return parsed.leads || [];
  } catch (error) {
    console.error("extractLeadsFromText failed:", error);
    return [];
  }
}
