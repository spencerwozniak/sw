'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import WorkHero from '@/app/work/_components/WorkHero';
import Chatbot from '@/components/Chatbot';
import { ProjectCard, ProjectItem } from './_components/ProjectCard';
import projectsData from '@/data/projects.json';
import Resume from './resume';

export default function MyWorkPage() {
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);

  React.useEffect(() => {
    const allProjects = projectsData as ProjectItem[];
    setProjects(allProjects);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col text-gray-100 transition-colors duration-300"
    >
      <main>
        {/* Hero */}
        <WorkHero />

        {/* Projects Section */}
        <section className="py-20" id="projects">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mb-12 text-center"
            >
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">Projects</h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                A collection of projects I&apos;ve built, from startups to freelance work to personal experiments.
              </p>
            </motion.div>

            {/* Grid - 2 columns on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </motion.div>
          </div>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Resume />
        </motion.div>
      </main>

      <Chatbot />
    </motion.div>
  );
}
