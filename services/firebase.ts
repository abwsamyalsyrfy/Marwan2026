
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * إعدادات Firebase
 * لاستخدام قاعدة بيانات جديدة ونظيفة، قم باستبدال القيم أدناه بمفاتيح مشروعك الجديد 
 * من وحدة تحكم Firebase (Firebase Console -> Project Settings).
 */
const firebaseConfig = {
  apiKey: "ضع_مفتاح_API_الجديد_هنا",
  authDomain: "your-new-project.firebaseapp.com",
  projectId: "your-new-project-id",
  storageBucket: "your-new-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};

// تهيئة التطبيق
let app;
let dbInstance = null;

try {
    // التحقق من أن المستخدم قام بتغيير القيم الافتراضية
    const isConfigured = firebaseConfig.apiKey !== "ضع_مفتاح_API_الجديد_هنا" && firebaseConfig.apiKey !== "";
    
    if (isConfigured) {
        app = initializeApp(firebaseConfig);
        dbInstance = getFirestore(app);
        console.log("✅ Firebase: متصل بنجاح بالسحابة");
    } else {
        console.warn("⚠️ Firebase: مفاتيح الاتصال مفقودة. سيتم العمل بنمط التخزين المحلي (Offline Mode)");
    }
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
}

export const firestore = dbInstance;
