import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * iOS/Web: классический KeyboardAvoidingView + padding.
 * Android: см. app.json android.softwareKeyboardLayoutMode resize — второй слой KeyboardAvoidingView
 * даёт пустую «полоску» между контентом и клавиатурой; оставляем обычный View + safe inset.
 */
export default function KeyboardAvoidingBox({
  children,
  style,
  keyboardVerticalOffset = 0,
  behavior,
  enabled: enabledProp,
  useBottomInset = false,
}) {
  const insets = useSafeAreaInsets();
  const enabled = enabledProp ?? true;

  const inner = useBottomInset ? (
    <View style={[styles.flex, { paddingBottom: insets.bottom }]}>{children}</View>
  ) : (
    children
  );

  if (Platform.OS === 'android') {
    return <View style={[styles.flex, style]}>{inner}</View>;
  }

  const resolvedBehavior = behavior ?? 'padding';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={enabled ? resolvedBehavior : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled={enabled}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
