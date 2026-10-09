'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import AnimatedDigit from './AnimatedDigit';
import { Container, Frame, FadeIn, Stat } from '@/components/ui';

// 🎯 Countdown target date
const TARGET_DATE = new Date('2025-09-01T00:00:00'); // example: July 1, 2025

function calculateTimeLeft(targetDate: Date) {
  const now = new Date();
  const totalSeconds = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));

  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export default function TimerPage() {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(TARGET_DATE));

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = calculateTimeLeft(TARGET_DATE);
      setTimeLeft(updated);

      if (
        updated.days === 0 &&
        updated.hours === 0 &&
        updated.minutes === 0 &&
        updated.seconds === 0
      ) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pt-14 sm:pt-20">
        <div className="mx-auto max-w-[max(20rem,calc((100svh-19rem)*1.7778))]">
          <Frame aspect="16/9">
            <Image
              src="/images/sf-background.jpg"
              alt="San Francisco background"
              fill
              priority
              sizes="(max-width: 1240px) 100vw, 1200px"
              className="object-cover object-[10%_center]"
            />
          </Frame>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-10">
          <Stat value={<AnimatedDigit value={timeLeft.days} />} label="days" />
          <Stat value={<AnimatedDigit value={timeLeft.hours} />} label="hours" />
          <Stat value={<AnimatedDigit value={timeLeft.minutes} />} label="min" />
          <Stat value={<AnimatedDigit value={timeLeft.seconds} />} label="sec" />
        </div>
      </Container>
    </FadeIn>
  );
}
