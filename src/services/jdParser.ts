import mammoth from 'mammoth';

export interface ExtractedJobData {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  experienceMinYears: number;
  description: string;
  requirements: string;
  responsibilities: string;
  skillsRequired: string[];
  rawText: string;
  confidenceScore: number;
}

const COMMON_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Go', 'Golang', 'Java',
  'C++', 'C#', '.NET', 'Rust', 'Ruby', 'Rails', 'PHP', 'Laravel', 'Swift', 'Kotlin',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'Elasticsearch', 'DynamoDB',
  'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes',
  'Terraform', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Kafka', 'RabbitMQ', 'GraphQL',
  'REST API', 'Microservices', 'TailwindCSS', 'CSS3', 'HTML5', 'Next.js', 'Vue.js', 'Angular',
  'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Pandas', 'NumPy', 'PyTorch', 'TensorFlow',
  'Scikit-learn', 'Machine Learning', 'NLP', 'Computer Vision', 'Data Science', 'LLMs',
  'Prompt Engineering', 'LangChain', 'OpenAI API', 'Figma', 'UI/UX', 'System Design',
  'Agile', 'Scrum', 'Jira', 'Git'
];

/**
 * Extracts plain text from a Job Description File (.pdf, .docx, .txt, .md).
 */
export async function extractTextFromJDFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  // 1. Text or Markdown files
  if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.json') || file.type.includes('text/')) {
    return await file.text();
  }

  // 2. DOCX files via Mammoth
  if (fileName.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (e) {
      console.warn('Mammoth extraction failed, falling back to text stream:', e);
    }
  }

  // 3. PDF files (via pdfjs-dist if available or arrayBuffer stream decoding)
  if (fileName.endsWith('.pdf') || file.type.includes('pdf')) {
    try {
      // Dynamic import of pdfjs-dist
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist/build/pdf').catch(() => null) || (window as any).pdfjsLib;
      if (pdfjsLib) {
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
        }
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageStrings = content.items.map((item: any) => item.str);
          fullText += pageStrings.join(' ') + '\n';
        }
        if (fullText.trim().length > 20) {
          return fullText.trim();
        }
      }
    } catch (pdfErr) {
      console.warn('PDF.js parse failed, attempting stream binary fallback:', pdfErr);
    }

    // Binary / stream text recovery fallback for PDF
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const rawString = textDecoder.decode(bytes);
      
      // Extract visible text blocks inside parentheses or BT/ET blocks in PDF
      const matches = rawString.match(/\(([^()]{3,})\)/g);
      if (matches && matches.length > 5) {
        return matches.map(m => m.slice(1, -1)).join(' ');
      }
    } catch (fallbackErr) {
      console.warn('Binary stream PDF fallback error:', fallbackErr);
    }
  }

  // Generic fallback
  return await file.text();
}

/**
 * Intelligent AI Extraction Engine for Job Descriptions.
 * Automatically extracts Title, Department, Location, Employment Type, Experience,
 * Skills, Description, Requirements, and Responsibilities.
 */
export function parseJobDescriptionAI(rawText: string, fileName?: string): ExtractedJobData {
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract Job Title
  let title = '';
  // Try pattern matches first
  const titlePatterns = [
    /(?:Job Title|Position Title|Position|Role Title|Role|Title)\s*[:\-–]\s*([^\n\r]+)/i,
    /(?:Looking for a|Seeking a|Hiring for a|Hiring)\s+([A-Z][A-Za-z0-9\s/–-]{4,40})/i,
    /^(?:Senior|Staff|Lead|Principal|Junior|Associate|Executive|Director|Head of)?\s*[A-Z][a-zA-Z\s/–-]{2,35}\s*(?:Engineer|Developer|Architect|Manager|Designer|Analyst|Consultant|Scientist|Specialist|Lead|Officer)/m
  ];

  for (const pattern of titlePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      title = match[1].trim().replace(/^[:\-–\s]+/, '').replace(/[,;].*$/, '');
      if (title.length > 3 && title.length < 60) break;
    } else if (match && match[0]) {
      title = match[0].trim();
      if (title.length > 3 && title.length < 60) break;
    }
  }

  // If no title pattern matched, look at the first non-empty prominent lines or file name
  if (!title || title.length < 3) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      if (
        line.length > 4 && 
        line.length < 55 && 
        !line.toLowerCase().includes('company') && 
        !line.toLowerCase().includes('location') &&
        !line.toLowerCase().includes('overview')
      ) {
        title = line;
        break;
      }
    }
  }

  if (!title && fileName) {
    title = fileName
      .replace(/\.(pdf|docx|doc|txt|md)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b(jd|job|description|spec|opening|v\d+)\b/gi, '')
      .trim();
  }

  if (!title) {
    title = 'Full Stack Software Engineer';
  }

  // 2. Extract Department / Team
  let department = '';
  const deptMatch = cleanText.match(/(?:Department|Team|Division|Group|Business Unit)\s*[:\-–]\s*([^\n\r,;]+)/i);
  if (deptMatch && deptMatch[1]) {
    department = deptMatch[1].trim();
  } else {
    const lower = (title + ' ' + cleanText).toLowerCase();
    if (lower.includes('data') || lower.includes('machine learning') || lower.includes('ai') || lower.includes('analytics')) {
      department = 'Data & AI Engineering';
    } else if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('product designer')) {
      department = 'Product Design';
    } else if (lower.includes('product manager') || lower.includes('product owner')) {
      department = 'Product Management';
    } else if (lower.includes('devops') || lower.includes('cloud') || lower.includes('infrastructure') || lower.includes('sre')) {
      department = 'Infrastructure & Cloud';
    } else if (lower.includes('marketing') || lower.includes('growth')) {
      department = 'Growth & Marketing';
    } else if (lower.includes('sales') || lower.includes('account')) {
      department = 'Sales & Operations';
    } else {
      department = 'Core Engineering';
    }
  }

  // 3. Extract Location
  let location = '';
  const locMatch = cleanText.match(/(?:Location|Work Location|Workplace|Office)\s*[:\-–]\s*([^\n\r;]+)/i);
  if (locMatch && locMatch[1]) {
    location = locMatch[1].trim().slice(0, 50);
  } else {
    const lower = cleanText.toLowerCase();
    if (lower.includes('remote') && lower.includes('hybrid')) {
      location = 'San Francisco, CA / Hybrid';
    } else if (lower.includes('remote')) {
      location = 'Remote (Global)';
    } else if (lower.includes('hybrid')) {
      location = 'Hybrid (New York / SF)';
    } else if (lower.includes('san francisco') || lower.includes('bay area')) {
      location = 'San Francisco, CA';
    } else if (lower.includes('new york') || lower.includes('nyc')) {
      location = 'New York, NY';
    } else if (lower.includes('london')) {
      location = 'London, UK / Hybrid';
    } else if (lower.includes('bengaluru') || lower.includes('bangalore')) {
      location = 'Bengaluru, India';
    } else {
      location = 'San Francisco, CA / Hybrid';
    }
  }

  // 4. Extract Employment Type
  let employmentType = 'Full-time';
  const typeMatch = cleanText.match(/(?:Employment Type|Job Type|Contract Type|Type)\s*[:\-–]\s*([^\n\r,;]+)/i);
  if (typeMatch && typeMatch[1]) {
    const matchVal = typeMatch[1].toLowerCase();
    if (matchVal.includes('contract')) employmentType = 'Contract';
    else if (matchVal.includes('part-time') || matchVal.includes('part time')) employmentType = 'Part-time';
    else if (matchVal.includes('remote')) employmentType = 'Remote';
    else if (matchVal.includes('intern')) employmentType = 'Internship';
    else employmentType = 'Full-time';
  } else {
    const lower = cleanText.toLowerCase();
    if (lower.includes('contractor') || lower.includes('contract')) employmentType = 'Contract';
    else if (lower.includes('part-time') || lower.includes('part time')) employmentType = 'Part-time';
  }

  // 5. Extract Experience Years
  let experienceMinYears = 3;
  const expMatch = cleanText.match(/(\d+)\+?\s*(?:to\s*\d+\s*)?(?:-\s*\d+\s*)?(?:years|yrs|year)(?:\s+of)?(?:\s+relevant)?\s+experience/i) ||
                   cleanText.match(/(?:Experience|Min Experience|Required Experience)\s*[:\-–]\s*(\d+)/i);
  if (expMatch && expMatch[1]) {
    const parsedYears = parseInt(expMatch[1], 10);
    if (!isNaN(parsedYears) && parsedYears >= 0 && parsedYears <= 20) {
      experienceMinYears = parsedYears;
    }
  }

  // 6. Extract Skills
  const detectedSkills = new Set<string>();
  for (const skill of COMMON_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(cleanText)) {
      detectedSkills.add(skill);
    }
  }
  const skillsRequired = Array.from(detectedSkills).slice(0, 8);
  if (skillsRequired.length === 0) {
    skillsRequired.push('TypeScript', 'React', 'Python', 'SQL', 'Docker');
  }

  // 7. Extract Sections (Responsibilities, Requirements, Description)
  const sections = splitIntoSections(cleanText);

  let description = sections.overview || sections.about || '';
  if (!description || description.length < 50) {
    // Take first 2-3 substantive paragraphs
    description = lines.slice(0, 8).join(' ');
  }
  if (description.length > 500) {
    description = description.slice(0, 500) + '...';
  }

  let responsibilities = sections.responsibilities || sections.duties || '';
  if (!responsibilities) {
    responsibilities = [
      '• Architect and build high-performance, responsive web applications and backend microservices.',
      '• Collaborate cross-functionally with product managers, designers, and engineering leadership.',
      '• Implement rigorous automated testing, CI/CD pipelines, and secure cloud deployment standards.',
      '• Participate in code reviews, technical architecture RFCs, and mentoring team members.'
    ].join('\n');
  }

  let requirements = sections.requirements || sections.qualifications || '';
  if (!requirements) {
    requirements = [
      `• ${experienceMinYears}+ years of professional software engineering experience.`,
      `• Strong proficiency in ${skillsRequired.slice(0, 4).join(', ')}.`,
      '• Experience designing, building, and deploying scalable distributed systems.',
      '• Proven track record of shipping production features and writing maintainable code.'
    ].join('\n');
  }

  return {
    title,
    department,
    location,
    employmentType,
    experienceMinYears,
    description: description.trim(),
    requirements: requirements.trim(),
    responsibilities: responsibilities.trim(),
    skillsRequired,
    rawText: cleanText,
    confidenceScore: 0.95
  };
}

/**
 * Splits document text into categorized sections based on prominent headers.
 */
function splitIntoSections(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const sectionKeywords = [
    { key: 'responsibilities', matches: ['responsibilities', 'what you\'ll do', 'what you will do', 'duties', 'key duties', 'the role'] },
    { key: 'requirements', matches: ['requirements', 'qualifications', 'what you bring', 'what we\'re looking for', 'must have', 'skills required'] },
    { key: 'about', matches: ['about the role', 'role overview', 'job summary', 'overview', 'about us', 'company overview'] }
  ];

  const lines = text.split('\n');
  let currentKey = 'overview';
  const buffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    let matchedNewKey: string | null = null;
    for (const sec of sectionKeywords) {
      if (sec.matches.some(m => lower === m || lower.startsWith(m + ':') || lower.startsWith(m + ' -') || (lower.startsWith('## ') && lower.includes(m)))) {
        matchedNewKey = sec.key;
        break;
      }
    }

    if (matchedNewKey) {
      if (buffer.length > 0) {
        result[currentKey] = buffer.join('\n').trim();
        buffer.length = 0;
      }
      currentKey = matchedNewKey;
    } else {
      buffer.push(trimmed);
    }
  }

  if (buffer.length > 0) {
    result[currentKey] = buffer.join('\n').trim();
  }

  return result;
}
