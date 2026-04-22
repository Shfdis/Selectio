import { userApi } from "./userSlice";

const recommendedPostsListTag = { type: "Post", id: "LIST:recommended" };
const communitiesFeedListTag = { type: "Post", id: "LIST:communities-feed" };
const communityPostsListTag = (communityId) => ({ type: "Post", id: `LIST:community:${communityId}` });
const postTag = (postId) => ({ type: "Post", id: postId });
const postCommentsListTag = (postId) => ({ type: "PostComment", id: `LIST:post:${postId}` });
const favoritePostsListTag = { type: "FavoritePost", id: "LIST:me" };

export const postsApi = userApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRecommendedPosts: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/posts/recommended",
        params: { page, pageSize },
      }),
      providesTags: (result = []) => [
        recommendedPostsListTag,
        ...result
          .map((post) => post?.id)
          .filter((id) => id != null)
          .map((id) => postTag(id)),
      ],
    }),
    getPostById: builder.query({
      query: (postId) => `/api/posts/${postId}`,
      providesTags: (_result, _error, postId) => [postTag(postId)],
    }),
    createPost: builder.mutation({
      query: ({ communityId, bookId, content, photoUrl }) => ({
        url: "/api/posts",
        method: "POST",
        body: { communityId, bookId, content, photoUrl },
      }),
      invalidatesTags: (_result, _error, arg) => [
        communityPostsListTag(arg?.communityId),
        communitiesFeedListTag,
        recommendedPostsListTag,
      ],
    }),
    suggestPost: builder.mutation({
      query: ({ communityId, bookId, content, photoUrl }) => ({
        url: "/api/posts/suggest",
        method: "POST",
        body: { communityId, bookId, content, photoUrl },
      }),
      invalidatesTags: (_result, _error, arg) => [communityPostsListTag(arg?.communityId)],
    }),
    getPostComments: builder.query({
      query: ({ postId, page = 1, pageSize = 100 } = {}) => ({
        url: `/api/posts/${postId}/comments`,
        params: { page, pageSize },
      }),
      providesTags: (result = [], _error, arg) => [
        postCommentsListTag(arg?.postId),
        ...result
          .map((comment) => comment?.id)
          .filter((id) => id != null)
          .map((id) => ({ type: "PostComment", id })),
      ],
    }),
    createPostComment: builder.mutation({
      query: ({ postId, content }) => ({
        url: `/api/posts/${postId}/comments`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: (_result, _error, arg) => [postCommentsListTag(arg?.postId), postTag(arg?.postId)],
    }),
    likePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/like`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [postTag(arg?.postId)],
    }),
    unlikePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/like`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [postTag(arg?.postId)],
    }),
    favoritePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/favorite`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [postTag(arg?.postId), favoritePostsListTag],
    }),
    unfavoritePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/favorite`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [postTag(arg?.postId), favoritePostsListTag],
    }),
  }),
});

export const {
  useGetRecommendedPostsQuery,
  useGetPostByIdQuery,
  useCreatePostMutation,
  useSuggestPostMutation,
  useGetPostCommentsQuery,
  useCreatePostCommentMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useFavoritePostMutation,
  useUnfavoritePostMutation,
} = postsApi;
