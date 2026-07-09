import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import Section from "../Section";
import { projects, githubProfile } from "../../data/content";

export default function DevProjects() {
  return (
    <Section id="projects" index="03" label="projects" title="Things I've built">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => (
          <motion.article
            key={project.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.06, ease: "easeOut" }}
            className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent"
          >
            <div className="aspect-[16/10] overflow-hidden bg-surface-2">
              <img
                src={project.image}
                alt={`${project.name} preview`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-ink">{project.name}</h3>
                <a
                  href={project.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${project.name} on GitHub`}
                  className="shrink-0 rounded-md text-ink-faint transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <Github size={18} />
                </a>
              </div>

              <p className="flex-1 text-sm leading-relaxed text-ink-soft">
                {project.description}
              </p>

              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
                {project.tech.map((tech) => (
                  <li
                    key={tech}
                    className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-soft"
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="mt-10 text-center">
        <a
          href={githubProfile}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 font-mono text-sm text-ink-soft transition-colors duration-200 hover:border-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          more on GitHub
          <ArrowRight size={15} />
        </a>
      </div>
    </Section>
  );
}
