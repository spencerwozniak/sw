'use client';

import { useEffect, useState } from 'react';
import AnimatedDigit from './AnimatedDigit';
import Image from 'next/image';

export default function TimerPage() {
  // 🎯 Set your countdown target date here
  const targetDate = new Date('2025-09-01T00:00:00'); // example: July 1, 2025

  function calculateTimeLeft(targetDate: Date) {
    const now = new Date();
    const totalSeconds = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
  
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
  
    return { days, hours, minutes, seconds };
  }
  
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));
  

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = calculateTimeLeft(targetDate);
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
  }, [targetDate]);
  

  return (

      <div className="relative min-h-[100vh] w-full">
        <Image
          src="/images/sf-background.jpg"
          alt="San Francisco background"
          layout="fill"
          objectFit="cover"
          objectPosition="10% center"
          priority
          className="z-0"
        />

        {/* Overlay with countdown timer */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/80 to-transparent flex items-center justify-center">
        <div className="flex gap-5 text-white text-center">
        <div>
            <AnimatedDigit value={timeLeft.days} />
            <div className="text-sm mt-1">days</div>
        </div>
        <div>
            <AnimatedDigit value={timeLeft.hours} />
            <div className="text-sm mt-1">hours</div>
        </div>
        <div>
            <AnimatedDigit value={timeLeft.minutes} />
            <div className="text-sm mt-1">min</div>
        </div>
        <div>
            <AnimatedDigit value={timeLeft.seconds} />
            <div className="text-sm mt-1">sec</div>
        </div>
        </div>

        </div>
      </div>
  );
}
