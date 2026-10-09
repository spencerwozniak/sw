"use client";

import { FiChevronDown } from "react-icons/fi";
import {
  FaLinkedin,
  FaGithub,
  FaGraduationCap,
  FaYoutube,
  FaBook,
  FaEnvelope,
  FaInstagram,
} from "react-icons/fa";
import { FaThreads } from "react-icons/fa6";

import Chatbot from "@/components/Chatbot";
import CalendlyButton from "@/app/contact/_components/CalendlyButton";
import { Button, Container, FadeIn, List, ListRow, PageHeader, ScrollCue, Section } from "@/components/ui";
import { scrollToId } from "@/lib/scroll";

type ContactLink = {
  name: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
};

const CONNECT: ContactLink[] = [
  {
    name: "LinkedIn",
    desc: "Connect professionally",
    href: "https://www.linkedin.com/in/spencerwozniak/",
    icon: <FaLinkedin />,
  },
  {
    name: "Email",
    desc: "Shoot me an email",
    href: "mailto:hey@spencerwozniak.com",
    icon: <FaEnvelope />,
  },
];

const SOCIALS: ContactLink[] = [
  {
    name: "GitHub",
    desc: "See my code",
    href: "https://github.com/spencerwozniak",
    icon: <FaGithub />,
  },
  {
    name: "ResearchGate",
    desc: "View my publications",
    href: "https://www.researchgate.net/profile/Spencer-Wozniak",
    icon: <FaGraduationCap />,
  },
  {
    name: "YouTube",
    desc: "Watch my videos",
    href: "https://www.youtube.com/@spencerwozniak",
    icon: <FaYoutube />,
  },
  {
    name: "Goodreads",
    desc: "Track my reads",
    href: "https://www.goodreads.com/user/show/180143299-spencer-wozniak",
    icon: <FaBook />,
  },
  {
    name: "Threads",
    desc: "Read my thoughts",
    href: "https://www.threads.com/@spencer.wozniak",
    icon: <FaThreads />,
  },
  {
    name: "Instagram",
    desc: "See my life in photos",
    href: "https://instagram.com/spencer.wozniak",
    icon: <FaInstagram />,
  },
];

export default function ContactPage() {
  const scrollToContactMethods = () => scrollToId("contact-methods");

  return (
    <>
      <FadeIn>
        <Container as="main" width="text">
          <PageHeader
            title="Let's Connect"
            subtitle="Schedule a meeting or explore other ways to reach out"
            actions={
              <>
                <CalendlyButton variant="inline" />
                <Button
                  onClick={scrollToContactMethods}
                  aria-label="Scroll to contact methods"
                  iconRight={<FiChevronDown />}
                >
                  Other Ways to Connect
                </Button>
              </>
            }
          />
          <ScrollCue flush label="See more" targetId="contact-methods" buttonLabel="Scroll to contact methods" />

          <Section id="contact-methods" titleId="h-connect" title="Let's Connect">
            <List>
              {CONNECT.map((c) => (
                <ListRow
                  key={c.href}
                  href={c.href}
                  icon={c.icon}
                  title={c.name}
                  subline={c.desc}
                  sublineInline
                  external
                />
              ))}
            </List>
          </Section>

          <Section titleId="h-socials" title="Socials">
            <List>
              {SOCIALS.map((c) => (
                <ListRow
                  key={c.href}
                  href={c.href}
                  icon={c.icon}
                  title={c.name}
                  subline={c.desc}
                  sublineInline
                  external
                />
              ))}
            </List>
          </Section>
        </Container>
      </FadeIn>

      <Chatbot />
    </>
  );
}
