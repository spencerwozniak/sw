// ArticleBrowser.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './ArticleBrowser.module.css';

interface Article {
  id: string;
  title: string;
  date: string;
  name: string;
  contents: string;
  topic?: string;
}

interface Props {
  itemsPerPage?: number;
  data: Article[];
  showSearchBar?: boolean;
}

export default function ArticleBrowser({ itemsPerPage = 6, data, showSearchBar }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return data.filter((article) => {
      const searchText = `${article.title} ${article.contents} ${article.topic ?? ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }, [query, data]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleFirst = () => setPage(1);
  const handleLast = () => setPage(totalPages);
  const handlePrev = () => setPage(prev => Math.max(1, prev - 1));
  const handleNext = () => setPage(prev => Math.min(totalPages, prev + 1));

  return (
    <div className={`${styles.container} px-4`}>
      {showSearchBar !== false && (
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      )}

      <div className={styles.list}>
        {paginated.map((article) => {
          const isDOI = article.id.startsWith('10.');
          const href = isDOI ? `https://doi.org/${article.id}` : `/writing/${article.id}`;

          return (
            <Link
              key={article.id}
              href={href}
              className={styles.card}
              target={isDOI ? '_blank' : undefined}
              rel={isDOI ? 'noopener noreferrer' : undefined}
            >
              <h2 className={styles.cardTitle}>{article.title}</h2>
              <p className={styles.cardTopic}>{article.name}</p>
              <p className={styles.cardMeta}>{article.topic} | {article.date}</p>
              <p className={styles.cardSnippet}>
                {article.contents.replace(/<[^>]+>/g, '').slice(0, 200)}...
              </p>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className={styles.paginationWrapper}>
          <button
            className={`${styles.pageButton} ${styles.pageButtonLetter} ${page === 1 ? styles.disabled : ''}`}
            onClick={handleFirst}
            disabled={page === 1}
          >
            &lt;&lt;<p>First</p>
          </button>
          <button
            className={`${styles.pageButton} ${styles.pageButtonLetter} ${page === 1 ? styles.disabled : ''}`}
            onClick={handlePrev}
            disabled={page === 1}
          >
            &lt;<p>Prev</p>
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`${styles.pageButton} ${styles.pageButtonNumber} ${page === i + 1 ? styles.active : ''}`}
            >
              {i + 1}
            </button>
          ))}

          <button
            className={`${styles.pageButton} ${styles.pageButtonLetter} ${page === totalPages ? styles.disabled : ''}`}
            onClick={handleNext}
            disabled={page === totalPages}
          >
            <p>Next</p>&gt;
          </button>
          <button
            className={`${styles.pageButton} ${styles.pageButtonLetter} ${page === totalPages ? styles.disabled : ''}`}
            onClick={handleLast}
            disabled={page === totalPages}
          >
            <p>Last</p>&gt;&gt;
          </button>
        </div>
      )}
    </div>
  );
}
