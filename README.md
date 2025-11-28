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
- PostgreSQL Database
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
- PostgreSQL (v12 veya üzeri)
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

5. Database'i oluşturun ve migration'ları çalıştırın:
```bash
# PostgreSQL'de database oluştur
createdb mobile_provider_db

# SQL dosyasını çalıştır
psql -U postgres -d mobile_provider_db -f database/schema.sql
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

## Deployment

### Azure App Service

1. Azure Portal'da App Service oluşturun (F1 Free tier)
2. PostgreSQL database servisi oluşturun
3. Environment variables'ı Azure'da ayarlayın
4. GitHub Actions veya VS Code extension ile deploy edin

### Render.com

1. GitHub repository'yi bağlayın
2. PostgreSQL database ekleyin
3. Environment variables'ı ayarlayın
4. Build command: `npm install`
5. Start command: `npm start`

## Issues Encountered

1. **Rate Limiting**: Günlük limit kontrolü için database tablosu kullanıldı. Alternatif olarak Redis kullanılabilir.
2. **Partial Payment**: Kalan tutar hesaplama logic'i dikkatli implement edildi.
3. **CSV Batch Import**: Büyük dosyalar için streaming parser kullanıldı.

## API Documentation

Swagger UI: `http://localhost:3000/api-docs`

Swagger dokümantasyonu tüm endpoint'leri, parametreleri ve response formatlarını içermektedir.

## Testing

Detaylı test rehberi için: [docs/TESTING.md](docs/TESTING.md)

Hızlı test için:
```bash
# Health check
curl http://localhost:3000/health

# Login (test user)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "password123"}'
```

## Deployment

Detaylı deployment rehberi için: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Hızlı Deployment (Azure)

1. Azure Portal'da App Service oluşturun (F1 Free tier)
2. PostgreSQL database ekleyin
3. Environment variables'ı ayarlayın
4. GitHub'dan deploy edin

### Deployment (Render.com)

1. GitHub repository'yi bağlayın
2. PostgreSQL database ekleyin
3. Environment variables'ı ayarlayın
4. Build: `npm install`, Start: `npm start`

## API Gateway

API Gateway yapılandırma detayları için: [docs/API_GATEWAY.md](docs/API_GATEWAY.md)

## Code Repository

**GitHub Repository:** [https://github.com/yourusername/mobile-provider-bill-payment-api](https://github.com/yourusername/mobile-provider-bill-payment-api)

> **Not:** Repository linkini kendi GitHub hesabınızla değiştirin. Projeyi GitHub'a push edin ve linki buraya ekleyin.

**Deployed API (Swagger):** [Deployment URL buraya eklenecek]

> **Not:** Azure/Render.com'a deploy ettikten sonra Swagger URL'ini buraya ekleyin.

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

#### 8. Database & Data Model ✅
- ER Diagram göster
- Database tablolarını göster
- Örnek data göster

#### 9. Deployment (Opsiyonel) ✅
- Deployed URL göster (varsa)
- Deployed API'yi test et

## Authors

Bu proje SE 4458 dersi için geliştirilmiştir.

