import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

function TogglePill({ label }) {
  const [active, setActive] = useState(false);

  return (
    <Pressable
      style={[styles.pill, active ? styles.pillActive : null]}
      onPress={() => setActive((v) => !v)}
      hitSlop={10}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

export default function SortFilterBar() {
  return (
    <View style={styles.row}>
      <TogglePill label="Сортировка" />
      <TogglePill label="Фильтр" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: '6%',
    paddingTop: '2%',
    paddingBottom: '4%',
    backgroundColor: '#ECE8DD',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
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
});

