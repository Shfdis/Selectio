import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BookRowCard from './BookRowCard';
import ScreenHeader from './ScreenHeader';
import KeyboardAvoidingBox from './KeyboardAvoidingBox';
import StarRatingInput from './StarRatingInput';

export default function ReviewEditor({
  headerTitle,
  headerTitleStyle,
  book,
  rating,
  onChangeRating,
  text,
  onChangeText,
  onPressBack,
  onPressConfirm,
  inputsDisabled = false,
  confirmDisabled = false,
  showDelete = false,
  onPressDelete = () => {},
  deleteDisabled = false,
}) {
  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle={headerTitle}
        headerTitleStyle={headerTitleStyle}
        onPressBack={onPressBack}
        onPressConfirm={onPressConfirm}
        confirmDisabled={confirmDisabled}
      />

      <KeyboardAvoidingBox enabled useBottomInset style={styles.flex} keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {book ? (
            <View style={styles.bookBlock}>
              <BookRowCard book={book} showMoreButton={false} showDivider={false} />
            </View>
          ) : null}

          {book ? <View style={styles.afterBookDivider} /> : null}

          <View style={styles.ratingBlock}>
            <StarRatingInput value={rating} onChange={onChangeRating} size={63} gap={14} disabled={inputsDisabled} />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.sectionTitle}>Отзыв</Text>
            <TextInput
              value={text}
              onChangeText={onChangeText}
              placeholder="Напишите ваш отзыв..."
              placeholderTextColor="#868158"
              multiline
              textAlignVertical="top"
              style={styles.textInput}
              editable={!inputsDisabled}
            />
          </View>

          {showDelete ? (
            <View style={styles.deleteWrap}>
              <Pressable
                style={[styles.deleteButton, deleteDisabled ? styles.deleteButtonDisabled : null]}
                onPress={onPressDelete}
                disabled={deleteDisabled}
              >
                <Text style={styles.deleteText}>Удалить отзыв</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingBox>
    </View>
  );
}

const styles = StyleSheet.create({
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
  content: {
    paddingBottom: '12%',
  },
  bookBlock: {
    paddingTop: '3%',
  },
  afterBookDivider: {
    marginTop: '3%',
    marginHorizontal: '6%',
    height: 1,
    backgroundColor: '#CAC7B9',
  },
  ratingBlock: {
    marginTop: '6%',
    paddingHorizontal: '6%',
    alignItems: 'center',
  },
  textBlock: {
    marginTop: '8%',
    paddingHorizontal: '6%',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 400,
    color: '#2D2800',
    fontFamily: 'Playfair',
    marginBottom: 10,
  },
  textInput: {
    minHeight: 260,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    borderColor: '#8B7B4E',
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    fontSize: 14,
    color: '#2D2800',
    fontFamily: 'Playfair',
    lineHeight: 18,
  },
  deleteWrap: {
    marginTop: '10%',
    paddingHorizontal: '6%',
  },
  deleteButton: {
    width: '100%',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#784C2F',
    borderWidth: 1,
    borderColor: '#2D2800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteText: {
    fontSize: 18,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: 600,
    lineHeight: 22,
  },
});
