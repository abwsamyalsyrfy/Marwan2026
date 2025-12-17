
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// تم استخراج هذه الإعدادات من الصورة التي أرسلتها
const firebaseConfig = {
  apiKey: "AIzaSyDyR2S9nr9lO1s3EiQEcBhZHr37U2twldE",
  authDomain: "taskease-11eb8.firebaseapp.com",
  projectId: "taskease-11eb8",
  storageBucket: "taskease-11eb8.firebasestorage.app",
  messagingSenderId: "984875735484",
  appId: "1:984875735484:web:bc6f8db82c684ad988b3b9",
  measurementId: "G-D5WJSWK5LS"
};

// تهيئة التطبيق
let app;
let dbInstance;

try {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

export const firestore = dbInstance;
