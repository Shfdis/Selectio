import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';

const CARD_WIDTH = 136;
const CARD_HEIGHT = 193;
const CARD_GAP = 11;

function BookCoverCard({ imageUri, onPress }) {
  return (
    <Pressable style={styles.bookCard} onPress={onPress}>
      <Image source={{ uri: imageUri }} style={styles.bookCardImage} resizeMode="cover" />
    </Pressable>
  );
}

export default function SearchBookRow({ title, subtitle, covers, onPressCover, style }) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {covers.map((uri, index) => (
          <BookCoverCard key={index} imageUri={uri} onPress={onPressCover} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 23,
    paddingTop: 15,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '300',
    lineHeight: 24,
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#565d3f',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 17,
    marginBottom: 18,
  },
  horizontalList: {
    flexDirection: 'row',
    gap: CARD_GAP,
    paddingRight: 23,
  },
  bookCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#CCB985',
  },
  bookCardImage: {
    width: '100%',
    height: '100%',
  },
});
