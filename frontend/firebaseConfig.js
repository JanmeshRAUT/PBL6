// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAaVr5Kij4MUlqZF_1WpeQtpSwPfI5-Nro",
  authDomain: "medtrust-a481c.firebaseapp.com",
  databaseURL: "https://medtrust-a481c-default-rtdb.firebaseio.com",
  projectId: "medtrust-a481c",
  storageBucket: "medtrust-a481c.firebasestorage.app",
  messagingSenderId: "901319230783",
  appId: "1:901319230783:web:a672ff3c100a5da123ff8a",
  measurementId: "G-N5DMCR8J1D"
};


// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Authentication
const auth = getAuth(app);

// ✅ Export app & auth for use in other files
export { app, auth };