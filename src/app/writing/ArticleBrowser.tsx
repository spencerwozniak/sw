// ArticleBrowser.tsx
'use client';

import { useState, useMemo } from 'react';
import { FiSearch } from 'react-icons/fi';
import { List, ListRow, Input, Pager } from '@/components/ui';
import { htmlToText } from '@/lib/articles/text';

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

  // The stored contents are HTML: search and preview the text a reader sees, not tags and entities.
  const indexed = useMemo(
    () =>
      data.map((article) => {
        const text = htmlToText(article.contents);
        return {
          article,
          searchText: `${article.title} ${text} ${article.topic ?? ''}`.toLowerCase(),
          preview: `${text.replace(/\s+([,.;:!?)])/g, '$1').slice(0, 200)}...`,
        };
      }),
    [data]
  );

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return indexed.filter((entry) => entry.searchText.includes(needle));
  }, [query, indexed]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div>
      {showSearchBar !== false && (
        <Input
          label="Search"
          icon={<FiSearch />}
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          wrapperClassName="mt-4 mb-1"
        />
      )}

      <List>
        {paginated.map(({ article, preview }) => {
          const isDOI = article.id.startsWith('10.');
          const href = isDOI ? `https://doi.org/${article.id}` : `/writing/${article.id}`;

          return (
            <ListRow
              key={article.id}
              href={href}
              newTab={isDOI}
              title={article.title}
              subline={article.name}
              meta={
                <>
                  {article.topic} | {article.date}
                </>
              }
              metaPlacement="stack"
              preview={preview}
            />
          );
        })}
      </List>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
