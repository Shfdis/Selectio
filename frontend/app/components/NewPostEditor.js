import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BookRowCard from './BookRowCard';
import SearchResultsSheet from './SearchResults';
import SearchInput, { defaultSearchPlaceholder } from './SearchInput';
import ScreenHeader from './ScreenHeader';
import KeyboardAvoidingBox from './KeyboardAvoidingBox';

const newPostSearchSheetTopOffset = 205;

export default function NewPostEditor({
  onPressBack,
  onPressConfirm,
  confirmDisabled = false,
  bookSearchQuery,
  onChangeBookSearchQuery,
  selectedBook,
  onSelectBook,
  searchBooksCatalog = [],
  comment,
  onChangeComment,
  attachedPhotoUri,
  onPressAttachPhoto,
}) {
  const searchInputRef = useRef(null);
  const ignoreResultsSheetFocusRef = useRef(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(!selectedBook);
  const [resultsSheetDismissed, setResultsSheetDismissed] = useState(false);

  useEffect(() => {
    if (!bookSearchQuery.trim()) {
      setResultsSheetDismissed(false);
    }
  }, [bookSearchQuery]);

  const filteredBooks = useMemo(() => {
    const q = bookSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchBooksCatalog.filter(
      (book) =>
        String(book?.title ?? '').toLowerCase().includes(q) ||
        String(book?.author ?? '').toLowerCase().includes(q) ||
        (book?.genreFirst && String(book.genreFirst).toLowerCase().includes(q)) ||
        (book?.genreSecond && String(book.genreSecond).toLowerCase().includes(q)),
    );
  }, [bookSearchQuery, searchBooksCatalog]);

  const showResultsSheet = bookPickerOpen && bookSearchQuery.trim().length > 0 && !resultsSheetDismissed;

  const dismissResultsSheet = useCallback(() => {
    ignoreResultsSheetFocusRef.current = true;
    setResultsSheetDismissed(true);
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setTimeout(() => {
      ignoreResultsSheetFocusRef.current = false;
    }, 450);
  }, []);

  const openBookPicker = useCallback(() => {
    setBookPickerOpen(true);
    setResultsSheetDismissed(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, []);

  const onSelectBookFromResults = useCallback(
    (book) => {
      onSelectBook?.(book);
      onChangeBookSearchQuery(book?.title ?? '');
      setBookPickerOpen(false);
      setResultsSheetDismissed(true);
      Keyboard.dismiss();
      searchInputRef.current?.blur();
    },
    [onChangeBookSearchQuery, onSelectBook],
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Новый пост"
        onPressBack={onPressBack}
        onPressConfirm={onPressConfirm}
        confirmDisabled={confirmDisabled}
      />

      <KeyboardAvoidingBox enabled useBottomInset style={styles.flex} keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.bookSection}>
            <Text style={styles.bookHint}>Выберите книгу по тематике поста</Text>
            {selectedBook && !bookPickerOpen ? (
              <View style={styles.selectedBookCardWrap}>
                <View style={styles.selectedBookCardContent}>
                  <BookRowCard book={selectedBook} showMoreButton={false} showDivider={false} />
                </View>
                <Pressable style={styles.swapButton} onPress={openBookPicker} hitSlop={10}>
                  <Image
                    source={require('../assets/icons/icon_swap.png')}
                    style={styles.swapIcon}
                    resizeMode="contain"
                  />
                </Pressable>
              </View>
            ) : (
              <SearchInput
                ref={searchInputRef}
                value={bookSearchQuery}
                onChangeText={onChangeBookSearchQuery}
                placeholder={defaultSearchPlaceholder}
                onFocus={() => {
                  if (bookSearchQuery.trim().length > 0 && !ignoreResultsSheetFocusRef.current) {
                    setResultsSheetDismissed(false);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Комментарий</Text>
            <TextInput
              value={comment}
              onChangeText={onChangeComment}
              placeholder=""
              placeholderTextColor="#81876D"
              multiline
              textAlignVertical="top"
              style={styles.commentInput}
            />
          </View>

          <Pressable style={styles.attachButton} onPress={onPressAttachPhoto} hitSlop={10}>
            <Image
              source={require('../assets/icons/icon_photo-add.png')}
              style={styles.attachIcon}
              resizeMode="contain"
            />
            <Text style={styles.attachText}>{attachedPhotoUri ? 'Изменить фото' : 'Прикрепить фото'}</Text>
          </Pressable>
          {attachedPhotoUri ? (
            <Image source={{ uri: attachedPhotoUri }} style={styles.attachedPreview} resizeMode="cover" />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingBox>

      <SearchResultsSheet
        visible={showResultsSheet}
        topOffset={newPostSearchSheetTopOffset}
        onDismiss={dismissResultsSheet}
        emptyMessage="Ничего не найдено"
        data={filteredBooks}
        keyExtractor={(book, idx) => book.searchCatalogKey ?? `${book.title}-${idx}`}
        renderItem={({ item: book }) => (
          <BookRowCard
            book={book}
            showMoreButton={false}
            onPressBook={() => onSelectBookFromResults(book)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 26,
  },
  bookSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    paddingTop: 18,
    paddingBottom: 22,
  },
  bookHint: {
    fontSize: 17,
    fontFamily: 'Playfair',
    fontWeight: '400',
    color: '#2D2800',
    lineHeight: 20,
    marginBottom: 14,
    width: '100%',
  },
  commentSection: {
    marginTop: '6%',
  },
  commentLabel: {
    fontSize: 17,
    fontWeight: 400,
    color: '#2D2800',
    fontFamily: 'Playfair',
    marginBottom: 10,
    width: '100%',
  },
  commentInput: {
    width: '100%',
    minHeight: 444,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#81876D',
    backgroundColor: '#ECE8DD',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Playfair',
    color: '#2D2800',
    lineHeight: 18,
  },
  attachButton: {
    position: 'relative',
    marginTop: 28,
    width: '100%',
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#81876D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    position: 'absolute',
    left: '13%',
    width: 24,
    height: 24,
  },
  attachText: {
    fontSize: 16,
    fontFamily: 'Playfair',
    fontWeight: '500',
    color: '#2D2800',
    lineHeight: 20,
  },
  attachedPreview: {
    marginTop: 12,
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#81876D',
    backgroundColor: '#E4DFD0',
  },
  selectedBookCardWrap: {
    position: 'relative',
    marginHorizontal: '-6%',
  },
  selectedBookCardContent: {
    paddingRight: 56,
  },
  swapButton: {
    position: 'absolute',
    right: 26,
    top: 24,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: {
    width: 18,
    height: 18,
  },
});
