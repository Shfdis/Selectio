import * as SecureStore from 'expo-secure-store';

const tokenKey = 'auth_token';

export const saveToken = async (token) => {
  try {
    await SecureStore.setItemAsync(tokenKey, token);
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(tokenKey);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(tokenKey);
  } catch (error) {
    console.error('Error removing token:', error);
    throw error;
  }
};
