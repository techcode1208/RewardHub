import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXiXtmu_okE8ufj10qYi8tj9gWwCWErpc",
  authDomain: "rewardhub-93a2b.firebaseapp.com",
  projectId: "rewardhub-93a2b",
  storageBucket: "rewardhub-93a2b.firebasestorage.app",
  messagingSenderId: "644949034240",
  appId: "1:644949034240:web:7c4daaa6592f72f8049fe5",
  measurementId: "G-TNRBJ5TG2X"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;