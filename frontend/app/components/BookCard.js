import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import GenrePill from './GenrePill';
export default function BookCard({
    imageUrl,
    title,
    author,
    genreFirst,
    genreSecond,
    onClick = () => {},
    genreAccessory = null,
    showAddReview = false,
    onPressAddReview = () => {},
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
            <View style={styles.genreSection}>
              <View style={styles.genreBox}>
                <GenrePill label={genreFirst} />
                <GenrePill label={genreSecond} />
              </View>
              {showAddReview ? (
                <Pressable style={styles.addReviewButton} onPress={onPressAddReview} hitSlop={8}>
                  <Image
                    source={require('../assets/icons/icon_plus.png')}
                    style={styles.addReviewIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.addReviewText}>Добавить отзыв</Text>
                </Pressable>
              ) : genreAccessory ? (
                <View style={styles.ratingBelow}>{genreAccessory}</View>
              ) : null}
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
        flex: 1,
        minWidth: 0,
        alignItems: 'flex-start',
        marginLeft: '4%',
      },
    titleBlock: {
        width: '100%',
        minWidth: 0,
        flex: 1,
        alignItems: 'flex-start',
      },
    title: {
        fontSize: 18,
        color: '#2D2800',
        fontFamily: 'Playfair',
        fontWeight: 400,
        lineHeight: 22,
        width: '100%',
      },
    author: {
        marginTop: '3.5%',
        fontSize: 12,
        color: '#868158',
        fontFamily: 'Playfair',
        fontWeight: 400,
        lineHeight: 14,
        width: '100%',
        marginBottom: '8%',
      },
      genreSection: {
        width: '100%',
        marginTop: 'auto',
      },
      genreBox: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        rowGap: 4,
        columnGap: 6,
      },
      ratingBelow: {
        marginTop: 6,
        alignSelf: 'flex-start',
      },
      addReviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        marginTop: 6,
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: '#555C40',
        borderWidth: 1,
        borderColor: '#CAC7B9',
      },
      addReviewIcon: {
        width: 16,
        height: 16,
        tintColor: '#ECE8DD',
      },
      addReviewText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#ECE8DD',
        fontFamily: 'Playfair',
        fontWeight: '500',
      },
});