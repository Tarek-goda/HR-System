import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth'; // إذا كنت تحتاج الـ Authentication
import { getFirestore, provideFirestore } from '@angular/fire/firestore'; // إذا كنت تحتاج قاعدة البيانات

import { routes } from './app.routes';
// 1. ضع هنا بيانات الفايربيز الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    
    // 2. تهيئة الفايربيز بالنظام الحديث
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),       // تفعيل الخدمات التي تحتاجها فقط
    provideFirestore(() => getFirestore()) 
  ]
};