import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SearchInput, { defaultSearchPlaceholder } from './SearchInput';
import ScreenHeader from './ScreenHeader';

export default function NewPostEditor({
  onPressBack,
  onPressConfirm,
  confirmDisabled = false,
  bookSearchQuery,
  onChangeBookSearchQuery,
  comment,
  onChangeComment,
  onPressAttachPhoto,
}) {
  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Новый пост"
        headerTitleStyle={styles.headerTitleRaise}
        onPressBack={onPressBack}
        onPressConfirm={onPressConfirm}
        confirmDisabled={confirmDisabled}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.bookSection}>
            <Text style={styles.bookHint}>Выберите книгу по тематике поста</Text>
            <SearchInput
              value={bookSearchQuery}
              onChangeText={onChangeBookSearchQuery}
              placeholder={defaultSearchPlaceholder}
            />
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Комментарий</Text>
            <TextInput
              value={comment}
              onChangeText={onChangeComment}
              placeholder=""
              placeholderTextColor="#81876D"
              multiline
              textAlignVertical="top"
              style={styles.commentInput}
            />
          </View>

          <Pressable style={styles.attachButton} onPress={onPressAttachPhoto} hitSlop={10}>
            <Image
              source={require('../assets/icons/icon_photo-add.png')}
              style={styles.attachIcon}
              resizeMode="contain"
            />
            <Text style={styles.attachText}>Прикрепить фото</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function defaultAttachPhotoHandler() {
}

const styles = StyleSheet.create({
  headerTitleRaise: {
    transform: [{ translateY: -3 }],
  },
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 26,
  },
  bookSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    paddingTop: 18,
    paddingBottom: 38,
  },
  bookHint: {
    fontSize: 17,
    fontFamily: 'Playfair',
    fontWeight: '400',
    color: '#2D2800',
    lineHeight: 20,
    marginBottom: 22,
    width: '100%',
  },
  commentSection: {
    marginTop: '6%',
  },
  commentLabel: {
    fontSize: 17,
    fontWeight: 400,
    color: '#2D2800',
    fontFamily: 'Playfair',
    marginBottom: 10,
    width: '100%',
  },
  commentInput: {
    width: '100%',
    minHeight: 444,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#81876D',
    backgroundColor: '#ECE8DD',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Playfair',
    color: '#2D2800',
    lineHeight: 18,
  },
  attachButton: {
    position: 'relative',
    marginTop: 28,
    width: '100%',
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#81876D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    position: 'absolute',
    left: '13%',
    width: 24,
    height: 24,
  },
  attachText: {
    fontSize: 16,
    fontFamily: 'Playfair',
    fontWeight: '500',
    color: '#2D2800',
    lineHeight: 20,
  },
});
