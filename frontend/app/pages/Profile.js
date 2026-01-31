import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { removeToken } from '../utils/secureStore';
import { userApi } from '../slices/userSlice';

export default function Profile() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 100 }}>WE WOOOORK</Text>
      <Pressable
        onPress={async () => {
          await removeToken();
          // Clear cached /me so Home doesn't instantly redirect back to profile
          dispatch(userApi.util.resetApiState());
          // Reset stack so back can't return to profile
          navigation.reset({
            index: 0,
            routes: [{ name: 'home' }],
          });
        }}
      >
        <Text style={{ fontSize: 48 }}>logout</Text>
      </Pressable>
    </View>
  );
}