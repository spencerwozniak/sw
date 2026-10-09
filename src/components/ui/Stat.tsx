import React from 'react';
import { Meta } from './Meta';

export function Stat({ value, label }: { value: React.ReactNode; label: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="font-serif text-[clamp(2.5rem,2rem+2vw,3.5rem)] font-semibold leading-none text-fg tabular-nums">
        {value}
      </div>
      <Meta as="div" className="mt-2">
        {label}
      </Meta>
    </div>
  );
}
