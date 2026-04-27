import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import HorizontalCoverSection from './HorizontalCoverSection';
import { useGetPopularBooksQuery, useGetRecommendedBooksQuery } from '../slices/booksSlice';
import { selectLibraryChangeVersion } from '../slices/librarySyncSlice';

export default function RecommendedBooksSection({
  title = 'Рекомендованные книги',
  subtitle = 'Книги на основе ваших вкусовых предпочтений',
  onPressBook,
  style,
  pageSize = 20,
}) {
  const isFocused = useIsFocused();
  const libraryChangeVersion = useSelector(selectLibraryChangeVersion);
  const [booksPage, setBooksPage] = useState(1);
  const [booksForRecommendations, setBooksForRecommendations] = useState([]);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const appendedPageNumbersRef = useRef(new Set());
  const isLoadingMoreRef = useRef(false);
  const [forceRefetchOnPageOne, setForceRefetchOnPageOne] = useState(false);
  const [scrollResetSignal, setScrollResetSignal] = useState(0);

  const {
    data: recommendedBooksPage = [],
    isFetching: isRecommendedPageFetching,
    refetch: refetchRecommendedBooksPage,
  } = useGetRecommendedBooksQuery({
    page: booksPage,
    pageSize,
  });
  const {
    data: popularBooksPage = [],
    isFetching: isPopularPageFetching,
    refetch: refetchPopularBooksPage,
  } = useGetPopularBooksQuery({
    page: booksPage,
    pageSize,
  });

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    setBooksPage(1);
    setHasMoreBooks(true);
    appendedPageNumbersRef.current = new Set();
    isLoadingMoreRef.current = false;
  }, [isFocused]);

  useEffect(() => {
    if (libraryChangeVersion <= 0) {
      return;
    }
    setBooksPage(1);
    setBooksForRecommendations([]);
    setHasMoreBooks(true);
    appendedPageNumbersRef.current = new Set();
    isLoadingMoreRef.current = false;
    setForceRefetchOnPageOne(true);
    setScrollResetSignal((prev) => prev + 1);
  }, [libraryChangeVersion]);

  useEffect(() => {
    if (!forceRefetchOnPageOne || booksPage !== 1) {
      return;
    }
    refetchRecommendedBooksPage();
    refetchPopularBooksPage();
    setForceRefetchOnPageOne(false);
  }, [booksPage, forceRefetchOnPageOne, refetchPopularBooksPage, refetchRecommendedBooksPage]);

  useEffect(() => {
    if (isRecommendedPageFetching || isPopularPageFetching) {
      return;
    }
    const pageBooks = recommendedBooksPage.length > 0 ? recommendedBooksPage : popularBooksPage;
    if (booksPage === 1) {
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
    } else if (booksPage === 1) {
      setHasMoreBooks(true);
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
      resetScrollSignal={scrollResetSignal}
    />
  );
}
