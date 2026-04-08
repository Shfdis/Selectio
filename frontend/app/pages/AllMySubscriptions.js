import AllCommunities from '../components/AllCommunities';
import { mySubscribedCommunityCovers } from '../data/communityPage';

export default function AllMySubscriptions() {
  return (
    <AllCommunities
      headerTitle="Мои подписки"
      headerSubtitle="Отсортировано по последним добавленным"
      coverImageUrls={mySubscribedCommunityCovers}
      coverPressRoute="community"
    />
  );
}
