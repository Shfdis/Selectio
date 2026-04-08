export const exampleCommunity = {
  coverImageUrl: 'https://i.pinimg.com/736x/3e/fa/ed/3efaed6718c988bcbbd018d4c0c5fecf.jpg',
  subscribersCount: '11.8k',
  name: 'ShadowMilkEveryDay',
  genres: ['Сянься', 'Романтика', 'Комедия', 'Фэнтези', 'Детектив', 'Приключения'],
  description:
    'Сообщество для тех, кого очаровала трагическая история некогда благородного Milk Cookie. Обсуждаем лор, теорий, арты, геймплей и всё, что связано с этим харизматичным антагонистом. От его изысканных манер до бездны отчаяния, породившей тёмную магию. Здесь собираются те, кто видит в тени не просто злодея, а одну из самых глубоких душ в мире печенья.',
};

export const myCreatedCommunity = {
  subscribersCount: '696.9k',
  name: 'HannigramForever',
  genres: ['Хоррор', 'Романтика', 'Драма', 'Криминал', 'Триллер'],
  description:
    'Это сообщество для тех, кто слышит тишину между ударами двух сердец — одного, ставшего тьмой, и другого, что научился в этой тьме видеть свет.\n\nЗдесь не судят за любовь к опасной красоте. Здесь понимают, как можно одновременно восхищаться лезвием и бояться его, как можно терять себя в другом, чтобы найти настоящего себя. Мы собрались под одним небом, где бродят чёрные олени и расцветают кровавые орхидеи.\n\nЕсли вы когда-нибудь замечали, что самая сильная связь рождается не в уюте, а на острие ножа — добро пожаловать домой. Здесь мы говорим на языке взглядов, жестов и непроизнесённых обещаний.\n\nЭто место для ганнигрэмов. Для тех, кто увидел в разрушении не конец, а самую прекрасную трансформацию.',
  coverImageUrl: 'https://i.pinimg.com/736x/51/1c/9a/511c9a4c7824498766d280a76eb0e187.jpg',
};

export const myCommunitiesStripCount = 6;

export const mySubscribedCommunityCovers = Array.from({ length: 18 }, () => exampleCommunity.coverImageUrl);
export const myCreatedCommunityCovers = Array.from({ length: 18 }, () => myCreatedCommunity.coverImageUrl);

const threadBodyPost1 =
  'Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии, к которым хочется возвращаться вновь и вновь!!';

const threadBodyAlt =
  'Если вы когда-нибудь замечали, что самая сильная связь рождается не в уюте, а на острие ножа — добро пожаловать домой. Здесь мы говорим на языке взглядов, жестов и непроизнесённых обещаний. Это место для ганнигрэмов. Для тех, кто увидел в разрушении не конец, а самую прекрасную трансформацию.';

const threadCommentsPost1 = [
  { id: 'c1', username: 'ShadowMilkEveryDay', dateText: '07.01.26', text: threadBodyPost1, likes: 69, liked: true },
  { id: 'c2', username: 'HannigramForever', dateText: '07.01.26', text: threadBodyAlt, likes: 6969, liked: false },
  { id: 'c3', username: 'ShadowMilkEveryDay', dateText: '07.01.26', text: threadBodyPost1, likes: 52, liked: true },
  { id: 'c4', username: 'HannigramForever', dateText: '07.01.26', text: threadBodyAlt, likes: 314, liked: true },
  { id: 'c5', username: 'ShadowMilkEveryDay', dateText: '07.01.26', text: threadBodyPost1, likes: 100, liked: true },
  { id: 'c6', username: 'HannigramForever', dateText: '07.01.26', text: threadBodyAlt, likes: 666, liked: true },
  { id: 'c7', username: 'ShadowMilkEveryDay', dateText: '07.01.26', text: threadBodyPost1, likes: 69, liked: true },
];

const threadBodyPost2 =
  'Моя самая любимая книга из всех существующих на планете!! Неожиданные сюжетные повороты, неоднозначные персонажи, постоянные эмоциональные качели, а главное - романтические линии';

const threadCommentsPost2 = [
  { id: 'c1', username: 'ShadowMilkEveryDay', dateText: '07.01.26', text: threadBodyPost2, likes: 5, liked: false },
  { id: 'c2', username: 'HannigramForever', dateText: '08.01.26', text: 'Согласен, очень цепляет.', likes: 12, liked: true },
  { id: 'c3', username: 'ShadowMilkEveryDay', dateText: '09.01.26', text: 'Перечитываю третий раз.', likes: 3, liked: true },
];

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
    threadComments: threadCommentsPost1,
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
    threadComments: threadCommentsPost2,
    book: {
      imageUrl: 'https://ir.ozone.ru/s3/multimedia-1-i/8427096306.jpg',
      title: 'Хаски и его учитель белый кот',
      author: 'Митбан',
      genreFirst: 'Фэнтези',
      genreSecond: 'Романтика',
    },
  },
];

export function getThreadCommentsForPostId(postId) {
  const post = examplePosts.find((p) => p.id === postId);
  return post?.threadComments ?? examplePosts[0].threadComments;
}
