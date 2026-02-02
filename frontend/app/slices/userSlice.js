import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import API_CONFIG from "../config/api";
import { getToken, saveToken, removeToken } from "../utils/secureStore";

const basicQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.baseUrl,
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
  tagTypes: ["User"],
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
            // Now that the token is saved, refetch /me with auth header
            dispatch(userApi.util.invalidateTags(["User"]));
          }
        } catch (error) {
          console.error("Login failed:", error);
        }
      },
    }),
    getCurrentUser: builder.query({
      query: () => "/api/auth/me",
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
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
} = userApi;