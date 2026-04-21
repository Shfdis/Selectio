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
      providesTags: ["User"],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useGetUserLibraryBooksQuery,
  useGetMyBookCommentsQuery,
  useGetMyFavoritePostsQuery,
} = profileApi;
