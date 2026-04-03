import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useCallback } from 'react';
import GreenHeaderStrip from '../components/GreenHeaderStrip';
import PostCard from '../components/PostCard';
import { exampleCommunity, examplePosts } from '../data/communityPage';

function GenrePill({ label }) {
  return (
    <View style={styles.genrePill}>
      <Text style={styles.genrePillText}>{label}</Text>
    </View>
  );
}

export default function Community() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const community = exampleCommunity;
  const [isSubscribed, setIsSubscribed] = useState(false);

  const onPressBack = () => {
    navigation.goBack();
  };

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onPressSubscribe = () => {
    setIsSubscribed(true);
  };

  const onPressUnsubscribe = () => {
    setIsSubscribed(false);
  };

  const topGenres = community.genres.slice(0, 3);
  const bottomGenres = community.genres.slice(3, 6);

  return (
    <View style={styles.screen}>
      <GreenHeaderStrip onPressBack={onPressBack} onPressStrip={scrollToTop} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerGreenBlock}>
          <View style={styles.coverWrap}>
            <Image
              source={{ uri: community.coverImageUrl }}
              style={styles.cover}
              resizeMode="cover"
            />
          </View>

          <View style={styles.subscribersOval}>
            <Image
              source={require('../assets/icons/icon_community.png')}
              style={styles.subscribersIcon}
              resizeMode="contain"
            />
            <Text style={styles.subscribersText}>{community.subscribersCount}</Text>
          </View>

          <Text style={styles.communityName} numberOfLines={1}>
            {community.name}
          </Text>

          <View style={styles.genreRows}>
            <View style={styles.genreRow}>
              {topGenres.map((g) => (
                <GenrePill key={g} label={g} />
              ))}
            </View>
            {bottomGenres.length > 0 && (
              <View style={styles.genreRow}>
                {bottomGenres.map((g) => (
                  <GenrePill key={g} label={g} />
                ))}
              </View>
            )}
          </View>

          {!isSubscribed ? (
            <Pressable style={styles.subscribeButton} onPress={onPressSubscribe} hitSlop={10}>
              <Image
                source={require('../assets/icons/icon_plus.png')}
                style={styles.subscribeIcon}
                resizeMode="contain"
              />
              <Text style={styles.subscribeButtonText}>Подписаться</Text>
            </Pressable>
          ) : (
            <View style={styles.subscribedButtonsRow}>
              <Pressable style={styles.subscribedButton} onPress={onPressUnsubscribe} hitSlop={10}>
                <Image
                  source={require('../assets/icons/icon_x.png')}
                  style={styles.subscribedIcon}
                  resizeMode="contain"
                />
                <Text style={styles.subscribedButtonText} numberOfLines={1}>
                  Отписаться
                </Text>
              </Pressable>
              <Pressable style={[styles.subscribedButton, styles.subscribedButtonOffer]} hitSlop={10}>
                <Image
                  source={require('../assets/icons/icon_offer.png')}
                  style={[styles.subscribedIcon, styles.subscribedIconOffer]}
                  resizeMode="contain"
                />
                <Text
                  style={[styles.subscribedButtonText, styles.subscribedButtonTextOffer]}
                  numberOfLines={1}
                >
                  Предложить пост
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.scrollContentInner}>
          <Text style={styles.descriptionLabel}>Описание:</Text>
          <Text style={styles.descriptionText}>{community.description}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.postsSection}>
          {examplePosts.map((p) => (
            <PostCard
              key={p.id}
              username={p.username}
              dateText={p.dateText}
              text={p.text}
              imageSource={p.imageSource}
              book={p.book}
              initialLikes={p.initialLikes}
              initialComments={p.initialComments}
              initiallyLiked={p.initiallyLiked}
              initiallyBookmarked={p.initiallyBookmarked}
              onPressComment={() => {}}
            />
          ))}
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
  headerGreenBlock: {
    width: '100%',
    backgroundColor: '#555C40',
    paddingBottom: '5%',
    alignItems: 'center',
  },
  coverWrap: {
    width: 156,
    height: 156,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#535D3E',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  subscribersOval: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '3%',
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    borderColor: '#868058',
    gap: 6,
  },
  subscribersIcon: {
    width: 18,
    height: 18,
  },
  subscribersText: {
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 20,
  },
  communityName: {
    marginTop: '5%',
    fontSize: 24,
    color: '#ECE8DD',
    fontFamily: 'Mak',
    fontWeight: 500,
    lineHeight: 29,
    textAlign: 'center',
    maxWidth: '90%',
  },
  genreRows: {
    marginTop: '4%',
    width: '100%',
    paddingHorizontal: '6%',
    alignItems: 'center',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  genrePill: {
    borderRadius: 20,
    backgroundColor: '#CCB985',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CAC7B9',
    minWidth: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genrePillText: {
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 15,
  },
  subscribeButton: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '3%',
    marginBottom: '1%',
    paddingVertical: 7,
    paddingHorizontal: 0,
    borderRadius: 40,
    backgroundColor: '#40462E',
    borderWidth: 1,
    borderColor: '#ECE8DD',
    width: 328,
    alignSelf: 'center',
  },
  subscribeIcon: {
    width: 22,
    height: 22,
    position: 'absolute',
    left: 24,
  },
  subscribeButtonText: {
    fontSize: 16,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: '15%',
    backgroundColor: '#ECE8DD',
  },
  scrollContentInner: {
    paddingHorizontal: '6%',
    paddingTop: '5%',
  },
  subscribedButtonsRow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: '3%',
    marginBottom: '1%',
    width: '100%',
  },
  subscribedButton: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
    paddingVertical: 7,
    paddingHorizontal: 0,
    borderRadius: 40,
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    borderColor: '#868058',
    width: 328,
  },
  subscribedButtonOffer: {
    backgroundColor: '#ECE8DD',
    borderColor: '#868058',
  },
  subscribedIcon: {
    width: 15,
    height: 15,
    position: 'absolute',
    left: 24,
  },
  subscribedIconOffer: {
    width: 22,
    height: 22,
  },
  subscribedButtonText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
  subscribedButtonTextOffer: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
  descriptionLabel: {
    fontSize: 20,
    color: '#868058',
    fontFamily: 'Mak',
    fontWeight: 600,
    lineHeight: 20,
    marginBottom: '4%',
  },
  descriptionText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 19,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#CAC7B9',
    marginTop: '7%',
  },
  postsSection: {
    width: '100%',
  },
});
