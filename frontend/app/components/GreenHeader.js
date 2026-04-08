import { View, StyleSheet, Image, Pressable } from 'react-native';

export default function GreenHeader({ onPressBack, onPressStrip, onPressSettings }) {
  return (
    <View style={styles.strip}>
      {onPressStrip ? (
        <Pressable
          style={styles.stripHit}
          onPress={onPressStrip}
          accessibilityRole="button"
          accessibilityLabel="Наверх"
        />
      ) : null}
      <Pressable style={styles.backButton} onPress={onPressBack} hitSlop={10}>
        <View style={styles.backButtonCircle}>
          <Image
            source={require('../assets/icons/icon_back_white.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </View>
      </Pressable>

      {onPressSettings ? (
        <Pressable style={styles.settingsButton} onPress={onPressSettings} hitSlop={10}>
          <View style={styles.backButtonCircle}>
            <Image
              source={require('../assets/icons/icon_settings_white.png')}
              style={styles.settingsIcon}
              resizeMode="contain"
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: '100%',
    height: 107,
    backgroundColor: '#555C40',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    position: 'relative',
  },
  stripHit: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    left: 23,
    top: 52,
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backButtonCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#40462E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  settingsButton: {
    position: 'absolute',
    right: 23,
    top: 52,
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  settingsIcon: {
    width: 28,
    height: 28,
  },
});
