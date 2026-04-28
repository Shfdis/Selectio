import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function NavItem({ iconSource, label, active = false, disabled = true, onPress }) {
  const Container = disabled ? View : Pressable;

  return (
    <Container style={styles.item} {...(!disabled ? { onPress } : null)}>
      <Image
        source={iconSource}
        style={[styles.icon, active ? styles.iconActive : null]}
        resizeMode="contain"
      />
    </Container>
  );
}

export default function BottomNavBar({
  activeKey,
  disabled = true,
  onPressKey,
  icons,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: 8 + insets.bottom }]}>
      <NavItem
        iconSource={icons?.home}
        label="Рекомендации"
        active={activeKey === 'home'}
        disabled={disabled}
        onPress={() => onPressKey?.('home')}
      />
      <NavItem
        iconSource={icons?.groups}
        label="Сообщества"
        active={activeKey === 'groups'}
        disabled={disabled}
        onPress={() => onPressKey?.('groups')}
      />
      <NavItem
        iconSource={icons?.search}
        label="Поиск"
        active={activeKey === 'search'}
        disabled={disabled}
        onPress={() => onPressKey?.('search')}
      />
      <NavItem
        iconSource={icons?.profile}
        label="Профиль"
        active={activeKey === 'profile'}
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
    borderTopWidth: 1,
    borderTopColor: '#CAC7B9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    
    flexShrink: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    tintColor: '#2D2800',
  },
  iconActive: {
    tintColor: '#2D2800',
  },
  label: {
    fontSize: 11,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    textAlign: 'center',
    lineHeight: 13,
    includeFontPadding: false,
  },
  labelActive: {
    color: '#2D2800',
  },
});
