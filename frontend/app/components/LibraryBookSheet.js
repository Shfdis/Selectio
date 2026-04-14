import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import LibraryFadeSheetModal from './LibraryFadeSheetModal';

export function LibraryBookSheetRow({ iconSource, label, onPress }) {
  return (
    <Pressable style={styles.row} onPress={onPress} hitSlop={8}>
      {iconSource ? <Image source={iconSource} style={styles.icon} resizeMode="contain" /> : null}
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

export default function LibraryBookSheet({ visible, bookTitle, onClose, children }) {
  return (
    <LibraryFadeSheetModal visible={visible} onClose={onClose}>
      {({ finishWith }) => (
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title} numberOfLines={2}>
            {bookTitle}
          </Text>
          {typeof children === 'function' ? children(finishWith) : children}
        </Pressable>
      )}
    </LibraryFadeSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    zIndex: 2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 50,
    gap: 12,
  },
  title: {
    fontSize: 22,
    lineHeight: 24,
    color: '#555C40',
    fontFamily: 'Playfair-SemiBold',
    marginBottom: 6,
    width: '92%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 12,
    marginTop: 4,
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 22,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
  },
});
