import { userApi } from "./userSlice";

export const postsApi = userApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRecommendedPosts: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/posts/recommended",
        params: { page, pageSize },
      }),
    }),
    createPost: builder.mutation({
      query: ({ communityId, bookId, content, photoUrl }) => ({
        url: "/api/posts",
        method: "POST",
        body: { communityId, bookId, content, photoUrl },
      }),
      invalidatesTags: ["User"],
    }),
    suggestPost: builder.mutation({
      query: ({ communityId, bookId, content, photoUrl }) => ({
        url: "/api/posts/suggest",
        method: "POST",
        body: { communityId, bookId, content, photoUrl },
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetRecommendedPostsQuery,
  useCreatePostMutation,
  useSuggestPostMutation,
} = postsApi;
