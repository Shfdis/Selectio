import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CommunityScreenLayout from '../components/CommunityScreen';
import { examplePosts, myCreatedCommunity } from '../data/communityPage';

export default function MyCommunity() {
  const navigation = useNavigation();
  const community = myCreatedCommunity;

  const onPressBack = () => {
    navigation.goBack();
  };
  const onPressSettings = () => {
    navigation.navigate('editCommunity');
  };
  const onPressCreatePost = () => {
    navigation.navigate('newPost');
  };
  const onPressSuggestedPosts = () => {
    navigation.navigate('suggestedPosts');
  };

  return (
    <CommunityScreenLayout
      community={community}
      posts={examplePosts}
      onPressBack={onPressBack}
      onPressSettings={onPressSettings}
      renderActionArea={() => (
        <View style={styles.actionButtonsRow}>
          <Pressable style={styles.actionButton} onPress={onPressCreatePost} hitSlop={10}>
            <Image
              source={require('../assets/icons/icon_write.png')}
              style={styles.actionIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              Создать пост
            </Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onPressSuggestedPosts} hitSlop={10}>
            <Image
              source={require('../assets/icons/icon_list.png')}
              style={styles.actionIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              Посмотреть предложку
            </Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  actionButtonsRow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: '3%',
    marginBottom: '1%',
    width: '100%',
  },
  actionButton: {
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
  actionIcon: {
    width: 22,
    height: 22,
    position: 'absolute',
    left: 24,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
});
