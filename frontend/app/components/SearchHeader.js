import { forwardRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BookSearchInputRow, { defaultBookSearchPlaceholder } from './SearchInput';

export const defaultSearchPlaceholder = defaultBookSearchPlaceholder;
export const defaultCommunitiesSearchPlaceholder = 'Поиск сообществ';
export const searchHeaderHeight = 103;

const SearchStickyHeader = forwardRef(function SearchStickyHeader(
  { value, onChangeText, onFocus, placeholder = defaultSearchPlaceholder, onPress },
  ref,
) {
  return (
    <View style={styles.stickyHeader}>
      {onPress ? (
        <Pressable
          style={styles.stickyHeaderHit}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Наверх"
        />
      ) : null}
      <BookSearchInputRow
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        style={onPress ? styles.searchRowLayer : undefined}
      />
    </View>
  );
});

export default SearchStickyHeader;

const styles = StyleSheet.create({
  stickyHeader: {
    height: 103,
    backgroundColor: '#ECE8DD',
    borderBottomWidth: 1,
    borderBottomColor: '#C4C4C4',
    paddingTop: 50,
    paddingHorizontal: 21,
    position: 'relative',
  },
  stickyHeaderHit: {
    ...StyleSheet.absoluteFillObject,
  },
  searchRowLayer: {
    zIndex: 1,
  },
});
