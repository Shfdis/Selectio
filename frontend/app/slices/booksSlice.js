import { userApi } from "./userSlice";

export const booksApi = userApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    searchBooks: builder.query({
      query: ({ query, page = 1, pageSize = 20 }) => ({
        url: "/api/books/search",
        params: { query, page, pageSize },
      }),
      providesTags: ["Books"],
    }),
    getPopularBooks: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/books/popular",
        params: { page, pageSize },
      }),
      providesTags: ["Books"],
    }),
    getPopularBooksByGenre: builder.query({
      query: ({ genre, page = 1, pageSize = 20 } = {}) => ({
        url: "/api/books/popular-by-genre",
        params: { genre, page, pageSize },
      }),
      providesTags: ["Books"],
    }),
    getRecommendedBooks: builder.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({
        url: "/api/books/recommended",
        params: { page, pageSize },
      }),
      providesTags: ["Books"],
    }),
    getBookById: builder.query({
      query: (bookId) => `/api/books/${bookId}`,
      providesTags: ["Books"],
    }),
    getBookComments: builder.query({
      query: ({ bookId, page = 1, pageSize = 20 }) => ({
        url: `/api/books/${bookId}/comments`,
        params: { page, pageSize },
      }),
      providesTags: ["Books"],
    }),
    addBookToLibrary: builder.mutation({
      query: ({ bookId, status }) => ({
        url: `/api/books/${bookId}/library`,
        method: "POST",
        body: { status },
      }),
      invalidatesTags: ["User", "Books"],
    }),
    moveBookInLibrary: builder.mutation({
      query: ({ bookId, status }) => ({
        url: `/api/books/${bookId}/library`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["User", "Books"],
    }),
    removeBookFromLibrary: builder.mutation({
      query: ({ bookId }) => ({
        url: `/api/books/${bookId}/library`,
        method: "DELETE",
      }),
      invalidatesTags: ["User", "Books"],
    }),
  }),
});

export const {
  useSearchBooksQuery,
  useGetPopularBooksQuery,
  useGetPopularBooksByGenreQuery,
  useGetRecommendedBooksQuery,
  useGetBookByIdQuery,
  useGetBookCommentsQuery,
  useAddBookToLibraryMutation,
  useMoveBookInLibraryMutation,
  useRemoveBookFromLibraryMutation,
} = booksApi;
