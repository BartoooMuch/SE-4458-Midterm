# Firebase Kurulum Adımları

## ADIM 1: Firebase Console'a Git
1. Tarayıcıda şu adrese git: https://console.firebase.google.com/
2. Google hesabınla giriş yap

## ADIM 2: Yeni Proje Oluştur
1. "Add project" veya "Proje ekle" butonuna tıkla
2. Proje adı gir (örn: "midterm-chat-app" veya "se4458-chat")
3. "Continue" tıkla
4. Google Analytics'i atla (isteğe bağlı - "Not now" seç)
5. "Create project" tıkla
6. Birkaç saniye bekle, proje oluşturulacak
7. "Continue" tıkla

## ADIM 3: Firestore Database Etkinleştir
1. Sol menüden "Firestore Database" seç (veya "Build" > "Firestore Database")
2. "Create database" butonuna tıkla
3. **ÖNEMLİ:** "Start in test mode" seç (geliştirme için)
4. "Next" tıkla
5. Lokasyon seç (Türkiye için: "europe-west" veya "europe-central")
6. "Enable" tıkla
7. Birkaç saniye bekle, database oluşturulacak

## ADIM 4: Frontend Config Bilgilerini Al
1. Sol üstte ⚙️ (Settings) ikonuna tıkla
2. "Project settings" seç
3. "General" sekmesinde aşağı kaydır
4. "Your apps" bölümüne gel
5. Web ikonuna tıkla (`</>`)
6. App nickname gir (örn: "chat-frontend")
7. "Register app" tıkla
8. **BURASI ÖNEMLİ:** Çıkan config objesini kopyala:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
9. Bu değerleri not al (bir sonraki adımda kullanacağız)

## ADIM 5: Service Account Key Al (Chat Service için)
1. Hala "Project settings" sayfasındasın
2. "Service accounts" sekmesine tıkla
3. "Generate new private key" butonuna tıkla
4. Uyarı penceresinde "Generate key" tıkla
5. JSON dosyası indirilecek - **BUNU AÇ VE İÇERİĞİNİ NOT AL**
   - `project_id` değerini not al
   - `private_key` değerini not al (tam halini, \n karakterleriyle birlikte)
   - `client_email` değerini not al

## ADIM 6: Firestore Security Rules (Geliştirme için)
1. Sol menüden "Firestore Database" > "Rules" sekmesine git
2. Şu kuralları yapıştır:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /messages/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. "Publish" butonuna tıkla

## TAMAMLANDI! ✅
Artık Firebase hazır. Bir sonraki adımda environment dosyalarını oluşturacağız.


