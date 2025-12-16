
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyAaVr5Kij4MUlqZF_1WpeQtpSwPfI5-Nro",
  authDomain: "medtrust-a481c.firebaseapp.com",
  projectId: "medtrust-a481c",
  storageBucket: "medtrust-a481c.firebasestorage.app",
  messagingSenderId: "901319230783",
  appId: "1:901319230783:web:a672ff3c100a5da123ff8a",
  measurementId: "G-N5DMCR8J1D",
};


const app = initializeApp(firebaseConfig);


const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
