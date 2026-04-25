import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HorizontalCoverSection from './HorizontalCoverSection';
import { useGetPopularBooksQuery, useGetRecommendedBooksQuery } from '../slices/booksSlice';

export default function RecommendedBooksSection({
  title = 'Рекомендованные книги',
  subtitle = 'Книги на основе ваших вкусовых предпочтений',
  onPressBook,
  style,
  pageSize = 20,
}) {
  const [booksPage, setBooksPage] = useState(1);
  const [booksForRecommendations, setBooksForRecommendations] = useState([]);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const appendedPageNumbersRef = useRef(new Set());
  const isLoadingMoreRef = useRef(false);

  const { data: recommendedBooksPage = [], isFetching: isRecommendedPageFetching } = useGetRecommendedBooksQuery({
    page: booksPage,
    pageSize,
  });
  const { data: popularBooksPage = [], isFetching: isPopularPageFetching } = useGetPopularBooksQuery({
    page: booksPage,
    pageSize,
  });

  useEffect(() => {
    if (isRecommendedPageFetching || isPopularPageFetching) {
      return;
    }
    const pageBooks = recommendedBooksPage.length > 0 ? recommendedBooksPage : popularBooksPage;
    if (booksPage === 1) {
      // Always refresh the first page so tag invalidation is reflected in UI.
      appendedPageNumbersRef.current = new Set([1]);
      setBooksForRecommendations(pageBooks);
    } else {
      if (appendedPageNumbersRef.current.has(booksPage)) {
        return;
      }
      appendedPageNumbersRef.current.add(booksPage);
      setBooksForRecommendations((prev) => {
        const existingIds = new Set(prev.map((book) => book?.id));
        const incoming = pageBooks.filter((book) => !existingIds.has(book?.id));
        return [...prev, ...incoming];
      });
    }

    const recommendedHasMore = recommendedBooksPage.length >= pageSize;
    const popularHasMore = popularBooksPage.length >= pageSize;
    const noDataOnThisPage = recommendedBooksPage.length === 0 && popularBooksPage.length === 0;
    if ((!recommendedHasMore && !popularHasMore) || noDataOnThisPage) {
      setHasMoreBooks(false);
    }
    isLoadingMoreRef.current = false;
  }, [
    booksPage,
    pageSize,
    recommendedBooksPage,
    popularBooksPage,
    isRecommendedPageFetching,
    isPopularPageFetching,
  ]);

  const covers = useMemo(
    () =>
      booksForRecommendations.map((book) => ({
        imageUri: book?.coverUrl || null,
        title: book?.title || 'Без названия',
        author: book?.author || 'Неизвестный автор',
      })),
    [booksForRecommendations],
  );

  const loadMoreBooks = useCallback(() => {
    if (!hasMoreBooks || isLoadingMoreRef.current) {
      return;
    }
    if (isRecommendedPageFetching || isPopularPageFetching) {
      return;
    }
    isLoadingMoreRef.current = true;
    setBooksPage((prev) => prev + 1);
  }, [hasMoreBooks, isRecommendedPageFetching, isPopularPageFetching]);

  return (
    <HorizontalCoverSection
      title={title}
      subtitle={subtitle}
      covers={covers}
      onPressCover={(_, index) => onPressBook?.(booksForRecommendations[index])}
      onHorizontalEndReached={loadMoreBooks}
      style={style}
    />
  );
}
