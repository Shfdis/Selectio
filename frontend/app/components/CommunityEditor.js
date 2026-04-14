import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import GenrePill from './GenrePill';
import LibraryFilterSheet from './LibraryFilterSheet';
import { libraryFilterGenres } from '../data/libraryBooks';

export function CommunityAddGenresButton({ onPress }) {
  return (
    <Pressable style={styles.addGenresButton} onPress={onPress} hitSlop={10}>
      <Text style={styles.addGenresText}>Добавить жанры</Text>
    </Pressable>
  );
}

export function CommunityGenrePills({ genres = [] }) {
  const list = Array.isArray(genres) ? genres : [];
  return (
    <View style={styles.selectedGenresWrap}>
      {list.map((genre) => (
        <GenrePill key={genre} label={genre} />
      ))}
    </View>
  );
}

const maxCommunityGenres = 6;

export default function CommunityEditor({
  coverImageSource,
  onPressChangeAvatar,
  displayName,
  onChangeDisplayName,
  description,
  onChangeDescription,
  selectedGenres = [],
  onSelectedGenresChange,
  addGenresWhenEmpty = false,
}) {
  const [genreSheetVisible, setGenreSheetVisible] = useState(false);
  const [genreSheetDraft, setGenreSheetDraft] = useState([]);

  const controlled = typeof onSelectedGenresChange === 'function';
  const [uncontrolledGenres, setUncontrolledGenres] = useState(() =>
    Array.isArray(selectedGenres) ? [...selectedGenres] : [],
  );

  const safeGenres = useMemo(() => {
    if (controlled) {
      return Array.isArray(selectedGenres) ? selectedGenres : [];
    }
    return uncontrolledGenres;
  }, [controlled, selectedGenres, uncontrolledGenres]);

  const commitGenres = useCallback(
    (next) => {
      const list = Array.isArray(next) ? [...next] : [];
      if (controlled) {
        onSelectedGenresChange(list);
      } else {
        setUncontrolledGenres(list);
      }
    },
    [controlled, onSelectedGenresChange],
  );

  const openGenreSheet = useCallback(() => {
    setGenreSheetDraft([...safeGenres]);
    setGenreSheetVisible(true);
  }, [safeGenres]);

  const onToggleGenreDraft = useCallback((genre) => {
    setGenreSheetDraft((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      if (base.includes(genre)) {
        return base.filter((g) => g !== genre);
      }
      if (base.length >= maxCommunityGenres) {
        return base;
      }
      return [...base, genre];
    });
  }, []);

  const onApplyGenreSheet = useCallback(() => {
    commitGenres([...genreSheetDraft]);
    setGenreSheetVisible(false);
  }, [genreSheetDraft, commitGenres]);
  const genresSection =
    addGenresWhenEmpty && safeGenres.length === 0 ? (
      <CommunityAddGenresButton onPress={openGenreSheet} />
    ) : (
      <CommunityGenrePills genres={safeGenres} />
    );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image source={coverImageSource} style={styles.avatar} resizeMode="cover" />
          </View>
          <Pressable style={styles.changeAvatarButton} onPress={onPressChangeAvatar ?? (() => {})} hitSlop={10}>
          <Image
            source={require('../assets/icons/icon_photo-add.png')}
            style={styles.changeAvatarIcon}
            resizeMode="contain"
          />
          <Text style={styles.changeAvatarText}>Изменить фото</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Отображаемое имя</Text>
          <TextInput
            value={displayName}
            onChangeText={onChangeDisplayName}
            style={styles.input}
            placeholder=""
            placeholderTextColor="#81876D"
          />

          <View style={styles.genresHeaderRow}>
            <Text style={styles.label}>Выбранные жанры</Text>
            <Pressable style={styles.listButton} onPress={openGenreSheet} hitSlop={10}>
              <Image source={require('../assets/icons/icon_list.png')} style={styles.listIcon} resizeMode="contain" />
            </Pressable>
          </View>

          {genresSection}

          <Text style={[styles.label, styles.descriptionLabel]}>Описание</Text>
          <TextInput
            value={description}
            onChangeText={onChangeDescription}
            style={[styles.input, styles.descriptionInput]}
            multiline
            textAlignVertical="top"
            placeholder=""
            placeholderTextColor="#81876D"
          />
        </View>
      </ScrollView>

      <LibraryFilterSheet
        visible={genreSheetVisible}
        layout="rows"
        rowsPreset="community"
        title="Выберите жанры (не больше 6)"
        genres={libraryFilterGenres}
        selectedGenres={genreSheetDraft}
        maxSelectedGenres={maxCommunityGenres}
        onToggleGenre={onToggleGenreDraft}
        onApply={onApplyGenreSheet}
        onClose={() => setGenreSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  avatarSection: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 14,
  },
  avatarWrap: {
    width: 172,
    height: 172,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#535D3E',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  changeAvatarButton: {
    marginTop: 16,
    width: 172,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#81876D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  changeAvatarIcon: {
    position: 'absolute',
    left: '3%',
    width: 24,
    height: 24,
  },
  changeAvatarText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '500',
    lineHeight: 20,
    left: '9%',
  },
  form: {
    paddingHorizontal: 28,
    paddingTop: 22,
  },
  label: {
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#81876D',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: '#ECE8DD',
  },
  genresHeaderRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listButton: {
    width: 35,
    height: 35,
    borderRadius: 60,
    backgroundColor: '#E4DFD0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  listIcon: {
    width: 24,
    height: 24,
  },
  addGenresButton: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#81876D',
    backgroundColor: '#E4DFD0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  addGenresText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '500',
    lineHeight: 26,
  },
  selectedGenresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  descriptionLabel: {
    marginTop: 22,
  },
  descriptionInput: {
    minHeight: 450,
    marginBottom: 12,
  },
});
