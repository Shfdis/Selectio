import { userApi } from "./userSlice";

export const communitiesApi = userApi.injectEndpoints({
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
    }),
  }),
});

export const {
  useSearchCommunitiesQuery,
  useGetUserCommunitiesQuery,
  useGetCommunitiesFeedQuery,
  useGetCommunitiesCatalogQuery,
} = communitiesApi;
