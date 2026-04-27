import CommunityCoversGridScreen from '../components/AllCommunities';
import { useMemo } from 'react';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import { useGetUserCommunitiesQuery } from '../slices/communitiesSlice';

export default function MySubscriptions() {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const { data: subscribedCommunities = [] } = useGetUserCommunitiesQuery(
    { userId, page: 1, pageSize: 200 },
    { skip: !userId },
  );
  const coverImageUrls = useMemo(
    () => subscribedCommunities.map((community) => community?.coverUrl),
    [subscribedCommunities],
  );
  const coverNames = useMemo(
    () => subscribedCommunities.map((community) => community?.name || 'Сообщество'),
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
      coverNames={coverNames}
      coverPressRoute="community"
      coverPressParamsByIndex={coverPressParamsByIndex}
    />
  );
}
