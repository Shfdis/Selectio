export const wantToReadBooks = [
  {
    imageUrl:
      'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
    title: 'Благие знамения',
    author: 'Нил Гейман',
    genreFirst: 'Приключения',
    genreSecond: 'Комедия',
  },
  {
    imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
    title: 'Хаски и его учитель белый кот',
    author: 'Митбан',
    genreFirst: 'Сянься',
    genreSecond: 'Романтика',
  },
  {
    imageUrl:
      'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
    title: 'Благие знамения',
    author: 'Нил Гейман',
    genreFirst: 'Приключения',
    genreSecond: 'Комедия',
  },
  {
    imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
    title: 'Хаски и его учитель белый кот',
    author: 'Митбан',
    genreFirst: 'Сянься',
    genreSecond: 'Романтика',
  },
  {
    imageUrl:
      'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
    title: 'Благие знамения',
    author: 'Нил Гейман',
    genreFirst: 'Приключения',
    genreSecond: 'Комедия',
  },
  {
    imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
    title: 'Хаски и его учитель белый кот',
    author: 'Митбан',
    genreFirst: 'Сянься',
    genreSecond: 'Романтика',
  },
];

export const inProgressBooks = [
  {
    imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
    title: 'Хаски и его учитель белый кот',
    author: 'Митбан',
    genreFirst: 'Сянься',
    genreSecond: 'Романтика',
  },
  {
    imageUrl:
      'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
    title: 'Благие знамения',
    author: 'Нил Гейман',
    genreFirst: 'Графический роман',
    genreSecond: 'Исторический роман',
  },
  {
    imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
    title: 'Хаски и его учитель белый кот',
    author: 'Митбан',
    genreFirst: 'Сянься',
    genreSecond: 'Романтика',
  },
];

export const readBooks = [
  {
    imageUrl:
      'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
    title: 'Благие знамения',
    author: 'Нил Гейман',
    genreFirst: 'Приключения',
    genreSecond: 'Исторический роман',
  },
  {
    imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
    title: 'Хаски и его учитель белый кот',
    author: 'Митбан',
    genreFirst: 'Сянься',
    genreSecond: 'Романтика',
  },
  {
    imageUrl:
      'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
    title: 'Благие знамения',
    author: 'Нил Гейман',
    genreFirst: 'Приключения',
    genreSecond: 'Комедия',
  },
  {
    imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
    title: 'Хаски и его учитель белый кот',
    author: 'Митбан',
    genreFirst: 'Сянься',
    genreSecond: 'Романтика',
  },
];

export const libraryFilterGenres = [
  'Фэнтези',
  'Детектив',
  'Нон-фикшн',
  'Романтика',
  'Графический роман',
  'Исторический роман',
  'Проза',
  'Поэзия',
  'Подростковое',
  'Детское',
];

const bookSearchCatalogRepeatCopies = 12;

const bookSearchSeeds = (() => {
  const seen = new Set();
  const unique = [];
  for (const b of [...wantToReadBooks, ...inProgressBooks, ...readBooks]) {
    const key = `${b.title}|${b.author}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(b);
    }
  }
  return unique;
})();

export const bookSearchCatalog = (() => {
  const out = [];
  for (let copy = 0; copy < bookSearchCatalogRepeatCopies; copy++) {
    bookSearchSeeds.forEach((b, idx) => {
      out.push({
        ...b,
        searchCatalogKey: `${copy}-${idx}-${b.title}`,
      });
    });
  }
  return out;
})();

