export const exampleCommunity = {
  coverImageUrl: 'https://i.pinimg.com/736x/3e/fa/ed/3efaed6718c988bcbbd018d4c0c5fecf.jpg',
  subscribersCount: '11.8k',
  name: 'ShadowMilkEveryDay',
  genres: ['Сянься', 'Романтика', 'Комедия', 'Фэнтези', 'Детектив', 'Приключения'],
  description:
    'Сообщество для тех, кого очаровала трагическая история некогда благородного Milk Cookie. Обсуждаем лор, теорий, арты, геймплей и всё, что связано с этим харизматичным антагонистом. От его изысканных манер до бездны отчаяния, породившей тёмную магию. Здесь собираются те, кто видит в тени не просто злодея, а одну из самых глубоких душ в мире печенья.',
};

export const myCommunitiesStripCount = 6;

export const mySubscribedCommunityCovers = Array.from({ length: 18 }, () => exampleCommunity.coverImageUrl);

export const examplePosts = [
  {
    id: '1',
    username: 'ShadowMilkEveryDay',
    dateText: '07.01.26',
    text: 'Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии, к которым хочется возвращаться вновь и вновь!!',
    imageSource: { uri: 'https://i.pinimg.com/474x/56/e5/19/56e5193bb2b6234748387a105f4e37f4.jpg' },
    initialLikes: 69,
    initialComments: 52,
    initiallyLiked: false,
    initiallyBookmarked: true,
    book: {
      imageUrl:
        'https://static.kinoafisha.info/k/series_posters/1920x1080/upload/series/posters/8/5/0/2058/808438341595445105.jpg',
      title: 'Благие знамения',
      author: 'Нил Гейман',
      genreFirst: 'Приключения',
      genreSecond: 'Комедия',
    },
  },
  {
    id: '2',
    username: 'ShadowMilkEveryDay',
    dateText: '07.01.26',
    text: 'Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии',
    initialLikes: 12,
    initialComments: 3,
    initiallyLiked: true,
    initiallyBookmarked: true,
    book: {
      imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
      title: 'Хаски и его учитель белый кот',
      author: 'Митбан',
      genreFirst: 'Фэнтези',
      genreSecond: 'Романтика',
    },
  },
];

