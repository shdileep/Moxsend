import { EmailGenerationParams, GeneratedEmail, Lead } from "../types";

export async function generateEmails(params: EmailGenerationParams): Promise<GeneratedEmail[]> {
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

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.statusText} ${await response.text()}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Clean markdown if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);
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
  } catch (error) {
    console.error("Groq API Error:", error);
    throw error;
  }
}

export async function improveEmail(originalEmail: string, request: string): Promise<string> {
  const prompt = `
    You are an AI email optimization expert. Improve the following email based on this feedback: "${request}"
    
    Original Email:
    ${originalEmail}

    Return ONLY the improved email body text as a string. No pleasantries.
  `;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error);
    return originalEmail;
  }
}

export async function extractLeadsFromFile(fileBase64: string, mimeType: string): Promise<Lead[]> {
  const prompt = `
    You are an expert, highly trained Data Extraction AI model. 
    Your ONLY task is to analyze the attached document or image and systematically extract all professional leads.
    
    CRITICAL INSTRUCTIONS:
    1. Parse EVERY single person listed in the document. Do not skip anyone.
    2. Map the extracted text exactly to these fields: Name, Company, Industry, Email, Role.
    3. If a field is missing, you MUST return "N/A". Never omit a key.
    4. You must output 100% valid, strictly formatted JSON. Do not include markdown code blocks (\`\`\`json) or any conversational text.

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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error("Groq Vision API Error", await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return parsed.leads || [];
  } catch (error) {
    console.error("Extraction Error:", error);
    return [];
  }
}

export async function extractLeadsFromText(text: string): Promise<Lead[]> {
  const prompt = `
    You are an expert, highly trained Data Extraction AI model. 
    Your ONLY task is to analyze the following raw text extracted from a document and systematically extract all professional leads.
    Even if the text is from a resume, cover letter, or a single profile, extract the primary person as a lead.
    
    CRITICAL INSTRUCTIONS:
    1. Parse EVERY single person found in the text. Do not skip anyone.
    2. Map the extracted text exactly to these fields: Name, Company, Industry, Email, Role.
    3. If a field is missing, you MUST return "N/A". Never omit a key.
    4. You must output 100% valid, strictly formatted JSON. Do not include markdown code blocks (\`\`\`json) or any conversational text.

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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.error("Groq Text Extraction API Error", await response.text());
      return [];
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Clean markdown if present
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);
    return parsed.leads || [];
  } catch (error) {
    console.error("Extraction Error:", error);
    return [];
  }
}

