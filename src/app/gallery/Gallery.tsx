'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './Gallery.module.css';
import galleryTabs from '@/data/gallery.json';

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

  const activeImages = shuffledImagesMap[activeTab] || [];

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
        [tabId]: shuffle(tabs.find(t => t.id === tabId)?.images || [])
      }));
    }

    // Pick a random start index for this tab
    const tabImages = shuffledImagesMap[tabId] || [];
    const randIndex = tabImages.length ? Math.floor(Math.random() * tabImages.length) : 0;
    setCurrentIndex(randIndex);
  };

  return (
    <main className={styles.pageWrap}>
      <div className={styles.mainGalleryWrap}>
        <div className={styles.modernTabs}>
          {tabs.map((tab) => (
            <span
              key={tab.id}
              className={`${styles.modernTab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.name}
            </span>
          ))}
        </div>

        <div className={styles.carouselWrapper}>
          <button className={`${styles.carouselArrow} ${styles.left}`} onClick={handlePrev}>
            ←
          </button>
          <div className={styles.carouselTrack}>
            {activeImages.map((image, index) => (
              <div
                key={index}
                className={`${styles.carouselSlide} ${index === currentIndex ? styles.active : ''}`}
              >
                <div className={styles.carouselImageContainer}>
                  <img
                    src={image.url.startsWith('http') ? image.url : `/gallery/${image.url}`}
                    alt={image.caption || `Slide ${index + 1}`}
                    className={styles.carouselImage}
                  />
                  {image.caption && <div className={styles.carouselCaption}>{image.caption}</div>}
                </div>
              </div>
            ))}
          </div>
          <button className={`${styles.carouselArrow} ${styles.right}`} onClick={handleNext}>
            →
          </button>
        </div>
      </div>
    </main>
  );
};

export default Gallery;
