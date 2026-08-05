# 💧 Suv Yetkazib Berish Tizimi

18.9L idishlarda suv yetkazib berish biznesi uchun to'liq tizim: **mijoz Telegram boti**,
**admin web panel** va **kuryer Telegram boti**. TZ hujjatida kelishilgan barcha funksiyalar
(katalog, buyurtma, idish qarzdorligi, kuryerga taqsimlash, Yandex Navigator, statistika,
rol asosidagi ruxsatlar) shu kodda amalga oshirilgan.

## 📁 Loyiha tuzilishi

```
water-system/
├── backend/          # Express.js API + SQLite baza (barcha mantiq shu yerda)
├── admin-panel/       # Statik HTML/JS admin panel (backend orqali xizmat qiladi)
├── customer-bot/      # Mijozlar uchun Telegram bot (Telegraf)
└── courier-bot/       # Kuryerlar uchun Telegram bot (Telegraf)
```

**Muhim izoh:** TZ'da PostgreSQL tavsiya qilingan edi, lekin joriy sinov muhitida tarmoq
cheklovi tufayli Prisma/PostgreSQL binary fayllarini yuklab bo'lmadi, shu sabab backend
**better-sqlite3** (fayl asosidagi SQLite baza) bilan yozildi. Bu kichik-o'rta hajmdagi
biznes uchun (kuniga bir necha yuzlab buyurtma) to'liq yetarli va hech qanday alohida
baza-server o'rnatishni talab qilmaydi. Agar kelajakda PostgreSQL'ga o'tish kerak bo'lsa,
faqat `backend/src/db.js` va `backend/src/routes/*.js` fayllaridagi SQL so'rovlarini mos
draiverга (masalan `pg` kutubxonasi) moslashtirish kifoya — biznes mantiq o'zgarmaydi.

---

## 1️⃣ Backend'ni ishga tushirish

```bash
cd backend
npm install
cp .env.example .env
npm run seed      # boshlang'ich Admin/Operator va namunaviy mahsulotlarni yaratadi
npm run dev        # serverni ishga tushiradi (http://localhost:4000)
```

Seed skripti quyidagilarni yaratadi:
- **Admin**: login `admin`, parol `admin123`
- **Operator**: login `operator`, parol `operator123`
- 2 ta namunaviy mahsulot va ombordagi 200 ta to'liq idish

> ⚠️ Productionga chiqarishdan oldin `.env` faylidagi `JWT_SECRET`ni va yuqoridagi
> standart parollarni albatta almashtiring (admin panel orqali yoki bazada to'g'ridan-to'g'ri).

Backend ishga tushgach, **admin panel avtomatik shu server orqali xizmat qiladi**:
👉 **http://localhost:4000/login.html**

---

## 2️⃣ Admin Web Panel

Alohida o'rnatish shart emas — backend uni statik fayl sifatida serve qiladi. Xususiyatlari:

| Bo'lim | Admin | Operator |
|---|---|---|
| Zakazlar oqimi (kanban: Yangi/Biriktirilgan/Yetkazilmoqda/Yopilgan) | ✅ | ✅ |
| Kuryerga biriktirish | ✅ | ✅ |
| Buyurtmani bekor qilish | ✅ | ❌ |
| Kuryerlar ro'yxati (ko'rish) | ✅ | ✅ |
| Kuryer qo'shish / tahrirlash | ✅ | ❌ |
| Idishlar balansi (ko'rish) | ✅ | ✅ |
| Omborni to'ldirish | ✅ | ❌ |
| Mijozlar va qarzdorlik ro'yxati | ✅ | ✅ |
| Statistika / hisobotlar | ✅ | ❌ (tab ko'rinmaydi) |
| Mahsulot va narx boshqaruvi | ✅ | ❌ (tab ko'rinmaydi) |

Idish qarzdorligi siyosati TZ'da kelishilganidek: chegara oshsa buyurtma **bloklanmaydi**,
faqat mijozlar jadvalida ⚠️ belgi bilan ko'rsatiladi.

---

## 3️⃣ Mijoz Telegram botini ishga tushirish

1. Telegram'da [@BotFather](https://t.me/BotFather) orqali yangi bot yarating, tokenni oling.
2. ```bash
   cd customer-bot
   npm install
   cp .env.example .env
   # .env faylini oching va BOT_TOKEN qiymatini kiriting
   npm start
   ```
3. Botga `/start` bosing — mijoz oqimi: katalog → miqdor → telefon → lokatsiya → buyurtma tasdig'i.
4. `📦 Idish qarzim` tugmasi orqali joriy qarzdorlikni ko'rish mumkin.

**To'lov**: faqat naqd pul, kuryerga qo'lda to'lanadi (TZ'da kelishilganidek).

---

## 4️⃣ Kuryer Telegram botini ishga tushirish

1. BotFather orqali **ikkinchi, alohida** bot yarating (mijoz boti bilan bir xil bo'lmasin).
2. ```bash
   cd courier-bot
   npm install
   cp .env.example .env
   # .env faylini oching va BOT_TOKEN qiymatini kiriting
   npm start
   ```
3. Kuryer botga `/start` bossa, lekin admin panelda hali ro'yxatga olinmagan bo'lsa —
   bot unga Telegram ID'sini ko'rsatadi. Shu ID'ni admin panelning **Kuryerlar** bo'limida
   "+ Kuryer qo'shish" orqali kiriting.
4. Ro'yxatga olingach, kuryer `/start`ni qayta bossa, `📋 Zakazlarim` tugmasi orqali
   biriktirilgan buyurtmalarni, mijoz manzilini va **🗺 Yandex Navigator** tugmasini ko'radi.
5. Yetkazib berilgach, "✅ Yopish" tugmasi bosiladi va bot ketma-ket ikkita savol beradi:
   *"Nechta idish berildi?"* va *"Nechta bo'sh idish qaytarib olindi?"* — javoblar asosida
   mijozning idish qarzi va kuryerdagi bo'sh idishlar avtomatik yangilanadi.

---

## 🔄 To'liq oqim (misol)

1. Mijoz botda 2 ta suv buyurtma qiladi → buyurtma **"Yangi"** holatida admin panelda paydo bo'ladi.
2. Admin/Operator uni faol kuryerga biriktiradi → holat **"Biriktirilgan"**ga o'tadi.
3. Kuryer o'z botida buyurtmani ko'radi, "Yo'lga chiqdi" deb belgilanishi mumkin (admin panelda) → **"Yetkazilmoqda"**.
4. Kuryer yetkazib berib, botda "2 ta berildi / 1 ta qaytarildi" deb belgilaydi → holat **"Yopilgan"**ga o'tadi, mijozning idish qarzi +1ga oshadi, kuryerda 1 ta bo'sh idish qoladi.
5. Kuryer bazaga qaytganda, admin panelda "Omborga qaytarish" orqali kuryerdagi bo'sh idishlarni omborga o'tkazadi.
6. Admin **Statistika** bo'limida kunlik/haftalik/oylik tushum, top mijozlar va kuryerlar samaradorligini ko'radi.

---

## 🗄 Ma'lumotlar bazasi sxemasi (qisqacha)

- **customers** — mijozlar, telefon, lokatsiya, `bottlesOwed` (idish qarzi)
- **products** — mahsulotlar (suv turlari) va narxlari
- **couriers** — kuryerlar, `bottlesWithCourier` (kuryerdagi bo'sh idishlar)
- **admin_users** — admin panel foydalanuvchilari (`role`: admin | operator)
- **orders** / **order_items** — buyurtmalar va ularning tarkibi
- **warehouse** — ombordagi to'liq/bo'sh idishlar soni (yagona qator)

## 🔐 Xavfsizlik bo'yicha eslatmalar (production uchun)

- `.env` fayllardagi standart parollar va `JWT_SECRET`ni albatta almashtiring.
- Backend'ni HTTPS ortida (masalan Nginx reverse proxy bilan) joylashtiring.
- `customer-bot` va `courier-bot` sessiyalari hozircha xotirada (Map) saqlanadi — bot qayta
  ishga tushirilsa, tugallanmagan buyurtma jarayonlari yo'qoladi. Katta yuklama kutilsa,
  Redis asosidagi sessiyaga o'tish tavsiya etiladi.
- SQLite bitta serverda yaxshi ishlaydi; agar kelajakda bir nechta serverga
  gorizontal masshtablash kerak bo'lsa, PostgreSQL'ga o'tish tavsiya etiladi.

## 🚀 Keyingi qadamlar (ixtiyoriy kengaytmalar)

- To'lov tizimlarini ulash (Click/Payme) — hozircha faqat naqd pul.
- Chegirma/aksiya tizimi — TZ bo'yicha hozircha talab qilinmagan.
- Kuryer lokatsiyasini jonli kuzatish (live tracking) admin panelda xaritada.
- Zaxira nusxalash (backup) — `backend/data.db` faylini muntazam nusxalash kifoya (masalan cron orqali).
