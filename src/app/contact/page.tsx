"use client";

import { motion } from "framer-motion";
import Chatbot from "@/components/Chatbot";
import CalendlyButton from "@/app/contact/_components/CalendlyButton";

import Image from "next/image";

import {
  FaLinkedin,
  FaGithub,
  FaGraduationCap,
  FaYoutube,
  FaBook,
  FaEnvelope,
  FaInstagram,
  FaChevronDown,
} from "react-icons/fa";

import { FaThreads } from "react-icons/fa6";

export default function ContactPage() {
  const scrollToContactMethods = () => {
    const element = document.getElementById("contact-methods");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="text-white flex flex-col transition-colors duration-300"
    >
      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="relative flex flex-col min-h-screen overflow-hidden w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col items-center justify-center text-center p-16 px-8 max-w-[800px] mx-auto w-full md:p-12 md:px-6"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-[3.5rem] md:text-[4.5rem] mb-6 text-center font-semibold tracking-tight leading-tight"
            >
              Let&apos;s Connect
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-xl md:text-2xl mb-12 opacity-80 font-light leading-relaxed max-w-[600px]"
            >
              Schedule a meeting or explore other ways to reach out
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col md:flex-row gap-6 items-center w-full max-w-[400px] md:max-w-[500px]"
            >
              <div className="w-full md:w-auto md:flex-1">
                <CalendlyButton variant="inline" />
              </div>
              <button
                onClick={scrollToContactMethods}
                className="inline-flex items-center justify-center gap-3 py-3.5 px-6 bg-transparent border border-white/20 rounded-2xl text-white text-[0.95rem] font-medium cursor-pointer transition-all duration-300 no-underline w-full md:w-auto md:flex-1 hover:bg-white/5 hover:border-white/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none group"
                aria-label="Scroll to contact methods"
              >
                <span>Other Ways to Connect</span>
                <FaChevronDown className="text-sm transition-transform duration-300 group-hover:translate-y-1" />
              </button>
            </motion.div>
          </motion.div>
          {/* Scroll Indicator */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-sm text-white/50 font-medium mb-2">See more</span>
            <button
              onClick={scrollToContactMethods}
              className="bg-transparent border-none cursor-pointer p-0 flex items-center justify-center transition-opacity duration-300 hover:opacity-80 focus:outline-none"
              aria-label="Scroll to contact methods"
            >
              <div className="animate-bounce">
                <FaChevronDown className="h-5 w-5 text-white/50" aria-hidden="true" />
              </div>
            </button>
          </div>
        </section>

        {/* Contact Methods Section */}
        <section
          id="contact-methods"
          className="w-full py-16 px-8 flex flex-col items-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl my-8 text-center font-semibold tracking-tight"
          >
            Let&apos;s Connect
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-8 w-full max-w-[900px] mx-auto"
          >
            <a
              href="https://www.linkedin.com/in/spencerwozniak/"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaLinkedin size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">LinkedIn</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  Connect professionally
                </p>
              </div>
            </a>
            <a
              href="mailto:hey@spencerwozniak.com"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaEnvelope size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">Email</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  Shoot me an email
                </p>
              </div>
            </a>
            <a
              href="https://www.serelora.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <Image
                src="/serelora-sun-white.png"
                alt="Serelora Logo"
                width={30}
                height={30}
                className="shrink-0 w-8 h-6 object-contain mt-1"
              />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">Serelora</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  Start a project
                </p>
              </div>
            </a>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl my-8 text-center font-semibold tracking-tight"
          >
            Socials
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-8 w-full max-w-[900px] mx-auto"
          >
            <a
              href="https://github.com/spencerwozniak"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaGithub size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">GitHub</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  See my code
                </p>
              </div>
            </a>
            <a
              href="https://www.researchgate.net/profile/Spencer-Wozniak"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaGraduationCap size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">ResearchGate</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  View my publications
                </p>
              </div>
            </a>
            <a
              href="https://www.youtube.com/@spencerwozniak"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaYoutube size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">YouTube</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  Watch my videos
                </p>
              </div>
            </a>
            <a
              href="https://www.goodreads.com/user/show/180143299-spencer-wozniak"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaBook size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">Goodreads</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  Track my reads
                </p>
              </div>
            </a>

            <a
              href="https://www.threads.com/@spencer.wozniak"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaThreads size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">Threads</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  Read my thoughts
                </p>
              </div>
            </a>
            <a
              href="https://instagram.com/spencer.wozniak"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white p-5 rounded-2xl bg-white/[0.035] transition-all duration-300 no-underline flex items-start gap-4 hover:bg-white/5"
            >
              <FaInstagram size={24} className="shrink-0 w-6 h-6 mt-1" />
              <div className="flex flex-col justify-center">
                <h2 className="m-0 text-[1.4rem] font-medium leading-tight">Instagram</h2>
                <p className="mt-1 text-[0.95rem] opacity-75 font-light leading-snug">
                  See my life in photos
                </p>
              </div>
            </a>
          </motion.div>
        </section>
      </main>

      <Chatbot />
    </motion.div>
  );
}
