import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { CrimsonText_400Regular, CrimsonText_600SemiBold } from '@expo-google-fonts/crimson-text';
import { store } from './store/store';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register'
import EditProfile from './pages/EditProfile';
import WantToRead from './pages/WantToRead';
import InProgress from './pages/InProgress';
import ReadBooks from './pages/ReadBooks';
import NewReview from './pages/NewReview';
import EditReview from './pages/EditReview';
import Book from './pages/Book';
import Community from './pages/Community';
import MyCommunity from './pages/MyCommunity';
import Genre from './pages/Genre';
import AllMySubscriptions from './pages/AllMySubscriptions';
import AllMyCreatedCommunities from './pages/AllMyCreatedCommunities';
import MainScreen from './pages/MainScreen';
import NewCommunity from './pages/NewCommunity';
import EditCommunity from './pages/EditCommunity';
import PostComments from './pages/PostComments';
import NewPost from './pages/NewPost';
import SuggestedPosts from './pages/SuggestedPosts';
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Mak': require('./assets/fonts/MAK.otf'),
    'Playfair': PlayfairDisplay_400Regular,
    'Playfair-SemiBold': PlayfairDisplay_600SemiBold,
    'CrimsonText': CrimsonText_400Regular,
    'CrimsonText-SemiBold': CrimsonText_600SemiBold,
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
      <SafeAreaProvider>
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
            name="main"
            component={MainScreen}
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
          <Stack.Screen
            name="editReview"
            component={EditReview}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="book"
            component={Book}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="community"
            component={Community}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="myCommunity"
            component={MyCommunity}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="newPost"
            component={NewPost}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="postComments"
            component={PostComments}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="suggestedPosts"
            component={SuggestedPosts}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="allMySubscriptions"
            component={AllMySubscriptions}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="allMyCreatedCommunities"
            component={AllMyCreatedCommunities}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="newCommunity"
            component={NewCommunity}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="editCommunity"
            component={EditCommunity}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="genre"
            component={Genre}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
