import { Image, Pressable, StyleSheet, View } from 'react-native';

export default function StarRatingInput({
  value = 0,
  onChange = () => {},
  size = 28,
  gap = 10,
  disabled = false,
}) {
  const v = Math.max(0, Math.min(5, Math.floor(value)));

  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const starValue = idx + 1;
        const filled = starValue <= v;
        return (
          <Pressable
            key={`star-${starValue}`}
            onPress={() => onChange(starValue)}
            disabled={disabled}
            hitSlop={10}
            style={styles.starButton}
          >
            <Image
              source={
                filled
                  ? require('../assets/icons/review-star-filled.png')
                  : require('../assets/icons/review-star-outline.png')
              }
              style={{ width: size, height: size }}
              resizeMode="contain"
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
