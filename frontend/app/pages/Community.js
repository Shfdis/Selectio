import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import CommunityScreen from '../components/CommunityScreen';
import { exampleCommunity, examplePosts } from '../data/communityPage';

export default function Community() {
  const navigation = useNavigation();
  const community = exampleCommunity;
  const [isSubscribed, setIsSubscribed] = useState(false);

  const onPressBack = () => {
    navigation.goBack();
  };

  const onPressSubscribe = () => {
    setIsSubscribed(true);
  };

  const onPressUnsubscribe = () => {
    setIsSubscribed(false);
  };

  return (
    <CommunityScreen
      community={community}
      posts={examplePosts}
      onPressBack={onPressBack}
      renderActionArea={() =>
        !isSubscribed ? (
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
            <Pressable
              style={[styles.subscribedButton, styles.subscribedButtonOffer]}
              hitSlop={10}
              onPress={() => navigation.navigate('newPost')}
            >
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
        )
      }
    />
  );
}

const styles = StyleSheet.create({
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
});
