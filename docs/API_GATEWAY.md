# API Gateway Configuration

## Overview

Bu proje standalone bir API olarak çalışabilir, ancak production ortamında bir API Gateway kullanılması önerilir.

## API Gateway Seçenekleri

### 1. AWS API Gateway

AWS API Gateway kullanarak API'yi yapılandırma:

1. **API Gateway Oluşturma**
   - AWS Console → API Gateway → Create API
   - REST API seçin
   - Regional endpoint seçin

2. **Resource ve Method Oluşturma**
   ```
   /api/v1/bills/query
   /api/v1/bills/query/detailed
   /api/v1/bills/unpaid
   /api/v1/bills/pay
   /api/v1/admin/bills
   /api/v1/admin/bills/batch
   /api/v1/auth/login
   ```

3. **Integration Setup**
   - Integration type: HTTP Proxy
   - Endpoint URL: `http://your-api-server:3000`
   - HTTP method: Passthrough

4. **Rate Limiting**
   - Throttle: API Gateway seviyesinde rate limiting eklenebilir
   - Usage plans ile kullanıcı bazlı limitler

5. **Authentication**
   - Authorizer: Lambda authorizer veya Cognito
   - JWT token validation

6. **Logging**
   - CloudWatch Logs
   - Enable execution logging
   - Log full request/response

7. **Deployment**
   - Create stage (prod, dev, staging)
   - Deploy API

### 2. Azure API Management

Azure API Management kullanarak:

1. **API Management Instance Oluşturma**
   - Azure Portal → Create Resource → API Management
   - Developer tier (ücretsiz) seçilebilir

2. **API Import**
   - OpenAPI/Swagger spec import
   - Backend URL ayarlama

3. **Policies**
   ```xml
   <policies>
     <inbound>
       <rate-limit calls="3" renewal-period="86400" />
       <cors allow-credentials="true">
         <allowed-origins>
           <origin>*</origin>
         </allowed-origins>
       </cors>
     </inbound>
     <backend>
       <forward-request />
     </backend>
     <outbound>
       <log-to-eventhub logger-id="logger">
         <@(context.Request.ToString()) />
       </log-to-eventhub>
     </outbound>
   </policies>
   ```

4. **Authentication**
   - JWT validation policy
   - OAuth 2.0

### 3. Kong Gateway (Self-Hosted)

Kong Gateway kullanarak:

1. **Kong Kurulumu**
   ```bash
   docker run -d --name kong-database \
     -p 5432:5432 \
     -e "POSTGRES_USER=kong" \
     -e "POSTGRES_DB=kong" \
     postgres:13

   docker run -d --name kong \
     --link kong-database:kong-database \
     -e "KONG_DATABASE=postgres" \
     -e "KONG_PG_HOST=kong-database" \
     -p 8000:8000 \
     -p 8443:8443 \
     -p 8001:8001 \
     kong:latest
   ```

2. **Service ve Route Oluşturma**
   ```bash
   curl -i -X POST http://localhost:8001/services/ \
     --data "name=mobile-provider-api" \
     --data "url=http://your-api:3000"

   curl -i -X POST http://localhost:8001/services/mobile-provider-api/routes \
     --data "hosts[]=api.example.com" \
     --data "paths[]=/api"
   ```

3. **Plugin'ler**
   - Rate Limiting: `kong plugin install kong-plugin-rate-limiting`
   - JWT: Built-in JWT plugin
   - Logging: File log veya HTTP log plugin

### 4. Custom Express Gateway (Middleware)

Bu projede Express middleware olarak basit bir gateway eklenebilir:

```javascript
// gateway.js
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use('/api', require('./server'));

app.listen(8080);
```

## Swagger ve Gateway URL

Swagger dokümantasyonunda gateway URL'ini güncellemek için:

1. `.env` dosyasında `GATEWAY_URL` ayarlayın
2. Deploy edildikten sonra gateway URL'ini kullanın

## Logging

API Gateway'de logging için:

- **AWS**: CloudWatch Logs
- **Azure**: Application Insights
- **Kong**: File/HTTP log plugin
- **Custom**: Winston logger (zaten implement edildi)

## Rate Limiting

İki seviyede rate limiting:
1. **Gateway Level**: Genel API rate limiting
2. **Application Level**: Subscriber bazlı günlük limit (3 çağrı/gün)

## Öneriler

1. Production'da mutlaka bir API Gateway kullanın
2. Gateway seviyesinde SSL/TLS zorunlu yapın
3. Rate limiting'i gateway ve application seviyesinde uygulayın
4. Logging'i merkezi bir yerde toplayın
5. Monitoring ve alerting ekleyin

