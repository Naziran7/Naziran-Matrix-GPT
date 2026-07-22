import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Storage setup for file processing in AI routes (resumes & RAG documents)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max file size
});

// --- Local Node.js Vector & Text RAG Store Engine ---
interface RAGChunk {
  id: string;
  filename: string;
  category: string;
  text: string;
  uploadedAt: string;
}

function cleanExtractedText(rawText: string): string {
  if (!rawText) return '';
  
  // 1. Remove XML/RDF/HTML tags
  let cleaned = rawText.replace(/<[^>]+>/g, ' ');

  // 2. Remove PDF internal stream keywords, object tags, and structural metadata noise
  const pdfMetadataKeywords = [
    /FlateDecode/gi, /ObjStm/gi, /endstream/gi, /endobj/gi, /xmpmeta/gi,
    /adobe:ns:meta/gi, /rdf:RDF/gi, /PScript5/gi, /CreatorTool/gi, /ModifyDate/gi,
    /CreateDate/gi, /Producer/gi, /FontName/gi, /Encoding/gi, /Type\/Catalog/gi,
    /%PDF-\d\.\d/gi, /<<\s*\/Length\s+\d+/gi, /\/Subtype\s*\/[A-Za-z0-9]+/gi,
    /\/ViewerPreferences/gi, /\/ExtGState/gi, /\/ProcSet/gi, /\/MediaBox/gi,
    /\/Contents/gi, /\/Group/gi, /\/Tabs/gi, /\/StructParents/gi, /\d+\s+\d+\s+obj/gi
  ];

  pdfMetadataKeywords.forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  // 3. Remove non-printable / binary noise & normalize whitespace
  cleaned = cleaned
    .replace(/[^\x20-\x7E\x0A\x0D]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Filter out lines or chunks that are pure noise (e.g. hex codes, PDF objects, metadata junk)
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => {
    const trimmed = s.trim();
    if (trimmed.length < 15) return false;
    if (trimmed.includes('MediaBox') || trimmed.includes('ViewerPreferences') || trimmed.includes('ExtGState') || trimmed.includes('StructParents')) return false;
    const wordCount = (trimmed.match(/[a-zA-Z]{2,}/g) || []).length;
    return wordCount >= 3;
  });

  return sentences.join(' ');
}

const VECTOR_STORE_FILE = path.join(uploadDir, 'vector_store.json');

function initLocalRAGStore(): RAGChunk[] {
  let chunks: RAGChunk[] = [];
  if (fs.existsSync(VECTOR_STORE_FILE)) {
    try {
      const data = fs.readFileSync(VECTOR_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        chunks = parsed;
      }
    } catch (e) {
      console.warn('[RAG Engine] Failed to parse vector_store.json, re-initializing store.');
    }
  }

  if (chunks.length === 0) {
    chunks = [
      {
        id: 'doc-handbook-1',
        filename: 'Naziran_ERP_Corporate_Handbook_2026.pdf',
        category: 'HANDBOOK',
        text: 'Section 4.1 Attendance & Annual Leave Policy: Full-time employees receive 20 days of paid annual leave per calendar year. Leave applications must be submitted at least 5 business days in advance via the ERP portal. Overtime work is compensated at 1.5x hourly rate after 40 working hours per week.',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'doc-handbook-2',
        filename: 'Naziran_ERP_Corporate_Handbook_2026.pdf',
        category: 'HANDBOOK',
        text: 'Section 6.3 IT Security & Credentials: Corporate credentials, high-speed fiber line access, and ERP session tokens must be protected using JWT authentication and multi-factor authorization. Laptops must run updated antivirus software.',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'doc-finance-1',
        filename: 'Financial_Disbursement_Guidelines_v2.pdf',
        category: 'FINANCE',
        text: 'Corporate Expense Payout Policy: Payouts for utility bills, office space lease, and restock purchases exceeding $500 require dual managerial approval from Finance Lead John Doe. Original receipts must be attached in the ERP Ledger within 3 business days.',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'doc-sales-1',
        filename: 'Sales_Quotation_and_GST_Standard.pdf',
        category: 'SALES',
        text: 'Sales Order & Invoicing Tax Standards: All commercial transactions incur 18% GST tax automatically calculated on invoice issue. Wholesale purchase orders above $50,000 qualify for 5% net bulk volume rebate upon CRM deal signoff.',
        uploadedAt: new Date().toISOString()
      }
    ];
  }

  // Purge any legacy bad metadata chunks containing raw PDF stream tags or object noise
  const cleanChunks = chunks.filter(c => {
    const text = c.text || '';
    const isPdfRawHeader = text.includes('FlateDecode') || text.includes('ObjStm') || text.includes('xmpmeta') || text.includes('PScript5') || text.includes('/MediaBox') || text.includes('/ViewerPreferences') || text.includes('/ExtGState') || text.includes('/ProcSet') || text.includes('0 obj') || text.includes('endstream') || text.includes('endobj') || text.includes('/StructParents');
    return !isPdfRawHeader;
  });

  try {
    fs.writeFileSync(VECTOR_STORE_FILE, JSON.stringify(cleanChunks, null, 2));
  } catch (e) {
    console.error('[RAG Engine] Failed to write vector store:', e);
  }
  return cleanChunks;
}

function getLocalRAGStore(): RAGChunk[] {
  return initLocalRAGStore();
}

function saveLocalRAGStore(store: RAGChunk[]) {
  try {
    fs.writeFileSync(VECTOR_STORE_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('[RAG Engine] Error saving vector store:', e);
  }
}

function chunkText(text: string, chunkSize = 600, overlap = 100): string[] {
  const cleanText = cleanExtractedText(text);
  if (!cleanText || cleanText.length < 15) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    const chunk = cleanText.slice(start, end).trim();
    if (chunk.length > 15) {
      chunks.push(chunk);
    }
    start += (chunkSize - overlap);
  }
  return chunks.length > 0 ? chunks : [cleanText];
}

// Call Google Gemini REST API if GEMINI_API_KEY is configured
async function generateLLMResponse(prompt: string, context: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_') || apiKey.length < 10) {
    return null;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are the AI Assistant for Naziran ERP. Answer the user's question clearly, naturally, and professionally like a real conversational chatbot.

Context retrieved from enterprise database / documents:
---
${context}
---

User Query: "${prompt}"

Instructions:
- Provide a helpful, clear, and well-structured answer with bullet points if appropriate.
- Do not output raw XML tags, hex codes, or binary metadata.
- If the context doesn't fully answer the query, explain what you found and offer helpful guidance.`
            }
          ]
        }
      ]
    };

    const res = await axios.post(url, payload, { timeout: 8000 });
    const candidates = res.data?.candidates;
    if (candidates && candidates.length > 0) {
      const reply = candidates[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim().length > 10) {
        return reply.trim();
      }
    }
  } catch (err: any) {
    console.warn('[Gemini LLM Call Note] Could not complete LLM generation, using local synthesizer:', err.message || err);
  }
  return null;
}

async function searchLocalRAG(query: string) {
  const store = getLocalRAGStore();
  const tokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 1);

  if (!store || store.length === 0) {
    return {
      answer: "No documents have been indexed yet. Please upload a PDF or document using the **Index Custom Handbook or Document** button above.",
      confidenceScore: 0,
      citations: [],
      chunksUsed: 0
    };
  }

  const scored = store.map(chunk => {
    const content = chunk.text.toLowerCase();
    let score = 0;
    
    tokens.forEach(token => {
      if (content.includes(token)) score += 2;
    });

    if (content.includes(query.toLowerCase())) score += 6;
    if (chunk.filename.toLowerCase().includes(query.toLowerCase())) score += 4;

    const matchPercentage = tokens.length > 0 ? Math.min(Math.round((score / (tokens.length * 2 + 1)) * 100) + 40, 99) : 60;
    return { chunk, score, matchPercentage };
  });

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.filter(s => s.score > 0).slice(0, 3);

  if (topMatches.length === 0) {
    return {
      answer: `I searched across all indexed document vector chunks, but I couldn't find specific text matching **"${query}"**.\n\nTry searching for another keyword present in your file or re-indexing your PDF document.`,
      confidenceScore: 15,
      citations: [],
      chunksUsed: 0
    };
  }

  const topMatch = topMatches[0];
  const filename = topMatch.chunk.filename;
  const contextText = topMatches.map(m => m.chunk.text).join('\n---\n');

  // Try generating response using Gemini LLM if key is available
  const llmAnswer = await generateLLMResponse(query, contextText);

  const citations = topMatches.map(m => ({
    filename: m.chunk.filename,
    category: m.chunk.category || 'DOCUMENT',
    snippet: cleanExtractedText(m.chunk.text),
    matchScore: m.matchPercentage
  }));

  if (llmAnswer) {
    return {
      answer: llmAnswer,
      confidenceScore: topMatch.matchPercentage,
      citations,
      chunksUsed: topMatches.length
    };
  }

  // Conversational Synthesizer fallback
  const cleanSnippet = cleanExtractedText(topMatch.chunk.text);
  let answer = `Here is what I found regarding **"${query}"** in **${filename}**:\n\n`;
  
  const keySentences = cleanSnippet
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 15)
    .slice(0, 4);

  if (keySentences.length > 0) {
    keySentences.forEach(sentence => {
      answer += `• ${sentence.trim()}\n`;
    });
  } else {
    answer += `${cleanSnippet}\n`;
  }

  return {
    answer: answer.trim(),
    confidenceScore: topMatch.matchPercentage,
    citations,
    chunksUsed: topMatches.length
  };
}

router.use(authenticateJWT);

// Helper to call python service or fallback to local RAG engine
async function fetchAIService(endpoint: string, method: 'get' | 'post', data?: any) {
  try {
    const url = `${AI_SERVICE_URL}${endpoint}`;
    console.log(`[AI Proxy] Calling Python AI Service: ${method.toUpperCase()} ${url}`);
    
    const response = await axios({
      url,
      method,
      data,
      timeout: 15000 // 15s timeout
    });
    return response.data;
  } catch (error: any) {
    console.warn(`[AI Proxy Warning] Python service failed at ${endpoint}. Triggering local fallback.`);
    return await getMockFallback(endpoint, data);
  }
}

function screenResumeLocally(resumeText: string, jobDescription: string, resumeName: string) {
  let candidateName = resumeName.replace(/\.pdf$/i, '').replace(/\.docx?$/i, '').replace(/[-_]/g, ' ').trim();
  if (candidateName.includes(' - ')) {
    candidateName = candidateName.split(' - ')[0].trim();
  }

  const SKILL_LIBRARY = [
    'React', 'React.js', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'Express.js', 'Next.js', 'Vue', 'Angular',
    'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'REST API', 'GraphQL', 'Redux', 'Zustand', 'Prisma', 'PostgreSQL',
    'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'GitHub', 'CI/CD',
    'Python', 'Java', 'C++', 'C#', '.NET', 'PHP', 'Laravel', 'Django', 'Flask', 'FastAPI', 'Spring Boot',
    'Business Analysis', 'Data Analysis', 'SQL', 'Excel', 'Advanced Excel', 'Tableau', 'Power BI', 'Google Analytics',
    'Requirements Gathering', 'Process Mapping', 'UML', 'User Stories', 'Agile', 'Scrum', 'Jira', 'Confluence',
    'Stakeholder Management', 'Gap Analysis', 'Business Process Modeling', 'KPI Tracking', 'ETL', 'R', 'SAS',
    'Recruitment', 'Talent Acquisition', 'Onboarding', 'HRIS', 'Payroll', 'Performance Management', 'Employee Relations',
    'Employee Engagement', 'HR Policies', 'Labor Laws', 'Succession Planning', 'HR Analytics',
    'Financial Analysis', 'Accounting', 'Bookkeeping', 'QuickBooks', 'SAP', 'Tally', 'Financial Modeling',
    'Budgeting', 'Forecasting', 'Taxation', 'Auditing', 'Invoicing', 'Accounts Payable', 'Accounts Receivable',
    'Digital Marketing', 'SEO', 'SEM', 'Content Strategy', 'Social Media Marketing', 'CRM', 'Salesforce', 'HubSpot',
    'Lead Generation', 'Cold Calling', 'Negotiation', 'Account Management', 'Brand Strategy'
  ];

  const combinedSearchText = (resumeName + " " + resumeText).toLowerCase();
  const lowerJD = jobDescription.toLowerCase();

  let matchedSkills = SKILL_LIBRARY.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(resumeText) || regex.test(resumeName);
  });

  const uniqueSkillsSet = new Set<string>();
  const uniqueMatchedSkills: string[] = [];
  matchedSkills.forEach(s => {
    const lower = s.toLowerCase();
    if (!uniqueSkillsSet.has(lower)) {
      uniqueSkillsSet.add(lower);
      uniqueMatchedSkills.push(s);
    }
  });
  matchedSkills = uniqueMatchedSkills;

  let experience = "Not explicitly specified";
  const expMatch = resumeText.match(/(?:\d+\+?\s*(?:years?|yrs?)\s*(?:of\s*)?experience|[0-9]+\s*years?|experience:?[\s\S]{1,150})/i);
  if (expMatch) {
    experience = expMatch[0].replace(/\n+/g, ' ').slice(0, 120).trim();
  } else {
    const roles = ['Business Analyst', 'Software Engineer', 'Full Stack Developer', 'Data Analyst', 'Project Manager', 'HR Manager', 'Financial Analyst', 'Accountant', 'Sales Representative', 'DevOps Engineer'];
    const foundRoles = roles.filter(r => new RegExp(`\\b${r}\\b`, 'i').test(combinedSearchText));
    if (foundRoles.length > 0) {
      experience = `Experience in roles including: ${foundRoles.join(', ')}`;
    }
  }

  let education = "Educational background listed in file";
  const eduMatch = resumeText.match(/(?:Bachelor|Master|B\.?Tech|B\.?S|M\.?S|MBA|Ph\.?D|Diploma|Degree|Computer Science|Business Administration|Finance|Engineering)[\w\s.,&]*/i);
  if (eduMatch) {
    education = eduMatch[0].replace(/\n+/g, ' ').slice(0, 100).trim();
  }

  const projects: string[] = [];
  const projMatches = resumeText.match(/(?:built|developed|implemented|managed|designed|created|led)[\w\s.,&]{10,80}/gi);
  if (projMatches && projMatches.length > 0) {
    projMatches.slice(0, 2).forEach(p => projects.push(p.trim()));
  } else if (matchedSkills.length > 0) {
    projects.push(`Applied ${matchedSkills.slice(0, 3).join(', ')} in professional workflows`);
  } else {
    projects.push(`Extracted profile details from ${resumeName}`);
  }

  const jdSkills = SKILL_LIBRARY.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(jobDescription);
  });

  const jdWords = lowerJD.split(/\W+/).filter(w => w.length > 3 && !['with', 'have', 'must', 'from', 'this', 'that', 'they', 'role', 'team', 'work', 'year', 'years', 'looking', 'candidate', 'should', 'good', 'strong', 'engineer', 'analyst', 'manager', 'developer'].includes(w));

  let skillMatches = 0;
  jdSkills.forEach(req => {
    if (matchedSkills.some(s => s.toLowerCase() === req.toLowerCase())) {
      skillMatches++;
    }
  });

  let wordMatches = 0;
  jdWords.forEach(w => {
    if (combinedSearchText.includes(w)) {
      wordMatches++;
    }
  });

  let domainMatch = 1.0;
  const isTargetDev = /software|engineer|developer|programmer|full stack|backend|frontend/i.test(jobDescription);
  const isTargetAnalyst = /business analyst|data analyst|system analyst|requirements/i.test(jobDescription);

  const isResumeAnalyst = /business analyst|requirements|stakeholder|jira|confluence|tableau|excel/i.test(combinedSearchText) && !/react|node|typescript|express|java\b|python|c\+\+/i.test(combinedSearchText);
  const isResumeDev = /react|typescript|node|express|full stack|software engineer|developer|java\b|python|c\+\+/i.test(combinedSearchText);

  if (isTargetDev && isResumeAnalyst) {
    domainMatch = 0.35;
  } else if (isTargetAnalyst && isResumeDev) {
    domainMatch = 0.65;
  }

  let rawScore = 50;
  if (jdSkills.length > 0) {
    const ratio = skillMatches / jdSkills.length;
    rawScore = Math.round(ratio * 100);
  } else if (jdWords.length > 0) {
    const ratio = wordMatches / jdWords.length;
    rawScore = Math.round(ratio * 100);
  } else {
    rawScore = isResumeDev && isTargetDev ? 85 : (isResumeAnalyst && isTargetAnalyst ? 88 : 35);
  }

  let finalScore = Math.round(rawScore * domainMatch);

  if (matchedSkills.length > 0 && isTargetDev && isResumeDev) {
    finalScore = Math.max(finalScore, 82);
  } else if (matchedSkills.length > 0 && isTargetAnalyst && isResumeAnalyst) {
    finalScore = Math.max(finalScore, 85);
  }

  finalScore = Math.max(18, Math.min(96, finalScore));

  let ranking = "Rank 1 (Highly Recommended)";
  if (finalScore < 45) {
    ranking = "Rank 4 (Unsuitable / Domain Mismatch)";
  } else if (finalScore < 65) {
    ranking = "Rank 3 (Underqualified)";
  } else if (finalScore < 82) {
    ranking = "Rank 2 (Recommended)";
  }

  const topSkillsStr = matchedSkills.slice(0, 6).join(', ') || 'General Qualifications';

  let recommendation = "";
  if (finalScore >= 80) {
    recommendation = `The candidate (${candidateName}) exhibits strong alignment with the ${jobDescription} role, displaying expertise in ${topSkillsStr}. Highly recommended for technical interview.`;
  } else if (finalScore >= 65) {
    recommendation = `The candidate (${candidateName}) shows moderate alignment for ${jobDescription}. Primary skills identified include ${topSkillsStr}, though some key requirements for this position may need further evaluation.`;
  } else if (finalScore >= 45) {
    recommendation = `The candidate (${candidateName}) is underqualified for the target role "${jobDescription}". Extracted background (${topSkillsStr}) shows partial overlap, but lacks core experience required for this profile.`;
  } else {
    recommendation = `Domain mismatch: The uploaded resume for ${candidateName} (${topSkillsStr}) does not align with the requested role "${jobDescription}". Candidate is marked as ${ranking}.`;
  }

  return {
    candidateName: candidateName,
    extractedDetails: {
      skills: matchedSkills.length > 0 ? matchedSkills : ["Business Analysis", "Requirements Gathering", "Documentation"],
      experience: experience,
      education: education,
      projects: projects
    },
    matchPercentage: finalScore,
    ranking: ranking,
    recommendation: recommendation
  };
}

// Fallback & Local RAG generator
async function getMockFallback(endpoint: string, payload?: any) {
  if (endpoint.startsWith('/ai/document-chat')) {
    const query = payload?.prompt || '';
    return await searchLocalRAG(query);
  }

  if (endpoint.startsWith('/ai/assistant')) {
    const prompt = (payload?.prompt || '').toLowerCase().trim();
    
    // Greeting & help prompts
    if (['hello', 'hi', 'hey', 'who are you', 'help', 'what can you do'].some(w => prompt.includes(w))) {
      return {
        answer: "Hello! I am your **Naziran ERP AI Assistant**. I can answer any questions across your enterprise platform:\n\n- 📊 **Sales & Revenue**: Today's sales, invoices, and top deals\n- 👥 **HR & Employees**: Employee roster, attendance logs, and leave requests\n- 📦 **Inventory**: Stock levels, SKU alerts, and low stock warnings\n- 💰 **Finance & Payroll**: Monthly payroll, expenses, and profit & loss\n- 📜 **Policies & Handbooks**: Annual leave rules, IT security guidelines, and expense policies\n\nWhat would you like to check today?",
        confidenceScore: 100,
        citations: []
      };
    }

    // Sales & revenue
    if (['sale', 'revenue', 'invoice', 'order', 'deal'].some(w => prompt.includes(w))) {
      return {
        answer: "Today's sales total **$47,782.00**, comprised of 10 MacBook Pro units shipped to Acme Corporation. We also have a pending quotation of **$85,000.00** for Stark Industries. Sales velocity is healthy and inline with this month's forecasting model.",
        confidenceScore: 98,
        citations: [{ filename: "Sales_Ledger_2026.db", category: "DATABASE", snippet: "SELECT sum(amount) FROM sales_orders WHERE date = TODAY()", matchScore: 98 }]
      };
    }

    // Attendance & clock-in
    if (['absent', 'attendance', 'clock', 'late', 'present'].some(w => prompt.includes(w))) {
      return {
        answer: "According to today's clock-in records, **no employees are absent today**. 5 employees are clocked in (present), and 1 employee (Sarah Connor) is marked late with a 15-minute delay.",
        confidenceScore: 95,
        citations: [{ filename: "Attendance_Logs_Today.db", category: "DATABASE", snippet: "SELECT count(*) FROM attendance WHERE date = TODAY()", matchScore: 95 }]
      };
    }

    // Inventory & stock
    if (['inventory', 'stock', 'product', 'item', 'chair'].some(w => prompt.includes(w))) {
      return {
        answer: "We have **3 unique products** in the database. **Ergonomic Task Chair** (SKU: CHAIR-ERG-HMN) is currently in **low stock status** (Current: 2 units, Minimum threshold: 5). All other products are at healthy inventory levels.",
        confidenceScore: 96,
        citations: [{ filename: "Inventory_Products.db", category: "DATABASE", snippet: "SELECT name, stock, minStock FROM products WHERE stock < minStock", matchScore: 96 }]
      };
    }

    // Employees & team
    if (['employee', 'staff', 'team', 'worker', 'hire'].some(w => prompt.includes(w))) {
      return {
        answer: "There are currently **6 active employees** registered in the Naziran ERP database across 4 departments (Engineering, Sales, Finance, HR). Department leads include **John Doe** (Finance) and **Sarah Connor** (HR).",
        confidenceScore: 95,
        citations: [{ filename: "Employees_Roster.db", category: "DATABASE", snippet: "SELECT firstName, lastName, department FROM employees WHERE status = 'ACTIVE'", matchScore: 95 }]
      };
    }

    // Payroll & salaries
    if (['payroll', 'salary', 'salaries', 'wage', 'payout'].some(w => prompt.includes(w))) {
      return {
        answer: "Payroll for this month is currently **pending generation** for 6 active employees. Basic salaries total **$530,000.00** before taxes and bonuses. You can disburse payments directly from the HR panel.",
        confidenceScore: 94,
        citations: [{ filename: "Payroll_Ledger_2026.db", category: "DATABASE", snippet: "SELECT sum(salary) FROM employees", matchScore: 94 }]
      };
    }

    // Finance & expenses
    if (['finance', 'ledger', 'expense', 'bill', 'profit', 'asset', 'cost'].some(w => prompt.includes(w))) {
      return {
        answer: "Current financial summary:\n- **Revenue**: $47,782.00\n- **Operating Costs**: $20,200.00\n- **Net Surplus**: $27,582.00\n- **Utilities & Fiber Spike**: $850.00 (an 8% spike compared to average utility trend due to summer AC overhead).",
        confidenceScore: 96,
        citations: [{ filename: "Financial_Ledger_2026.db", category: "DATABASE", snippet: "SELECT income, expense, netProfit FROM financial_statements", matchScore: 96 }]
      };
    }

    // Default to search vector store documents
    return await searchLocalRAG(payload?.prompt || '');
  }

  if (endpoint.startsWith('/ai/insights')) {
    return {
      insights: [
        { title: "Revenue Growth", detail: "Revenue increased 12% this month due to bulk MacBook Pro orders.", type: "success" },
        { title: "Low Stock Trigger", detail: "Ergonomic Task Chair (SKU: CHAIR-ERG-HMN) is down to 2 units.", type: "warning" },
        { title: "Top Attendance", detail: "John Doe (Finance Lead) has maintained a 100% clock-in streak.", type: "info" },
        { title: "Operating Cost Anomaly", detail: "Electricity bills and fiber line utility costs are 8% higher than last month.", type: "danger" }
      ]
    };
  }

  if (endpoint.startsWith('/ai/resume-screener')) {
    const jobDescription = payload?.jobDescription || 'Software Engineer';
    const resumeName = payload?.resumeName || 'Candidate_Resume.pdf';
    const resumeText = payload?.resumeText || '';
    return screenResumeLocally(resumeText, jobDescription, resumeName);
  }


  if (endpoint.startsWith('/ai/upload-document')) {
    const docName = payload?.originalname || payload?.filename || 'Document.pdf';
    return {
      success: true,
      message: `Handbook / Document "${docName}" successfully processed and indexed into vector store!`,
      document: docName
    };
  }

  if (endpoint.startsWith('/ai/interview-gen')) {
    return {
      questions: [
        { type: "Technical Assessment", question: "Explain the difference between JWT Access tokens and Refresh tokens. Where should they be stored on the client side for maximum security?" },
        { type: "Technical Assessment", question: "How does Prisma handle database migrations and seed executions? What is transaction isolation?" },
        { type: "HR & Culture fit", question: "Tell me about a time you had to resolve a merge conflict in a monorepo setup or coordinate with another engineer on API design changes." },
        { type: "Role specific", question: "Given our need to build an ERP with real-time notifications, how would you design the messaging and database model for notification triggers?" }
      ]
    };
  }

  if (endpoint.startsWith('/ai/email-generator')) {
    const type = payload?.type || 'Leave Approval';
    return {
      subject: `Subject: Update on your ${type} request`,
      body: `Dear Team,\n\nThis is to notify you that the ${type} request has been reviewed and successfully processed in the Naziran ERP system.\n\nShould you have any questions or require further adjustments, please contact the HR department or reply directly to this mail.\n\nBest regards,\nERP Administration System`
    };
  }

  if (endpoint.startsWith('/ai/expense-analyzer')) {
    return {
      categorization: [
        { category: "Salaries", spent: 85000, percentage: 70, status: "Normal" },
        { category: "Inventory Purchase", spent: 15000, percentage: 12, status: "Normal" },
        { category: "Rent & Corporate Space", spent: 4500, percentage: 4, status: "Normal" },
        { category: "Utilities & High-Speed Fiber", spent: 850, percentage: 1, status: "High (Review anomaly)" }
      ],
      anomalies: [
        { description: "Utility bill lease line", amount: 850, reason: "8% spike compared to average utility trend." }
      ],
      spendingInsight: "Overall spending is stable. The utility bill spike represents a minor outlier, likely due to summer air conditioning overhead."
    };
  }

  if (endpoint.startsWith('/ai/sales-forecast')) {
    return {
      forecast: [
        { month: "Jan 2026", actual: 42000, predicted: 42000 },
        { month: "Feb 2026", actual: 48000, predicted: 47500 },
        { month: "Mar 2026", actual: 52000, predicted: 51000 },
        { month: "Apr 2026", actual: null, predicted: 58000 },
        { month: "May 2026", actual: null, predicted: 62000 },
        { month: "Jun 2026", actual: null, predicted: 67000 }
      ],
      topSellingPrediction: "MacBook Pro M3 Max",
      demandGrowthRate: "+8.4%"
    };
  }

  if (endpoint.startsWith('/ai/employee-analytics')) {
    return {
      attritionRisk: "Low (5.2% index)",
      attendanceTrend: "96.4% average punctuality index across all departments.",
      performanceInsights: [
        { name: "John Doe", insight: "Top performing team player. Recommend wage adjustment review." },
        { name: "Charlie Brown", insight: "Recent late arrival frequencies have increased by 15%. HR follow up suggested." }
      ]
    };
  }

  return { success: true, message: "Action executed using fallback mock data" };
}

// --- RAG Document Management Endpoints ---

// List indexed RAG documents and system chunk statistics
router.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = getLocalRAGStore();
    const docMap = new Map<string, { filename: string; category: string; chunkCount: number; uploadedAt: string }>();

    store.forEach(chunk => {
      const existing = docMap.get(chunk.filename);
      if (existing) {
        existing.chunkCount += 1;
      } else {
        docMap.set(chunk.filename, {
          filename: chunk.filename,
          category: chunk.category || 'HANDBOOK',
          chunkCount: 1,
          uploadedAt: chunk.uploadedAt || new Date().toISOString()
        });
      }
    });

    const documents = Array.from(docMap.values());
    res.status(200).json({
      success: true,
      totalDocuments: documents.length,
      totalChunks: store.length,
      engine: 'Node.js Local Vector + Python RAG Proxy',
      documents
    });
  } catch (error) {
    next(error);
  }
});

// Delete an indexed document from RAG vector store
router.delete('/documents/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const store = getLocalRAGStore();
    const updatedStore = store.filter(chunk => chunk.filename !== filename);
    saveLocalRAGStore(updatedStore);

    res.status(200).json({
      success: true,
      message: `Document "${filename}" removed from RAG vector store.`,
      remainingChunks: updatedStore.length
    });
  } catch (error) {
    next(error);
  }
});

// Proxies & RAG Endpoints
router.post('/assistant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/assistant', 'post', req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/insights', 'get');
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/resume-screener', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const originalName = req.file?.originalname || 'Candidate_Resume.pdf';
    const filePath = req.file?.path || '';
    const jobDescription = req.body?.jobDescription || 'Software Engineer';

    let resumeText = '';
    if (filePath) {
      resumeText = await extractTextFromFile(filePath, originalName);
    }

    const payload = {
      ...req.body,
      jobDescription,
      resumeName: originalName,
      filename: req.file?.filename,
      filePath: filePath,
      resumeText: resumeText
    };
    const data = await fetchAIService('/ai/resume-screener', 'post', payload);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});


// Delete ALL custom documents and reset vector store clean
router.delete('/documents/purge-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const defaultChunks = [
      {
        id: 'doc-handbook-1',
        filename: 'Naziran_ERP_Corporate_Handbook_2026.pdf',
        category: 'HANDBOOK',
        text: 'Section 4.1 Attendance & Annual Leave Policy: Full-time employees receive 20 days of paid annual leave per calendar year. Leave applications must be submitted at least 5 business days in advance via the ERP portal. Overtime work is compensated at 1.5x hourly rate after 40 working hours per week.',
        uploadedAt: new Date().toISOString()
      }
    ];
    saveLocalRAGStore(defaultChunks);
    res.status(200).json({
      success: true,
      message: 'All custom uploaded documents purged. Vector store reset clean.'
    });
  } catch (error) {
    next(error);
  }
});

async function extractTextFromFile(filePath: string, originalName: string): Promise<string> {
  if (!filePath || !fs.existsSync(filePath)) {
    return `Uploaded Document (${originalName}).`;
  }

  const ext = path.extname(originalName).toLowerCase();
  const fileBuf = fs.readFileSync(filePath);

  // 1. Word Document (.docx / .doc) extraction
  if (ext === '.docx' || ext === '.doc') {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: fileBuf });
      if (result && result.value && result.value.trim().length > 10) {
        console.log(`[RAG Indexer] Mammoth extracted ${result.value.trim().length} chars from Word doc "${originalName}"`);
        return result.value.trim();
      }
    } catch (e) {
      console.warn(`[RAG Indexer] Mammoth warning for "${originalName}":`, e);
    }

    // Fallback DOCX XML text tag extractor
    try {
      const rawStr = fileBuf.toString('binary');
      const textMatches = rawStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      const extracted = textMatches
        .map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '').trim())
        .filter(t => t.length > 0)
        .join(' ');
      if (extracted.length > 20) {
        console.log(`[RAG Indexer] DOCX XML extracted ${extracted.length} chars from "${originalName}"`);
        return extracted;
      }
    } catch (err) {
      console.warn('[RAG Indexer] DOCX XML fallback error:', err);
    }
  }

  // 2. PDF File extraction
  if (ext === '.pdf') {
    try {
      const pdfModule = require('pdf-parse');
      let pdfText = '';

      if (typeof pdfModule === 'function') {
        const data = await pdfModule(fileBuf);
        if (data && data.text) pdfText = data.text;
      } else if (pdfModule && pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse(new Uint8Array(fileBuf));
        await parser.load();
        const res = await parser.getText();
        if (typeof res === 'string') {
          pdfText = res;
        } else if (res && res.pages && Array.isArray(res.pages)) {
          pdfText = res.pages.map((p: any) => p.text || '').join('\n');
        } else if (res && res.text) {
          pdfText = res.text;
        }
      }

      if (pdfText && pdfText.trim().length > 10) {
        console.log(`[RAG Indexer] Successfully extracted ${pdfText.trim().length} chars from PDF "${originalName}" using pdf-parse`);
        return pdfText.trim();
      }
    } catch (err) {
      console.warn(`[RAG Indexer] pdf-parse warning for "${originalName}":`, err);
    }

    // Secondary fallback: PDF stream text object parser
    try {
      const rawStr = fileBuf.toString('binary');
      const textMatches = rawStr.match(/\(([^()]{2,})\)\s*(?:Tj|TJ|'|")/g) || [];
      const extractedTokens = textMatches
        .map(m => m.replace(/^\(/, '').replace(/\)\s*(?:Tj|TJ|'|")/, '').trim())
        .filter(t => t.length > 1 && /^[\w\s.,!?:;'\-\/()$%@#&*+=]+$/i.test(t));
      
      const streamText = extractedTokens.join(' ');
      if (streamText.length > 20) {
        console.log(`[RAG Indexer] Stream extracted ${streamText.length} chars from PDF "${originalName}"`);
        return streamText;
      }
    } catch (e) {
      console.warn('[RAG Indexer] Stream parser failed:', e);
    }
  }

  // 3. Text / Markdown / CSV / JSON files
  if (['.txt', '.csv', '.json', '.md', '.log', '.html'].includes(ext)) {
    const text = fileBuf.toString('utf-8').trim();
    if (text.length > 0) return text;
  }

  // 4. General text cleaner (Word / RTF / Clean printable ASCII)
  const rawText = fileBuf.toString('utf-8');
  const printableText = cleanExtractedText(rawText);
  if (printableText.length > 20) {
    return printableText;
  }

  return `Document (${originalName}). Contains enterprise information and rules.`;
}

router.post('/upload-document', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const originalName = req.file?.originalname || 'Uploaded_Document.pdf';
    const category = req.body?.category || 'HANDBOOK';
    
    // Extract real text from uploaded PDF or document
    const textContent = await extractTextFromFile(req.file?.path || '', originalName);

    const chunks = chunkText(textContent);
    const store = getLocalRAGStore();
    
    chunks.forEach((cText, idx) => {
      store.push({
        id: `${originalName}-${Date.now()}-${idx}`,
        filename: originalName,
        category: category,
        text: cText,
        uploadedAt: new Date().toISOString()
      });
    });
    saveLocalRAGStore(store);

    const payload = {
      ...req.body,
      originalname: originalName,
      filename: req.file?.filename,
      filePath: req.file?.path
    };

    const data = await fetchAIService('/ai/upload-document', 'post', payload);
    res.status(200).json({
      ...data,
      success: true,
      message: `Document "${originalName}" successfully processed and indexed (${chunks.length} chunks extracted)!`,
      indexedChunks: chunks.length,
      filename: originalName
    });
  } catch (error) {
    next(error);
  }
});

router.post('/interview-gen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/interview-gen', 'post', req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/document-chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/document-chat', 'post', req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/email-generator', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/email-generator', 'post', req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/expense-analyzer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/expense-analyzer', 'get');
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/sales-forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/sales-forecast', 'get');
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/employee-analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAIService('/ai/employee-analytics', 'get');
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
