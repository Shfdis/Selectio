import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import HomeLoading from '../components/HomeLoading';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import LoginRegisterChoice from '../components/LoginRegisterChoice';

export default function Home() {
  const { data: currentUser, isLoading, error } = useGetCurrentUserQuery();
  const navigation = useNavigation();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!currentUser || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigation.navigate('main');
  }, [currentUser, navigation]);

  if (!currentUser && isLoading) {
    return <HomeLoading />;
  } else if (!currentUser) {
    return <LoginRegisterChoice />;
  }
  return <HomeLoading />;
}
