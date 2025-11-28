# Environment Setup Guide

## .env Dosyası Oluşturma

Projeyi çalıştırmak için `.env` dosyası oluşturmanız gerekmektedir.

### Adımlar

1. Proje root dizininde `.env` dosyası oluşturun
2. Aşağıdaki template'i kopyalayıp değerlerinizi girin:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mobile_provider_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_minimum_32_characters
JWT_EXPIRES_IN=24h

# API Gateway Configuration (if using external service)
GATEWAY_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### Önemli Notlar

1. **JWT_SECRET**: Production'da mutlaka güçlü bir secret key kullanın (en az 32 karakter)
   ```bash
   # Random secret oluşturma (Linux/Mac)
   openssl rand -base64 32
   
   # Windows PowerShell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   ```

2. **DB_PASSWORD**: PostgreSQL şifrenizi girin

3. **GATEWAY_URL**: Eğer bir API Gateway kullanıyorsanız, gateway URL'ini buraya ekleyin

### Örnek Production .env

```env
PORT=3000
NODE_ENV=production
DB_HOST=your-database-server.postgres.database.azure.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=admin_user
DB_PASSWORD=your_secure_password_here
JWT_SECRET=production_secret_key_minimum_32_characters_long_random_string
JWT_EXPIRES_IN=24h
GATEWAY_URL=https://your-api-gateway-url.com
LOG_LEVEL=error
```

### Güvenlik

- `.env` dosyasını asla Git'e commit etmeyin (zaten .gitignore'da)
- Production'da environment variables'ı platform'unuzun (Azure, AWS, Render) environment settings'inden yönetin
- Database şifrelerini ve JWT secret'ları güvenli tutun

