export interface EmailGenerationParams {
  productDescription: string;
  targetAudience: string;
  tone: string;
  goal: string;
}

export interface EmailSequence {
  day1: { subject: string; body: string };
  day3: { body: string };
  day7: { body: string };
}

export interface GeneratedEmail {
  id: string;
  subjectLines: string[];
  openingLines: string[];
  body: string;
  sequence?: EmailSequence;
  linkedInMessage?: string;
  psychologicalInsight?: string;
  suggestions: string[];
}

export interface Lead {
  name: string;
  company: string;
  industry: string;
  email: string;
  role: string;
  generatedEmail?: GeneratedEmail;
  status: 'idle' | 'generating' | 'completed' | 'failed';
}
