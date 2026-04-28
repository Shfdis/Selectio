import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function KeyboardAvoidingBox({
  children,
  style,
  keyboardVerticalOffset = 0,
  enabled: enabledProp,
  /** Добавить отступ снизу под системную панель Android (и home indicator на iOS). */
  useBottomInset = false,
}) {
  const insets = useSafeAreaInsets();
  const enabled = enabledProp === undefined ? Platform.OS === 'ios' : enabledProp;
  const content = useBottomInset ? (
    <View style={[styles.flex, { paddingBottom: insets.bottom }]}>{children}</View>
  ) : (
    children
  );
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={enabled ? 'padding' : undefined}
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
