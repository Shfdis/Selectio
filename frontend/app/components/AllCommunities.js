import { View, StyleSheet, Image, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useRef, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import PageHeader from './PageHeader';

const horizontalPadding = 15;
const horizontalGap = 14;
const verticalGap = 21;

function buildRows(coverCount) {
  const rows = [];
  for (let i = 0; i < coverCount; i += 3) {
    rows.push(Array.from({ length: Math.min(3, coverCount - i) }, (_, j) => i + j));
  }
  return rows;
}

export default function AllCommunities({
  headerTitle,
  headerSubtitle,
  coverImageUrls = [],
  coverNames = [],
  coverPressRoute,
  coverPressParamsByIndex = [],
  onPressCover,
}) {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const cardSize = (width - horizontalPadding * 2 - horizontalGap * 2) / 3;
  const coverCount = coverImageUrls.length;
  const rows = useMemo(() => buildRows(coverCount), [coverCount]);

  return (
    <View style={styles.screen}>
      <PageHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        onPressBack={() => navigation.goBack()}
        onPressStrip={scrollToTop}
        headerStyle={styles.pageHeaderTall}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingTop: verticalGap },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((indices, rowIndex) => (
          <View
            key={rowIndex}
            style={[
              styles.row,
              {
                marginBottom: rowIndex < rows.length - 1 ? verticalGap : 0,
                gap: horizontalGap,
              },
            ]}
          >
            {indices.map((index) => {
              const coverUri = coverImageUrls[index];
              const hasCustomCover = typeof coverUri === 'string' && coverUri.trim().length > 0;
              const coverLabel = coverNames[index] || 'Сообщество';
              return (
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
                onPress={() => {
                  if (typeof onPressCover === 'function') {
                    onPressCover(index);
                    return;
                  }
                  if (!coverPressRoute) {
                    return;
                  }
                  const routeParams = coverPressParamsByIndex[index];
                  navigation.navigate(coverPressRoute, routeParams);
                }}
              >
                {hasCustomCover ? (
                  <Image source={{ uri: coverUri.trim() }} style={styles.cover} resizeMode="cover" />
                ) : (
                  <View style={styles.coverTextFallback}>
                    <Text style={styles.coverTextFallbackTitle} numberOfLines={5}>
                      {coverLabel}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
            })}
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
  coverTextFallback: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'flex-start',
    backgroundColor: '#CCB985',
    borderWidth: 1,
    borderColor: '#CAC7B9',
  },
  coverTextFallbackTitle: {
    fontSize: 15,
    lineHeight: 16,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '600',
  },
});
