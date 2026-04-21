import { userApi } from "./userSlice";

export const booksApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    searchBooks: builder.query({
      query: ({ query, page = 1, pageSize = 20 }) => ({
        url: "/api/books/search",
        params: { query, page, pageSize },
      }),
    }),
    getPopularBooks: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/books/popular",
        params: { page, pageSize },
      }),
    }),
    getRecommendedBooks: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/books/recommended",
        params: { page, pageSize },
      }),
    }),
  }),
});

export const {
  useSearchBooksQuery,
  useGetPopularBooksQuery,
  useGetRecommendedBooksQuery,
} = booksApi;
