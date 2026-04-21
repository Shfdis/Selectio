import { userApi } from "./userSlice";

const normalizeGenre = (value) => String(value ?? "").trim();

export const mapApiBookGenres = (book) => ({
  genreFirst: normalizeGenre(book?.genre),
  genreSecond: normalizeGenre(book?.secondGenre),
});

export const mapApiBookToUi = (book) => {
  const { genreFirst, genreSecond } = mapApiBookGenres(book);
  return {
    ...book,
    genreFirst,
    genreSecond,
  };
};

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
      providesTags: ["Books", "RecommendedBooks"],
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
    createBookComment: builder.mutation({
      query: ({ bookId, content, rating }) => ({
        url: `/api/books/${bookId}/comments`,
        method: "POST",
        body: { content, rating },
      }),
      invalidatesTags: ["User", "Books", "RecommendedBooks"],
    }),
    updateBookComment: builder.mutation({
      query: ({ commentId, content, rating }) => ({
        url: `/api/book-comments/${commentId}`,
        method: "PUT",
        body: { content, rating },
      }),
      invalidatesTags: ["User", "Books", "RecommendedBooks"],
    }),
    deleteBookComment: builder.mutation({
      query: ({ commentId }) => ({
        url: `/api/book-comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User", "Books", "RecommendedBooks"],
    }),
    addBookToLibrary: builder.mutation({
      query: ({ bookId, status }) => ({
        url: `/api/books/${bookId}/library`,
        method: "POST",
        body: { status },
      }),
      invalidatesTags: ["User", "Books", "RecommendedBooks"],
    }),
    moveBookInLibrary: builder.mutation({
      query: ({ bookId, status }) => ({
        url: `/api/books/${bookId}/library`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["User", "Books", "RecommendedBooks"],
    }),
    removeBookFromLibrary: builder.mutation({
      query: ({ bookId }) => ({
        url: `/api/books/${bookId}/library`,
        method: "DELETE",
      }),
      invalidatesTags: ["User", "Books", "RecommendedBooks"],
    }),
  }),
});

export const {
  useSearchBooksQuery,
  useGetPopularBooksQuery,
  useGetPopularBooksByGenreQuery,
  useLazyGetPopularBooksByGenreQuery,
  useGetRecommendedBooksQuery,
  useGetBookByIdQuery,
  useGetBookCommentsQuery,
  useCreateBookCommentMutation,
  useUpdateBookCommentMutation,
  useDeleteBookCommentMutation,
  useAddBookToLibraryMutation,
  useMoveBookInLibraryMutation,
  useRemoveBookFromLibraryMutation,
} = booksApi;
