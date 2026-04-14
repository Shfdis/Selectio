import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import GenrePill from './GenrePill';

const MAX_GENRES = 4;

export default function CommunitySearchRowCard({
  community,
  onPress = () => {},
  showDivider = true,
}) {
  const genres = (community.genres ?? []).slice(0, MAX_GENRES);

  return (
    <View style={styles.rowOuter}>
      <Pressable style={styles.row} onPress={onPress}>
        <Image source={{ uri: community.coverImageUrl }} style={styles.cover} resizeMode="cover" />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {community.name}
          </Text>
          <View style={styles.subscribersRow}>
            <Image
              source={require('../assets/icons/icon_community.png')}
              style={styles.subIcon}
              resizeMode="contain"
            />
            <Text style={styles.subscribersText}>{community.subscribersCount}</Text>
          </View>
          <View style={styles.genreRow}>
            {genres.map((g) => (
              <GenrePill key={g} label={g} style={styles.genrePill} textStyle={styles.genreText} />
            ))}
          </View>
        </View>
      </Pressable>
      {showDivider ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowOuter: {
    width: '100%',
    backgroundColor: '#ECE8DD',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: '6%',
    paddingVertical: '6%',
  },
  cover: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: '#535D3E',
  },
  body: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '600',
    lineHeight: 22,
  },
  subscribersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#868058',
    gap: 6,
  },
  subIcon: {
    width: 16,
    height: 16,
  },
  subscribersText: {
    fontSize: 15,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: '400',
    lineHeight: 18,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  genrePill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  genreText: {
    fontSize: 11,
    lineHeight: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#CAC7B9',
    marginHorizontal: '6%',
  },
});
