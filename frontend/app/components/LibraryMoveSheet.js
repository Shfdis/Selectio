import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

const libraryShelfIds = ['wantToRead', 'inProgress', 'read'];

export const LIBRARY_SHELF_LABELS = {
  wantToRead: 'Хочу прочитать',
  inProgress: 'В процессе',
  read: 'Прочитанное',
};

export const LIBRARY_SHELF_ICONS = {
  wantToRead: require('../assets/icons/icon_want_read.png'),
  inProgress: require('../assets/icons/icon_open_book.png'),
  read: require('../assets/icons/icon_close_book.png'),
};

function otherShelves(currentList) {
  return libraryShelfIds.filter((id) => id !== currentList);
}

export default function LibraryMoveSheet({
  visible,
  bookTitle,
  list = 'wantToRead',
  onMoveToShelf,
  onDelete,
  onClose,
}) {
  if (!visible) return null;

  const targets = otherShelves(list);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.dismissArea} onPress={onClose} />

      <Pressable style={styles.sheet} onPress={() => {}}>
        <Text style={styles.title} numberOfLines={2}>
          {bookTitle}
        </Text>

        {targets.map((targetId) => (
          <Pressable
            key={targetId}
            style={styles.actionRow}
            onPress={() => onMoveToShelf?.(targetId)}
            hitSlop={8}
          >
            <Image source={LIBRARY_SHELF_ICONS[targetId]} style={styles.actionIcon} resizeMode="contain" />
            <Text style={styles.actionText}>
              Переместить в «{LIBRARY_SHELF_LABELS[targetId]}»
            </Text>
          </Pressable>
        ))}

        <Pressable style={styles.actionRow} onPress={onDelete} hitSlop={8}>
          <Image
            source={require('../assets/icons/icon_tresh.png')}
            style={styles.actionIcon}
            resizeMode="contain"
          />
          <Text style={styles.actionText}>Удалить из списка</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  dismissArea: {
    flex: 1,
  },
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  actionIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    marginTop: 4,
    flexShrink: 0,
  },
  actionText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 22,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
  },
});
