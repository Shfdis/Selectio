import { userApi } from "./userSlice";

const recommendedPostsListTag = { type: "Post", id: "LIST:recommended" };
const communitiesFeedListTag = { type: "Post", id: "LIST:communities-feed" };
const communityPostsListTag = (communityId) => ({ type: "Post", id: `LIST:community:${communityId}` });
const suggestedPostsListTag = (communityId) => ({ type: "Post", id: `LIST:suggested:${communityId}` });
const postTag = (postId) => ({ type: "Post", id: postId });
const postCommentsListTag = (postId) => ({ type: "PostComment", id: `LIST:post:${postId}` });
const postCommentTag = (commentId) => ({ type: "PostComment", id: commentId });
const favoritePostsListTag = { type: "FavoritePost", id: "LIST:me" };
const defaultFeedArgs = { page: 1, pageSize: 20 };
const updateFavoritedFlagInList = (draft, postId, nextValue) => {
  if (!Array.isArray(draft)) {
    return;
  }
  const idNum = Number(postId);
  const item = draft.find((post) => Number(post?.id) === idNum);
  if (item) {
    item.favoritedByCurrentUser = nextValue;
  }
};
const applyFavoriteStateToCaches = (dispatch, { postId, communityId, nextValue }) => {
  const patches = [];
  patches.push(
    dispatch(
      userApi.util.updateQueryData("getCommunitiesFeed", defaultFeedArgs, (draft) => {
        updateFavoritedFlagInList(draft, postId, nextValue);
      }),
    ),
  );
  patches.push(
    dispatch(
      userApi.util.updateQueryData("getRecommendedPosts", defaultFeedArgs, (draft) => {
        updateFavoritedFlagInList(draft, postId, nextValue);
      }),
    ),
  );
  if (communityId != null) {
    patches.push(
      dispatch(
        userApi.util.updateQueryData(
          "getCommunityPosts",
          { communityId, page: 1, pageSize: 20 },
          (draft) => {
            updateFavoritedFlagInList(draft, postId, nextValue);
          },
        ),
      ),
    );
    patches.push(
      dispatch(
        userApi.util.updateQueryData(
          "getSuggestedPosts",
          { communityId, page: 1, pageSize: 20 },
          (draft) => {
            updateFavoritedFlagInList(draft, postId, nextValue);
          },
        ),
      ),
    );
  }
  patches.push(
    dispatch(
      userApi.util.updateQueryData("getPostById", postId, (draft) => {
        if (draft && typeof draft === "object") {
          draft.favoritedByCurrentUser = nextValue;
        }
      }),
    ),
  );
  return patches;
};

export const postsApi = userApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRecommendedPosts: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/users/me/feed",
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
    getSuggestedPosts: builder.query({
      query: ({ communityId, page = 1, pageSize = 20 } = {}) => ({
        url: `/api/communities/${communityId}/suggestions`,
        params: { page, pageSize },
      }),
      providesTags: (result = [], _error, arg) => [
        suggestedPostsListTag(arg?.communityId),
        ...result
          .map((post) => post?.id)
          .filter((id) => id != null)
          .map((id) => postTag(id)),
      ],
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
      invalidatesTags: (_result, _error, arg) => [
        communityPostsListTag(arg?.communityId),
        suggestedPostsListTag(arg?.communityId),
      ],
    }),
    approveSuggestedPost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/approve`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        postTag(arg?.postId),
        suggestedPostsListTag(arg?.communityId),
        communityPostsListTag(arg?.communityId),
        communitiesFeedListTag,
        recommendedPostsListTag,
      ],
    }),
    rejectSuggestedPost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/reject`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        postTag(arg?.postId),
        suggestedPostsListTag(arg?.communityId),
      ],
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
    updatePostComment: builder.mutation({
      query: ({ commentId, content }) => ({
        url: `/api/comments/${commentId}`,
        method: "PUT",
        body: { content },
      }),
      invalidatesTags: (_result, _error, arg) => [
        postCommentTag(arg?.commentId),
        postCommentsListTag(arg?.postId),
      ],
    }),
    deletePostComment: builder.mutation({
      query: ({ commentId }) => ({
        url: `/api/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        postCommentTag(arg?.commentId),
        postCommentsListTag(arg?.postId),
        postTag(arg?.postId),
      ],
    }),
    likePostComment: builder.mutation({
      query: ({ commentId }) => ({
        url: `/api/comments/${commentId}/like`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [postCommentTag(arg?.commentId)],
    }),
    unlikePostComment: builder.mutation({
      query: ({ commentId }) => ({
        url: `/api/comments/${commentId}/like`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [postCommentTag(arg?.commentId)],
    }),
    likePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/like`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        postTag(arg?.postId),
        communitiesFeedListTag,
        communityPostsListTag(arg?.communityId),
      ],
    }),
    unlikePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/like`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        postTag(arg?.postId),
        communitiesFeedListTag,
        communityPostsListTag(arg?.communityId),
      ],
    }),
    favoritePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/favorite`,
        method: "POST",
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patches = applyFavoriteStateToCaches(dispatch, {
          postId: arg?.postId,
          communityId: arg?.communityId,
          nextValue: true,
        });
        try {
          await queryFulfilled;
        } catch (_error) {
          patches.forEach((patch) => patch?.undo?.());
        }
      },
      invalidatesTags: () => [favoritePostsListTag],
    }),
    unfavoritePost: builder.mutation({
      query: ({ postId }) => ({
        url: `/api/posts/${postId}/favorite`,
        method: "DELETE",
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patches = applyFavoriteStateToCaches(dispatch, {
          postId: arg?.postId,
          communityId: arg?.communityId,
          nextValue: false,
        });
        try {
          await queryFulfilled;
        } catch (_error) {
          patches.forEach((patch) => patch?.undo?.());
        }
      },
      invalidatesTags: () => [favoritePostsListTag],
    }),
  }),
});

export const {
  useGetRecommendedPostsQuery,
  useGetPostByIdQuery,
  useGetSuggestedPostsQuery,
  useCreatePostMutation,
  useSuggestPostMutation,
  useApproveSuggestedPostMutation,
  useRejectSuggestedPostMutation,
  useGetPostCommentsQuery,
  useCreatePostCommentMutation,
  useUpdatePostCommentMutation,
  useDeletePostCommentMutation,
  useLikePostCommentMutation,
  useUnlikePostCommentMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useFavoritePostMutation,
  useUnfavoritePostMutation,
} = postsApi;
