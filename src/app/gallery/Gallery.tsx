'use client';

import React, { useState, useEffect } from 'react';
import styles from './Gallery.module.css';
import galleryTabs from '@/data/gallery.json';

interface GalleryTab {
  id: string;
  name: string;
  images: { url: string; caption?: string }[];
}

const Gallery: React.FC = () => {
  const tabs: GalleryTab[] = galleryTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');
  const [currentIndex, setCurrentIndex] = useState(0);

  
  const activeImages = tabs.find((tab) => tab.id === activeTab)?.images || [];

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

  return (
      <main className={styles.pageWrap}>
        <div className={styles.mainGalleryWrap}>
          <div className={styles.modernTabs}>
            {tabs.map((tab) => (
              <span
                key={tab.id}
                className={`${styles.modernTab} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentIndex(0);
                }}
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
