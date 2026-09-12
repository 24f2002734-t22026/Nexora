import type { Analysis, Candidate, JobSkill, SkillEvidence, VerificationAlert } from './types';

export const jobSkills: JobSkill[] = [
  { name: 'Python', priority: 'required', category: 'backend', matchingCount: 12, missingCount: 6 },
  { name: 'Angular', priority: 'required', category: 'frontend', matchingCount: 8, missingCount: 10 },
  { name: 'React', priority: 'required', category: 'frontend', matchingCount: 11, missingCount: 7 },
  { name: 'SQL', priority: 'required', category: 'database', matchingCount: 15, missingCount: 3 },
  { name: 'TypeScript', priority: 'required', category: 'technical', matchingCount: 12, missingCount: 6 },
  { name: 'AWS', priority: 'preferred', category: 'cloud', matchingCount: 6, missingCount: 12 },
  { name: 'Docker', priority: 'preferred', category: 'cloud', matchingCount: 8, missingCount: 10 },
];

export const candidates: Candidate[] = [
  {
    id: 'candidate_1',
    name: 'Rahul Sharma',
    title: 'Senior Software Engineer',
    email: 'rahul.sharma@example.com',
    phone: '+91 98451 22910',
    location: 'Bengaluru, India',
    rank: 1,
    finalScore: 94.0,
    semanticScore: 92.0,
    keywordScore: 96.0,
    requiredSkillsMatched: 5,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'Angular', 'React', 'SQL', 'TypeScript'],
    missingSkills: ['AWS', 'Docker'],
    experience: '3.5 years building resilient web services, single-page enterprise UIs, and relational data pipelines.',
    experienceYears: 3.5,
    explanation: 'Strong match because the candidate demonstrates Python, Angular, React and SQL across both listed skills and project/experience evidence. AWS experience is limited.',
    education: [
      { degree: 'B.Tech in Computer Science & Engineering', institution: 'National Institute of Technology Karnataka', year: '2022' }
    ],
    projects: [
      {
        title: 'Enterprise Fleet Monitoring Portal',
        description: 'Architected an Angular and TypeScript telemetry dashboard consuming real-time WebSocket feeds with RxJS state management.',
        technologies: ['Angular', 'TypeScript', 'RxJS', 'Python', 'FastAPI'],
        period: '2024'
      },
      {
        title: 'Distributed Analytics Pipeline',
        description: 'Built high-throughput SQL analytics jobs and internal React administrative consoles processing 4M+ daily events.',
        technologies: ['React', 'Python', 'PostgreSQL', 'SQL', 'Redis'],
        period: '2023 - 2024'
      }
    ],
    workHistory: [
      {
        company: 'CognitiveScale Systems',
        role: 'Full Stack Engineer',
        period: 'July 2023 – Present',
        highlights: [
          'Engineered Angular 16 micro-frontend applications integrated with Python FastAPI backend microservices.',
          'Optimized SQL query performance across Postgres partitions, reducing median latency by 42%.',
          'Coordinated TypeScript design systems used by 18 frontend engineers.'
        ]
      },
      {
        company: 'Apex Cloud Labs',
        role: 'Associate Software Engineer (Internship A)',
        period: 'January 2025 – June 2025',
        isOverlap: true,
        highlights: [
          'Contributed to customer onboarding React dashboards and internal billing tooling.',
          'Automated Python reporting scripts for database maintenance.'
        ]
      },
      {
        company: 'Vanguard Data Solutions',
        role: 'Research Intern (Internship B)',
        period: 'March 2025 – August 2025',
        isOverlap: true,
        highlights: [
          'Explored schema migrations and prototype Angular workflows for internal analysts.'
        ]
      }
    ],
    links: {
      linkedin: 'https://linkedin.com/in/rahul-sharma-dev',
      github: 'https://github.com/rahulsharma-core',
      portfolio: 'https://rahulsharma.dev'
    },
    externalEvidence: {
      githubRepos: ['angular-telemetry-portal', 'fastapi-event-streamer', 'sql-migration-runner'],
      detectedTech: ['Angular', 'TypeScript', 'Python', 'PostgreSQL', 'React'],
      profileHealth: 'Active contributor · 840+ contributions in the past 12 months'
    },
    verificationAlerts: [
      {
        id: 'alert_1_overlap',
        type: 'timeline_overlap',
        severity: 'warning',
        title: 'Potential internship timeline overlap detected',
        message: 'Internship at Apex Cloud Labs (Jan 2025 – Jun 2025) overlaps with Vanguard Data Solutions (Mar 2025 – Aug 2025). This may reflect simultaneous part-time engagements or an amended internship timeline, but should be verified during recruiter screening.',
        timelineDetails: 'Apex Cloud Labs (Jan 2025 – Jun 2025) vs Vanguard Data Solutions (Mar 2025 – Aug 2025)',
        reviewRecommended: true,
        impactOnScore: 0
      }
    ],
    verificationStatus: 'review_recommended',
    skillEvidence: {
      Python: {
        skill: 'Python',
        priority: 'required',
        level: 'strong',
        details: ['Listed in primary technical skills', 'Implemented in 2 production services', 'Extensive backend microservices experience at CognitiveScale'],
        yearsOfExperience: 3.5,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: true
      },
      Angular: {
        skill: 'Angular',
        priority: 'required',
        level: 'strong',
        details: ['Listed in technical skills', 'Used in Enterprise Fleet Portal project', 'Production Angular 16 micro-frontends with RxJS'],
        yearsOfExperience: 2.5,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: true
      },
      React: {
        skill: 'React',
        priority: 'required',
        level: 'strong',
        details: ['Listed in technical skills', 'Used in Distributed Analytics Pipeline project', 'Customer onboarding dashboards'],
        yearsOfExperience: 2.0,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: true
      },
      SQL: {
        skill: 'SQL',
        priority: 'required',
        level: 'strong',
        details: ['Listed in technical skills', 'PostgreSQL partition query optimization', 'Complex transactional relational models'],
        yearsOfExperience: 3.0,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: true
      },
      TypeScript: {
        skill: 'TypeScript',
        priority: 'required',
        level: 'strong',
        details: ['Strict typings across Angular and React projects', 'Maintained team design system types'],
        yearsOfExperience: 3.0,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: true
      },
      AWS: {
        skill: 'AWS',
        priority: 'preferred',
        level: 'limited',
        details: ['Listed in resume skills section only', 'No production project or commercial experience evidence found'],
        yearsOfExperience: 0.5,
        inProjects: false,
        inSkillsSection: true,
        inWorkHistory: false
      },
      Docker: {
        skill: 'Docker',
        priority: 'preferred',
        level: 'not_found',
        details: ['Skill not detected in resume or project descriptions', 'Insufficient evidence'],
        yearsOfExperience: 0,
        inProjects: false,
        inSkillsSection: false,
        inWorkHistory: false
      }
    }
  },
  {
    id: 'candidate_2',
    name: 'Arjun Kumar',
    title: 'Frontend Developer',
    email: 'arjun.kumar@example.com',
    phone: '+91 97312 44102',
    location: 'Mumbai, India',
    rank: 2,
    finalScore: 89.5,
    semanticScore: 88.0,
    keywordScore: 91.0,
    requiredSkillsMatched: 5,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Angular', 'TypeScript', 'React', 'SQL', 'Python'],
    missingSkills: ['AWS'],
    experience: '2.5 years specializing in Angular enterprise applications, responsive design systems, and REST integrations.',
    experienceYears: 2.5,
    explanation: 'Exceptional frontend depth with verified Angular and TypeScript production projects. Python and SQL are demonstrated in full stack courseworks and API consumer layers.',
    education: [
      { degree: 'B.E. in Information Technology', institution: 'VJTI Mumbai', year: '2023' }
    ],
    projects: [
      {
        title: 'HealthTech Provider Dashboard',
        description: 'Engineered high-performance Angular UI with NgRx store and TypeScript for 12,000 active clinical practitioners.',
        technologies: ['Angular', 'TypeScript', 'HTML5', 'CSS3', 'RxJS'],
        period: '2024'
      },
      {
        title: 'Inventory Ops Control',
        description: 'Contributed to React and Python Flask inventory system with relational PostgreSQL queries.',
        technologies: ['React', 'Python', 'SQL', 'PostgreSQL'],
        period: '2023'
      }
    ],
    workHistory: [
      {
        company: 'OmniHealth Digital',
        role: 'Frontend Engineer',
        period: 'August 2023 – Present',
        highlights: [
          'Developed key Angular workflows reducing clinical report loading time by 35%.',
          'Collaborated with product designers on WCAG 2.1 AA accessible UI components.'
        ]
      }
    ],
    links: {
      linkedin: 'https://linkedin.com/in/arjunkumar-ui',
      github: 'https://github.com/arjunkumar-dev'
    },
    externalEvidence: {
      githubRepos: ['angular-ngrx-starter', 'accessible-form-controls'],
      detectedTech: ['Angular', 'TypeScript', 'HTML', 'CSS', 'React'],
      profileHealth: 'Consistent commit history · Active open-source maintainer'
    },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Angular: {
        skill: 'Angular',
        priority: 'required',
        level: 'strong',
        details: ['Listed in skills', '2 production applications in healthtech', 'NgRx & RxJS master certification'],
        yearsOfExperience: 2.5,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: true
      },
      TypeScript: {
        skill: 'TypeScript',
        priority: 'required',
        level: 'strong',
        details: ['Core language in all frontend roles', 'Strict type configurations'],
        yearsOfExperience: 2.5,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: true
      },
      React: {
        skill: 'React',
        priority: 'required',
        level: 'moderate',
        details: ['Used in Inventory Ops Control project', 'Familiar with React Hooks and component state'],
        yearsOfExperience: 1.0,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: false
      },
      Python: {
        skill: 'Python',
        priority: 'required',
        level: 'moderate',
        details: ['Academic project backend with Flask', 'Listed in technical skills'],
        yearsOfExperience: 1.0,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: false
      },
      SQL: {
        skill: 'SQL',
        priority: 'required',
        level: 'moderate',
        details: ['Postgres schema queries in academic and contract projects'],
        yearsOfExperience: 1.5,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: false
      },
      Docker: {
        skill: 'Docker',
        priority: 'preferred',
        level: 'moderate',
        details: ['Local docker-compose workflows for development environments'],
        yearsOfExperience: 1.0,
        inProjects: true,
        inSkillsSection: true,
        inWorkHistory: false
      },
      AWS: {
        skill: 'AWS',
        priority: 'preferred',
        level: 'not_found',
        details: ['Skill not detected in resume', 'Insufficient evidence'],
        yearsOfExperience: 0,
        inProjects: false,
        inSkillsSection: false,
        inWorkHistory: false
      }
    }
  },
  {
    id: 'candidate_3',
    name: 'Maya Patel',
    title: 'Full Stack Engineer',
    email: 'maya.patel@example.com',
    phone: '+91 99801 77312',
    location: 'Pune, India',
    rank: 3,
    finalScore: 87.2,
    semanticScore: 89.0,
    keywordScore: 85.0,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 2,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'React', 'SQL', 'TypeScript', 'Docker', 'AWS'],
    missingSkills: ['Angular'],
    experience: '3 years building scalable cloud backend services in Python and interactive React dashboards on AWS.',
    experienceYears: 3.0,
    explanation: 'Outstanding cloud and backend capabilities with comprehensive AWS, Docker, and Python evidence. Angular is not detected in the resume; React is primary frontend framework.',
    education: [
      { degree: 'B.Tech in Computer Science', institution: 'COEP Technological University', year: '2022' }
    ],
    projects: [
      {
        title: 'Cloud Billing & Usage Aggregator',
        description: 'Serverless AWS Lambda and ECS data ingestion service writing to Aurora PostgreSQL.',
        technologies: ['Python', 'AWS', 'Docker', 'PostgreSQL', 'SQL'],
        period: '2023 - 2024'
      }
    ],
    workHistory: [
      {
        company: 'Strata Cloud Solutions',
        role: 'Full Stack Engineer',
        period: 'September 2022 – Present',
        highlights: [
          'Maintained CI/CD pipelines deploying containerized Python apps to AWS ECS.',
          'Built internal analytics dashboards in React with TypeScript.'
        ]
      }
    ],
    links: {
      linkedin: 'https://linkedin.com/in/mayapatel-tech',
      github: 'https://github.com/mayapatel'
    },
    externalEvidence: {
      githubRepos: ['aws-infra-terraform', 'react-metrics-board'],
      detectedTech: ['Python', 'AWS', 'Docker', 'React', 'TypeScript'],
      profileHealth: 'Active GitHub profile with verified cloud certifications'
    },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'strong', details: ['3 years core backend development', 'Lambda, FastAPI, async pipelines'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      React: { skill: 'React', priority: 'required', level: 'strong', details: ['Built production metrics boards', 'TypeScript integration'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'strong', details: ['Aurora PostgreSQL design & optimization'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'strong', details: ['Applied across React codebases'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Not found in resume', 'Candidate specializes in React'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'strong', details: ['Certified AWS Solutions Architect', 'ECS, Lambda, S3, RDS'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'strong', details: ['Containerized microservices production pipelines'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true }
    }
  },
  {
    id: 'candidate_4',
    name: 'Karthik Srinivasan',
    title: 'Software Developer',
    email: 'karthik.s@example.com',
    phone: '+91 94451 88201',
    location: 'Chennai, India',
    rank: 4,
    finalScore: 84.8,
    semanticScore: 85.0,
    keywordScore: 84.5,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Angular', 'TypeScript', 'SQL', 'Python', 'Docker'],
    missingSkills: ['React', 'AWS'],
    experience: '2.5 years of enterprise application development with Angular, Python, and SQL database management.',
    experienceYears: 2.5,
    explanation: 'Solid balance of Angular frontend development and Python data ingestion. Lacks direct React evidence; AWS is unevidenced.',
    education: [{ degree: 'B.Tech in Information Technology', institution: 'Anna University', year: '2023' }],
    projects: [
      {
        title: 'ERP Logistics Tracker',
        description: 'Real-time dispatch and shipment status tracking portal built with Angular 15 and PostgreSQL.',
        technologies: ['Angular', 'TypeScript', 'Python', 'SQL'],
        period: '2023 - 2024'
      }
    ],
    workHistory: [
      {
        company: 'LogiCore Systems',
        role: 'Software Developer',
        period: 'July 2023 – Present',
        highlights: ['Designed dynamic Angular forms and client-side data grids.', 'Wrote Python REST endpoints and automated SQL reporting queries.']
      }
    ],
    links: { linkedin: 'https://linkedin.com/in/karthik-srinivasan', github: 'https://github.com/karthiks-code' },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Angular: { skill: 'Angular', priority: 'required', level: 'strong', details: ['Key framework in current job', 'Built ERP UI modules'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'strong', details: ['Strict typings used daily'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Python: { skill: 'Python', priority: 'required', level: 'moderate', details: ['REST API endpoints and backend scripts'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'strong', details: ['Relational joins and index creation in Postgres'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'moderate', details: ['Used for local development container setups'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_5',
    name: 'Sofia Chen',
    title: 'Full Stack Engineer',
    email: 'sofia.chen@example.com',
    location: 'Remote, Singapore',
    rank: 5,
    finalScore: 82.6,
    semanticScore: 84.0,
    keywordScore: 80.5,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'React', 'SQL', 'TypeScript', 'Docker'],
    missingSkills: ['Angular', 'AWS'],
    experience: '3 years in modern web development, GraphQL API construction, and Python service integration.',
    experienceYears: 3.0,
    explanation: 'High semantic alignment on Python backend and React web applications. Angular experience is absent.',
    education: [{ degree: 'B.S. in Computer Science', institution: 'NUS Singapore', year: '2022' }],
    projects: [{ title: 'Fintech Transaction Portal', description: 'React single page app with Python GraphQL backend.', technologies: ['React', 'Python', 'SQL', 'Docker'] }],
    workHistory: [{ company: 'FinPulse Labs', role: 'Full Stack Engineer', period: '2022 – Present', highlights: ['Maintained payment dashboards and transactional APIs.'] }],
    links: { github: 'https://github.com/sofiachen-dev' },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'strong', details: ['Production microservices in FastAPI'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      React: { skill: 'React', priority: 'required', level: 'strong', details: ['Main frontend library in production'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'strong', details: ['Complex schema migrations in PostgreSQL'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'strong', details: ['All frontends written in TypeScript'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Insufficient evidence found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'moderate', details: ['Containerized local testing setups'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_6',
    name: 'Daniel Kim',
    title: 'Backend Developer',
    email: 'daniel.kim@example.com',
    location: 'Bengaluru, India',
    rank: 6,
    finalScore: 80.1,
    semanticScore: 78.0,
    keywordScore: 83.0,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 2,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'SQL', 'TypeScript', 'Angular', 'AWS', 'Docker'],
    missingSkills: ['React'],
    experience: '3 years architecting Python backends, high-performance database caching, and enterprise Angular portals.',
    experienceYears: 3.0,
    explanation: 'Deep backend and database engineering with verified Angular admin dashboard experience. No React evidence.',
    education: [{ degree: 'B.Tech in Computer Engineering', institution: 'IIIT Hyderabad', year: '2022' }],
    projects: [{ title: 'Order Fulfillment Router', description: 'Automated order matching engine in Python with SQL queues.', technologies: ['Python', 'SQL', 'Angular', 'AWS'] }],
    workHistory: [{ company: 'SupplyScale Inc.', role: 'Backend Engineer', period: '2022 – Present', highlights: ['Scaled Redis queues and automated Postgres indexing.'] }],
    links: { linkedin: 'https://linkedin.com/in/danielkim-dev' },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'strong', details: ['Core backend language across 3 years'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Angular: { skill: 'Angular', priority: 'required', level: 'moderate', details: ['Internal admin portal built with Angular'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'strong', details: ['PostgreSQL & MySQL optimization'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'moderate', details: ['Used for Angular portal types'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected in candidate profile'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'moderate', details: ['RDS and S3 deployment experience'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'moderate', details: ['Docker images for service deployment'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_7',
    name: 'Priya Nair',
    title: 'Web Application Engineer',
    email: 'priya.nair@example.com',
    location: 'Kochi, India',
    rank: 7,
    finalScore: 78.4,
    semanticScore: 81.0,
    keywordScore: 75.0,
    requiredSkillsMatched: 3,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['React', 'Angular', 'TypeScript', 'SQL'],
    missingSkills: ['Python', 'AWS', 'Docker'],
    experience: '2.5 years frontend and UI engineering across React, Angular, and relational SQL queries.',
    experienceYears: 2.5,
    explanation: 'Solid frontend capabilities across both major SPA frameworks (React and Angular). Python backend evidence is limited to academic scripts.',
    education: [{ degree: 'B.Tech in Computer Science', institution: 'CUSAT', year: '2023' }],
    projects: [{ title: 'Customer Support Desk', description: 'Dual frontend modules in Angular and React.', technologies: ['Angular', 'React', 'TypeScript', 'SQL'] }],
    workHistory: [{ company: 'Zeta Software', role: 'UI Developer', period: '2023 – Present', highlights: ['Engineered responsive client portals.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Angular: { skill: 'Angular', priority: 'required', level: 'strong', details: ['Enterprise ticket management UI'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      React: { skill: 'React', priority: 'required', level: 'strong', details: ['Customer support web app'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'strong', details: ['Types for UI state and API requests'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'moderate', details: ['Basic CRUD and join operations'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: false },
      Python: { skill: 'Python', priority: 'required', level: 'not_found', details: ['Insufficient evidence found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_8',
    name: 'Leo Martin',
    title: 'Platform & Cloud Engineer',
    email: 'leo.martin@example.com',
    location: 'Bengaluru, India',
    rank: 8,
    finalScore: 76.5,
    semanticScore: 74.0,
    keywordScore: 80.0,
    requiredSkillsMatched: 3,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 2,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'SQL', 'AWS', 'Docker'],
    missingSkills: ['Angular', 'React', 'TypeScript'],
    experience: '3 years in infrastructure automation, Python scripting, and cloud databases.',
    experienceYears: 3.0,
    explanation: 'Superb cloud and DevOps capabilities with AWS, Docker, and Python pipelines. Minimal frontend evidence.',
    education: [{ degree: 'B.E. in Information Science', institution: 'BMS College of Engineering', year: '2022' }],
    projects: [{ title: 'Terraform AWS Orchestrator', description: 'Infrastructure-as-code automation.', technologies: ['Python', 'AWS', 'Docker', 'SQL'] }],
    workHistory: [{ company: 'CloudOps Matrix', role: 'DevOps Engineer', period: '2022 – Present', highlights: ['Maintained Kubernetes clusters and AWS VPCs.'] }],
    links: { github: 'https://github.com/leomartin-ops' },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'strong', details: ['Automated deployment scripts and lambda handlers'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'strong', details: ['Postgres RDS tuning and automated backups'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'strong', details: ['VPC, EC2, ECS, IAM, CloudWatch'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'strong', details: ['Container registries and multi-stage builds'], yearsOfExperience: 3.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Not found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Not found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'not_found', details: ['Not found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_9',
    name: 'Aisha Khan',
    title: 'Full Stack Associate',
    email: 'aisha.khan@example.com',
    location: 'Hyderabad, India',
    rank: 9,
    finalScore: 73.8,
    semanticScore: 76.0,
    keywordScore: 71.0,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 0,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'Angular', 'React', 'SQL'],
    missingSkills: ['TypeScript', 'AWS', 'Docker'],
    experience: '2 years working across Python REST backends and dual Angular/React applications.',
    experienceYears: 2.0,
    explanation: 'Good foundation in both Angular and React alongside Python APIs. Cloud deployments have not been evidenced.',
    education: [{ degree: 'B.Tech in Computer Science', institution: 'JNTU Hyderabad', year: '2023' }],
    projects: [{ title: 'Vendor Management Hub', description: 'Angular 14 portal connecting to Python Flask service.', technologies: ['Angular', 'Python', 'SQL'] }],
    workHistory: [{ company: 'InnoTech Solutions', role: 'Junior Software Engineer', period: '2023 – Present', highlights: ['Created CRUD views and data validation forms.'] }],
    links: { linkedin: 'https://linkedin.com/in/aishakhan-dev' },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Angular: { skill: 'Angular', priority: 'required', level: 'strong', details: ['Vendor Management Hub core frontend'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Python: { skill: 'Python', priority: 'required', level: 'moderate', details: ['Flask services for backend data processing'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      React: { skill: 'React', priority: 'required', level: 'moderate', details: ['Internal utility web applications'], yearsOfExperience: 1.0, inProjects: true, inSkillsSection: true, inWorkHistory: false },
      SQL: { skill: 'SQL', priority: 'required', level: 'moderate', details: ['MySQL queries for vendor records'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'limited', details: ['Mentioned in skills, minimal usage detail'], yearsOfExperience: 0.5, inProjects: false, inSkillsSection: true, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_10',
    name: 'James Wilson',
    title: 'Software Engineer',
    email: 'james.wilson@example.com',
    location: 'Bengaluru, India',
    rank: 10,
    finalScore: 71.2,
    semanticScore: 69.0,
    keywordScore: 74.0,
    requiredSkillsMatched: 3,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'SQL', 'TypeScript', 'Docker'],
    missingSkills: ['Angular', 'React', 'AWS'],
    experience: '2 years backend engineering with Python, relational schemas, and container builds.',
    experienceYears: 2.0,
    explanation: 'Solid backend and SQL developer. Does not currently show Angular or React web framework experience.',
    education: [{ degree: 'B.S. in Software Engineering', institution: 'BITS Pilani', year: '2023' }],
    projects: [{ title: 'Document Search Indexer', description: 'Python full-text indexing service using PostgreSQL.', technologies: ['Python', 'SQL', 'Docker'] }],
    workHistory: [{ company: 'DataStream Technologies', role: 'Software Engineer', period: '2023 – Present', highlights: ['Developed microservice endpoints and SQL queries.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'strong', details: ['2 years production backend work'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'strong', details: ['PostgreSQL queries and indexes'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'limited', details: ['Listed in skills section'], yearsOfExperience: 0.5, inProjects: false, inSkillsSection: true, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'moderate', details: ['Dockerfile creation for backend tests'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_11',
    name: 'Nora Williams',
    title: 'Frontend & UI Developer',
    email: 'nora.w@example.com',
    location: 'Remote, India',
    rank: 11,
    finalScore: 68.0,
    semanticScore: 71.0,
    keywordScore: 65.0,
    requiredSkillsMatched: 3,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 0,
    preferredSkillsTotal: 2,
    matchedSkills: ['React', 'TypeScript', 'SQL'],
    missingSkills: ['Python', 'Angular', 'AWS', 'Docker'],
    experience: '2 years focusing on React component libraries, CSS architectures, and lightweight SQL queries.',
    experienceYears: 2.0,
    explanation: 'Competent React and TypeScript developer with high design fidelity. Lacks Python backend and Angular framework evidence.',
    education: [{ degree: 'B.Des & Minor in Computing', institution: 'NID Ahmedabad', year: '2023' }],
    projects: [{ title: 'SaaS Design System', description: 'Reusable React component kit with TypeScript.', technologies: ['React', 'TypeScript', 'CSS'] }],
    workHistory: [{ company: 'PixelWave Studio', role: 'UI Engineer', period: '2023 – Present', highlights: ['Created accessible design tokens and web forms.'] }],
    links: { portfolio: 'https://norawilliams.design' },
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      React: { skill: 'React', priority: 'required', level: 'strong', details: ['Design system and responsive interfaces'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'strong', details: ['Strictly typed React component props'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'limited', details: ['Basic queries for static site generation'], yearsOfExperience: 1.0, inProjects: false, inSkillsSection: true, inWorkHistory: false },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Python: { skill: 'Python', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_12',
    name: 'Vikram Singh',
    title: 'Junior Full Stack Developer',
    email: 'vikram.singh@example.com',
    location: 'Pune, India',
    rank: 12,
    finalScore: 65.5,
    semanticScore: 64.0,
    keywordScore: 67.0,
    requiredSkillsMatched: 3,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Angular', 'SQL', 'TypeScript', 'AWS'],
    missingSkills: ['Python', 'React', 'Docker'],
    experience: '1.5 years developing enterprise Angular web modules and cloud database schemas.',
    experienceYears: 1.5,
    explanation: 'Shows verified Angular and TypeScript usage in banking software projects. Python backend experience is missing.',
    education: [{ degree: 'B.E. in Computer Science', institution: 'MIT World Peace University', year: '2024' }],
    projects: [{ title: 'Banking Loan Calculator', description: 'Angular loan EMI calculator with SQL persistent audit log.', technologies: ['Angular', 'TypeScript', 'SQL'] }],
    workHistory: [{ company: 'Finserve IT', role: 'Junior Engineer', period: '2024 – Present', highlights: ['Maintained Angular components.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Angular: { skill: 'Angular', priority: 'required', level: 'strong', details: ['Main project framework in financial services'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'strong', details: ['Used across all Angular codebases'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'moderate', details: ['Transactional queries for loan records'], yearsOfExperience: 1.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'limited', details: ['Listed in resume skills'], yearsOfExperience: 0.5, inProjects: false, inSkillsSection: true, inWorkHistory: false },
      Python: { skill: 'Python', priority: 'required', level: 'not_found', details: ['Insufficient evidence in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_13',
    name: 'Elena Rossi',
    title: 'Data & Backend Analyst',
    email: 'elena.rossi@example.com',
    location: 'Remote, India',
    rank: 13,
    finalScore: 62.3,
    semanticScore: 66.0,
    keywordScore: 59.0,
    requiredSkillsMatched: 2,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'SQL', 'AWS'],
    missingSkills: ['Angular', 'React', 'TypeScript', 'Docker'],
    experience: '2 years in Python data processing pipelines and SQL warehouse querying.',
    experienceYears: 2.0,
    explanation: 'Strong data-layer credentials with Python and SQL. Missing modern frontend framework capabilities (neither Angular nor React found).',
    education: [{ degree: 'M.Sc in Data Science', institution: 'Chennai Mathematical Institute', year: '2023' }],
    projects: [{ title: 'Customer Churn Predictor', description: 'Python batch model exporting to SQL warehouse.', technologies: ['Python', 'SQL', 'AWS'] }],
    workHistory: [{ company: 'MetricsPro Analytics', role: 'Data Analyst', period: '2023 – Present', highlights: ['Wrote SQL queries for analytics dashboards.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'strong', details: ['Pandas, NumPy, script automation'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'strong', details: ['Data warehouse queries and window functions'], yearsOfExperience: 2.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'moderate', details: ['S3 data lake and Athena query execution'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: false },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Skill not detected in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_14',
    name: 'Omar Farouk',
    title: 'Software Developer',
    email: 'omar.farouk@example.com',
    location: 'Bengaluru, India',
    rank: 14,
    finalScore: 59.4,
    semanticScore: 57.0,
    keywordScore: 62.0,
    requiredSkillsMatched: 2,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'SQL', 'Docker'],
    missingSkills: ['Angular', 'React', 'TypeScript', 'AWS'],
    experience: '1.5 years enterprise software development with Python and relational databases.',
    experienceYears: 1.5,
    explanation: 'Good basic programming and database understanding. Frontend and cloud frameworks remain significant growth areas.',
    education: [{ degree: 'B.Tech in Information Technology', institution: 'Kerala University', year: '2024' }],
    projects: [{ title: 'Inventory API', description: 'Python REST API with PostgreSQL.', technologies: ['Python', 'SQL', 'Docker'] }],
    workHistory: [{ company: 'QuickServe Tech', role: 'Junior Developer', period: '2024 – Present', highlights: ['Wrote database migration scripts.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'moderate', details: ['REST API creation in FastAPI'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'moderate', details: ['Postgres relational schemas'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'limited', details: ['Basic container configuration'], yearsOfExperience: 0.5, inProjects: true, inSkillsSection: true, inWorkHistory: false },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Insufficient evidence found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Not found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_15',
    name: 'Sara Ahmed',
    title: 'UI Developer & Web Designer',
    email: 'sara.ahmed@example.com',
    location: 'Mumbai, India',
    rank: 15,
    finalScore: 55.7,
    semanticScore: 61.0,
    keywordScore: 50.0,
    requiredSkillsMatched: 2,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 0,
    preferredSkillsTotal: 2,
    matchedSkills: ['React', 'TypeScript'],
    missingSkills: ['Python', 'Angular', 'SQL', 'AWS', 'Docker'],
    experience: '1.5 years frontend web styling and React component implementation.',
    experienceYears: 1.5,
    explanation: 'Shows solid modern web styling and React components, but lacks backend (Python), database (SQL), and enterprise Angular signals.',
    education: [{ degree: 'B.Sc in Information Technology', institution: 'Mumbai University', year: '2024' }],
    projects: [{ title: 'Brand Landing Experience', description: 'React animated site with TypeScript.', technologies: ['React', 'TypeScript', 'CSS3'] }],
    workHistory: [{ company: 'Nova Creative Labs', role: 'Junior UI Engineer', period: '2024 – Present', highlights: ['Built landing page modules.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      React: { skill: 'React', priority: 'required', level: 'moderate', details: ['Component building and responsive design'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'moderate', details: ['Interface definitions for web props'], yearsOfExperience: 1.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Python: { skill: 'Python', priority: 'required', level: 'not_found', details: ['Not found in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Skill not detected in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      SQL: { skill: 'SQL', priority: 'required', level: 'not_found', details: ['Insufficient evidence'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_16',
    name: 'Ethan Brown',
    title: 'Support & Systems Engineer',
    email: 'ethan.brown@example.com',
    location: 'Bengaluru, India',
    rank: 16,
    finalScore: 52.8,
    semanticScore: 51.0,
    keywordScore: 55.0,
    requiredSkillsMatched: 2,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 1,
    preferredSkillsTotal: 2,
    matchedSkills: ['Python', 'SQL', 'Docker'],
    missingSkills: ['Angular', 'React', 'TypeScript', 'AWS'],
    experience: '2 years providing IT operations support, Linux administration, and Python automation.',
    experienceYears: 2.0,
    explanation: 'Basic system administration with Python scripts and SQL log queries. Limited web application framework experience.',
    education: [{ degree: 'B.Sc in Computer Science', institution: 'Christ University', year: '2023' }],
    projects: [{ title: 'Log Monitor Automation', description: 'Python script scraping server logs into SQL.', technologies: ['Python', 'SQL', 'Docker'] }],
    workHistory: [{ company: 'Apex IT Support', role: 'Support Specialist', period: '2023 – Present', highlights: ['Automated routine file backups.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      Python: { skill: 'Python', priority: 'required', level: 'moderate', details: ['System automation and bash interop'], yearsOfExperience: 2.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      SQL: { skill: 'SQL', priority: 'required', level: 'moderate', details: ['Log analysis and simple queries'], yearsOfExperience: 1.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'limited', details: ['Running containerized support services'], yearsOfExperience: 1.0, inProjects: true, inSkillsSection: true, inWorkHistory: false },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_17',
    name: 'Meera Iyer',
    title: 'Graduate Trainee Engineer',
    email: 'meera.iyer@example.com',
    location: 'Chennai, India',
    rank: 17,
    finalScore: 48.6,
    semanticScore: 52.0,
    keywordScore: 45.0,
    requiredSkillsMatched: 1,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 0,
    preferredSkillsTotal: 2,
    matchedSkills: ['SQL'],
    missingSkills: ['Python', 'Angular', 'React', 'TypeScript', 'AWS', 'Docker'],
    experience: '1 year academic foundation in database management and object-oriented software principles.',
    experienceYears: 1.0,
    explanation: 'Entry-level candidate with basic SQL database coursework. Requires training across modern frontend and backend stacks.',
    education: [{ degree: 'B.Tech in Computer Science', institution: 'SRM Institute', year: '2024' }],
    projects: [{ title: 'Library Catalog System', description: 'Academic database project.', technologies: ['SQL', 'Java'] }],
    workHistory: [{ company: 'Infotech Campus Trainee', role: 'Graduate Engineer Trainee', period: '2024 – Present', highlights: ['Completed foundational programming modules.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      SQL: { skill: 'SQL', priority: 'required', level: 'moderate', details: ['Academic coursework and library schema design'], yearsOfExperience: 1.0, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Python: { skill: 'Python', priority: 'required', level: 'not_found', details: ['Not detected in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  },
  {
    id: 'candidate_18',
    name: 'Ishita Verma',
    title: 'Software Intern',
    email: 'ishita.verma@example.com',
    location: 'Noida, India',
    rank: 18,
    finalScore: 39.5,
    semanticScore: 42.0,
    keywordScore: 37.0,
    requiredSkillsMatched: 1,
    requiredSkillsTotal: 5,
    preferredSkillsMatched: 0,
    preferredSkillsTotal: 2,
    matchedSkills: ['SQL'],
    missingSkills: ['Python', 'Angular', 'React', 'TypeScript', 'AWS', 'Docker'],
    experience: '6 months internship exposure to HTML, basic scripting, and database entry.',
    experienceYears: 0.5,
    explanation: 'Initial internship experience with basic web markup and SQL queries. Significant skill gaps across core requirements for a Senior role.',
    education: [{ degree: 'B.C.A in Computer Applications', institution: 'Amity University', year: '2025' }],
    projects: [{ title: 'Student Management Form', description: 'Simple HTML form with relational database entry.', technologies: ['HTML', 'SQL'] }],
    workHistory: [{ company: 'StartSphere Technologies', role: 'Web Intern', period: 'January 2025 – Present', highlights: ['Assisted in frontend form entry.'] }],
    links: {},
    verificationAlerts: [],
    verificationStatus: 'verified',
    skillEvidence: {
      SQL: { skill: 'SQL', priority: 'required', level: 'limited', details: ['Simple SELECT statements and data entry'], yearsOfExperience: 0.5, inProjects: true, inSkillsSection: true, inWorkHistory: true },
      Python: { skill: 'Python', priority: 'required', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Angular: { skill: 'Angular', priority: 'required', level: 'not_found', details: ['Skill not detected in resume'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      React: { skill: 'React', priority: 'required', level: 'not_found', details: ['Skill not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      TypeScript: { skill: 'TypeScript', priority: 'required', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      AWS: { skill: 'AWS', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false },
      Docker: { skill: 'Docker', priority: 'preferred', level: 'not_found', details: ['Not detected'], yearsOfExperience: 0, inProjects: false, inSkillsSection: false, inWorkHistory: false }
    }
  }
];

export const demoAnalysis: Analysis = {
  id: 'analysis_123',
  jobTitle: 'Senior Full Stack Engineer',
  jobDescriptionFileName: 'Full_Stack_Developer_JD.pdf',
  candidateCount: 18,
  status: 'completed',
  createdAt: 'Sep 12, 2026 · 10:42 AM',
  requiredSkills: jobSkills,
  candidates
};
