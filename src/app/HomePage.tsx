'use client';

import Image from 'next/image';
import NavButton from '@/components/NavButton';

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
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Spencer Wozniak</h1>
          <h2 className="text-xl sm:text-2xl font-light text-gray-400 mb-5">
            Code. Care. Christ.
          </h2>

          <p className="text-base sm:text-lg leading-relaxed text-gray-300 mb-5">
            I’m a Catholic Christian, a relentless explorer of ideas, and a builder at heart.
            I’ve spent years exploring the intersection of AI and healthcare through years of hands-on research and work with patients across a wide range of settings.
          </p>

          <p className="text-base sm:text-lg leading-relaxed text-gray-300">
            After years spent in both clinical care and code, I drove across the country to chase my dreams.
            I now help businesses, from local restaurants to multi-million-dollar brands, build <strong>fast, modern websites that bring their story to life and convert visitors into customers</strong>.{' '}
            Alongside this, I am also developing{' '}
            <a
              href="https://www.serelora.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#bfaa8d] font-semibold underline break-words"
            >
              a universal AI interface for doctors
            </a>{' '}
            to improve how care is delivered at scale.
          </p>

          <div className="flex flex-wrap md:flex-nowrap justify-center md:justify-start md:gap-5">
            <NavButton to="/work" label="See my Work" className="!text-[14px] !mt-5 md:!w-40" />
            <NavButton to="/writing/behold-i-make-all-things-new" label="Read my Story" className="!text-[14px] !mt-5 md:!w-40" />
            <NavButton to="/contact" label="Get in touch" className="!text-[14px] !mt-5 md:!w-40" />
          </div>
        </div>
      </section>
    </main>
  );
}
