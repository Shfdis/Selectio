import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function KeyboardAvoidingBox({
  children,
  style,
  keyboardVerticalOffset = 0,
  behavior,
  enabled: enabledProp,
  useBottomInset = false,
}) {
  const insets = useSafeAreaInsets();
  const resolvedBehavior =
    behavior ?? (Platform.OS === 'ios' ? 'padding' : 'height');
  const enabled = enabledProp ?? true;
  const content = useBottomInset ? (
    <View style={[styles.flex, { paddingBottom: insets.bottom }]}>{children}</View>
  ) : (
    children
  );
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={enabled ? resolvedBehavior : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled={enabled}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
