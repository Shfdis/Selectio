import CommunityCoversGridScreen from '../components/AllCommunities';
import { myCreatedCommunityCovers } from '../data/communityPage';

export default function AllMyCreatedCommunities() {
  return (
    <CommunityCoversGridScreen
      headerTitle="Мои сообщества"
      headerSubtitle="Отсортировано по последним созданным"
      coverImageUrls={myCreatedCommunityCovers}
      coverPressRoute="myCommunity"
    />
  );
}
