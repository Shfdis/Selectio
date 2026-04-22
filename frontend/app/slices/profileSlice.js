import { userApi } from "./userSlice";

export const profileApi = userApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getUserProfile: builder.query({
      query: (userId) => `/api/users/${userId}`,
      providesTags: ["User"],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({
        url: "/api/users/profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    uploadImage: builder.mutation({
      query: ({ uri, name = "avatar.jpg", type = "image/jpeg" }) => {
        const formData = new FormData();
        formData.append("file", {
          uri,
          name,
          type,
        });
        return {
          url: "/api/images",
          method: "POST",
          body: formData,
        };
      },
    }),
    getUserLibraryBooks: builder.query({
      query: ({ userId, status, page = 1, pageSize = 100 }) => ({
        url: `/api/users/${userId}/books`,
        params: { status, page, pageSize },
      }),
      providesTags: ["User"],
    }),
    getMyBookComments: builder.query({
      query: ({ page = 1, pageSize = 100 } = {}) => ({
        url: "/api/users/me/book-comments",
        params: { page, pageSize },
      }),
      providesTags: ["User"],
    }),
    getMyFavoritePosts: builder.query({
      query: ({ page = 1, pageSize = 100 } = {}) => ({
        url: "/api/users/favorites",
        params: { page, pageSize },
      }),
      providesTags: (result = []) => [
        { type: "FavoritePost", id: "LIST:me" },
        ...result
          .map((post) => post?.postId)
          .filter((id) => id != null)
          .map((id) => ({ type: "FavoritePost", id })),
      ],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useUploadImageMutation,
  useGetUserLibraryBooksQuery,
  useGetMyBookCommentsQuery,
  useGetMyFavoritePostsQuery,
} = profileApi;
