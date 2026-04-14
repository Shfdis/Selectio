import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function DeleteConfirmDialog({
  visible,
  onConfirm,
  onCancel,
  title = 'Удалить из списка?',
  message = 'Вы сможете вернуть книгу в любое время.',
  cancelLabel = 'Нет',
  confirmLabel = 'Да',
}) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onCancel} />

      <View style={styles.dialog}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onCancel} hitSlop={8}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.confirmButton]} onPress={onConfirm} hitSlop={8}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  dialog: {
    width: '72%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CAC7B9',
    backgroundColor: '#ECE8DD',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    zIndex: 2,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 32,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '300',
  },
  message: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 20,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#CAC7B9',
    backgroundColor: '#555C40',
  },
  confirmButton: {
    borderColor: '#CAC7B9',
    backgroundColor: '#794C2F',
  },
  cancelText: {
    fontSize: 18,
    lineHeight: 22,
    color: '#ECE8DD',
    fontFamily: 'Playfair-SemiBold',
  },
  confirmText: {
    fontSize: 18,
    lineHeight: 22,
    color: '#ECE8DD',
    fontFamily: 'Playfair-SemiBold',
  },
});
