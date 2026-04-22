import { userApi } from "./userSlice";

export const communitiesApi = userApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    searchCommunities: builder.query({
      query: ({ query = "", page = 1, pageSize = 20 } = {}) => ({
        url: "/api/communities",
        params: { query, page, pageSize },
      }),
    }),
    getUserCommunities: builder.query({
      query: ({ userId, page = 1, pageSize = 20 }) => ({
        url: `/api/users/${userId}/communities`,
        params: { page, pageSize },
      }),
      providesTags: ["User"],
    }),
    getCommunitiesFeed: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/users/me/feed",
        params: { page, pageSize },
      }),
    }),
    getCommunitiesCatalog: builder.query({
      query: ({ page = 1, pageSize = 100 } = {}) => ({
        url: "/api/communities",
        params: { page, pageSize },
      }),
      providesTags: ["User"],
    }),
    getCommunityById: builder.query({
      query: (communityId) => `/api/communities/${communityId}`,
      providesTags: ["User"],
    }),
    getCommunityPosts: builder.query({
      query: ({ communityId, page = 1, pageSize = 20 } = {}) => ({
        url: `/api/communities/${communityId}/posts`,
        params: { page, pageSize },
      }),
      providesTags: ["User"],
    }),
    createCommunity: builder.mutation({
      query: (body) => ({
        url: "/api/communities",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    joinCommunity: builder.mutation({
      query: ({ communityId }) => ({
        url: `/api/communities/${communityId}/join`,
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    leaveCommunity: builder.mutation({
      query: ({ communityId }) => ({
        url: `/api/communities/${communityId}/leave`,
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useSearchCommunitiesQuery,
  useGetUserCommunitiesQuery,
  useGetCommunitiesFeedQuery,
  useGetCommunitiesCatalogQuery,
  useGetCommunityByIdQuery,
  useGetCommunityPostsQuery,
  useCreateCommunityMutation,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} = communitiesApi;
