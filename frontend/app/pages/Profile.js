import { View, Text, StyleSheet, Image, Pressable, ScrollView, Alert, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import { removeToken } from '../utils/secureStore';
import { userApi } from '../slices/userSlice';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import ProfileListCard from '../components/ProfileListCard';
import ReviewCard from '../components/ReviewCard';
import BottomNavBar from '../components/BottomNavBar';
import { useMemo, useState } from 'react';

const windowHeight = Dimensions.get('window').height;
const paddedHeight = windowHeight * 0.24;

export default function Profile() {
  const dispatch = useDispatch();
  const { data: currentUser } = useGetCurrentUserQuery();
  const [activeTab, setActiveTab] = useState('books');

  const displayName = currentUser?.username || 'Ария Бочкина';
  const description =
    currentUser?.description ||
    'Люблю погружаться в фэнтезийные и постапокалиптические миры, но самый любимый жанр - сянься';

  const tabItems = useMemo(
    () => [
      { key: 'books', label: 'Книги' },
      { key: 'reviews', label: 'Отзывы' },
      { key: 'favorites', label: 'Избранное' },
    ],
    [],
  );

  const onPressSettings = () => {
    Alert.alert('Настройки', 'Хотите выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await removeToken();
          dispatch(userApi.util.resetApiState());
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.padded, { height: paddedHeight }]}>
          <View style={styles.headerRow}>
            <Image source={require('../assets/icons/profile-avatar.png')} style={styles.avatar} />

            <Pressable style={styles.settingsButton} onPress={onPressSettings}>
              <Image source={require('../assets/icons/icon-settings.png')} style={styles.settingsIcon} />
            </Pressable>
          </View>

          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.bio}>{description}</Text>
        </View>

        <View style={styles.tabs}>
          {tabItems.map((t) => (
            <Pressable key={t.key} onPress={() => setActiveTab(t.key)} hitSlop={10}>
              <Text style={[styles.tabText, t.key === activeTab ? styles.tabTextActive : null]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.contentArea}>
          {activeTab === 'books' ? (
            <View style={styles.cards}>
              <ProfileListCard
                title="Хочу прочитать"
                countText="0 книг"
                leftColor="#CCB985"
                disabled
                style={styles.cardSpacing}
              />
              <ProfileListCard
                title="В процессе"
                countText="0 книг"
                leftColor="#CCB985"
                disabled
                style={styles.cardSpacing}
              />
              <ProfileListCard title="Прочитанное" countText="0 книг" leftColor="#D6C596" disabled />
            </View>
          ) : activeTab === 'reviews' ? (
            <View style={styles.reviews}>
              <ReviewCard
                title="Хаски и его учитель белый кот"
                author="Митбан"
                rating={4}
                text="Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии"
                showMore
                disabled
                style={styles.reviewSpacing}
              />
              <ReviewCard
                title="Хаски и его учитель белый кот"
                author="Митбан"
                rating={5}
                text="Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные"
                disabled
              />
            </View>
          ) : (
            <Text style={styles.emptyState}>Пока пусто</Text>
          )}
        </View>
      </ScrollView>

      <BottomNavBar
        activeKey="profile"
        disabled
        icons={{
          home: require('../assets/icons/icon-book.png'),
          groups: require('../assets/icons/icon-groups.png'),
          search: require('../assets/icons/icon-search.png'),
          profile: require('../assets/icons/icon-profile-filled.png'),
        }}
      />
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
  },
  scrollContent: {
    paddingTop: '12%',
    paddingBottom: '24%',
  },
  padded: {
    paddingHorizontal: '6%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatar: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 9999,
  },
  settingsButton: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: '#E4DFD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    width: '70%',
    height: '70%',
    resizeMode: 'contain',
  },
  name: {
    marginTop: '5%',
    fontSize: 24,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 300,
    lineHeight: 29,
    textAlign: 'left',
  },
  bio: {
    marginTop: '4%',
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 19,
    width: '100%'
  },
  tabs: {
    marginTop: '20%',
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CAC7B9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: '2%',
    paddingVertical: '3%',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Playfair',
    fontWeight: 500,
    color: '#81876D',
    lineHeight: 19,
  },
  tabTextActive: {
    color: '#2D2800',
  },
  cards: {
    marginTop: "3.5%"
  },
  cardSpacing: {
    marginBottom: '6%',
  },
  contentArea: {
    paddingHorizontal: '6%',
    paddingTop: '6%',
    paddingBottom: '6%',
  },
  reviews: {
    width: '100%',
  },
  reviewSpacing: {
    marginBottom: '6%',
  },
  emptyState: {
    fontSize: 16,
    color: '#81876D',
    fontFamily: 'Playfair',
    fontWeight: 400,
    textAlign: 'center',
  },
});