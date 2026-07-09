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
  { label: "Crafts", href: "#crafts" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

export const hero = {
  name: "Ahnaf Labib",
  // Dev-facing roles only; the artistic hats live in the creative persona.
  rolesDev: [
    "An Undergraduate Student",
    "An Aspiring Software Engineer",
    "An Aspiring Front-end Designer",
    "An iDTech SDE Instructor",
    "A Former GDSC Lead",
  ],
  tagline: "CS @ DePauw · SWE intern @ Tenzer · building LLM pipelines by day.",
} as const;

export const about = {
  image: "/assets/ahnafLabib.png",
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
    logo: "/assets/TNZR.png",
    title: "Software Development Intern",
    org: "Tenzer Technology Center",
    duration: "Aug 2025 – Present",
    description:
      "Scraped over 5,000 forum contents using Python and BeautifulSoup to train LLMs on author styles, improving precision by 41%. Engineered NLP pipelines with Scikit-learn, the OpenAI API, and Supabase, reducing style-analysis runtime by 36%. Deployed a Flask + Supabase AI agent that automated generation tasks and cut manual editing workload by 58%.",
  },
  {
    logo: "/assets/idtech-logo.png",
    title: "Software Development Instructor",
    org: "iD Tech",
    duration: "Feb 2025 – Present",
    description:
      "Taught one-on-one lessons to more than 49 students worldwide in Python, Java, and C++, with 86% successfully completing individual software projects. Designed over 22 applied AI and Machine Learning projects that improved average grades by 51%. Guided students in building chatbots with AWS Lex, Bedrock, and the OpenAI API, reducing debugging cycles by 34%.",
  },
  {
    logo: "/assets/CDI.png",
    title: "Software Engineering Intern",
    org: "Center for Diversity & Inclusion",
    duration: "May 2024 – Present",
    description:
      "Built a student profile database in Firebase with 448 entries from 31 regions, enhancing event planning and outreach. Formulated more than 22 responsive media queries that reduced cross-device load times by 36% and boosted engagement by 47%. Engineered an AI chatbot with LangChain that supported over 98 student interactions, contributing to a 23% increase in international enrollment.",
  },
  {
    logo: "/assets/HDSTRT.png",
    title: "Software Development Fellow",
    org: "Headstarter",
    duration: "Jul 2024 – Sep 2024",
    description:
      "Engineered seven AI projects in six weeks using Python, Django, NextJS, OpenAI, and AWS while following agile methods. Developed three RAG-based web scrapers integrated with Ollama and GPT-4 for high-speed real-time data extraction. Enhanced front-end interfaces by applying Hick's UI/UX principle, increasing user accessibility by 46%.",
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

export const quote = {
  text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  author: "Will Durant",
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
 * ------------------------------------------------------------------ */

/** A run of text that can be italicized and/or tinted with the accent color. */
export interface TextSegment {
  text: string;
  italic?: boolean;
  accent?: boolean;
}

/** Headlines/statements are modeled as lines of segments so the display font
 *  can mix roman and italic runs, and lay each line out on its own row. */
export const creativeHero: {
  eyebrow: string;
  headline: TextSegment[][];
  cta: string;
  marquee: string[];
} = {
  eyebrow: "The Artist",
  headline: [
    [{ text: "Ahnaf makes" }],
    [
      { text: "photographs", italic: true, accent: true },
      { text: ", " },
      { text: "music", italic: true, accent: true },
    ],
    [{ text: "& other beautiful things." }],
  ],
  cta: "See the gallery",
  marquee: [
    "PHOTOGRAPHY",
    "MUSIC",
    "DESIGN",
    "STORYTELLING",
    "35MM",
    "LIGHT",
    "GRAIN",
  ],
};

export type CraftIcon = "Camera" | "Music" | "PenTool";

export interface Craft {
  title: string;
  description: string;
  icon: CraftIcon;
  link: string;
}

export interface GalleryItem {
  title: string;
  medium: string;
  /** Optional — drop a file in public/assets/gallery/ and set this to upgrade
   *  the tile from an abstract gradient to a real photograph. */
  image?: string;
  palette: [string, string];
}

export const creative: {
  statement: TextSegment[][];
  crafts: Craft[];
  gallery: GalleryItem[];
} = {
  statement: [
    [
      { text: "I chase the " },
      { text: "quiet in-between", italic: true, accent: true },
      { text: "—" },
    ],
    [{ text: "the half-second before a room" }],
    [
      { text: "remembers it's being " },
      { text: "watched", italic: true, accent: true },
      { text: "." },
    ],
  ],
  crafts: [
    {
      title: "Photography",
      description:
        "Shooting on grainy, warm-toned 35mm around Greencastle and wherever the light gets interesting. Portraits, streets, and the long golden hours in between.",
      icon: "Camera",
      link: "https://www.instagram.com/itsded_inside/",
    },
    {
      title: "Music",
      description:
        "A guitar, a loop pedal, and too many half-finished ideas. I play by feel — bending progressions until they say something I couldn't otherwise.",
      icon: "Music",
      link: "https://www.instagram.com/itsded_inside/",
    },
    {
      title: "Design",
      description:
        "Interfaces and small print pieces where typography does the heavy lifting. I like whitespace, restraint, and one loud gesture per page.",
      icon: "PenTool",
      link: "https://github.com/AhnfLabib",
    },
  ],
  gallery: [
    {
      title: "Golden Hour, Greencastle",
      medium: "35mm · 2025",
      palette: ["#e9a23b", "#8c3d15"],
    },
    {
      title: "Practice Room, 11 PM",
      medium: "Digital · 2025",
      palette: ["#3a3550", "#12101c"],
    },
    {
      title: "Frost on the Quad",
      medium: "35mm · 2024",
      palette: ["#cdd7e0", "#6d7f92"],
    },
    {
      title: "Six Strings, Soft Focus",
      medium: "35mm · 2025",
      palette: ["#c65a2e", "#40160c"],
    },
    {
      title: "Last Light, Highway 231",
      medium: "Digital · 2024",
      palette: ["#f0663c", "#3a1a2e"],
    },
    {
      title: "Stillness, Studio Floor",
      medium: "35mm · 2025",
      palette: ["#b9a67f", "#4a4030"],
    },
    {
      title: "Neon After Rain",
      medium: "Digital · 2025",
      palette: ["#2e6c8c", "#0e1c26"],
    },
    {
      title: "Self, Overexposed",
      medium: "35mm · 2024",
      palette: ["#e7d3b0", "#9a6b3f"],
    },
  ],
};
