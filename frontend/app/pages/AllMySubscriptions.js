import CommunityCoversGridScreen from '../components/AllCommunities';
import { useMemo } from 'react';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import { useGetUserCommunitiesQuery } from '../slices/communitiesSlice';

const DEFAULT_COVER_URI = 'https://via.placeholder.com/136x136?text=Community';

export default function MySubscriptions() {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const { data: subscribedCommunities = [] } = useGetUserCommunitiesQuery(
    { userId, page: 1, pageSize: 200 },
    { skip: !userId },
  );
  const coverImageUrls = useMemo(
    () => subscribedCommunities.map((community) => community?.coverUrl || DEFAULT_COVER_URI),
    [subscribedCommunities],
  );
  const coverPressParamsByIndex = useMemo(
    () => subscribedCommunities.map((community) => ({ communityId: community?.id })),
    [subscribedCommunities],
  );

  return (
    <CommunityCoversGridScreen
      headerTitle="Мои подписки"
      headerSubtitle="Отсортировано по последним добавленным"
      coverImageUrls={coverImageUrls}
      coverPressRoute="community"
      coverPressParamsByIndex={coverPressParamsByIndex}
    />
  );
}
