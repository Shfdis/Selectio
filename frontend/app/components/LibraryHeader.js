import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LibraryHeader({
  title,
  onPressBack,
  onPressAdd = () => {},
  activeId = null,
  onToggleActive = () => {},
}) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>

        <Pressable style={styles.backButton} onPress={onPressBack} hitSlop={10}>
          <Image
            source={require('../assets/GreenBackArrow.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      <View style={styles.toolbarRow}>
        <Pressable
          style={[styles.pill, activeId === 'sort' ? styles.pillActive : null]}
          onPress={() => onToggleActive('sort')}
          hitSlop={10}
        >
          <Text style={styles.pillText}>Сортировка</Text>
        </Pressable>

        <Pressable
          style={[styles.pill, activeId === 'filter' ? styles.pillActive : null]}
          onPress={() => onToggleActive('filter')}
          hitSlop={10}
        >
          <Text style={styles.pillText}>Фильтр</Text>
        </Pressable>

        <Pressable
          style={styles.addButton}
          onPress={() => {
            onToggleActive(null);
            onPressAdd();
          }}
          hitSlop={10}
        >
          <Image
            source={require('../assets/icons/icon_plus.png')}
            style={styles.addIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    backgroundColor: '#ECE8DD',
    paddingTop: '12%',
    paddingBottom: '3%',
    paddingHorizontal: '6%',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 36,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 300,
    lineHeight: 43,
    width: '78%',
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 60,
    backgroundColor: '#E4DFD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 25,
  },
  toolbarRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: '4%',
    gap: 12,
  },
  pill: {
    width: 90,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CAC7B9',
    backgroundColor: '#ECE8DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#CCB985',
  },
  pillText: {
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 14,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 20,
    backgroundColor: '#555C40',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    width: 24,
    height: 24,
  },
});

