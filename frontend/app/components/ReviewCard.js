import { View, Text, StyleSheet, Pressable, Image } from 'react-native';

function StarsRow({ rating = 5 }) {
  const full = Math.max(1, Math.min(5, Math.floor(rating)));
  const empty = 5 - full;

  return (
    <View style={styles.starsRow}>
      {Array.from({ length: full }).map((_, idx) => (
        <Image
          key={`full-${idx}`}
          source={require('../assets/icons/review-star-filled.png')}
          style={styles.star}
          resizeMode="contain"
        />
      ))}
      {Array.from({ length: empty }).map((_, idx) => (
        <Image
          key={`empty-${idx}`}
          source={require('../assets/icons/review-star-outline.png')}
          style={styles.star}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}

export default function ReviewCard({
  title,
  author,
  rating = 5,
  text,
  showEdit = true,
  disabled = true,
  onPressEdit,
  style,
}) {
  const EditContainer = disabled ? View : Pressable;
  const hasBodyText = typeof text === 'string' && text.trim().length > 0;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
        </View>

        {showEdit ? (
          <EditContainer style={styles.editButton} {...(!disabled ? { onPress: onPressEdit } : null)}>
            <Image
              source={require('../assets/icons/review-edit.png')}
              style={styles.editIcon}
              resizeMode="contain"
            />
          </EditContainer>
        ) : null}
      </View>

      <StarsRow rating={rating} />

      {hasBodyText ? (
        <View style={styles.bodyRow}>
          <Text style={styles.body} ellipsizeMode="tail">
            {text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#555C40',
    borderRadius: 10,
    paddingHorizontal: '5%',
    paddingTop: '4%',
    paddingBottom: '5%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    paddingRight: '4%',
  },
  title: {
    fontSize: 18,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 22,
  },
  author: {
    marginTop: 6,
    fontSize: 14,
    color: '#C2BAA4',
    fontFamily: 'Playfair',
    fontWeight: 600,
    lineHeight: 17,
  },
  editButton: {
    backgroundColor: '#40462E',
    borderRadius: 60,
    width: '10%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    width: '70%',
    height: '70%',
  },
  starsRow: {
    marginTop: '4%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  star: {
    width: '6.5%',
    aspectRatio: 1,
    maxWidth: 24,
    maxHeight: 24,
  },
  bodyRow: {
    marginTop: '4%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  body: {
    flex: 1,
    fontSize: 14,
    color: '#EBE4D0',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 17,
  },
});
