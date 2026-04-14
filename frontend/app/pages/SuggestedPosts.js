import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import PostCard from '../components/PostCard';
import { examplePosts } from '../data/communityPage';

const initialSuggestedPosts = examplePosts.map((post, index) => ({
  ...post,
  id: `suggested-${post.id}-${index}`,
  sourcePostId: post.id,
}));

export default function SuggestedPosts() {
  const navigation = useNavigation();
  const [posts, setPosts] = useState(initialSuggestedPosts);

  const hasPosts = posts.length > 0;

  const onPublish = (postId) => {
    setPosts((current) => current.filter((p) => p.id !== postId));
  };

  const onDelete = (postId) => {
    setPosts((current) => current.filter((p) => p.id !== postId));
  };

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Предложенных постов пока нет</Text>
        <Text style={styles.emptySubtitle}>Новые предложения появятся здесь</Text>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Предложка"
        onPressBack={() => navigation.goBack()}
        showConfirmButton={false}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {hasPosts
          ? posts.map((post) => (
              <View key={post.id} style={styles.postWrap}>
                <PostCard
                  postId={post.sourcePostId}
                  username={post.username}
                  dateText={post.dateText}
                  text={post.text}
                  imageSource={post.imageSource}
                  book={post.book}
                  showActions={false}
                />

                <View style={styles.actionRow}>
                  <Pressable style={[styles.actionButton, styles.publishButton]} onPress={() => onPublish(post.id)} hitSlop={10}>
                    <Text style={[styles.actionText, styles.publishText]}>Выложить</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(post.id)} hitSlop={10}>
                    <Text style={[styles.actionText, styles.deleteText]}>Удалить</Text>
                  </Pressable>
                </View>
              </View>
            ))
          : emptyState}
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
    paddingBottom: 28,
    backgroundColor: '#ECE8DD',
  },
  postWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    paddingBottom: 14,
  },
  actionRow: {
    marginTop: 12,
    paddingHorizontal: 23,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 34,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  publishButton: {
    backgroundColor: '#40462E',
    borderColor: '#40462E',
  },
  deleteButton: {
    backgroundColor: '#784C2F',
    borderColor: '#868058',
  },
  actionText: {
    fontSize: 17,
    fontFamily: 'Playfair',
    lineHeight: 20,
    paddingBottom: 3,
  },
  publishText: {
    color: '#ECE8DD',
    fontWeight: '500',
  },
  deleteText: {
    color: '#ECE8DD',
    fontWeight: '500',
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Mak',
    color: '#2D2800',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Playfair',
    color: '#565d3f',
    textAlign: 'center',
  },
});
