import { View, StyleSheet, Image, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import PageHeader from '../components/PageHeader';
import { mySubscribedCommunityCovers } from '../data/communityPage';

const myCommunitiesSubtitle = 'Отсортировано по последним добавленным';

export default function MyCommunities() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const pad = 15;
  const gapH = 14;
  const gapV = 21;
  const cardSize = (width - pad * 2 - gapH * 2) / 3;

  const coverCount = mySubscribedCommunityCovers.length;
  const rows = [];
  for (let i = 0; i < coverCount; i += 3) {
    rows.push(Array.from({ length: Math.min(3, coverCount - i) }, (_, j) => i + j));
  }

  return (
    <View style={styles.screen}>
      <PageHeader
        title="Мои сообщества"
        subtitle={myCommunitiesSubtitle}
        onPressBack={() => navigation.goBack()}
        onPressStrip={scrollToTop}
        headerStyle={styles.pageHeaderTall}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: pad, paddingTop: gapV },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((indices, rowIndex) => (
          <View
            key={rowIndex}
            style={[
              styles.row,
              {
                marginBottom: rowIndex < rows.length - 1 ? gapV : 0,
                gap: gapH,
              },
            ]}
          >
            {indices.map((index) => (
              <Pressable
                key={index}
                style={[
                  styles.card,
                  {
                    width: cardSize,
                    height: cardSize,
                    borderRadius: 10,
                  },
                ]}
                onPress={() => navigation.navigate('community')}
              >
                <Image
                  source={{ uri: mySubscribedCommunityCovers[index] }}
                  style={styles.cover}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeaderTall: {
    height: 119,
    paddingBottom: 5,
  },
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
    paddingBottom: 40,
    backgroundColor: '#ECE8DD',
  },
  row: {
    flexDirection: 'row',
  },
  card: {
    overflow: 'hidden',
    backgroundColor: '#CCB985',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
});
