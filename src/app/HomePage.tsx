'use client';

import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="bg-[#0a0a0a] text-white px-5 py-10 flex flex-col gap-20">
      <section className="mt-8 md:mt-0 flex flex-wrap justify-center items-center gap-10 min-h-screen max-w-7xl mx-auto px-5 pt-10">
        {/* Headshot Image */}
        <div className="relative w-[20vw] h-[30vw] min-w-[267px] min-h-[400px] rounded-xl overflow-hidden shadow-md flex-shrink-0">
          <Image
            src="/headshot.jpg"
            alt="Spencer Wozniak headshot"
            fill
            className="object-cover rounded-xl"
          />
        </div>

        {/* Divider (hidden on small screens) */}

        {/* Text Section */}
        <div className="flex-1 max-w-xl border-l-2 border-[#bfaa8d50] px-8 min-w-[330px]">
          <h1 className="text-5xl font-bold mb-4">Spencer Wozniak</h1>
          <h2 className="text-2xl font-light text-gray-400 mb-5">Thinker, Builder, Mentor.</h2>
          <p className="text-lg leading-relaxed text-gray-300 mb-5">
            I’m a Catholic Christian, a relentless explorer of ideas, and a builder at heart.
            I’ve spent years exploring the intersection of AI and healthcare through years of hands-on research and work with patients across a wide range of settings.
          </p>
          <p className="text-lg leading-relaxed text-gray-300">
            After years spent in both clinical care and code, I’ve driven across the country to chase my dreams and I’m now building&nbsp;
            <a 
              href='https://www.serelora.com' 
              target='_blank' 
              className="text-[#bfaa8d] font-semibold underline"
            >
              a universal AI interface for doctors
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
