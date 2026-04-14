import { Pressable, StyleSheet, Text, View } from 'react-native';
import LibraryFadeSheetModal from './LibraryFadeSheetModal';

export const SORT_OPTIONS = [
  { id: 'title-asc', label: 'Названию (А-Я)' },
  { id: 'title-desc', label: 'Названию (Я-А)' },
  { id: 'author-asc', label: 'Последнему добавленному' },
  { id: 'author-desc', label: 'Первому добавленному' },
];

export default function LibrarySortSheet({ visible, selectedId, onSelect, onClose }) {
  return (
    <LibraryFadeSheetModal visible={visible} onClose={onClose}>
      {({ finishWith }) => (
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Сортировать по</Text>

          {SORT_OPTIONS.map((option) => {
            const isSelected = option.id === selectedId;

            return (
              <Pressable
                key={option.id}
                style={styles.optionRow}
                onPress={() => {
                  onSelect(option.id);
                  finishWith(() => onClose());
                }}
                hitSlop={8}
              >
                {isSelected ? (
                  <View style={styles.dotSelected} />
                ) : (
                  <View style={styles.dotUnselected} />
                )}
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            );
          })}
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
    backgroundColor: '#E6E2D3',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 50,
    gap: 14,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    color: '#4A4F3D',
    fontFamily: 'Playfair-SemiBold',
  },
  optionRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    color: '#4A4F3D',
    fontFamily: 'Playfair',
    fontWeight: '400',
  },
  dotSelected: {
    marginRight: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#555D42',
  },
  dotUnselected: {
    marginRight: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1CDBC',
    backgroundColor: 'transparent',
  },
});
