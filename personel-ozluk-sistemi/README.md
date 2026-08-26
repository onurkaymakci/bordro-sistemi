# Personel Özlük Sistemi — MVP Backend

`Personel_Ozluk_Sistemi_Baslangic_PRD.docx` dokümanındaki gereksinimlere göre hazırlanmış,
**çok kiracılı (multi-tenant)** bir İK / Personel Özlük Yönetimi API'sinin başlangıç (starter)
kod tabanı. PRD'deki **11. MVP Kapsamı** bölümünde tanımlanan modülleri kapsar.

## Kapsanan Modüller (MVP)

| PRD Bölümü | Modül | Durum |
|---|---|---|
| 11.1 | Dashboard (özet metrikler) | ✅ |
| 11.2 / 5 | Personel Kartı (CRUD, arama, filtreleme) | ✅ |
| 11.4 / 6 | Evrak Yönetimi (yükleme, listeleme, eksik evrak kontrolü) | ✅ |
| 11.5 | İzin Yönetimi (talep, onay/red, iptal) | ✅ |
| 11.6 | Kullanıcı ve Yetki Yönetimi (rol bazlı) | ✅ |
| 11.7 | Bildirim Merkezi (veri modeli hazır, üretim job'ı eklenmeli) | 🟡 |
| 11.8 | Temel Raporlar | ✅ |
| 11.9 | Güvenlik (JWT, şifreli parola, rol bazlı yetki, işlem logları) | ✅ |
| 7 | Şirket bazlı çok kiracılı izolasyon + Şirket Kaydı | ✅ |
| 8.x | AI Özellikleri (Akıllı Evrak Analizi, AI Asistan vb.) | 🔲 V2 — şemada yer ayrıldı (`aiExtractedData`) |

V2 kapsamındaki Bordro, SGK Entegrasyonu, E-İmza, Zimmet arayüzü, Organizasyon Şeması UI'ı
ve Mobil Uygulama bu starter'a **dahil değildir** (PRD Bölüm 12'de belirtildiği gibi).
Zimmet ve Organizasyon tabloları veritabanı şemasında hazır bekletilmiştir.

## Teknoloji Yığını

- **Node.js + Express** — REST API
- **PostgreSQL + Prisma ORM** — veritabanı ve migration yönetimi
- **JWT (jsonwebtoken)** — kimlik doğrulama
- **bcryptjs** — parola hash'leme
- **multer** — evrak/dosya yükleme
- **zod** — istek (request) doğrulama
- **helmet, cors, morgan** — güvenlik ve loglama ara katmanları

## Mimari Notlar

- **Multi-tenant izolasyon:** Her tablo `companyId` ile bir şirkete bağlıdır.
  `scopeToCompany` middleware'i, `SYSTEM_ADMIN` dışındaki tüm kullanıcıları
  otomatik olarak kendi şirketinin verisiyle sınırlar (bkz. `src/middleware/auth.js`).
- **Roller (PRD Bölüm 7):** `SYSTEM_ADMIN`, `KEY_USER` (Anahtar Kullanıcı),
  `HR_SPECIALIST` (İK Uzmanı), `MANAGER` (Yönetici), `EMPLOYEE` (Çalışan).
  Her route, `authorize(...roller)` ile kısıtlanır.
- **Giriş akışı (PRD 10.1):** Şirket Kodu + Kullanıcı Adı/E-posta + Şifre.
  `SYSTEM_ADMIN` şirket koduna ihtiyaç duymaz.
- **Kurulum sırası (kullanıcının PRD'ye eklediği not ile birebir):**
  Şirket → Kullanıcı → Yetki → Personel → Evrak → İzin → Raporlama.

## Kurulum

### 1) Bağımlılıkları yükleyin

```bash
npm install
```

### 2) Ortam değişkenlerini ayarlayın

```bash
cp .env.example .env
# .env içindeki DATABASE_URL ve JWT_SECRET değerlerini kendinize göre düzenleyin
```

### 3) Veritabanını başlatın (Docker ile PostgreSQL)

```bash
docker compose up -d
```

### 4) Prisma migration'larını çalıştırın

```bash
npm run prisma:migrate
```

### 5) (Opsiyonel) Örnek veri ekleyin

```bash
npm run seed
```

Bu komut `DEMO01` şirket kodlu bir demo şirket ve `admin / Sifre12345!`
bilgileriyle bir Anahtar Kullanıcı oluşturur.

### 6) Sunucuyu başlatın

```bash
npm run dev
```

API varsayılan olarak `http://localhost:4000` üzerinde çalışır.
Sağlık kontrolü: `GET /health`

## Örnek API Akışı

```bash
# 1. Yeni şirket + ilk Anahtar Kullanıcı kaydı
curl -X POST http://localhost:4000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme A.S.",
    "companyCode": "ACME01",
    "adminFullName": "Ayşe Yılmaz",
    "adminEmail": "ayse@acme.com",
    "adminPassword": "GucluBirSifre123"
  }'

# 2. Giriş yap
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "companyCode": "ACME01",
    "emailOrUsername": "ayse@acme.com",
    "password": "GucluBirSifre123"
  }'
# -> dönen "token" değerini bir sonraki isteklerde kullanın

# 3. Personel oluştur
curl -X POST http://localhost:4000/api/employees \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "registryNo": "1001",
    "nationalId": "12345678901",
    "fullName": "Mehmet Demir",
    "hireDate": "2026-01-15"
  }'

# 4. Dashboard özetini getir
curl http://localhost:4000/api/dashboard/summary -H "Authorization: Bearer <TOKEN>"
```

## API Uç Noktaları (Özet)

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/auth/register-company` | Yeni şirket + Anahtar Kullanıcı kaydı |
| POST | `/api/auth/login` | Giriş (şirket kodu + kullanıcı + şifre) |
| GET | `/api/auth/me` | Oturum açan kullanıcı bilgisi |
| GET/POST | `/api/employees` | Personel listele / oluştur |
| GET/PUT | `/api/employees/:id` | Personel getir / güncelle |
| POST | `/api/employees/:id/deactivate` | Personeli pasife al |
| POST | `/api/documents` | Evrak yükle (`multipart/form-data`, alan adı `file`) |
| GET | `/api/documents/employee/:employeeId` | Personelin evraklarını listele |
| GET | `/api/documents/missing-report` | Eksik/süresi dolmuş evrak raporu |
| GET/POST | `/api/leaves` | İzin listele / talep oluştur |
| POST | `/api/leaves/:id/decision` | İzin onayla / reddet |
| POST | `/api/leaves/:id/cancel` | İzin talebini iptal et |
| GET | `/api/dashboard/summary` | Dashboard özet metrikleri |
| GET/PUT | `/api/company/me` | Şirket bilgisi getir / güncelle |
| GET/POST | `/api/company/mandatory-documents` | Zorunlu evrak tanımları |
| GET/POST | `/api/company/departments` | Departman/organizasyon yapısı |
| GET/POST | `/api/users` | Kullanıcı listele / oluştur |
| PUT | `/api/users/:id/role` | Rol ata |
| POST | `/api/users/:id/deactivate` | Kullanıcıyı pasifleştir |
| GET | `/api/reports/active-employees` | Aktif çalışan listesi |
| GET | `/api/reports/by-department` | Departman bazlı çalışan listesi |
| GET | `/api/reports/hires-terminations` | İşe giriş / çıkış raporu |
| GET | `/api/reports/leave-summary` | İzin özet raporu |

## GitHub'a Yükleme

```bash
cd personel-ozluk-sistemi
git init
git add .
git commit -m "İlk commit: Personel Özlük Sistemi MVP backend iskeleti"
git branch -M main
git remote add origin <YENİ_REPO_URL>
git push -u origin main
```

`.env` dosyası `.gitignore` içinde olduğu için repoya gitmez — hassas bilgileri
GitHub'a **asla** commit etmeyin.

## Sonraki Adımlar (Yol Haritanıza Göre)

- **Faz 1 tamamlandı:** Veritabanı şeması, kimlik doğrulama, yetkilendirme.
- **Sprint 2–5 karşılığı:** Bu starter'daki personel, evrak, izin, dashboard/rapor
  modülleri PRD'deki Sprint 2–5 çıktılarının backend karşılığıdır.
- **Sprint 6 (Test ve Yayın):** Bu depoya test altyapısı (ör. Jest + Supertest)
  ve CI/CD (GitHub Actions) eklemeniz önerilir.
- **Frontend:** PRD Bölüm 10'daki ekranlar için React/Vue tabanlı ayrı bir
  istemci uygulaması bu API'yi tüketecek şekilde geliştirilebilir.
- **V2:** AI Akıllı Evrak Analizi, AI İK Asistanı, Zimmet ve Organizasyon Şeması
  ekranları, Bordro modülü.

## Lisans

MIT
