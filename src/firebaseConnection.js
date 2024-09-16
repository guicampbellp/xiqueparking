import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

const firebaseConfig = {
  apiKey: "AIzaSyDlJQODT8nbeycOADSDK81Sjy0l92_zvi8",
  authDomain: "faixa-e3fff.firebaseapp.com",
  projectId: "faixa-e3fff",
  storageBucket: "faixa-e3fff.appspot.com",
  messagingSenderId: "120294129513",
  appId: "1:120294129513:web:8f43f1b6ad5fc64aa307f8",
  measurementId: "G-MELE4590GB"
};

// Inicializa o app Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
const db = getFirestore(app);

// Inicializa o Auth com Expo SecureStore para persistência
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(SecureStore)
});

export { db, auth };
