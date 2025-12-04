// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-qDqAbjfa3vpNLPOZyTlp8eRdyzD4J0w",
  authDomain: "swastikmetallive.firebaseapp.com",
  projectId: "swastikmetallive",
  storageBucket: "swastikmetallive.firebasestorage.app",
  messagingSenderId: "72216642800",
  appId: "1:72216642800:web:e01759b40ac80c2dafee35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export services to use in other files
export { db, auth };