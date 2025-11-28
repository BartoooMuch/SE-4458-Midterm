# API Testing Guide

## Test Endpoints

### 1. Health Check

```bash
curl http://localhost:3000/health
```

### 2. Authentication

#### Login

```bash
# Admin login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Banking login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "banking",
    "password": "password123"
  }'

# User login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

Response'da `token` alacaksınız. Bu token'ı sonraki request'lerde kullanın:

```bash
TOKEN="your-jwt-token-here"
```

### 3. Mobile Provider App - Query Bill

```bash
curl -X GET "http://localhost:3000/api/v1/bills/query?subscriber_no=5551234567&month=10&year=2024" \
  -H "Authorization: Bearer $TOKEN"
```

**Rate Limit Test:**

Aynı request'i 4 kez çalıştırın. 4. request'te 429 (Rate Limit Exceeded) hatası almalısınız.

### 4. Mobile Provider App - Query Bill Detailed

```bash
curl -X GET "http://localhost:3000/api/v1/bills/query/detailed?subscriber_no=5551234567&month=10&year=2024&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Banking App - Query Unpaid Bills

```bash
# Banking token ile
curl -X GET "http://localhost:3000/api/v1/bills/unpaid?subscriber_no=5551234567" \
  -H "Authorization: Bearer $BANKING_TOKEN"
```

### 6. Web Site - Pay Bill

```bash
# No authentication required
curl -X POST http://localhost:3000/api/v1/bills/pay \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_no": "5551234567",
    "month": 10,
    "year": 2024,
    "amount": 75.50
  }'
```

**Partial Payment Test:**

1. İlk ödeme: 75.50 TL
2. İkinci ödeme: 50.00 TL
3. Kalan tutar: 24.50 TL olmalı

### 7. Admin - Add Bill

```bash
curl -X POST http://localhost:3000/api/v1/admin/bills \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_no": "5551234567",
    "month": 12,
    "year": 2024,
    "total_amount": 180.00,
    "details": [
      {
        "service_type": "voice",
        "description": "Dakika kullanımı",
        "amount": 100.00
      },
      {
        "service_type": "data",
        "description": "İnternet paketi",
        "amount": 80.00
      }
    ]
  }'
```

### 8. Admin - Add Bill Batch (CSV)

```bash
curl -X POST http://localhost:3000/api/v1/admin/bills/batch \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@examples/bills-sample.csv"
```

## Postman Collection

Postman collection oluşturulabilir:

1. Postman → Import → Create Collection
2. Tüm endpoint'leri ekle
3. Environment variables kullan:
   - `base_url`: http://localhost:3000
   - `admin_token`: Admin JWT token
   - `banking_token`: Banking JWT token
   - `user_token`: User JWT token

## Test Scenarios

### Scenario 1: Complete Bill Payment Flow

1. Query unpaid bills (Banking App)
2. Query bill details (Mobile App)
3. Pay bill partially (Web Site)
4. Pay remaining amount (Web Site)
5. Verify bill is fully paid

### Scenario 2: Rate Limiting

1. Query bill 3 times (should succeed)
2. Query bill 4th time (should get 429 error)
3. Wait for next day or manually reset rate_limits table

### Scenario 3: Batch Import

1. Create CSV file with bills
2. Upload via batch endpoint
3. Verify bills in database
4. Test error handling (invalid subscriber, duplicate bill)

### Scenario 4: Authentication

1. Try to access protected endpoint without token (should get 401)
2. Try with invalid token (should get 401)
3. Try with user token on admin endpoint (should get 403)

## Expected Responses

### Success Response Format

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    // If pagination is used
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Database Verification

```sql
-- Check bills
SELECT * FROM bills WHERE subscriber_no = '5551234567';

-- Check transactions
SELECT * FROM transactions WHERE subscriber_no = '5551234567';

-- Check rate limits
SELECT * FROM rate_limits WHERE subscriber_no = '5551234567';

-- Reset rate limits (for testing)
DELETE FROM rate_limits WHERE date = CURRENT_DATE;
```

## Load Testing

Basit load testing için:

```bash
# Apache Bench
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/bills/query?subscriber_no=5551234567&month=10"
```

## Logs

Log dosyaları:
- `logs/combined.log` - Tüm loglar
- `logs/error.log` - Sadece error logları
- Console output - Request/response logları

