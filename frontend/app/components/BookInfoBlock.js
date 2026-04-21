import { View, Text, StyleSheet } from 'react-native';

export default function BookInfoBlock({ title, author, genreFirst, genreSecond }) {
  const genres = [genreFirst, genreSecond].map((g) => String(g ?? '').trim()).filter(Boolean);

  return (
    <View style={styles.block}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {author}
      </Text>
      {genres.length > 0 ? (
        <View style={styles.genreBox}>
          {genres.map((genre) => (
            <View key={genre} style={styles.genre}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
    alignItems: 'flex-start',
  },
  title: {
    marginTop: '3%',
    fontSize: 32,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 400,
    lineHeight: 32,
  },
  author: {
    marginTop: '2%',
    fontSize: 20,
    color: '#868158',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 22,
    marginBottom: '4%',
  },
  genreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  genre: {
    borderRadius: 20,
    backgroundColor: '#CCB985',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CAC7B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreText: {
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 15,
  },
});
