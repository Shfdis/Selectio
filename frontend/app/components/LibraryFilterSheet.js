import { useMemo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import LibraryFadeSheetModal from './LibraryFadeSheetModal';

function useRowsGenreListMaxHeight(genreCount) {
  return useMemo(() => {
    const h = Dimensions.get('window').height;
    const perRow = 46;
    const verticalPadding = 8;
    const contentNeeded = genreCount * perRow + verticalPadding;
    const reservedForChrome = 210;
    const maxAvailable = Math.max(320, h - reservedForChrome);
    const capByScreen = h * 0.74;
    return Math.min(Math.max(contentNeeded, 340), maxAvailable, capByScreen);
  }, [genreCount]);
}

export default function LibraryFilterSheet({
  visible,
  title = 'Жанры',
  subtitle = '',
  layout = 'chips',
  chipVariant = 'library',
  rowsPreset = 'default',
  genres = [],
  selectedGenres = [],
  maxSelectedGenres,
  onToggleGenre,
  onApply,
  onClose,
}) {
  const rowsListMaxHeight = useRowsGenreListMaxHeight(genres.length);

  const isCommunityChips = chipVariant === 'community';

  const chipsBody = (finishWith) => (
    <>
      <View style={[styles.genresWrap, isCommunityChips ? styles.genresWrapCommunity : null]}>
        {genres.map((genre) => {
          const selected = selectedGenres.includes(genre);
          const reachedLimit =
            typeof maxSelectedGenres === 'number' &&
            maxSelectedGenres > 0 &&
            selectedGenres.length >= maxSelectedGenres;
          const disabled = !selected && reachedLimit;
          return (
            <Pressable
              key={genre}
              style={[
                isCommunityChips ? styles.genrePill : styles.genreChip,
                isCommunityChips && selected ? styles.genrePillSelected : null,
                isCommunityChips && !selected ? styles.genrePillIdle : null,
                !isCommunityChips && selected ? styles.genreChipSelected : null,
                disabled ? styles.genreChipDisabled : null,
              ]}
              onPress={() => {
                if (!disabled) onToggleGenre?.(genre);
              }}
              disabled={disabled}
            >
              <Text
                style={[
                  isCommunityChips ? styles.genrePillText : styles.genreText,
                  isCommunityChips && selected ? styles.genrePillTextSelected : null,
                  !isCommunityChips && selected ? styles.genreTextSelected : null,
                ]}
              >
                {genre}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.applyButton} onPress={() => finishWith(() => (onApply ?? onClose)())}>
        <Text style={styles.applyText}>Применить</Text>
      </Pressable>
    </>
  );

  const isCommunityRows = layout === 'rows' && rowsPreset === 'community';

  const rowsBody = (finishWith) => (
    <>
      <ScrollView
        style={[styles.rowsScroll, { maxHeight: rowsListMaxHeight }]}
        contentContainerStyle={styles.rowsScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {genres.map((genre) => {
          const selected = selectedGenres.includes(genre);
          const reachedLimit =
            typeof maxSelectedGenres === 'number' &&
            maxSelectedGenres > 0 &&
            selectedGenres.length >= maxSelectedGenres;
          const disabled = !selected && reachedLimit;
          return (
            <Pressable
              key={genre}
              style={[styles.optionRow, disabled ? styles.optionRowDisabled : null]}
              onPress={() => {
                if (!disabled) onToggleGenre?.(genre);
              }}
              disabled={disabled}
              hitSlop={8}
            >
              {isCommunityRows ? (
                selected ? (
                  <View style={styles.communityRowDotSelected} />
                ) : (
                  <View style={styles.communityRowDotUnselected} />
                )
              ) : (
                <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              )}
              <Text style={[styles.optionText, isCommunityRows ? styles.optionTextCommunity : null]}>{genre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={[
          styles.applyButton,
          styles.applyButtonRows,
          isCommunityRows ? styles.applyButtonCommunity : null,
        ]}
        onPress={() => finishWith(() => (onApply ?? onClose)())}
      >
        <Text style={styles.applyText}>Применить</Text>
      </Pressable>
    </>
  );

  return (
    <LibraryFadeSheetModal visible={visible} onClose={onClose}>
      {({ finishWith }) => (
        <Pressable
          style={[
            styles.sheet,
            layout === 'rows' ? styles.sheetRows : null,
            isCommunityRows ? styles.sheetCommunity : null,
            layout === 'chips' && !isCommunityChips ? styles.sheetLibraryChips : null,
          ]}
          onPress={() => {}}
        >
          <Text style={[styles.title, isCommunityRows ? styles.titleCommunity : null, layout === 'chips' && !isCommunityChips ? styles.titleLibraryChips : null]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, layout === 'rows' ? styles.subtitleRows : null]}>{subtitle}</Text>
          ) : null}

          {layout === 'rows' ? rowsBody(finishWith) : chipsBody(finishWith)}
        </Pressable>
      )}
    </LibraryFadeSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    zIndex: 2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 42,
  },
  sheetRows: {
    paddingBottom: 50,
    gap: 14,
  },
  sheetCommunity: {
    backgroundColor: '#E6E2D3',
  },
  title: {
    fontSize: 22,
    lineHeight: 24,
    color: '#555C40',
    fontFamily: 'Playfair-SemiBold',
  },
  titleCommunity: {
    color: '#4A4F3D',
    fontSize: 22,
    lineHeight: 26,
  },
  sheetLibraryChips: {
    backgroundColor: '#F2F1E6',
  },
  titleLibraryChips: {
    color: '#4A543B',
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    color: '#81876D',
    fontFamily: 'Playfair',
  },
  subtitleRows: {
    marginTop: 0,
  },
  rowsScroll: {
    marginHorizontal: -4,
  },
  rowsScrollContent: {
    paddingVertical: 2,
    gap: 14,
  },
  optionRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRowDisabled: {
    opacity: 0.45,
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
  },
  optionTextCommunity: {
    color: '#4A4F3D',
  },
  communityRowDotSelected: {
    marginRight: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#555D42',
  },
  communityRowDotUnselected: {
    marginRight: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1CDBC',
    backgroundColor: 'transparent',
  },
  radioOuter: {
    marginRight: 12,
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8D9475',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECE8DD',
  },
  radioOuterSelected: {
    borderColor: '#5E7441',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#5E7441',
  },
  genresWrap: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genresWrapCommunity: {
    gap: 10,
  },
  genrePill: {
    minHeight: 23,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  genrePillIdle: {
    backgroundColor: '#ECE8DD',
    borderColor: '#81876D',
  },
  genrePillSelected: {
    backgroundColor: '#CCB985',
    borderColor: '#CAC7B9',
  },
  genrePillText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
    textAlign: 'center',
  },
  genrePillTextSelected: {
    fontFamily: 'Playfair-SemiBold',
  },
  genreChip: {
    borderWidth: 1,
    borderColor: '#4A543B',
    borderRadius: 20,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  genreChipSelected: {
    backgroundColor: '#545D44',
    borderColor: '#545D44',
  },
  genreChipDisabled: {
    opacity: 0.45,
  },
  genreText: {
    color: '#4A543B',
    fontFamily: 'Playfair',
    fontSize: 16,
    lineHeight: 20,
  },
  genreTextSelected: {
    fontFamily: 'Playfair-SemiBold',
    color: '#F2F1E6',
  },
  applyButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#545D44',
  },
  applyButtonRows: {
    marginTop: 4,
  },
  applyButtonCommunity: {
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#555D42',
  },
  applyText: {
    color: '#F2F1E6',
    fontFamily: 'Playfair-SemiBold',
    fontSize: 18,
    lineHeight: 22,
  },
});
