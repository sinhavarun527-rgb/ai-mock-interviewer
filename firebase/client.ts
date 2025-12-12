// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzheyM81noLDWfBJUk9kLr5a7A2FrZUgA",
  authDomain: "ai-resume-analyzer-28feb.firebaseapp.com",
  projectId: "ai-resume-analyzer-28feb",
  storageBucket: "ai-resume-analyzer-28feb.firebasestorage.app",
  messagingSenderId: "760643537080",
  appId: "1:760643537080:web:1256f2d7a67d3a35ac0c4d",
  measurementId: "G-LWQ5W9PVK2"
};

// Initialize Firebase App (avoid re-initialization)
// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
