import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import HomeLoading from '../components/HomeLoading';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import LoginRegisterChoice from '../components/LoginRegisterChoice';

export default function Home() {
  const { data: currentUser, isLoading, error } = useGetCurrentUserQuery();
  const navigation = useNavigation();

  useEffect(() => {
    if (!currentUser) return;
    navigation.replace('main');
  }, [currentUser, navigation]);

  if (!currentUser && isLoading) {
    return <HomeLoading />;
  } else if (!currentUser) {
    return <LoginRegisterChoice />;
  }
  return <HomeLoading />;
}
