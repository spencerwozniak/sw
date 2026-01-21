import Image from "next/image";
import NavButton from "../../../components/NavButton";
import { FaChevronDown } from "react-icons/fa";

export default function WorkHero() {
  return (
    <section className="relative isolate overflow-hidden min-h-screen flex flex-col">
      {/* Content */}
      <div className="flex-1 flex items-center">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 w-full py-20 text-center">
          {/* Serelora Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/serelora-font-white.png"
              alt="Serelora"
              width={400}
              height={120}
              priority
              className="h-auto w-full max-w-md object-contain"
            />
          </div>

          {/* Description */}
          <div className="mt-8 max-w-3xl mx-auto space-y-6">
            <p className="text-xl md:text-2xl text-gray-200 leading-relaxed">
              I&apos;m currently building <strong className="text-white font-semibold">Serelora</strong>, a startup that&apos;s transforming how physicians interact with electronic health records.
            </p>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              We&apos;re building an AI-powered interface that makes EHRs actually usable—helping doctors spend less time on documentation and more time with patients.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center">
            <NavButton
              to="https://www.serelora.com/"
              label="Visit Serelora"
              className="!text-[14px] !mt-5 md:!w-40"
            />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-md text-neutral-300/50 font-medium mb-2">See more</span>
        <div className="animate-bounce">
          <FaChevronDown className="h-5 w-5 text-neutral-300/50" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
