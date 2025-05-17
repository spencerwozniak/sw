import React from 'react';
import styles from './DocumentEmbed.module.css';

interface DocumentEmbedProps {
  title?: string;
  description?: string;
  link: string;
  embedSrc: string;
}

const DocumentEmbed: React.FC<DocumentEmbedProps> = ({
  title = 'EXAMPLE STUDY PLAN',
  description = 'See an example of a personalized study plan made for a WozPrep student.',
  link,
  embedSrc,
}) => {
  return (
    <div className={styles.embedContainer}>
      <div className={styles.embedHeader}>
        <h3>{title}</h3>
        <p>{description}</p>
        <p>
          View in Google Docs:&nbsp;
          <a href={link} target="_blank" rel="noopener noreferrer">
            Click here
          </a>
        </p>
      </div>
      <iframe
        src={embedSrc}
        width="100%"
        height="700"
        frameBorder="0"
        title={title}
      ></iframe>
    </div>
  );
};

export default DocumentEmbed;
