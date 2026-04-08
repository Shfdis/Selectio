import { View, StyleSheet, Pressable } from 'react-native';
import SearchInput, { defaultSearchPlaceholder } from './SearchInput';

export { defaultSearchPlaceholder };
export const defaultCommunitiesSearchPlaceholder = 'Поиск сообществ';

export default function SearchHeader({
  value,
  onChangeText,
  placeholder = defaultSearchPlaceholder,
  onPress,
}) {
  return (
    <View style={styles.stickyHeader}>
      {onPress ? (
        <Pressable
          style={styles.stickyHeaderHit}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Наверх"
        />
      ) : null}
      <SearchInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={onPress ? styles.searchRowLayer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    height: 103,
    backgroundColor: '#ECE8DD',
    borderBottomWidth: 1,
    borderBottomColor: '#C4C4C4',
    paddingTop: 50,
    paddingHorizontal: 21,
    position: 'relative',
  },
  stickyHeaderHit: {
    ...StyleSheet.absoluteFillObject,
  },
  searchRowLayer: {
    zIndex: 1,
  },
});
