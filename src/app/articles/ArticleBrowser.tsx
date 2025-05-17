'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './ArticleBrowser.module.css';
import articles from './articles.json';

interface Props {
  itemsPerPage?: number;
}

export default function ArticleBrowser({ itemsPerPage = 6 }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return articles.filter((article) => {
      const searchText = `${article.title} ${article.contents}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }, [query]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Articles</h1>

      <input
        type="text"
        className={styles.searchBar}
        placeholder="Search articles..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
      />

      <div className={styles.list}>
        {paginated.map((article) => (
          <Link key={article.id} href={`/articles/${article.id}`} className={styles.card}>
            <h2 className={styles.cardTitle}>{article.title}</h2>
            <p className={styles.cardMeta}>{article.date} · {article.location}</p>
            <p className={styles.cardSnippet}>
              {article.contents.replace(/<[^>]+>/g, '').slice(0, 200)}...
            </p>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`${styles.pageButton} ${page === i + 1 ? styles.active : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
