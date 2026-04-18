import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';

const openDelayMs = 90;
const openDurationMs = 280;
const closeDurationMs = 220;

export default function LibraryFadeSheetModal({ visible, onClose, children }) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const animateOpen = useCallback(() => {
    closingRef.current = false;
    backdropOpacity.setValue(0);
    sheetOpacity.setValue(0);
    Animated.sequence([
      Animated.delay(openDelayMs),
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: openDurationMs,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: openDurationMs,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
    ]).start();
  }, [backdropOpacity, sheetOpacity]);

  const animateClose = useCallback(
    (then) => {
      if (closingRef.current) return;
      closingRef.current = true;
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: closeDurationMs,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(sheetOpacity, {
          toValue: 0,
          duration: closeDurationMs,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start(({ finished }) => {
        closingRef.current = false;
        if (finished) then?.();
      });
    },
    [backdropOpacity, sheetOpacity],
  );

  useEffect(() => {
    if (visible) {
      animateOpen();
    } else {
      backdropOpacity.setValue(0);
      sheetOpacity.setValue(0);
    }
  }, [visible, animateOpen, backdropOpacity, sheetOpacity]);

  const dismiss = useCallback(() => {
    animateClose(() => onClose());
  }, [animateClose, onClose]);

  const finishWith = useCallback(
    (fn) => {
      animateClose(() => {
        fn?.();
      });
    },
    [animateClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable style={styles.dismissHit} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Закрыть" />
        <Animated.View style={[styles.sheetHost, { opacity: sheetOpacity }]}>
          {typeof children === 'function' ? children({ dismiss, finishWith }) : children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  dismissHit: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetHost: {
    width: '100%',
    zIndex: 2,
    elevation: 4,
  },
});
