
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// إعدادات Firebase الخاصة بمشروع marwan2026
const firebaseConfig = {
  apiKey: "AIzaSyAzNAWN9uwhKl0zoQK9eD15fMXNnvgvwhk",
  authDomain: "marwan2026.firebaseapp.com",
  projectId: "marwan2026",
  storageBucket: "marwan2026.firebasestorage.app",
  messagingSenderId: "217607910806",
  appId: "1:217607910806:web:10f0db763affcb8170d9b7",
  measurementId: "G-B2935HWXVG"
};

// تهيئة التطبيق وقاعدة البيانات
let app;
let dbInstance;

try {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    console.log("تم تهيئة Firebase بنجاح لمشروع marwan2026");
} catch (error) {
    console.error("فشل تهيئة Firebase:", error);
}

export const firestore = dbInstance;
