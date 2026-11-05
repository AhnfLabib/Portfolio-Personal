import { about, education, experience, hero, leadership, projects, socials } from "../src/data/content.js";

const RULES = [
  "You are an assistant on Ahnaf Labib's portfolio website, answering questions typed into its terminal.",
  "Answer only questions about Ahnaf's work, education, skills, projects and how to contact him.",
  "Answer in at most 120 words.",
  "Use plain text only: no markdown, and no lists unless the visitor asks for one.",
  "If the question is about anything else, reply in one sentence that you can only talk about Ahnaf, and suggest typing `help`.",
  "Never invent facts that are not in the context below. If you are unsure, say so.",
].join("\n");

/** Lines from Ahnaf's resume that the site content does not carry. No phone number. */
const RESUME_FACTS = [
  "Education: DePauw University, Bachelor's in Computer Science, graduation May 2026, cumulative GPA 3.77, CS GPA 3.80.",
  "Awards: Top 3 at NCAA Final Four Analytics Challenge; Best Performing iD Tech Intern; Best Tenzer SDE Intern.",
  "Languages: Python, JavaScript, TypeScript, Java, SQL, Swift, C++, C, HTML, CSS.",
  "Software: Visual Studio Code, AWS, Lex, Bedrock, RDS, Firebase, Supabase, Jupyter, Figma, Claude Code, Swing.",
  "Frameworks: ReactJS, VueJS, NextJS, NodeJS, Django, DynamoDB, Scikit-learn.",
  "Location: Indianapolis, IN.",
  "Email: ahnaflabib212@gmail.com. LinkedIn: linkedin.com/in/ahnaflabib2026. GitHub: github.com/AhnfLabib. Website: ahnaflabib.com.",
].join("\n");

const timeline = (entries: { title: string; org: string; duration: string; description: string }[]) =>
  entries.map((e) => `- ${e.title}, ${e.org} (${e.duration}): ${e.description}`).join("\n");

function buildFacts(): string {
  return [
    `Name: ${hero.name}. ${hero.tagline}`,
    `About:\n${about.paragraphs.join("\n")}`,
    `Core stack: ${about.stack.join(", ")}.`,
    `Experience:\n${timeline(experience)}`,
    `Projects:\n${projects.map((p) => `- ${p.name} (${p.tech.join(", ")}): ${p.description} Code: ${p.github}`).join("\n")}`,
    `Education (site): ${education.school}, ${education.location}. ${education.degree}, ${education.minor}. ${education.description}`,
    `Leadership:\n${timeline(leadership)}`,
    `Links: ${socials.map((s) => `${s.label} ${s.href.replace(/^mailto:/, "")}`).join("; ")}.`,
    `Resume:\n${RESUME_FACTS}`,
  ].join("\n\n");
}

export function buildSystemPrompt(): string {
  return `${RULES}\n\nContext about Ahnaf:\n\n${buildFacts()}`;
}
