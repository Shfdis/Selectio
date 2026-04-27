import { createSlice } from '@reduxjs/toolkit';

const librarySyncSlice = createSlice({
  name: 'librarySync',
  initialState: {
    changeVersion: 0,
  },
  reducers: {
    touchLibraryChange: (state) => {
      state.changeVersion += 1;
    },
  },
});

export const { touchLibraryChange } = librarySyncSlice.actions;
export const selectLibraryChangeVersion = (state) => state.librarySync.changeVersion;

export default librarySyncSlice.reducer;
