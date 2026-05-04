import CommunityCoversGridScreen from '../components/AllCommunities';
import { useMemo } from 'react';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import { useGetCommunitiesCatalogQuery } from '../slices/communitiesSlice';

export default function AllMyCreatedCommunities() {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const { data: communitiesCatalog = [] } = useGetCommunitiesCatalogQuery({ page: 1, pageSize: 200 });

  const myCreatedCommunities = useMemo(
    () =>
      communitiesCatalog.filter(
        (community) => Number(community?.ownerUserId) === Number(userId),
      ),
    [communitiesCatalog, userId],
  );
  const coverImageUrls = useMemo(
    () => myCreatedCommunities.map((community) => community?.coverUrl),
    [myCreatedCommunities],
  );
  const coverNames = useMemo(
    () => myCreatedCommunities.map((community) => community?.name || 'Сообщество'),
    [myCreatedCommunities],
  );
  const coverPressParamsByIndex = useMemo(
    () => myCreatedCommunities.map((community) => ({ communityId: community?.id })),
    [myCreatedCommunities],
  );

  return (
    <CommunityCoversGridScreen
      headerTitle="Мои сообщества"
      headerSubtitle="Отсортировано по последним созданным"
      coverImageUrls={coverImageUrls}
      coverNames={coverNames}
      coverPressRoute="myCommunity"
      coverPressParamsByIndex={coverPressParamsByIndex}
    />
  );
}
