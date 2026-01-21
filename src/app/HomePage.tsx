"use client";

import Image from "next/image";
import NavButton from "@/components/NavButton";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="text-white px-5 flex flex-col gap-20 overflow-x-hidden relative">
      <section
        className="
          flex flex-col md:flex-row items-center gap-10
          min-h-screen w-full max-w-7xl mx-auto px-5
          relative
        "
      >
        {/* Image - Left Side */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="
            relative w-full aspect-square max-w-sm overflow-hidden mt-5
            md:w-[30vw] md:h-[45vw] md:aspect-[2/3] md:max-w-none md:shrink-0
          "
        >
          <Image
            src="/headshot-transparent.png"
            alt="Spencer Wozniak headshot"
            fill
            className="object-cover object-top"
            priority
          />
        </motion.div>

        {/* Text - Right Side */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="
            flex-1 w-full max-w-xl min-w-0 break-words
            border-t-2 border-[#bfaa8d50] pt-8
            md:border-t-0 md:border-l-2 md:pt-0 md:px-8 md:min-w-[330px]
            text-center md:text-left
          "
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            Spencer Wozniak
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-md font-light text-neutral-100 mb-4 leading-relaxed"
          >
            <div className="br">
              <h2 className="text-lg mb-2 italic">
                Behold the handmaid of the Lord;
                <br />
                be it unto me according to thy word.
              </h2>
              <h2 className="text-sm text-neutral-200 font-normal">
                — Luke 1:38
              </h2>
            </div>

            <p className="leading-relaxed text-white mt-4">
              I&apos;m a Catholic Christian, healthtech entrepreneur, and full-stack engineer
              focused on building reliable, explainable software for healthcare.
            </p>
            <p className="leading-relaxed text-white mt-4">
              My work sits at the intersection of clinical systems, data infrastructure,
              and applied AI, with a particular emphasis on EHRs, interoperability, and patient-centered design.
              Every system I build, model I design, and line of
              code I write is offered through the hands of Mary to Christ.
            </p>

            <p className="leading-relaxed text-white mt-4">
              My background spans clinical care, academic research, and software engineering.
              Through direct exposure to patients and healthcare workflows, it became clear
              that much of the suffering in modern healthcare is not clinical, but infrastructural.
            </p>

            <p className="leading-relaxed text-white mt-4">
              That realization redirected my path from medical school into building technology full-time.
              I drove across the country to found{" "}
              <a
                href="https://www.serelora.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="
                font-semibold text-[#ddd1c1]
                hover:text-[#bfaa8d]
                transition-colors duration-200 underline underline-offset-4
                decoration-2 decoration-[#bfaa8d50]
                hover:decoration-[#bfaa8d]
              "
              >
                Serelora
              </a>,
              a startup  building healthcare infrastructure that is trustworthy, explainable,
              and oriented toward human dignity.
            </p>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap md:flex-nowrap justify-center md:justify-start md:gap-5"
          >
            <NavButton
              to="/work"
              label="My Work"
              className="!text-[14px] !mt-5 md:!w-40"
            />
            <NavButton
              to="/writing/behold-i-make-all-things-new"
              label="My Story"
              className="!text-[14px] !mt-5 md:!w-40"
            />
            <NavButton
              to="/contact"
              label="Contact Me"
              className="!text-[14px] !mt-5 md:!w-40"
            />
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
