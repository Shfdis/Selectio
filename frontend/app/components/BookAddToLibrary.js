import LibraryBookSheet, { LibraryBookSheetRow } from './LibraryBookSheet';

const icons = {
  wantToRead: require('../assets/icons/icon_want_read.png'),
  inProgress: require('../assets/icons/icon_open_book.png'),
  read: require('../assets/icons/icon_close_book.png'),
};

export default function BookAddToLibrary({ visible, bookTitle, onSelectShelf, onClose }) {
  return (
    <LibraryBookSheet visible={visible} bookTitle={bookTitle} onClose={onClose}>
      {(finishWith) => (
        <>
          <LibraryBookSheetRow
            iconSource={icons.wantToRead}
            label="Добавить в «Хочу прочитать»"
            onPress={() => finishWith(() => onSelectShelf('wantToRead'))}
          />
          <LibraryBookSheetRow
            iconSource={icons.inProgress}
            label="Добавить в «В процессе»"
            onPress={() => finishWith(() => onSelectShelf('inProgress'))}
          />
          <LibraryBookSheetRow
            iconSource={icons.read}
            label="Добавить в «Прочитанное»"
            onPress={() => finishWith(() => onSelectShelf('read'))}
          />
        </>
      )}
    </LibraryBookSheet>
  );
}
