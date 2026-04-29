import { Animated, Dimensions, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

function initialTabFromRoute(routeParam) {
  return routeParam && validTabs.has(routeParam) ? routeParam : defaultMainTab;
}

export default function MainScreen() {
  const route = useRoute();
  const paramTab = route.params?.mainTab;
  const scrollX = useRef(
    new Animated.Value(
      Math.max(
        0,
        orderedTabs.indexOf(initialTabFromRoute(paramTab)),
      ) * Dimensions.get('window').width,
    ),
  ).current;

  const [tab, setTab] = useState(() =>
    paramTab && validTabs.has(paramTab) ? paramTab : defaultMainTab,
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const lastScrollTabRef = useRef(tab);
  const tabRef = useRef(tab);
  const scrollRef = useRef(null);
  const prevParamTabRef = useRef(paramTab);

  const AnimatedScrollView = useMemo(() => Animated.createAnimatedComponent(ScrollView), []);

  const onScrollPager = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: false,
      }),
    [scrollX],
  );

  const scrollToIndex = useCallback(
    (index, animated) => {
      if (!containerWidth || !scrollRef.current || index < 0) {
        return;
      }
      const x = index * containerWidth;
      scrollRef.current.scrollTo({ x, animated });
      if (!animated) {
        scrollX.setValue(x);
      }
    },
    [containerWidth, scrollX],
  );

  useEffect(() => {
    if (paramTab && validTabs.has(paramTab)) {
      lastScrollTabRef.current = paramTab;
      setTab(paramTab);
    }
  }, [paramTab]);

  /** Первый layout / смена ширины: без анимации, позиция = текущему tab */
  useLayoutEffect(() => {
    if (!containerWidth) {
      return;
    }
    const index = orderedTabs.indexOf(tabRef.current);
    if (index < 0) {
      return;
    }
    scrollToIndex(index, false);
  }, [containerWidth, scrollToIndex]);

  /** Смена mainTab из навигации после маунта — плавный scroll */
  useEffect(() => {
    if (!containerWidth) {
      return;
    }
    if (!paramTab || !validTabs.has(paramTab)) {
      prevParamTabRef.current = paramTab;
      return;
    }
    if (prevParamTabRef.current === paramTab) {
      return;
    }
    prevParamTabRef.current = paramTab;
    const index = orderedTabs.indexOf(paramTab);
    if (index < 0) {
      return;
    }
    scrollToIndex(index, true);
  }, [paramTab, containerWidth, scrollToIndex]);

  const onPressKey = useCallback(
    (key) => {
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
      lastScrollTabRef.current = key;
      tabRef.current = key;
      setTab(key);
      scrollToIndex(nextIndex, true);
    },
    [containerWidth, scrollToIndex, tab],
  );

  const onMomentumScrollEnd = useCallback(
    (e) => {
      if (!containerWidth) {
        return;
      }
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / containerWidth);
      const clamped = Math.max(0, Math.min(orderedTabs.length - 1, index));
      const nextTab = orderedTabs[clamped];
      if (!nextTab || nextTab === tabRef.current) {
        return;
      }
      lastScrollTabRef.current = nextTab;
      tabRef.current = nextTab;
      setTab(nextTab);
    },
    [containerWidth],
  );
  useEffect(() => {
    tabRef.current = tab;
    lastScrollTabRef.current = tab;
  }, [tab]);

  const pageStyle = containerWidth ? { width: containerWidth } : { flex: 1 };

  return (
    <View style={styles.screen}>
      <View
        style={styles.content}
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      >
        <AnimatedScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={1}
          onScroll={onScrollPager}
          onMomentumScrollEnd={onMomentumScrollEnd}
          {...(Platform.OS === 'ios' ? { directionalLockEnabled: true } : {})}
          style={styles.pagerScroll}
          contentContainerStyle={styles.pagerScrollContent}
        >
          <View style={[styles.page, pageStyle]}>
            <SafeRecommendations />
          </View>
          <View style={[styles.page, pageStyle]}>
            <SafeCommunities />
          </View>
          <View style={[styles.page, pageStyle]}>
            <SafeSearch />
          </View>
          <View style={[styles.page, pageStyle]}>
            <SafeProfile />
          </View>
        </AnimatedScrollView>
      </View>
      <BottomNavBar
        scrollX={scrollX}
        pageWidth={containerWidth}
        activeKey={tab}
        disabled={false}
        onPressKey={onPressKey}
      />
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
  pagerScroll: {
    flex: 1,
  },
  pagerScrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
  },
});
