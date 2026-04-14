import { forwardRef } from 'react';
import { View, StyleSheet, Image, TextInput } from 'react-native';

export const defaultSearchPlaceholder = 'Поиск книг';

const SearchInput = forwardRef(function SearchInput(
  { value, onChangeText, onFocus, placeholder = defaultSearchPlaceholder, style },
  ref,
) {
  return (
    <View style={[styles.row, style]}>
      <Image
        source={require('../assets/icons/icon_search_green.png')}
        style={styles.searchIcon}
        resizeMode="contain"
      />
      <TextInput
        ref={ref}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#565d3f"
      />
    </View>
  );
});

export default SearchInput;

const styles = StyleSheet.create({
  row: {
    height: 40,
    width: '100%',
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
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
