import { View, StyleSheet, Image, TextInput, Pressable } from 'react-native';

export const defaultSearchPlaceholder = 'Поиск книг';
export const defaultCommunitiesSearchPlaceholder = 'Поиск сообществ';

export default function SearchStickyHeader({
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
      <View style={[styles.searchRow, onPress ? styles.searchRowLayer : null]}>
        <Image
          source={require('../assets/icons/icon_search_green.png')}
          style={styles.searchIcon}
          resizeMode="contain"
        />
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#565d3f"
        />
      </View>
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
  searchRow: {
    height: 40,
    width: '100%',
    maxWidth: 344,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  searchRowLayer: {
    zIndex: 1,
  },
  searchIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#2D2800',
    fontFamily: 'Playfair',
    paddingVertical: 0,
    paddingRight: 12,
  },
});
