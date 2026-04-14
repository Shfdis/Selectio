import { Fragment, useEffect, useRef } from 'react';
import { Animated, Dimensions, InteractionManager, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const windowHeight = Dimensions.get('window').height;
const defaultSearchTopOffset = 103;

export default function SearchResultsSheet({
  visible,
  topOffset,
  onDismiss,
  emptyMessage,
  data,
  keyExtractor,
  renderItem,
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 4 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
        Math.abs(gestureState.dy) > 8,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 56 || gestureState.vy > 0.55;
        if (shouldClose) {
          Animated.timing(translateY, {
            toValue: windowHeight,
            duration: 240,
            useNativeDriver: true,
          }).start(() => {
            InteractionManager.runAfterInteractions(() => {
              onDismissRef.current();
            });
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  const list = data ?? [];
  const isEmpty = list.length === 0;
  const safeTop =
    typeof topOffset === 'number' && !Number.isNaN(topOffset) ? topOffset : defaultSearchTopOffset;

  return (
    <View style={[styles.root, { top: safeTop }]} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={() => onDismissRef.current()} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handleZone} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {isEmpty ? (
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          ) : (
            list.map((item, index) => (
              <Fragment key={keyExtractor(item, index)}>{renderItem({ item, index })}</Fragment>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  sheet: {
    flex: 1,
    marginTop: 0,
    backgroundColor: '#ECE8DD',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#CAC7B9',
    overflow: 'hidden',
  },
  handleZone: {
    minHeight: 64,
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CAC7B9',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyText: {
    paddingTop: 24,
    paddingHorizontal: 24,
    fontSize: 16,
    color: '#81876D',
    fontFamily: 'Playfair',
    textAlign: 'center',
  },
});
