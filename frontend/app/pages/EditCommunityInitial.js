import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';

export default function EditCommunityInitial() {
  const navigation = useNavigation();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  const onPressGenresPicker = () => {
    Alert.alert('Выбор жанров', 'Здесь будет открываться выбор жанров.', [{ text: 'Ок' }]);
  };

  const onPressSave = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Создание сообщества"
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onPressSave}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image source={require('../assets/icons/profile-avatar.png')} style={styles.avatar} resizeMode="cover" />
          </View>
          <Pressable style={styles.changeAvatarButton} onPress={() => {}} hitSlop={10}>
            <Text style={styles.changeAvatarText}>Изменить аватарку</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Отображаемое имя</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
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

          <Pressable style={styles.addGenresButton} onPress={onPressGenresPicker} hitSlop={10}>
            <Text style={styles.addGenresText}>Добавить жанры</Text>
          </Pressable>

          <Text style={[styles.label, styles.descriptionLabel]}>Описание</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.descriptionInput]}
            multiline
            textAlignVertical="top"
            placeholder=""
            placeholderTextColor="#81876D"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
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
  },
  changeAvatarText: {
    fontSize: 33 / 2,
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
    fontSize: 32 / 2,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '500',
    lineHeight: 26,
  },
  descriptionLabel: {
    marginTop: 22,
  },
  descriptionInput: {
    minHeight: 450,
    marginBottom: 12,
  },
});
