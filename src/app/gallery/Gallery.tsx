'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import galleryTabs from '@/data/gallery.json';
import { Container, FadeIn, TabList, Tab, TabPanel, Frame, FrameSlide, IconButton } from '@/components/ui';

interface GalleryTab {
  id: string;
  name: string;
  images: { url: string; caption?: string }[];
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function resolve(url: string): string {
  return url.startsWith('http') ? url : `/gallery/${url}`;
}

const Gallery: React.FC = () => {
  const tabs: GalleryTab[] = galleryTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');
  const [shuffledImagesMap, setShuffledImagesMap] = useState<{ [tabId: string]: GalleryTab['images'] }>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Shuffle images on first mount
  useEffect(() => {
    const initialMap: { [tabId: string]: GalleryTab['images'] } = {};
    tabs.forEach((tab) => {
      initialMap[tab.id] = shuffle(tab.images);
    });
    setShuffledImagesMap(initialMap);

    // Set random initial index for the first tab
    const firstTabShuffled = initialMap[tabs[0].id] || [];
    setCurrentIndex(firstTabShuffled.length ? Math.floor(Math.random() * firstTabShuffled.length) : 0);
  }, [tabs]);

  const activeImages = useMemo(() => shuffledImagesMap[activeTab] || [], [shuffledImagesMap, activeTab]);

  useEffect(() => {
    const autoScroll = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeImages.length);
    }, 4000);
    return () => clearInterval(autoScroll);
  }, [activeImages]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeImages.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);

    // Shuffle if it hasn't been shuffled yet
    if (!shuffledImagesMap[tabId]) {
      setShuffledImagesMap((prevMap) => ({
        ...prevMap,
        [tabId]: shuffle(tabs.find((t) => t.id === tabId)?.images || []),
      }));
    }

    // Pick a random start index for this tab
    const tabImages = shuffledImagesMap[tabId] || [];
    const randIndex = tabImages.length ? Math.floor(Math.random() * tabImages.length) : 0;
    setCurrentIndex(randIndex);
  };

  const current = activeImages[currentIndex];
  const total = activeImages.length;

  const near = (i: number) => {
    if (!total) return false;
    const diff = Math.min((i - currentIndex + total) % total, (currentIndex - i + total) % total);
    return diff <= 1;
  };

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pt-14 sm:pt-20">
        <div className="mx-auto max-w-[max(20rem,calc((100svh-17rem)*1.5))]">
          <TabList label="Gallery">
            {tabs.map((t) => (
              <Tab
                key={t.id}
                selected={t.id === activeTab}
                onClick={() => handleTabChange(t.id)}
                id={`tab-${t.id}`}
                controls="gallery-panel"
              >
                {t.name}
              </Tab>
            ))}
          </TabList>
          <TabPanel id="gallery-panel" labelledBy={`tab-${activeTab}`} className="mt-6">
            <Frame aspect="3/2" caption={current?.caption} captionAside={total ? `${currentIndex + 1} / ${total}` : undefined}>
              {activeImages.map((img, i) => (
                <FrameSlide key={`${activeTab}-${img.url}`} active={i === currentIndex}>
                  {near(i) && (
                    <Image
                      src={resolve(img.url)}
                      alt={img.caption || `Slide ${i + 1}`}
                      fill
                      sizes="(max-width: 1240px) 100vw, 1200px"
                      className="object-cover"
                      unoptimized={img.url.startsWith('http')}
                    />
                  )}
                </FrameSlide>
              ))}
              <IconButton
                variant="surface"
                label="Previous image"
                icon={<span aria-hidden="true">←</span>}
                onClick={handlePrev}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2"
              />
              <IconButton
                variant="surface"
                label="Next image"
                icon={<span aria-hidden="true">→</span>}
                onClick={handleNext}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2"
              />
            </Frame>
          </TabPanel>
        </div>
      </Container>
    </FadeIn>
  );
};

export default Gallery;
