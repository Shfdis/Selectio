import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { store } from './store/store';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register'
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import WantToRead from './pages/WantToRead';
import InProgress from './pages/InProgress';
import ReadBooks from './pages/ReadBooks';
import NewReview from './pages/NewReview';
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Mak': require('./assets/fonts/MAK.otf'),
    'Playfair': require('./assets/fonts/PlayfairDisplay.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="home">
          <Stack.Screen 
            name="home" 
            component={Home}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="login"
            component={Login}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="register"
            component={Register}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile"
            component={Profile}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="editProfile"
            component={EditProfile}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="wantToRead"
            component={WantToRead}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="inProgress"
            component={InProgress}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="readBooks"
            component={ReadBooks}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="newReview"
            component={NewReview}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
