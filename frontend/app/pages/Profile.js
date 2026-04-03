import { View, Text, StyleSheet, Image, Pressable, ScrollView, Dimensions } from 'react-native';
import { useGetCurrentUserQuery, useGetUserProfileQuery } from '../slices/userSlice';
import ProfileListCard from '../components/ProfileListCard';
import ReviewCard from '../components/ReviewCard';
import { useMemo, useState } from 'react';
import PostCard from '../components/PostCard';
import { useNavigation } from '@react-navigation/native';
import { inProgressBooks, readBooks, wantToReadBooks } from '../data/libraryBooks';

const windowHeight = Dimensions.get('window').height;
const paddedHeight = windowHeight * 0.24;

export function ProfileMainContent() {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const { data: profile } = useGetUserProfileQuery(userId, { skip: !userId });
  const [activeTab, setActiveTab] = useState('books');
  const navigation = useNavigation();

  const displayName = profile?.username || currentUser?.username || 'Новый пользователь';
  const description =
    profile?.description ||
    currentUser?.description ||
    'Напишите что-нибудь о себе\n\nЗайдите в настройки, чтобы изменить описание';

  const tabItems = useMemo(
    () => [
      { key: 'books', label: 'Книги' },
      { key: 'reviews', label: 'Отзывы' },
      { key: 'favorites', label: 'Избранное' },
    ],
    [],
  );

  const onPressSettings = () => {
    navigation.navigate('editProfile');
  };

  const onPressWantToRead = () => {
    navigation.navigate('wantToRead');
  };
  const onPressInProgress = () => {
    navigation.navigate('inProgress');
  };
  const onPressReadBooks = () => {
    navigation.navigate('readBooks');
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

        <View
          style={[styles.contentArea, activeTab === 'favorites' ? styles.contentAreaFullWidth : null]}
        >
          {activeTab === 'books' ? (
            <View style={styles.cards}>
              <ProfileListCard
                title="Хочу прочитать"
                countText={`${wantToReadBooks.length} книг`}
                leftColor="#CCB985"
                onPress={onPressWantToRead}
                style={styles.cardSpacing}
              />
              <ProfileListCard
                title="В процессе"
                countText={`${inProgressBooks.length} книг`}
                leftColor="#CCB985"
                onPress={onPressInProgress}
                style={styles.cardSpacing}
              />
              <ProfileListCard
                title="Прочитанное"
                countText={`${readBooks.length} книг`}
                leftColor="#D6C596"
                onPress={onPressReadBooks}
              />
            </View>
          ) : activeTab === 'reviews' ? (
            <View style={styles.reviews}>
              <ReviewCard
                title="Хаски и его учитель белый кот"
                author="Митбан"
                rating={5}
                text="Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии"
                disabled
                style={styles.reviewSpacing}
              />
              <ReviewCard
                title="Благие знамения"
                author="Нил Гейман"
                rating={4}
                text="Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные"
                disabled
              />
            </View>
          ) : activeTab === 'favorites' ? (
            <View style={styles.favorites}>
              <PostCard
                username="ShadowMilkEveryDay"
                dateText="07.01.26"
                text="Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии, к которым хочется возвращаться вновь и вновь!!"
                imageSource= {{"uri": 'https://i.pinimg.com/474x/56/e5/19/56e5193bb2b6234748387a105f4e37f4.jpg?nii=t'}}
                initialLikes={69}
                initialComments={52}
                initiallyLiked={false}
                initiallyBookmarked={true}
                onPressComment={() => {}}
                book={{
                  imageUrl: 'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
                  title: 'Благие знамения',
                  author: 'Нил Гейман',
                  genreFirst: 'Приключения',
                  genreSecond: 'Комедия',
                }}
              />
              <PostCard
                username="ShadowMilkEveryDay"
                dateText="07.01.26"
                text="Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии"
                initialLikes={12}
                initialComments={3}
                initiallyLiked={true}
                initiallyBookmarked={true}
                onPressComment={() => {}}
                book={{
                  imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
                  title: 'Хаски и его учитель белый кот',
                  author: 'Митбан',
                  genreFirst: 'Фэнтези',
                  genreSecond: 'Романтика',
                }}
              />
            </View>
          ) : (
            <Text style={styles.emptyState}>Пока пусто</Text>
          )}
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
    flexGrow: 1,
    paddingTop: '12%',
    paddingBottom: 0,
    backgroundColor: '#ECE8DD',
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
  contentAreaFullWidth: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  reviews: {
    width: '100%',
  },
  reviewSpacing: {
    marginBottom: '6%',
  },
  favorites: {
    width: '100%',
  },
  emptyState: {
    fontSize: 16,
    color: '#81876D',
    fontFamily: 'Playfair',
    fontWeight: 400,
    textAlign: 'center',
  },
});