import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import BottomNavBar from '../components/BottomNavBar';
import KeyboardAvoidingBox from '../components/KeyboardAvoidingBox';
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
  const transition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (paramTab && validTabs.has(paramTab)) {
      setTab(paramTab);
    }
  }, [paramTab]);

  useEffect(() => {
    transition.setValue(0.95);
    Animated.timing(transition, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [tab, transition]);

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
    if (validTabs.has(key) && key !== tab) {
      setTab(key);
    }
  }, [tab]);

  const tabOrderIndex = orderedTabs.indexOf(tab);

  const resolveNeighborTab = useCallback(
    (delta) => {
      const nextIndex = tabOrderIndex + delta;
      if (nextIndex < 0 || nextIndex >= orderedTabs.length) {
        return null;
      }
      return orderedTabs[nextIndex];
    },
    [tabOrderIndex],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_evt, gestureState) => {
          if (!containerWidth) return;
          const distance = Math.abs(gestureState.dx);
          const speed = Math.abs(gestureState.vx);
          const shouldSwitch = distance > containerWidth * 0.18 || speed > 0.3;
          if (!shouldSwitch) {
            return;
          }
          const direction = gestureState.dx < 0 ? 1 : -1;
          const target = resolveNeighborTab(direction);
          if (target) {
            setTab(target);
          }
        },
      }),
    [containerWidth, resolveNeighborTab],
  );

  return (
    <KeyboardAvoidingBox style={styles.screen} keyboardVerticalOffset={0}>
      <View
        style={styles.content}
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.layer,
            tab === 'home' ? styles.layerVisible : styles.layerHidden,
            tab === 'home' ? { opacity: transition, zIndex: 2 } : { zIndex: 0 },
          ]}
          pointerEvents={tab === 'home' ? 'auto' : 'none'}
        >
          <SafeRecommendations />
        </Animated.View>
        <Animated.View
          style={[
            styles.layer,
            tab === 'groups' ? styles.layerVisible : styles.layerHidden,
            tab === 'groups' ? { opacity: transition, zIndex: 2 } : { zIndex: 0 },
          ]}
          pointerEvents={tab === 'groups' ? 'auto' : 'none'}
        >
          <SafeCommunities />
        </Animated.View>
        <Animated.View
          style={[
            styles.layer,
            tab === 'search' ? styles.layerVisible : styles.layerHidden,
            tab === 'search' ? { opacity: transition, zIndex: 2 } : { zIndex: 0 },
          ]}
          pointerEvents={tab === 'search' ? 'auto' : 'none'}
        >
          <SafeSearch />
        </Animated.View>
        <Animated.View
          style={[
            styles.layer,
            tab === 'profile' ? styles.layerVisible : styles.layerHidden,
            tab === 'profile' ? { opacity: transition, zIndex: 2 } : { zIndex: 0 },
          ]}
          pointerEvents={tab === 'profile' ? 'auto' : 'none'}
        >
          <SafeProfile />
        </Animated.View>
      </View>
      <BottomNavBar activeKey={tab} disabled={false} onPressKey={onPressKey} icons={icons} />
    </KeyboardAvoidingBox>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  content: {
    flex: 1,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  layerVisible: {
    opacity: 1,
  },
  layerHidden: {
    opacity: 0,
  },
});
