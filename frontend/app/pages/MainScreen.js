import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import BottomNavBar from '../components/BottomNavBar';
import { RecommendationsMainContent } from './Recommendations';
import { Communities } from './Communities';
import { Search } from './Search';
import { Profile } from './Profile';

const defaultMainTab = 'profile';

const validTabs = new Set(['home', 'groups', 'search', 'profile']);
const orderedTabs = ['home', 'groups', 'search', 'profile'];
const SafeRecommendations = RecommendationsMainContent ?? (() => null);
const SafeCommunities = Communities ?? (() => null);
const SafeSearch = Search ?? (() => null);
const SafeProfile = Profile ?? (() => null);

export default function MainScreen() {
  const route = useRoute();
  const paramTab = route.params?.mainTab;
  const [tab, setTab] = useState(() =>
    paramTab && validTabs.has(paramTab) ? paramTab : defaultMainTab,
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const lastScrollTabRef = useRef(tab);
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStartTranslateXRef = useRef(0);
  const dragCurrentTranslateXRef = useRef(0);

  useEffect(() => {
    if (paramTab && validTabs.has(paramTab)) {
      const index = orderedTabs.indexOf(paramTab);
      lastScrollTabRef.current = paramTab;
      setTab(paramTab);
      if (containerWidth && index >= 0) {
        const x = -index * containerWidth;
        translateX.setValue(x);
        dragStartTranslateXRef.current = x;
        dragCurrentTranslateXRef.current = x;
      }
    }
  }, [containerWidth, paramTab, translateX]);

  const icons = useMemo(
    () => ({
      home:
        tab === 'home'
          ? require('../assets/icons/icon_book-fill.png')
          : require('../assets/icons/icon-book.png'),
      groups:
        tab === 'groups'
          ? require('../assets/icons/icon_groups_fill.png')
          : require('../assets/icons/icon-groups.png'),
      search:
        tab === 'search'
          ? require('../assets/icons/icon_search-fill.png')
          : require('../assets/icons/icon-search.png'),
      profile:
        tab === 'profile'
          ? require('../assets/icons/icon-profile-filled.png')
          : require('../assets/icons/icon_profile.png'),
    }),
    [tab],
  );

  const onPressKey = useCallback((key) => {
    if (!validTabs.has(key) || key === tab) {
      return;
    }
    if (!containerWidth) {
      return;
    }
    const nextIndex = orderedTabs.indexOf(key);
    if (nextIndex < 0) {
      return;
    }
    const nextTranslateX = -nextIndex * containerWidth;
    lastScrollTabRef.current = key;
    translateX.setValue(nextTranslateX);
    dragStartTranslateXRef.current = nextTranslateX;
    dragCurrentTranslateXRef.current = nextTranslateX;
    setTab(key);
  }, [containerWidth, tab, translateX]);

  useEffect(() => {
    if (!containerWidth) {
      return;
    }
    const index = orderedTabs.indexOf(lastScrollTabRef.current);
    if (index < 0) {
      return;
    }
    const x = -index * containerWidth;
    translateX.setValue(x);
    dragStartTranslateXRef.current = x;
    dragCurrentTranslateXRef.current = x;
  }, [containerWidth, translateX]);

  useEffect(() => {
    lastScrollTabRef.current = tab;
  }, [tab]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          if (!containerWidth) {
            return;
          }
          const currentIndex = orderedTabs.indexOf(tab);
          const startX = -Math.max(0, currentIndex) * containerWidth;
          dragStartTranslateXRef.current = startX;
          dragCurrentTranslateXRef.current = startX;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (!containerWidth) {
            return;
          }
          const minX = -(orderedTabs.length - 1) * containerWidth;
          const maxX = 0;
          const nextX = Math.max(
            minX,
            Math.min(maxX, dragStartTranslateXRef.current + gestureState.dx),
          );
          dragCurrentTranslateXRef.current = nextX;
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (!containerWidth) {
            return;
          }
          const currentIndex = orderedTabs.indexOf(tab);
          let nextIndex = Math.round(-dragCurrentTranslateXRef.current / containerWidth);
          if (Math.abs(gestureState.vx) > 0.35) {
            nextIndex = gestureState.vx < 0 ? currentIndex + 1 : currentIndex - 1;
          }
          nextIndex = Math.max(0, Math.min(orderedTabs.length - 1, nextIndex));
          const nextTab = orderedTabs[nextIndex];
          const nextX = -nextIndex * containerWidth;
          dragStartTranslateXRef.current = nextX;
          dragCurrentTranslateXRef.current = nextX;
          lastScrollTabRef.current = nextTab;
          setTab(nextTab);
          Animated.spring(translateX, {
            toValue: nextX,
            useNativeDriver: true,
            damping: 20,
            stiffness: 220,
            mass: 0.8,
          }).start();
        },
        onPanResponderTerminate: () => {
          const index = orderedTabs.indexOf(tab);
          const x = -Math.max(0, index) * containerWidth;
          Animated.spring(translateX, {
            toValue: x,
            useNativeDriver: true,
            damping: 20,
            stiffness: 220,
            mass: 0.8,
          }).start();
        },
      }),
    [containerWidth, tab, translateX],
  );

  return (
    <View style={styles.screen}>
      <View
        style={styles.content}
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.pagerTrack,
            {
              width: containerWidth ? containerWidth * orderedTabs.length : '100%',
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={[styles.page, { width: containerWidth || '100%' }]}>
            <SafeRecommendations />
          </View>
          <View style={[styles.page, { width: containerWidth || '100%' }]}>
            <SafeCommunities />
          </View>
          <View style={[styles.page, { width: containerWidth || '100%' }]}>
            <SafeSearch />
          </View>
          <View style={[styles.page, { width: containerWidth || '100%' }]}>
            <SafeProfile />
          </View>
        </Animated.View>
      </View>
      <BottomNavBar activeKey={tab} disabled={false} onPressKey={onPressKey} icons={icons} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  pager: {
    flex: 1,
  },
  pagerTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    flex: 1,
  },
});
