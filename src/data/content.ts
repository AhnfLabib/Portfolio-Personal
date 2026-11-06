export interface NavItem {
  label: string;
  href: string;
}

export const navDev: NavItem[] = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Education", href: "#education" },
  { label: "Leadership", href: "#leadership" },
  { label: "Contact", href: "#contact" },
];

export const navCreative: NavItem[] = [
  { label: "Statement", href: "#statement" },
  { label: "Rolls", href: "#rolls" },
  { label: "Music", href: "#music" },
  { label: "Contact", href: "#contact" },
];

export const hero = {
  name: "Ahnaf Labib",
  // Dev-facing roles only; the artistic hats live in the creative persona.
  rolesDev: [
    "An AI Solutions Engineer",
    "A Full-Stack Developer",
    "A DePauw CS Graduate",
    "A Former iD Tech Instructor",
    "A Former GDSC Tech Lead",
  ],
  tagline: "AI Solutions Engineer @ Bridge Builder Strategies · DePauw CS '26 · building agentic AI by day.",
} as const;

export const about = {
  image: "/assets/ahnafLabib.png",
  /** Illustrated headshot used only on the Artist (creative) page. */
  artistImage: "/assets/ahnafLabib-artist.jpg",
  paragraphs: [
    "Hi, I'm Ahnaf (Uh-Nuf) — a passionate creator blending technology, design, and innovation to craft meaningful experiences.",
    "As a Computer Science major at DePauw University, I thrive at the intersection of coding and creativity, building intuitive applications and impactful digital content. I've spearheaded social media campaigns, reimagined user interfaces for better engagement, and developed web applications that solve real-world problems. I also enjoy sharing my knowledge, mentoring peers to unlock the exciting potential of STEM.",
    "Outside of coding, I dive into my creative side — capturing moments through photography, jamming on the guitar, or unwinding with challenging action-adventure games like Lies of P and Sekiro. If you're curious about my photography and music, check out my Instagram, where I post regularly. I'd love to connect and hear your thoughts on my work — let's build something awesome together!",
  ],
  stack: [
    "Python",
    "TypeScript",
    "React",
    "Java",
    "C++",
    "Supabase",
    "Firebase",
    "AWS",
  ],
  instagram: "https://www.instagram.com/itsded_inside/",
} as const;

export const education = {
  logo: "/assets/depauw-logo.png",
  school: "DePauw University",
  url: "https://www.depauw.edu/",
  location: "Greencastle, Indiana",
  degree: "Bachelor of Arts in Computer Science",
  minor: "Minor in Philosophy",
  description:
    "Developing a strong foundation in problem-solving, critical thinking, and technical innovation. My education focuses on blending analytical rigor with creative exploration to address real-world challenges.",
} as const;

export interface TimelineEntry {
  logo: string;
  title: string;
  org: string;
  duration: string;
  description: string;
}

export const experience: TimelineEntry[] = [
  {
    logo: "/assets/BBS.png",
    title: "AI Solutions Engineer",
    org: "Bridge Builder Strategies",
    duration: "Jan 2026 – Present",
    description:
      "Pioneered the company's first agentic AI development lifecycle, shipping two projects with Claude Code and MCP integrations (Jira, Supabase, Vercel). Built a full-stack workforce intelligence system with NextJS and Supabase for 91 users, covering tasks, skills, and budget evaluation. Automated Jira ticket creation from Granola meeting transcripts with LLM + MCP agents, cutting sprint planning time by 74%. Architected a Fabric medallion Lakehouse that turns five public APIs into 103 decision-support KPIs for 92 Indiana counties.",
  },
  {
    logo: "/assets/TNZR.png",
    title: "Software Development Intern",
    org: "Tenzer Technology Center",
    duration: "Aug 2025 – May 2026",
    description:
      "Scraped over 5,000 forum contents using Python and BeautifulSoup to train LLMs on author styles, improving precision by 41%. Engineered NLP pipelines with Scikit-learn, the Claude API, and Supabase, cutting style-analysis runtime by 36%. Deployed a Flask + Supabase AI agent that automated content generation and reduced manual editing workload by 58%.",
  },
  {
    logo: "/assets/idtech-logo.png",
    title: "Software Development Instructor",
    org: "iD Tech",
    duration: "Feb 2025 – Dec 2025",
    description:
      "Taught one-on-one lessons to more than 49 students worldwide in Python, Java, and C++, with 86% completing individual software projects. Designed over 22 Machine Learning projects with Pandas, driving student satisfaction and improving average grades by 51%. Guided students in building chatbots with AWS services (Lex, Bedrock) and the Claude API, cutting debugging cycles by 34%.",
  },
  {
    logo: "/assets/CDI.png",
    title: "Software Engineering Intern",
    org: "Center for Diversity & Inclusion",
    duration: "May 2024 – May 2025",
    description:
      "Built a student profile database in Firebase with 448 entries from 31 regions, enhancing event planning and outreach efforts. Engineered an AI chatbot with LangChain that handled over 98 student interactions, contributing to a 23% increase in international enrollment.",
  },
  {
    logo: "/assets/HDSTRT.png",
    title: "Software Development Fellow",
    org: "Headstarter",
    duration: "Jul 2024 – Sep 2024",
    description:
      "Built seven AI projects in six weeks using Python, Django, NextJS, OpenAI, and AWS while following agile methods. Enhanced front-end interfaces with ReactJS and ShadCn components, increasing user accessibility by 46%.",
  },
];

export const leadership: TimelineEntry[] = [
  {
    logo: "/assets/du.png",
    title: "Social Media Chair",
    org: "Delta Upsilon (DePauw Chapter)",
    duration: "Aug 2024 – Present",
    description:
      "Strategized a seven-step content creation plan with a $400 budget to produce 12 impactful posts, resulting in 64% engagement growth. Revamped the chapter website using ReactJS and ShadCn, updating chapter and member information and boosting user activity by 57%.",
  },
  {
    logo: "/assets/GDSC.svg",
    title: "Tech Lead",
    org: "Google Developer's Student Club",
    duration: "Aug 2023 – May 2024",
    description:
      "Spearheaded Git version control and TensorFlow workshops, organizing eight study jams with 44 students while managing a $2,200 budget. Mentored four student groups for the Google Solution Challenge 2024, guiding them through development, troubleshooting, and collaboration.",
  },
  {
    logo: "/assets/du.png",
    title: "Secretary",
    org: "Delta Upsilon (DePauw Chapter)",
    duration: "Feb 2023 – Aug 2023",
    description:
      "Managed communications and records for a 64-member chapter, streamlining information flow between members and headquarters. Implemented efficient systems for record-keeping and financial management.",
  },
  {
    logo: "/assets/HRTMN.jpeg",
    title: "Lead",
    org: "The Jane and David Stone Civic Leadership Program",
    duration: "Aug 2022 – May 2023",
    description:
      "Automated more than 257 in-house bookkeeping tasks for a store using a Python and SQL script, reducing financial record errors by 95%. Built a Python and Pandas pipeline to collect geospatial data from over four miles of trails, enabling teams to optimize conservation efforts.",
  },
];

export interface Project {
  image: string;
  name: string;
  description: string;
  tech: string[];
  github: string;
}

export const projects: Project[] = [
  {
    image: "/assets/Q.png",
    name: "Q.",
    description:
      "Personal Quote Library app built with React, TypeScript, and Supabase. Features secure authentication, quote collection, smart search, daily inspiration, and sharing capabilities.",
    tech: ["React", "TypeScript", "Supabase", "Brevo"],
    github: "https://github.com/AhnfLabib/Q.",
  },
  {
    image: "/assets/nexevent.png",
    name: "NexEvent",
    description:
      "Event management app built with Vue.js and Vuetify. Features secure authentication, task tracking, and expense management with Firebase integration.",
    tech: ["Vue.js", "Firebase", "Vuetify"],
    github: "https://github.com/AhnfLabib/NexEvent",
  },
  {
    image: "/assets/page-friend.png",
    name: "Page Friend",
    description:
      "Modern free open library portal enabling students to browse and request books. Built with Vue.js and Pinia for efficient state management.",
    tech: ["Vue.js", "Pinia", "API"],
    github: "https://github.com/AhnfLabib/Page-Friend",
  },
  {
    image: "/assets/Iot.png",
    name: "IoT Anomaly Detection",
    description:
      "Python-based system achieving 94% accuracy in detecting anomalies in IoT networks using K-means clustering algorithms.",
    tech: ["Python", "ML", "IoT"],
    github: "https://github.com/AhnfLabib/Anomaly-Detection-ML",
  },
  {
    image: "/assets/simple.png",
    name: "SimplePlayer",
    description:
      "Minimalist iOS music player with essential playback features, built using Swift and AVFoundation for a clean user experience.",
    tech: ["Swift", "iOS", "AVFoundation"],
    github: "https://github.com/AhnfLabib/SimplePlayer",
  },
  {
    image: "/assets/ToDoList.png",
    name: "To-Do List Manager",
    description:
      "Task management application featuring search functionality and automatic file saving for enhanced productivity.",
    tech: ["Java", "File I/O", "UI Design"],
    github: "https://github.com/AhnfLabib/To-do-list",
  },
  {
    image: "/assets/weatherbuddy.png",
    name: "Weather Buddy",
    description:
      "Real-time weather application providing forecasts for 10,000+ cities worldwide using Node.js and weather APIs.",
    tech: ["Node.js", "JavaScript", "APIs"],
    github: "https://github.com/AhnfLabib/Weather-Buddy",
  },
];

export const contact = {
  formEndpoint:
    "https://script.google.com/macros/s/AKfycbwb-E9rJbvJl6Hod44RMHsqmZHx7Nf2Gi2OlaQvzI_8CAtMH7e7c5BDSO7qgCXc9wHa/exec",
} as const;

export const socials = [
  { label: "Email", href: "mailto:ahnaflabib212@gmail.com", icon: "mail" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/ahnaflabib2026/",
    icon: "linkedin",
  },
  { label: "GitHub", href: "https://github.com/AhnfLabib", icon: "github" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/itsded_inside/",
    icon: "instagram",
  },
] as const;

export const githubProfile = "https://github.com/AhnfLabib";

/* ------------------------------------------------------------------ *
 * Creative persona ("The Artist") content.
 * Frames and drafts are pasted from scripts/media-manifest.json.
 * ------------------------------------------------------------------ */

export interface Frame {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface Roll {
  id: string;
  title: string;
  frames: Frame[];
}

export interface Cover {
  title: string;
  artist: string;
  /** Instagram reel shortcode. */
  reel: string;
}

export interface Draft {
  title: string;
  src: string;
  month: string;
  /** Seconds. */
  duration: number;
}

export const creative: {
  hero: { image: Frame; line: string; cta: string };
  statement: string;
  /** Mono pills under the statement. */
  tags: string[];
  now: string;
  rolls: Roll[];
  music: {
    handle: string;
    url: string;
    line: string;
    covers: Cover[];
    drafts: Draft[];
    draftsLine: string;
  };
  contact: { headline: string };
} = {
  hero: {
    image: {
      src: "/gallery/hero.jpg",
      width: 2000,
      height: 1125,
      alt: "A total solar eclipse at the diamond-ring moment.",
    },
    line: "Indianapolis, IN · 35mm & digital · 2024–26",
    cta: "See the rolls",
  },
  statement:
    "I photograph what light does when nobody is posing: rooms at the end of the day, stages lit red, a street in fog, one eclipse. Between frames I play guitar.",
  tags: ["35mm", "Indianapolis", "slide guitar"],
  now: "shooting on 35mm around Indianapolis · learning slide guitar",
  rolls: [
    {
      id: "light",
      title: "Light",
      frames: [
        {
          src: "/gallery/r1-01.jpg",
          width: 1600,
          height: 900,
          alt: "The solar corona glowing around the moon during totality.",
        },
        {
          src: "/gallery/r1-02.jpg",
          width: 1600,
          height: 1226,
          alt: "A living room with a TV at golden hour, sunlight striping the wall.",
        },
        {
          src: "/gallery/r1-03.jpg",
          width: 1600,
          height: 900,
          alt: "A white cupola lit from inside at dusk, framed by trees.",
        },
        {
          src: "/gallery/r1-04.jpg",
          width: 1600,
          height: 1226,
          alt: "A dim living room with a glass coffee table and a checkered rug.",
        },
        {
          src: "/gallery/r1-05.jpg",
          width: 1600,
          height: 900,
          alt: "A porch with two rocking chairs beside a large oak trunk.",
        },
      ],
    },
    {
      id: "street",
      title: "Street",
      frames: [
        {
          src: "/gallery/r2-01.jpg",
          width: 1600,
          height: 900,
          alt: "A Dhaka metro platform under an “Uttara North” departure board.",
        },
        {
          src: "/gallery/r2-02.jpg",
          width: 1600,
          height: 900,
          alt: "A ONE WAY sign in fog at night.",
        },
        {
          src: "/gallery/r2-03.jpg",
          width: 1200,
          height: 1600,
          alt: "A fisheye view from a car window of a brick downtown block.",
        },
        {
          src: "/gallery/r2-04.jpg",
          width: 1600,
          height: 900,
          alt: "A blue Mercedes 560 SL on a highway at dusk, traffic cones ahead.",
        },
      ],
    },
    {
      id: "stage",
      title: "Stage",
      frames: [
        {
          src: "/gallery/r3-01.jpg",
          width: 1520,
          height: 853,
          alt: "A singer silhouetted against a red LED wall.",
        },
        {
          src: "/gallery/r3-02.jpg",
          width: 1600,
          height: 898,
          alt: "A band silhouetted against a red wall, the drummer mid-hit.",
        },
        {
          src: "/gallery/r3-03.jpg",
          width: 898,
          height: 1600,
          alt: "A guitarist bathed in blue light, eyes closed.",
        },
        {
          src: "/gallery/r3-04.jpg",
          width: 1600,
          height: 898,
          alt: "A guitarist and a saxophonist backlit by stage beams.",
        },
      ],
    },
    {
      id: "portrait",
      title: "Portrait",
      frames: [
        {
          src: "/gallery/r4-01.jpg",
          width: 1200,
          height: 1600,
          alt: "Half a face in sunglasses whose lens is inked with chess taunts.",
        },
      ],
    },
  ],
  music: {
    handle: "@labib.onrecord",
    url: "https://www.instagram.com/labib.onrecord/",
    line: "Covers, recorded in one take, and drafts of my own.",
    covers: [
      { title: "Lover, You Should've Come Over", artist: "Jeff Buckley", reel: "DfWL_P3x3Cs" },
      { title: "Tuyo", artist: "Rodrigo Amarante", reel: "Des9G6mOc-7" },
      { title: "Love Ain't Always So Good", artist: "", reel: "DefxSxpNfCp" },
    ],
    drafts: [
      { title: "Fog", src: "/audio/fog.mp3", month: "", duration: 44 },
      { title: "Untitled 1", src: "/audio/untitled-1.mp3", month: "", duration: 53 },
      { title: "Dragonfly", src: "/audio/dragonfly.mp3", month: "", duration: 18 },
    ],
    draftsLine: "unfinished, on purpose",
  },
  contact: {
    headline: "Say hello.",
  },
};
