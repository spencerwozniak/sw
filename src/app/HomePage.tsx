"use client";

import Image from "next/image";
import NavButton from "@/components/NavButton";

export default function HomePage() {
  return (
    <main className="bg-[#0a0a0a] text-white px-5 flex flex-col gap-20 overflow-x-hidden">
      <section
        className="
          flex flex-col md:flex-row items-center gap-10
          min-h-screen w-full max-w-7xl mx-auto px-5
        "
      >
        {/* Image */}
        <div
          className="
            relative w-full aspect-square max-w-sm overflow-hidden shadow-md
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
        </div>

        {/* Text */}
        <div
          className="
            flex-1 w-full max-w-xl min-w-0 break-words
            border-t-2 border-[#bfaa8d50] pt-8
            md:border-t-0 md:border-l-2 md:pt-0 md:px-8 md:min-w-[330px]
          "
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Spencer Wozniak
          </h1>
          <h2 className="text-md sm:text-lg font-light text-gray-400 mb-5">
            Behold the handmaid of the Lord; be it unto me according to thy
            word.
            <span className="font-thin"> — Luke 1:38</span>
          </h2>

          <p className="text-base sm:text-lg leading-relaxed text-gray-300 mb-5"></p>

          <p className="text-base sm:text-lg leading-relaxed text-gray-300 mb-5">
            I’m a Catholic Christian, a relentless explorer of ideas, and a
            builder at heart. Everything system I build, model I design, and
            line of code I write is offered through the hands of Mary to Christ.
          </p>

          <p className="text-base sm:text-lg leading-relaxed text-gray-300 mb-5">
            My background spans clinical care, academic research, and AI
            engineering. Working closely with patients and EHR systems, I
            realized how deeply people suffer from broken software and poor
            design.
          </p>

          <p className="text-base sm:text-lg leading-relaxed text-gray-300 mb-5">
            That experience ultimately pulled me out of the path of medical
            school and into software development, and I drove across the country
            to found{" "}
            <a href="https://www.serelora.com/" target="_blank">
              <strong>Serelora</strong>
            </a>
            , a B2B software studio dedicated to creating systems that empower
            people to spend less time fighting technology and more time serving
            others.
          </p>

          <div className="flex flex-wrap md:flex-nowrap justify-center md:justify-start md:gap-5">
            <NavButton
              to="https://www.serelora.com/"
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
          </div>
        </div>
      </section>
    </main>
  );
}
