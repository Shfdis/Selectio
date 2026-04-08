import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ScreenHeader({
  headerTitle,
  headerTitleStyle,
  onPressBack,
  onPressConfirm = () => {},
  confirmDisabled = false,
  showConfirmButton = true,
}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconButton} onPress={onPressBack} hitSlop={10}>
        <Image
          source={require('../assets/GreenBackArrow.png')}
          style={styles.backIcon}
          resizeMode="contain"
        />
      </Pressable>

      <Text style={[styles.headerTitle, headerTitleStyle]}>{headerTitle}</Text>

      {showConfirmButton ? (
        <Pressable
          style={styles.iconButton}
          onPress={onPressConfirm}
          hitSlop={10}
          disabled={confirmDisabled}
        >
          <Image
            source={require('../assets/icons/icon_check_mark.png')}
            style={styles.checkIcon}
            resizeMode="contain"
          />
        </Pressable>
      ) : (
        <View style={styles.iconSlotSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    paddingTop: '12%',
    paddingBottom: '4%',
    paddingHorizontal: '6%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 300,
    lineHeight: 29,
    textAlign: 'center',
    flex: 1,
    maxWidth: '60%',
    transform: [{ translateY: 8 }],
  },
  iconButton: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: '#E4DFD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: '45%',
    height: '55%',
  },
  checkIcon: {
    width: '45%',
    height: '45%',
  },
  iconSlotSpacer: {
    width: '13%',
    aspectRatio: 1,
  },
});

