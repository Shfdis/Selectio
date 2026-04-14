import CommunityCoversGridScreen from '../components/AllCommunities';
import { mySubscribedCommunityCovers } from '../data/communityPage';

export default function MySubscriptions() {
  return (
    <CommunityCoversGridScreen
      headerTitle="Мои подписки"
      headerSubtitle="Отсортировано по последним добавленным"
      coverImageUrls={mySubscribedCommunityCovers}
      coverPressRoute="community"
    />
  );
}
