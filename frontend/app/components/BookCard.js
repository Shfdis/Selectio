import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
export default function BookCard({
    imageUrl,
    title,
    author,
    genreFirst,
    genreSecond,
    onClick = () => {},
  }) {
  
    return (
      <Pressable style={styles.card} onPress={onClick}>
        <Image source={{ uri : imageUrl}} style={styles.avatar} />
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {author}
            </Text>
            <View style={styles.genreBox}>
                <View style={styles.genre}>
                    <Text style={styles.genreText}>
                        {genreFirst}
                    </Text>
                </View>
                <View style={styles.genre}>
                    <Text style={styles.genreText}>
                        {genreSecond}
                    </Text>
                </View>
            </View>
          </View>
        </View>
    </Pressable>
    );
  }
const styles = StyleSheet.create({
    avatar: {
        width: '28%',
        aspectRatio: 1,
        borderRadius: 8,
      },
    card: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'flex-start',
      },
    topRow: {
        alignItems: 'flex-start',
        marginLeft: '4%',
      },
    titleBlock: {
        flex: 1,
        alignItems: 'flex-start',
      },
    title: {
        fontSize: 18,
        color: '#2D2800',
        fontFamily: 'Playfair',
        fontWeight: 400,
        lineHeight: 22,
        maxWidth: 200,
      },
    author: {
        marginTop: '3.5%',
        fontSize: 12,
        color: '#868158',
        fontFamily: 'Playfair',
        fontWeight: 400,
        lineHeight: 14,
        maxWidth: 200,
        marginBottom: '8%',
      },
      genreBox: {
        flexDirection: 'row',
        marginTop: 'auto',
      },
      genre: {
        borderRadius: 20,
        backgroundColor: '#CCB985',
        marginRight: 8,
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
      }
});