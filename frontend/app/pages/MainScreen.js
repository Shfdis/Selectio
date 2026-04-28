import { View, StyleSheet } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import BottomNavBar from '../components/BottomNavBar';
import KeyboardAvoidingBox from '../components/KeyboardAvoidingBox';
import { RecommendationsMainContent } from './Recommendations';
import { Communities } from './Communities';
import { Search } from './Search';
import { Profile } from './Profile';

const defaultMainTab = 'profile';

const validTabs = new Set(['home', 'groups', 'search', 'profile']);
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

  useEffect(() => {
    if (paramTab && validTabs.has(paramTab)) {
      setTab(paramTab);
    }
  }, [paramTab]);

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
    if (validTabs.has(key)) {
      setTab(key);
    }
  }, []);

  return (
    <KeyboardAvoidingBox style={styles.screen} keyboardVerticalOffset={0}>
      <View style={styles.content}>
        <View
          style={[styles.layer, tab === 'home' ? styles.layerVisible : styles.layerHidden]}
          pointerEvents={tab === 'home' ? 'auto' : 'none'}
        >
          <SafeRecommendations />
        </View>
        <View
          style={[styles.layer, tab === 'groups' ? styles.layerVisible : styles.layerHidden]}
          pointerEvents={tab === 'groups' ? 'auto' : 'none'}
        >
          <SafeCommunities />
        </View>
        <View
          style={[styles.layer, tab === 'search' ? styles.layerVisible : styles.layerHidden]}
          pointerEvents={tab === 'search' ? 'auto' : 'none'}
        >
          <SafeSearch />
        </View>
        <View
          style={[styles.layer, tab === 'profile' ? styles.layerVisible : styles.layerHidden]}
          pointerEvents={tab === 'profile' ? 'auto' : 'none'}
        >
          <SafeProfile />
        </View>
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
