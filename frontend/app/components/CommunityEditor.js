import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import GenrePill from './GenrePill';

export function CommunityAddGenresButton({ onPress }) {
  return (
    <Pressable style={styles.addGenresButton} onPress={onPress} hitSlop={10}>
      <Text style={styles.addGenresText}>Добавить жанры</Text>
    </Pressable>
  );
}

export function CommunityGenrePills({ genres }) {
  return (
    <View style={styles.selectedGenresWrap}>
      {genres.map((genre) => (
        <GenrePill key={genre} label={genre} />
      ))}
    </View>
  );
}

export default function CommunityEditor({
  coverImageSource,
  onPressChangeAvatar,
  displayName,
  onChangeDisplayName,
  description,
  onChangeDescription,
  onPressGenresPicker,
  genresSection,
}) {
  return (
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
          <Text style={styles.changeAvatarText}>Изменить аватарку</Text>
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
          <Pressable style={styles.listButton} onPress={onPressGenresPicker} hitSlop={10}>
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
  );
}

const styles = StyleSheet.create({
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
  },
  changeAvatarText: {
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 20,
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
    marginBottom: 12,
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
