import { Animated, Pressable, StyleSheet, View, Image } from 'react-native';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_KEYS = ['home', 'groups', 'search', 'profile'];

const DEFAULT_TAB_ICONS = {
  home: {
    inactive: require('../assets/icons/icon-book.png'),
    active: require('../assets/icons/icon_book-fill.png'),
  },
  groups: {
    inactive: require('../assets/icons/icon-groups.png'),
    active: require('../assets/icons/icon_groups_fill.png'),
  },
  search: {
    inactive: require('../assets/icons/icon-search.png'),
    active: require('../assets/icons/icon_search-fill.png'),
  },
  profile: {
    inactive: require('../assets/icons/icon_profile.png'),
    active: require('../assets/icons/icon-profile-filled.png'),
  },
};

/** fade: интерполируемое 0…1 или число до измерения pageWidth */
function NavItem({ fade, inactiveSource, activeSource, disabled = true, onPress }) {
  const Container = disabled ? View : Pressable;

  if (typeof fade === 'number') {
    return (
      <Container style={styles.item} {...(!disabled ? { onPressIn: onPress } : null)}>
        <View style={styles.iconSlot}>
          <Image
            source={inactiveSource}
            style={[styles.icon, { opacity: 1 - fade }]}
            resizeMode="contain"
          />
          <Image
            source={activeSource}
            style={[styles.icon, styles.iconLayer, { opacity: fade }]}
            resizeMode="contain"
          />
        </View>
      </Container>
    );
  }

  const inactiveOpacity = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Container style={styles.item} {...(!disabled ? { onPressIn: onPress } : null)}>
      <View style={styles.iconSlot}>
        <Animated.Image
          source={inactiveSource}
          style={[styles.icon, { opacity: inactiveOpacity }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Animated.Image
          source={activeSource}
          style={[styles.icon, styles.iconLayer, { opacity: fade }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </Container>
  );
}

/** Opacity активного слота i = «треугольник» по offset: 1 у i·W, 0 между соседями — синхронно с Horizontal ScrollView */
function fadesFromScroll(scrollX, pageWidth) {
  const W = pageWidth;
  return TAB_KEYS.map((_, i) =>
    scrollX.interpolate({
      inputRange: [(i - 1) * W, i * W, (i + 1) * W],
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    }),
  );
}

/** Пока нет ширины — статичное выделение по activeKey */
function staticFadeForKey(activeKey, key) {
  return activeKey === key ? 1 : 0;
}

export default function BottomNavBar({
  scrollX,
  pageWidth,
  activeKey,
  disabled = true,
  onPressKey,
  tabIcons = DEFAULT_TAB_ICONS,
}) {
  const insets = useSafeAreaInsets();

  const animatedFades = useMemo(() => {
    if (!pageWidth || !scrollX) {
      return null;
    }
    return fadesFromScroll(scrollX, pageWidth);
  }, [scrollX, pageWidth]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <NavItem
        fade={
          animatedFades
            ? animatedFades[0]
            : staticFadeForKey(activeKey, 'home')
        }
        inactiveSource={tabIcons?.home?.inactive}
        activeSource={tabIcons?.home?.active}
        disabled={disabled}
        onPress={() => onPressKey?.('home')}
      />
      <NavItem
        fade={
          animatedFades
            ? animatedFades[1]
            : staticFadeForKey(activeKey, 'groups')
        }
        inactiveSource={tabIcons?.groups?.inactive}
        activeSource={tabIcons?.groups?.active}
        disabled={disabled}
        onPress={() => onPressKey?.('groups')}
      />
      <NavItem
        fade={
          animatedFades
            ? animatedFades[2]
            : staticFadeForKey(activeKey, 'search')
        }
        inactiveSource={tabIcons?.search?.inactive}
        activeSource={tabIcons?.search?.active}
        disabled={disabled}
        onPress={() => onPressKey?.('search')}
      />
      <NavItem
        fade={
          animatedFades
            ? animatedFades[3]
            : staticFadeForKey(activeKey, 'profile')
        }
        inactiveSource={tabIcons?.profile?.inactive}
        activeSource={tabIcons?.profile?.active}
        disabled={disabled}
        onPress={() => onPressKey?.('profile')}
      />
    </View>
  );
}

const ICON_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#ECE8DD',
    marginBottom: 5,
    borderTopWidth: 1,
    borderTopColor: '#CAC7B9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,

    flexShrink: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    tintColor: '#2D2800',
  },
  iconLayer: {
    position: 'absolute',
  },
});
