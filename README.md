# Mobile Provider Bill Payment System - API

## Proje Açıklaması

Bu proje, Mobile Provider (Turkcell benzeri) fatura ödeme sistemi için REST API'lerini içermektedir. Sistem, mobil uygulama, banka uygulaması ve web sitesi için çeşitli API endpoint'leri sağlamaktadır.

## Özellikler

- RESTful API (Versioned - v1)
- JWT Authentication
- Rate Limiting (Subscriber başına günlük limit)
- Request/Response Logging
- API Gateway Desteği
- Swagger UI Dokümantasyonu
- Azure SQL Database (PostgreSQL'den migrate edildi)
- CSV Batch Import

## API Endpoints

### Mobile Provider App

| Endpoint | Method | Auth | Paging | Description |
|----------|--------|------|--------|-------------|
| `/api/v1/bills/query` | GET | Yes | No | Fatura sorgulama (Günlük 3 limit) |
| `/api/v1/bills/query/detailed` | GET | Yes | Yes | Detaylı fatura sorgulama |

### Banking App

| Endpoint | Method | Auth | Paging | Description |
|----------|--------|------|--------|-------------|
| `/api/v1/bills/unpaid` | GET | Yes | No | Ödenmemiş faturaları sorgulama |

### Web Site

| Endpoint | Method | Auth | Paging | Description |
|----------|--------|------|--------|-------------|
| `/api/v1/bills/pay` | POST | No | No | Fatura ödeme |

### Admin

| Endpoint | Method | Auth | Paging | Description |
|----------|--------|------|--------|-------------|
| `/api/v1/admin/bills` | POST | Yes | No | Tekil fatura ekleme |
| `/api/v1/admin/bills/batch` | POST | Yes | No | CSV'den toplu fatura ekleme |

## Kurulum

### Gereksinimler

- Node.js (v18 veya üzeri)
- Azure SQL Database veya SQL Server
- npm veya yarn

### Adımlar

1. Repository'yi klonlayın:
```bash
git clone <repository-url>
cd Midterm
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. `.env` dosyasını oluşturun:
```bash
cp .env.example .env
```

4. `.env` dosyasındaki database ve JWT secret değerlerini düzenleyin.

5. Database'i oluşturun ve schema'yı çalıştırın:
```bash
# Azure SQL Database'de schema-mssql.sql dosyasını çalıştırın
# Azure Portal Query Editor veya sqlcmd kullanarak:
# sqlcmd -S your-server.database.windows.net -d mobile_provider_db -U your-user -P your-password -i database/schema-mssql.sql
```

6. Sunucuyu başlatın:
```bash
npm start
# veya development için
npm run dev
```

7. Swagger UI'ya erişin:
```
http://localhost:3000/api-docs
```

## Data Model

### ER Diagram

```
┌─────────────────┐
│   Subscribers   │
├─────────────────┤
│ subscriber_no   │ PK
│ name            │
│ phone_number    │
│ email           │
│ created_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│      Bills      │
├─────────────────┤
│ bill_id         │ PK
│ subscriber_no   │ FK → Subscribers
│ month           │
│ year            │
│ total_amount    │
│ paid_amount     │
│ paid_status     │
│ created_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│ Bill_Details    │
├─────────────────┤
│ detail_id       │ PK
│ bill_id         │ FK → Bills
│ service_type    │
│ description     │
│ amount          │
│ created_at      │
└─────────────────┘

┌─────────────────┐
│   Transactions  │
├─────────────────┤
│ transaction_id  │ PK
│ bill_id         │ FK → Bills
│ subscriber_no   │ FK → Subscribers
│ amount          │
│ payment_date    │
│ status          │
│ created_at      │
└─────────────────┘

┌─────────────────┐
│   Rate_Limits   │
├─────────────────┤
│ id              │ PK
│ subscriber_no   │ FK → Subscribers
│ endpoint        │
│ call_count      │
│ date            │
│ created_at      │
└─────────────────┘

┌─────────────────┐
│     Users       │
├─────────────────┤
│ user_id         │ PK
│ username        │ UNIQUE
│ password_hash   │
│ role            │ (admin/banking/user)
│ subscriber_no   │ FK → Subscribers (nullable)
│ created_at      │
└─────────────────┘
```

### Database Tables

- **Subscribers**: Abone bilgileri
- **Bills**: Fatura kayıtları
- **Bill_Details**: Fatura detayları (dakika, SMS, internet kullanımı vb.)
- **Transactions**: Ödeme işlemleri
- **Rate_Limits**: Rate limiting için günlük çağrı limitleri

## Design Decisions & Assumptions

### 1. Authentication
- JWT token kullanıldı
- Admin endpoints için ayrı role kontrolü yapıldı
- Banking App ve Mobile App için farklı token tipleri kullanılabilir (şu an aynı JWT)

### 2. Rate Limiting
- Subscriber başına günlük 3 çağrı limiti implement edildi
- Rate limit bilgisi database'de tutuluyor (Rate_Limits tablosu)
- Her gün sıfırlanıyor

### 3. Paging
- Detaylı fatura sorgulama için pagination eklendi
- Default: page=1, limit=10
- Response'da total count ve pagination bilgileri döndürülüyor

### 4. Payment
- Partial payment destekleniyor
- Eğer ödeme tamamlanmazsa, kalan tutar bill'in paid_amount alanında saklanıyor
- Transaction kaydı her ödeme için oluşturuluyor

### 5. Batch Import
- CSV dosyası upload ediliyor
- Format: subscriber_no,month,year,total_amount
- Hata durumlarında rollback yapılıyor

### 6. API Versioning
- `/api/v1/` prefix'i kullanılıyor
- Gelecekte v2 eklenebilir

### 7. Logging
- Winston kullanılarak request ve response logları tutuluyor
- Log formatı: timestamp, method, path, status, latency, ip, auth status

### 8. Error Handling
- Standardized error response format
- HTTP status code'lar doğru kullanılıyor

## API Gateway

Bu proje standalone bir API olarak çalışabilir. Production'da şu seçenekler kullanılabilir:
- AWS API Gateway
- Azure API Management
- Kong Gateway
- Custom Gateway (Express middleware olarak implement edilebilir)

## Technology Stack

- **Backend:** Node.js + Express.js
- **Database:** Azure SQL Database (Cloud)
- **Authentication:** JWT
- **Documentation:** Swagger UI
- **Logging:** Winston
- **Rate Limiting:** Express Rate Limit + Custom DB-based
- **Cloud Platform:** Microsoft Azure

## Issues Encountered

1. **Rate Limiting**: Günlük limit kontrolü için database tablosu kullanıldı. Alternatif olarak Redis kullanılabilir.
2. **Partial Payment**: Kalan tutar hesaplama logic'i dikkatli implement edildi.
3. **CSV Batch Import**: Büyük dosyalar için streaming parser kullanıldı.

## API Documentation

**Local Swagger UI:** 
- API Gateway: `http://localhost:8080/api-docs`
- Direct API: `http://localhost:3000/api-docs`

Swagger dokümantasyonu tüm endpoint'leri, parametreleri ve response formatlarını içermektedir.

## Testing

Hızlı test için:
```bash
# Gateway üzerinden health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'

# Query bill (token ile)
curl -X GET "http://localhost:8080/api/v1/bills/query?subscriber_no=5551234567&month=11&year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Azure Deployment

### Architecture

```
Internet → Azure Web App (Gateway) → Azure Web App (API) → Azure SQL Database
           Port: 443/8080              Port: 443/3000       
```

### Components

1. **API Web App** (`midterm-api-bartu`)
   - Runtime: Node.js 20 LTS
   - Start Command: `npm start`
   - App: `server.js`

2. **Gateway Web App** (`midterm-gateway`)
   - Runtime: Node.js 18 LTS
   - Start Command: `npm run gateway`
   - App: `gateway.js`

3. **Azure SQL Database**
   - Server: `midterm-sql-12.database.windows.net`
   - Database: `mobile-provider-db`
   - Tier: Free (5GB)

## Code Repository

**GitHub Repository:** [https://github.com/BartoooMuch/SE-4458-Midterm](https://github.com/BartoooMuch/SE-4458-Midterm)

> Repository başarıyla GitHub'a yüklendi.

**Deployed API Root:**  
`https://midterm-api-bartu-bkhffpdzbhbhdddu.switzerlandnorth-01.azurewebsites.net`

**Deployed Swagger (direct API):**  
`https://midterm-api-bartu-bkhffpdzbhbhdddu.switzerlandnorth-01.azurewebsites.net/api-docs`

## Video Presentation

**Proje Sunum Videosu:** [Video link buraya eklenecek]

> **Not:** Projeyi anlatan kısa bir video (5-10 dakika) hazırlayın ve YouTube, Google Drive veya başka bir platforma yükleyin. Linki buraya ekleyin.

**Detaylı video içerik rehberi:** [VIDEO_CONTENT_GUIDE.md](VIDEO_CONTENT_GUIDE.md)

### Video'da Gösterilmesi Gerekenler (Ödev Gereksinimleri):

#### 1. API Gateway ✅
- Gateway'in çalıştığını göster
- Gateway URL'ini göster (http://localhost:8080 veya deployed URL)
- Health check endpoint'ini test et

#### 2. Rate Limiting ✅
- Subscriber başına günlük 3 çağrı limiti göster
- Query Bill endpoint'ini 4 kez çağır → 4. çağrıda 429 hatası
- Gateway-level rate limiting göster

#### 3. Logging ✅
- Request-level logs göster:
  - HTTP method, path, timestamp, IP, headers, request size, auth status
- Response-level logs göster:
  - Status code, latency, response size

#### 4. Authentication ✅
- Login endpoint'i → Token alma
- Token olmadan protected endpoint → 401 hatası
- Token ile protected endpoint → 200 OK
- Role-based access control (admin, banking, user)

#### 5. Paging ✅
- Query Bill Detailed endpoint'inde pagination göster
- page, limit parametreleri
- Response'da pagination bilgileri

#### 6. Swagger UI ✅
- Swagger UI'yi aç
- Gateway URL'ini kullandığını göster
- Endpoint testleri yap

#### 7. API Endpoints ✅
**Her endpoint'i test et:**
- `GET /api/v1/bills/query` (Auth: Yes, Rate Limit: 3/day)
- `GET /api/v1/bills/query/detailed` (Auth: Yes, Paging: Yes)
- `GET /api/v1/bills/unpaid` (Auth: Yes)
- `POST /api/v1/bills/pay` (Auth: No)
- `POST /api/v1/admin/bills` (Auth: Yes - Admin)
- `POST /api/v1/admin/bills/batch` (Auth: Yes - Admin)

##### 8. Database & Data Model ✅
- ER Diagram göster
- Azure SQL Database kullanıldığını göster
- Tablolar ve örnek data

#### 9. Azure Deployment ✅
- 2 Web App (API + Gateway)
- Azure SQL Database
- Deployed Swagger UI

## AI Agent Chat Application

### Overview

The AI Agent Chat Application is a conversational interface that allows users to interact with billing services through natural language. The application uses Firebase Firestore for real-time messaging, an LLM (OpenAI or local model) for intent parsing, and integrates with the midterm APIs through the API Gateway.

### Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Port 3000)   │
└────────┬────────┘
         │
         │ WebSocket / HTTP
         │
┌────────▼─────────────────┐
│   Firebase Firestore      │
│   (Real-time Database)    │
└────────┬──────────────────┘
         │
         │ Triggers
         │
┌────────▼──────────────────┐
│   Chat Service            │
│   (Port 3001)             │
│   - Process Messages      │
│   - Parse Intent (LLM)     │
│   - Call Midterm APIs     │
└────────┬──────────────────┘
         │
         │ HTTP
         │
┌────────▼────────┐
│  API Gateway    │
│  (Port 8080)    │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│  Midterm APIs   │
│  (Port 3000)    │
└─────────────────┘
```

### Components

1. **React Frontend** (`frontend/`)
   - Modern chat UI with real-time updates
   - Firebase Firestore integration
   - Action buttons for quick access
   - Responsive design

2. **Chat Service** (`chat-service/`)
   - Express.js backend service
   - Processes messages from Firestore
   - Integrates with LLM for intent parsing
   - Calls midterm APIs through gateway
   - Writes responses back to Firestore

3. **Firebase Firestore**
   - Real-time database for messages
   - Automatic synchronization
   - No backend polling needed

### Setup Instructions

#### 1. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the Firebase configuration object

#### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file in `frontend/` directory:
```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_BACKEND_URL=http://localhost:3001
```

Start the frontend:
```bash
npm start
```

#### 3. Chat Service Setup

```bash
cd chat-service
npm install
```

Create `.env` file in `chat-service/` directory:
```env
# Chat Service Configuration
CHAT_SERVICE_PORT=3001

# Gateway URL
GATEWAY_URL=http://localhost:8080

# Authentication (for calling midterm APIs)
CHAT_USERNAME=user
CHAT_PASSWORD=password123
DEFAULT_SUBSCRIBER_NO=5551234567

# LLM Configuration
# Option 1: Use OpenAI
USE_OPENAI=false
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Option 2: Use Local Model (Ollama, Mistral, etc.)
LOCAL_LLM_URL=http://localhost:11434/api/generate
LOCAL_MODEL_NAME=mistral

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email

# Logging
LOG_LEVEL=info
```

**Firebase Admin SDK Setup:**
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Either:
   - Set `FIREBASE_SERVICE_ACCOUNT_KEY` as the JSON string, OR
   - Extract and set `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL`

Start the chat service:
```bash
npm start
```

#### 4. Using Local LLM (Ollama)

If you want to use a local LLM instead of OpenAI:

1. Install Ollama: https://ollama.ai/
2. Pull a model:
   ```bash
   ollama pull mistral
   # or
   ollama pull llama2
   ```
3. Set in `.env`:
   ```env
   USE_OPENAI=false
   LOCAL_LLM_URL=http://localhost:11434/api/generate
   LOCAL_MODEL_NAME=mistral
   ```

### Running the Complete System

1. **Start the API Server:**
   ```bash
   npm start
   ```

2. **Start the API Gateway:**
   ```bash
   npm run gateway
   ```

3. **Start the Chat Service:**
   ```bash
   cd chat-service
   npm start
   ```

4. **Start the Frontend:**
   ```bash
   cd frontend
   npm start
   ```

The frontend will be available at `http://localhost:3000`

### Design Decisions & Assumptions

#### 1. Architecture Pattern
- **Firestore for Real-time Messaging**: Chosen for automatic synchronization and real-time updates without polling
- **Separate Chat Service**: Isolated service for message processing to maintain separation of concerns
- **API Gateway Pattern**: All API calls go through the gateway as required

#### 2. Intent Parsing
- **LLM Integration**: Uses OpenAI GPT-3.5-turbo or local models (Ollama/Mistral) for natural language understanding
- **Fallback Parsing**: Keyword-based fallback if LLM is unavailable
- **Intent Types**: Supports three intents:
  - `query_bill`: Basic bill query
  - `query_bill_detailed`: Detailed bill breakdown
  - `pay_bill`: Bill payment

#### 3. Authentication
- **Constant Credentials**: Uses constant username/password for authentication as per requirements
- **Token Caching**: Caches JWT tokens to reduce authentication overhead
- **No Auth for Pay Bill**: Pay bill endpoint doesn't require authentication

#### 4. Error Handling
- **Graceful Degradation**: Falls back to keyword matching if LLM fails
- **User-Friendly Messages**: Provides helpful error messages to users
- **Logging**: Comprehensive logging for debugging

#### 5. Real-time Updates
- **Firestore Listeners**: Uses Firestore `onSnapshot` for real-time message updates
- **No Polling**: Eliminates need for polling or manual refresh

### Supported Intents

The chat application understands the following intents:

1. **Query Bill**
   - Examples: "I want to check my bill", "Show me my bill for January"
   - Calls: `GET /api/v1/bills/query`

2. **Query Bill Detailed**
   - Examples: "Show me the breakdown", "I want detailed bill information"
   - Calls: `GET /api/v1/bills/query/detailed`

3. **Pay Bill**
   - Examples: "I want to pay my bill", "Pay 100 TL for January"
   - Calls: `POST /api/v1/bills/pay`

### Message Flow

1. User sends a message in the React frontend
2. Message is saved to Firestore
3. Frontend calls Chat Service API (`/api/chat/process`)
4. Chat Service:
   - Receives the message
   - Calls LLM to parse intent and extract parameters
   - Calls appropriate midterm API through gateway
   - Formats the response
   - Writes response back to Firestore
5. Frontend automatically updates via Firestore listener
6. User sees the response in real-time

### Issues Encountered

1. **Firebase Admin SDK Configuration**: Required careful setup of service account credentials
2. **LLM Response Parsing**: LLM responses need robust JSON parsing with fallback
3. **Real-time Synchronization**: Firestore listeners need proper cleanup to avoid memory leaks
4. **CORS Configuration**: Required proper CORS setup for frontend-backend communication
5. **Token Management**: JWT token caching and refresh logic needed optimization

### Testing

Test the chat application:

1. Start all services (API, Gateway, Chat Service, Frontend)
2. Open the frontend in browser
3. Try natural language queries:
   - "I want to check my bill for January"
   - "Show me the breakdown of my bill"
   - "I want to pay 50 TL for my January bill"

### Video Presentation

**Video Link:** [Add your video link here]

> **Note:** Create a short video (5-10 minutes) demonstrating:
> - Chat application UI
> - Real-time messaging
> - Intent parsing (show LLM integration)
> - API calls through gateway
> - Response formatting
> - Error handling

## Authors

Bu proje SE 4458 dersi için geliştirilmiştir.

