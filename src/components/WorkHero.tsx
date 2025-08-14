import Image from "next/image";
import NavButton from "./NavButton";

type WorkHeroProps = {
  bgSrc: string;                // e.g. "/hero-gold.jpg"
  bgAlt?: string;
  // Optional: tweak overlay strength without touching the code
  tintClassName?: string;       // e.g. "bg-amber-900/40"
};

export default function WorkHero({
  bgSrc = "/gold-bg.jpg",
  bgAlt = "Hero background",
  tintClassName = "bg-amber-900/40", // gold tint strength
}: WorkHeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-black">
      {/* Background image */}
      <Image
        src={bgSrc}
        alt={bgAlt}
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover object-center select-none pointer-events-none"
      />

      {/* Overlays (tint + glow + readability gradient) */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* Gold tint across the entire photo */}
        <div className={`absolute inset-0 ${tintClassName} mix-blend-multiply`} />

        {/* Soft golden glow accents */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[90rem] h-[90rem] rounded-full blur-3xl opacity-25
                        bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]
                        from-[#F6E7B2]/90 via-[#DCC48E]/50 to-transparent" />
        <div className="absolute -bottom-40 right-[-10%] w-[60rem] h-[60rem] rounded-full blur-3xl opacity-20
                        bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]
                        from-[#C7A86D]/90 via-[#BFAA8D]/50 to-transparent" />

        {/* Optional: subtle golden grid on top of the photo */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay
                        bg-[radial-gradient(circle_at_center,rgba(246,231,178,0.16)_0%,rgba(191,170,141,0.08)_38%,transparent_60%)]
                        bg-[size:28px_28px]" />
        <div className="absolute inset-0 opacity-30 mix-blend-overlay
                        bg-[linear-gradient(to_right,rgba(191,170,141,0.18)_1px,transparent_1px),
                            linear-gradient(to_bottom,rgba(191,170,141,0.12)_1px,transparent_1px)]
                        bg-[size:28px_28px]" />

        {/* Readability gradient (darkens edges, keeps center clear) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8 pt-24 pb-12 text-center">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-x-2 rounded-full border border-amber-200/40 bg-amber-100/10 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-200/30">
            My Work
          </span>
        </div>

        <div className="mt-5 max-w-3xl mx-auto">
          <h1 className="block font-bold text-white text-4xl md:text-5xl">
            Building Software to Change the World.
          </h1>
          <p className="mt-4 text-lg text-gray-200">
            I build fast, clean, and reliable software for businesses that are changing the world.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <NavButton to="/contact" label="Start a project" className="!w-50" />
        </div>
      </div>
    </section>
  );
}
