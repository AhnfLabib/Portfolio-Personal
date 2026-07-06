import { motion } from "framer-motion";
import { Github } from "lucide-react";
import Section from "./Section";
import { projects, githubProfile, type Project } from "../data/content";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
      className="neu-raised rounded-3xl p-5 flex flex-col"
    >
      <div className="neu-inset rounded-2xl p-2 mb-4">
        <img
          src={project.image}
          alt={`${project.name} preview`}
          loading="lazy"
          className="rounded-xl aspect-video object-cover w-full"
        />
      </div>

      <h3 className="font-bold text-lg text-ink mb-2">{project.name}</h3>

      <p className="text-sm text-ink-soft leading-relaxed flex-grow mb-4">
        {project.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {project.tech.map((tag) => (
          <span
            key={tag}
            className="neu-inset-sm rounded-full px-3 py-1 text-xs font-semibold text-ink-faint"
          >
            {tag}
          </span>
        ))}
      </div>

      <div>
        <a
          href={project.github}
          target="_blank"
          rel="noopener noreferrer"
          className="neu-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ink hover:text-accent"
        >
          <Github size={15} />
          View Project
        </a>
      </div>
    </motion.div>
  );
}

export default function Projects() {
  return (
    <Section id="projects" label="Selected work" title="Projects">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {projects.map((project) => (
          <ProjectCard key={project.github} project={project} />
        ))}
      </motion.div>

      <div className="mt-12 flex justify-center">
        <a
          href={githubProfile}
          target="_blank"
          rel="noopener noreferrer"
          className="neu-btn inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-ink hover:text-accent"
        >
          <Github size={16} />
          See More Projects
        </a>
      </div>
    </Section>
  );
}
