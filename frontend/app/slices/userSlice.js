import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import apiConfig from "../config/api";
import { getToken, saveToken, removeToken } from "../utils/secureStore";

const basicQuery = fetchBaseQuery({
  baseUrl: apiConfig.baseUrl,
  prepareHeaders: async (headers) => {
    const token = await getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await basicQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    await removeToken();
  }
  return result;
};

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User", "Books", "RecommendedBooks", "Post", "PostComment", "FavoritePost"],
  endpoints: (builder) => ({
    registerUser: builder.mutation({
      query: (body) => ({
        url: "/api/auth/register",
        method: "POST",
        body,
      }),
    }),
    loginUser: builder.mutation({
      query: (body) => ({
        url: "/api/auth/login",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.token) {
            await saveToken(data.token);
            dispatch(userApi.util.invalidateTags(["User"]));
          }
        } catch {
        }
      },
    }),
    getCurrentUser: builder.query({
      query: () => "/api/auth/me",
      providesTags: ["User"],
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useGetCurrentUserQuery,
} = userApi;