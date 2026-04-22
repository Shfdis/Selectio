import { View, StyleSheet, Image, Pressable, ScrollView, Dimensions, Text } from 'react-native';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import { mapApiBookGenres } from '../slices/booksSlice';
import {
  useGetMyBookCommentsQuery,
  useGetMyFavoritePostsQuery,
  useGetUserLibraryBooksQuery,
  useGetUserProfileQuery,
} from '../slices/profileSlice';
import ProfileListCard from '../components/ProfileListCard';
import ReviewCard from '../components/ReviewCard';
import { useMemo, useState } from 'react';
import PostCard from '../components/PostCard';
import { useNavigation } from '@react-navigation/native';

const windowHeight = Dimensions.get('window').height;
const paddedHeight = windowHeight * 0.24;
const LIBRARY_STATUS = {
  wantToRead: 0,
  inProgress: 1,
  read: 2,
};

const formatDate = (isoString) => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
};

export function Profile() {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const { data: profile } = useGetUserProfileQuery(userId, { skip: !userId });
  const { data: wantToReadData = [] } = useGetUserLibraryBooksQuery(
    { userId, status: LIBRARY_STATUS.wantToRead },
    { skip: !userId },
  );
  const { data: inProgressData = [] } = useGetUserLibraryBooksQuery(
    { userId, status: LIBRARY_STATUS.inProgress },
    { skip: !userId },
  );
  const { data: readData = [] } = useGetUserLibraryBooksQuery(
    { userId, status: LIBRARY_STATUS.read },
    { skip: !userId },
  );
  const { data: reviewData = [] } = useGetMyBookCommentsQuery(undefined, { skip: !userId });
  const { data: favoritePostsData = [] } = useGetMyFavoritePostsQuery(undefined, { skip: !userId });
  const [activeTab, setActiveTab] = useState('books');
  const navigation = useNavigation();

  const displayName = profile?.username || currentUser?.username || 'Новый пользователь';
  const avatarUrl = profile?.avatarUrl || '';
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
  const reviews = useMemo(
    () => {
      const latestByBookId = new Map();
      reviewData.forEach((review) => {
        const bookId = Number(review?.bookId ?? review?.book?.id);
        if (!Number.isFinite(bookId) || bookId <= 0) {
          return;
        }
        const existing = latestByBookId.get(bookId);
        const existingTime = existing ? Date.parse(existing.createdAt ?? '') : Number.NEGATIVE_INFINITY;
        const currentTime = Date.parse(review?.createdAt ?? '');
        if (!existing || (!Number.isNaN(currentTime) && currentTime >= existingTime)) {
          latestByBookId.set(bookId, review);
        }
      });
      return Array.from(latestByBookId.values()).map((review) => ({
        id: review.id,
        bookId: Number(review?.bookId ?? review?.book?.id),
        title: review.book?.title || 'Без названия',
        author: review.book?.author || 'Неизвестный автор',
        rating: review.rating ?? 0,
        text: review.content || '',
        book: {
          id: Number(review?.bookId ?? review?.book?.id),
          imageUrl: review.book?.coverUrl,
          title: review.book?.title || 'Без названия',
          author: review.book?.author || 'Неизвестный автор',
          ...mapApiBookGenres(review.book),
        },
      }));
    },
    [reviewData],
  );
  const favoritePosts = useMemo(
    () =>
      favoritePostsData.map((post) => ({
        id: post.postId,
        username: displayName,
        dateText: formatDate(post.favoritedAt || post.createdAt),
        text: post.content || '',
        book: {
          imageUrl: '',
          title: `Пост #${post.postId}`,
          author: '',
          genreFirst: '',
          genreSecond: '',
        },
        initialLikes: 0,
        initialComments: 0,
        initiallyLiked: false,
        initiallyBookmarked: true,
      })),
    [favoritePostsData, displayName],
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
            <Image
              source={avatarUrl ? { uri: avatarUrl } : require('../assets/icons/profile-avatar.png')}
              style={styles.avatar}
            />

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
                titleIcon={require('../assets/icons/icon_want_read.png')}
                countText={`${wantToReadData.length} книг`}
                leftColor="#CCB985"
                onPress={onPressWantToRead}
                style={styles.cardSpacing}
              />
              <ProfileListCard
                title="В процессе"
                titleIcon={require('../assets/icons/icon_open_book.png')}
                countText={`${inProgressData.length} книг`}
                leftColor="#CCB985"
                onPress={onPressInProgress}
                style={styles.cardSpacing}
              />
              <ProfileListCard
                title="Прочитанное"
                titleIcon={require('../assets/icons/icon_close_book.png')}
                countText={`${readData.length} книг`}
                leftColor="#D6C596"
                onPress={onPressReadBooks}
              />
            </View>
          ) : activeTab === 'reviews' ? (
            <View style={styles.reviews}>
              {reviews.map((review, idx) => (
                <ReviewCard
                  key={review.id}
                  title={review.title}
                  author={review.author}
                  rating={review.rating}
                  text={review.text}
                  disabled={false}
                  onPressEdit={() => navigation.navigate('editReview', { review })}
                  style={idx < reviews.length - 1 ? styles.reviewSpacing : null}
                />
              ))}
              {reviews.length === 0 ? <Text style={styles.emptyState}>Пока нет отзывов</Text> : null}
            </View>
          ) : activeTab === 'favorites' ? (
            <View style={styles.favorites}>
              {favoritePosts.map((p) => (
                <PostCard
                  key={p.id}
                  avatarUri={avatarUrl || undefined}
                  postId={p.id}
                  username={p.username}
                  dateText={p.dateText}
                  text={p.text}
                  book={p.book}
                  initialLikes={p.initialLikes}
                  initialComments={p.initialComments}
                  initiallyLiked={p.initiallyLiked}
                  initiallyBookmarked={p.initiallyBookmarked}
                />
              ))}
              {favoritePosts.length === 0 ? <Text style={styles.emptyState}>Пока нет избранного</Text> : null}
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