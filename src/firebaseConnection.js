import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore'
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import AsyncStorage from "@react-native-async-storage/async-storage";
const firebaseConfig = {
  apiKey: "AIzaSyDlJQODT8nbeycOADSDK81Sjy0l92_zvi8",
  authDomain: "faixa-e3fff.firebaseapp.com",
  projectId: "faixa-e3fff",
  storageBucket: "faixa-e3fff.appspot.com",
  messagingSenderId: "120294129513",
  appId: "1:120294129513:web:8f43f1b6ad5fc64aa307f8",
  measurementId: "G-MELE4590GB"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
})
export { db, auth };