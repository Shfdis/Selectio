import { userApi } from "./userSlice";

export const postsApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    getRecommendedPosts: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/posts/recommended",
        params: { page, pageSize },
      }),
    }),
  }),
});

export const { useGetRecommendedPostsQuery } = postsApi;
