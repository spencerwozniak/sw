import Image from 'next/image';
import { FiArrowUpRight } from 'react-icons/fi';
import { Button, Lede, Meta, Ruled } from '@/components/ui';
import projectsData from '@/data/projects.json';
import type { ProjectItem } from './ProjectCard';

export default function WorkHero() {
  const serelora = (projectsData as ProjectItem[]).find((p) => p.slug === 'serelora');

  return (
    <section className="pb-4 pt-14 sm:pt-24">
      {serelora && (
        <Meta as="p" sep="/" items={[serelora.category, serelora.year, serelora.role]} className="mb-6" />
      )}
      <div className="mb-9 w-full max-w-[440px]">
        <h1 className="m-0 -ml-[2.7%] leading-none">
          <Image
            src="/serelora-font-white.png"
            alt="Serelora"
            width={1280}
            height={256}
            priority
            className="mono-on-light h-auto w-full"
          />
        </h1>
      </div>
      <Ruled className="max-w-[600px]">
        <Lede className="mb-7">
          I&apos;m currently building <strong>Serelora</strong>, a startup that connects fragmented healthcare data and uses AI agents to take action on it.
        </Lede>
        <Button href="https://www.serelora.com/" iconRight={<FiArrowUpRight />}>Visit Serelora</Button>
      </Ruled>
    </section>
  );
}
