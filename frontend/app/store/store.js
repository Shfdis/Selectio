import { configureStore } from '@reduxjs/toolkit';
import { userApi } from '../slices/userSlice';
import librarySyncReducer from '../slices/librarySyncSlice';

export const store = configureStore({
  reducer: {
    [userApi.reducerPath]: userApi.reducer,
    librarySync: librarySyncReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(userApi.middleware),
});
