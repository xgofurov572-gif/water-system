require("dotenv").config();
const http = require("http");
const { Telegraf, Markup, session } = require("telegraf");
const axios = require("axios");

function startCustomerBot(customToken, customApiUrl) {
  const defaultToken = "8696687383:AAEDnnQZ06JXmBYrYUMZme6-5zbxarxTD04";
  const BOT_TOKEN = customToken || process.env.CUSTOMER_BOT_TOKEN || process.env.BOT_TOKEN || defaultToken;
  const API_URL = customApiUrl || process.env.API_URL || "http://localhost:4000/api";

  if (!BOT_TOKEN) {
    console.error("❌ Mijoz Boti: BOT_TOKEN ko'rsatilmagan");
    return;
  }

  const bot = new Telegraf(BOT_TOKEN);
  const httpAgent = new http.Agent({ keepAlive: true });
  const api = axios.create({ baseURL: API_URL, httpAgent });

  bot.use(session({ defaultSession: () => ({}) }));

// ===================== I18N =====================
const i18n = {
  uz: {
    welcome: "Suv yetkazib berish botiga xush kelibsiz! 💧\nQuyidagi menyudan foydalaning:",
    oferta: "Hurmatli mijoz!\n\nBotdan foydalanishdan oldin <b>OS-MAR water ommaviy ofertasi</b> bilan tanishib chiqing. Ofertani o'qish uchun pastdagi tugmani bosing.\n\nO'qib chiqqaningizdan so'ng «✅ Roziman» tugmasini bosing.",
    oferta_btn: "📄 Ommaviy ofertani o'qish",
    oferta_text: "<b>OS-MAR WATER — Ommaviy Oferta Shartnomasi</b>\n\n<b>1. Umumiy qoidalar</b>\nTelegram-bot orqali buyurtma berish — ushbu Oferta shartlarini to'liq qabul qilganlik hisoblanadi.\n\n<b>2. Xizmatning mohiyati</b>\nKompaniya mijozlarga 18.9 litrli idishlarda ichimlik suvi yetkazib berish xizmatini amalga oshiradi.\n- Minimal buyurtma miqdori — 5 ta idish.\n\n<b>3. Narxlar va to'lov</b>\nTo'lov ikki usulda amalga oshiriladi: Naqd pul yoki Karta orqali. Buyurtma yetkazilgandan so'ng to'lov qilinadi.\n\n<b>4. Idishlar va qaytarish</b>\n18.9 litrli plastik idishlar kompaniya mulki hisoblanadi. Keyingi yetkazib berishda mijoz bo'sh idishlarni kuryerga topshirishi shart. Agar idish yo'qotilsa yoki yaroqsiz holatga keltirilsa, har bir idish uchun 50,000 so'm miqdorida jarima (qoplab berish to'lovi) belgilanadi.\n\n<b>5. Yetkazib berish</b>\nYetkazib berish faqat bot orqali ko'rsatilgan manzilga amalga oshiriladi.\n\n<b>6. Shaxsiy ma'lumotlar</b>\nMijoz tomonidan berilgan ism, telefon raqami va joylashuv faqat buyurtmani yetkazib berish uchun ishlatiladi.",
    agree: "✅ Roziman",
    ask_name: "Iltimos, ism va familiyangizni kiriting:",
    catalog: "🛒 Katalog",
    orders: "📦 Mening buyurtmalarim",
    settings: "⚙️ Sozlamalar",
    debt: "📦 Idish qarzim",
    update_phone: "📞 Telefonni yangilash",
    update_loc: "📍 Manzilni yangilash",
    change_lang: "🇺🇿/🇷🇺 Tilni o'zgartirish",
    back: "⬅️ Orqaga",
    no_products: "Hozircha katalogda mahsulot yo'q. Keyinroq urinib ko'ring.",
    choose_water: "Quyidagi suvlardan birini tanlang:",
    how_many: "Nechta kerak? (Eng kami 5 ta)",
    custom_qty: "✍️ Boshqa son kiritish",
    enter_custom_qty: "Qancha mahsulot kerak? (Eng kami 5 ta, raqamda yozing):",
    qty_too_low: "❌ Eng kam buyurtma miqdori 5 ta bo'lishi kerak. Iltimos qaytadan kiriting:",
    qty_invalid: "❌ Noto'g'ri raqam. Qaytadan kiriting:",
    added_to_cart: "✅ Savatga qo'shildi!",
    continue_shop: "🛒 Davom etish",
    go_cart: "🛍 Savatga o'tish",
    cart_empty: "Savat bo'm-bo'sh 😔",
    cart_title: "🛍 <b>Sizning savatingiz:</b>",
    clear_cart: "🗑 Savatni tozalash",
    checkout: "✅ Buyurtma berish",
    cleared: "🗑 Savat tozalandi.",
    confirm_yes: "✅ Tasdiqlash",
    confirm_no: "❌ Bekor qilish",
    confirm_question: "Buyurtmani tasdiqlaysizmi?",
    order_cancelled: "🚫 Buyurtma bekor qilindi.",
    send_contact: "Buyurtmani rasmiylashtirish va bog'lanish uchun telefon raqamingizni yuboring 👇",
    phone_ok: "✅ Telefon raqam qabul qilindi.",
    send_loc: "Endi yetkazib berish manzilini (lokatsiya) yuboring 👇",
    loc_ok: "✅ Lokatsiya qabul qilindi.",
    choose_payment: "💵 To'lov turini tanlang:",
    pay_cash: "💵 Naqd pul",
    pay_card: "💳 Karta",
    confirm_title: "📝 <b>Buyurtmani tasdiqlash</b>",
    ask_address: "📍 Agar manzilni aniqlashtirmoqchi bo'lsangiz (masalan, kvartira yoki podyezd), matn qilib yozing.\n\nYoki shunchaki «Davom etish» tugmasini bosing.",
    skip: "➡️ Davom etish",
    order_ok: (order) => {
      const lines = (order.items || []).map(i =>
        `• ${i.productName}: ${i.quantity} ta × ${Number(i.price).toLocaleString('ru-RU')} = <b>${(i.quantity * i.price).toLocaleString('ru-RU')} so'm</b>`
      ).join('\n');
      return `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n📦 Buyurtma raqami: #${order.id}\n\n${lines}\n\n💰 Jami: <b>${Number(order.totalPrice).toLocaleString('ru-RU')} so'm</b>\n\nKuryer tez orada siz bilan bog'lanadi. 🚚`;
    },
    order_err: "Buyurtma yaratishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
    no_orders: "Hozircha sizda faol buyurtmalar yo'q.",
    my_orders_title: "📦 <b>Sizning oxirgi buyurtmalaringiz:</b>\n",
    status_new: "Kuryer kutilmoqda ⏳",
    status_assigned: "Kuryer tayinlangan 🚚",
    status_delivering: "Yo'lda ▶️",
    status_done: "Yetkazib berildi ✅",
    status_cancelled: "Bekor qilingan ❌",
    no_debt: "👍 Sizda hozircha qarzdorlik yo'q.",
    has_debt: (owed) => `📦 Sizda hozirda ${owed} ta bo'sh idish qarzdorligi bor.`,
    error: "❌ Xatolik yuz berdi, qaytadan urinib ko'ring.",
  },
  ru: {
    welcome: "Добро пожаловать в бот доставки воды! 💧\nИспользуйте меню ниже:",
    oferta: "Уважаемый клиент!\n\nПеред использованием ознакомьтесь с <b>публичной офертой OS-MAR water</b>. Для ознакомления нажмите кнопку ниже.\n\nПосле ознакомления нажмите «✅ Согласен».",
    oferta_btn: "📄 Прочитать публичную оферту",
    oferta_text: "<b>OS-MAR WATER — Публичная Оферта</b>\n\n<b>1. Общие положения</b>\nОформление заказа через Telegram-бот означает полное принятие условий данной Оферты.\n\n<b>2. Суть услуги</b>\nДоставка питьевой воды в бутылях 18.9 л. Минимальный заказ — 5 бутылей.\n\n<b>3. Цены и оплата</b>\nОплата: Наличными или Картой. Оплата производится после доставки.\n\n<b>4. Бутыли и возврат</b>\nБутыли 18.9 л являются собственностью компании. При следующей доставке клиент обязан вернуть пустую тару. При утере или порче тары взимается штраф в размере 50,000 сум за каждую бутыль.\n\n<b>5. Доставка</b>\nОсуществляется только по адресу, указанному в боте.\n\n<b>6. Личные данные</b>\nИмя, телефон и локация используются исключительно для доставки заказа.",
    agree: "✅ Согласен",
    ask_name: "Пожалуйста, введите ваше имя и фамилию:",
    catalog: "🛒 Каталог",
    orders: "📦 Мои заказы",
    settings: "⚙️ Настройки",
    debt: "📦 Долг по таре",
    update_phone: "📞 Обновить телефон",
    update_loc: "📍 Обновить локацию",
    change_lang: "🇷🇺/🇺🇿 Сменить язык",
    back: "⬅️ Назад",
    no_products: "В каталоге пока нет товаров.",
    choose_water: "Выберите одну из следующих вод:",
    how_many: "Сколько нужно? (Минимум 5 шт)",
    custom_qty: "✍️ Ввести другое число",
    enter_custom_qty: "Сколько товаров нужно? (Минимум 5, напишите числом):",
    qty_too_low: "❌ Минимальный заказ 5 шт. Пожалуйста, введите снова:",
    qty_invalid: "❌ Неверное число. Введите снова:",
    added_to_cart: "✅ Добавлено в корзину!",
    continue_shop: "🛒 Продолжить",
    go_cart: "🛍 Перейти в корзину",
    cart_empty: "Корзина пуста 😔",
    cart_title: "🛍 <b>Ваша корзина:</b>",
    clear_cart: "🗑 Очистить корзину",
    checkout: "✅ Оформить заказ",
    cleared: "🗑 Корзина очищена.",
    confirm_yes: "✅ Подтвердить",
    confirm_no: "❌ Отменить",
    confirm_question: "Вы подтверждаете заказ?",
    order_cancelled: "🚫 Заказ отменен.",
    send_contact: "Отправьте ваш номер телефона для оформления заказа 👇",
    phone_ok: "✅ Номер телефона принят.",
    send_loc: "Теперь отправьте локацию доставки 👇",
    loc_ok: "✅ Локация принята.",
    choose_payment: "💵 Выберите тип оплаты:",
    pay_cash: "💵 Наличные",
    pay_card: "💳 Карта",
    confirm_title: "📝 <b>Подтверждение заказа</b>",
    ask_address: "📍 Если хотите уточнить адрес (например, квартиру или подъезд), напишите текстом.\n\nИли просто нажмите «Продолжить».",
    skip: "➡️ Продолжить",
    order_ok: (order) => {
      const lines = (order.items || []).map(i =>
        `• ${i.productName}: ${i.quantity} шт × ${Number(i.price).toLocaleString('ru-RU')} = <b>${(i.quantity * i.price).toLocaleString('ru-RU')} so'm</b>`
      ).join('\n');
      return `✅ <b>Ваш заказ принят!</b>\n\n📦 Номер заказа: #${order.id}\n\n${lines}\n\n💰 Итого: <b>${Number(order.totalPrice).toLocaleString('ru-RU')} so'm</b>\n\nКурьер скоро свяжется с вами. 🚚`;
    },
    order_err: "Произошла ошибка при создании заказа.",
    no_orders: "У вас пока нет активных заказов.",
    my_orders_title: "📦 <b>Ваши последние заказы:</b>\n",
    status_new: "Ожидается курьер ⏳",
    status_assigned: "Курьер назначен 🚚",
    status_delivering: "В пути ▶️",
    status_done: "Доставлено ✅",
    status_cancelled: "Отменено ❌",
    no_debt: "👍 У вас нет задолженности по таре.",
    has_debt: (owed) => `📦 У вас задолженность: ${owed} пустых бутылей.`,
    error: "❌ Произошла ошибка. Попробуйте снова.",
  }
};

function t(ctx, key, ...args) {
  const lang = ctx.session?.lang || "uz";
  const val = i18n[lang]?.[key] || i18n.uz[key];
  return typeof val === "function" ? val(...args) : val;
}

function formatSum(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " so'm";
}

function getMenu(ctx) {
  return Markup.keyboard([
    [t(ctx, "catalog")],
    [t(ctx, "orders"), t(ctx, "settings")],
  ]).resize();
}

function getSettingsMenu(ctx) {
  return Markup.keyboard([
    [t(ctx, "debt"), t(ctx, "update_phone")],
    [t(ctx, "update_loc"), t(ctx, "change_lang")],
    [t(ctx, "back")]
  ]).resize();
}

// ===================== REGISTRATION FLOW =====================
bot.start(async (ctx) => {
  ctx.session.cart = [];
  ctx.session.step = "choose_lang";
  await ctx.reply(
    "Tilni tanlang / Выберите язык:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz"),
        Markup.button.callback("🇷🇺 Русский", "lang_ru")
      ]
    ])
  );
});

bot.action(/lang_(uz|ru)/, async (ctx) => {
  const lang = ctx.match[1];
  ctx.session.lang = lang;
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  
  if (ctx.session.step === "choose_lang") {
    // Endi oferta ko'rsatamiz
    ctx.session.step = "oferta";
    await ctx.reply(t(ctx, "oferta"), {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t(ctx, "oferta_btn"), "read_oferta")],
        [Markup.button.callback(t(ctx, "agree"), "agree_oferta")]
      ])
    });
  } else {
    const telegramId = String(ctx.from.id);
    try { await api.post(`/customers/${telegramId}/language`, { language: lang }); } catch(e) {}
    await ctx.reply(`Assalomu alaykum! / Здравствуйте! 💧\n\n` + t(ctx, "welcome"), getMenu(ctx));
  }
});

bot.action("read_oferta", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(ctx, "oferta_text"), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t(ctx, "agree"), "agree_oferta")]
    ])
  }).catch(() => {});
});

bot.action("agree_oferta", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  ctx.session.step = "ask_name";
  await ctx.reply(t(ctx, "ask_name"));
});

// Text xabarlarni tutish
bot.on("text", async (ctx, next) => {
  const text = ctx.message.text;
  const telegramId = String(ctx.from.id);
  
  // Registration: Ask Name
  if (ctx.session.step === "ask_name") {
    ctx.session.tempName = text;
    ctx.session.step = "ask_reg_phone";
    await ctx.reply(t(ctx, "send_contact"), Markup.keyboard([
      [Markup.button.contactRequest(t(ctx, "send_contact"))]
    ]).resize());
    return;
  }

  // Custom Quantity Input
  if (ctx.session.step === "ask_custom_qty") {
    const qty = parseInt(text);
    if (isNaN(qty)) {
      return ctx.reply(t(ctx, "qty_invalid"));
    }
    if (qty < 5) {
      return ctx.reply(t(ctx, "qty_too_low"));
    }
    const productId = ctx.session.selectedProductId;
    ctx.session.step = null;
    await addToCartAndCheckout(ctx, productId, qty);
    return;
  }

  // Checkout Address
  if (ctx.session.step === "checkout_address") {
    let address = text;
    if (text === t(ctx, "skip") || text === "➡️ Davom etish" || text === "➡️ Продолжить") {
      address = ""; 
    }
    ctx.session.tempAddress = address;
    ctx.session.step = "checkout_payment";
    
    // So'rovnoma: To'lov turi
    await ctx.reply(t(ctx, "choose_payment"), Markup.keyboard([
      [t(ctx, "pay_cash"), t(ctx, "pay_card")],
      [t(ctx, "back")]
    ]).resize());
    return;
  }

  // Checkout Payment Type
  if (ctx.session.step === "checkout_payment") {
    let paymentType = "naqd";
    if (text === t(ctx, "pay_card")) paymentType = "karta";
    else if (text === t(ctx, "pay_cash")) paymentType = "naqd";
    else return ctx.reply(t(ctx, "choose_payment"));

    const cart = ctx.session.cart || [];
    if (!cart.length) {
      ctx.session.step = null;
      return ctx.reply(t(ctx, "cart_empty"));
    }
    
    try {
      const { data: order } = await api.post("/orders", {
        telegramId,
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        address: ctx.session.tempAddress || "",
        paymentType: paymentType
      });
      ctx.session.cart = [];
      ctx.session.step = null;
      
      await ctx.reply(t(ctx, "order_ok", order), {
        parse_mode: "HTML",
        ...getMenu(ctx)
      });
    } catch (e) {
      console.error(e);
      await ctx.reply(t(ctx, "order_err"), getMenu(ctx));
    }
    return;
  }
  
  return next();
});

bot.on("contact", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const phone = ctx.message.contact.phone_number;
  
  try {
    if (ctx.session.step === "ask_reg_phone") {
      // Yangi mijoz ro'yxatdan o'tishi
      await api.post("/customers/register", { telegramId, fullName: ctx.session.tempName });
      await api.post(`/customers/${telegramId}/phone`, { phone });
      await api.post(`/customers/${telegramId}/language`, { language: ctx.session.lang || "uz" });
      ctx.session.step = null;
      await ctx.reply(t(ctx, "phone_ok") + "\n\n" + t(ctx, "welcome"), getMenu(ctx));
      return;
    }

    // Odatiy kontakt o'zgartirish yoki checkout vaqtida so'rash
    await api.post(`/customers/${telegramId}/phone`, { phone });
    await ctx.reply(t(ctx, "phone_ok"));
    
    if (ctx.session.step === "checkout_phone") {
      const { data: customer } = await api.get(`/customers/${telegramId}`);
      if (customer.latitude == null) {
        ctx.session.step = "checkout_loc";
        return ctx.reply(t(ctx, "send_loc"), Markup.keyboard([
          [Markup.button.locationRequest(t(ctx, "send_loc"))],
          [t(ctx, "back")]
        ]).resize());
      } else {
        await askAddressForCheckout(ctx, customer);
      }
    } else {
      ctx.session.step = null;
      await ctx.reply(t(ctx, "welcome"), getMenu(ctx));
    }
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

bot.on("location", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const { latitude, longitude } = ctx.message.location;
  try {
    await api.post(`/customers/${telegramId}/location`, { latitude, longitude });
    await ctx.reply(t(ctx, "loc_ok"));

    if (ctx.session.step === "checkout_loc") {
      const { data: customer } = await api.get(`/customers/${telegramId}`);
      await askAddressForCheckout(ctx, customer);
    } else {
      ctx.session.step = null;
      await ctx.reply(t(ctx, "welcome"), getMenu(ctx));
    }
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

// ===================== MENUS =====================
bot.hears(["⬅️ Orqaga", "⬅️ Назад"], async (ctx) => {
  ctx.session.step = null;
  await ctx.reply(t(ctx, "welcome"), getMenu(ctx));
});

bot.hears(["⚙️ Sozlamalar", "⚙️ Настройки"], async (ctx) => {
  await ctx.reply(t(ctx, "settings"), getSettingsMenu(ctx));
});

bot.hears(["🇺🇿/🇷🇺 Tilni o'zgartirish", "🇷🇺/🇺🇿 Сменить язык"], async (ctx) => {
  await ctx.reply(
    "Tilni tanlang / Выберите язык:",
    Markup.inlineKeyboard([
      [Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz"), Markup.button.callback("🇷🇺 Русский", "lang_ru")]
    ])
  );
});

bot.hears(["📦 Idish qarzim", "📦 Долг по таре"], async (ctx) => {
  const telegramId = String(ctx.from.id);
  try {
    const { data: customer } = await api.get(`/customers/${telegramId}`);
    const owed = customer.bottlesOwed || 0;
    if (owed <= 0) {
      await ctx.reply(t(ctx, "no_debt"));
    } else {
      await ctx.reply(t(ctx, "has_debt", owed));
    }
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

bot.hears(["📞 Telefonni yangilash", "📞 Обновить телефон"], async (ctx) => {
  ctx.session.step = "update_phone";
  await ctx.reply(t(ctx, "send_contact"), Markup.keyboard([
    [Markup.button.contactRequest(t(ctx, "send_contact"))],
    [t(ctx, "back")]
  ]).resize());
});

bot.hears(["📍 Manzilni yangilash", "📍 Обновить локацию"], async (ctx) => {
  ctx.session.step = "update_loc";
  await ctx.reply(t(ctx, "send_loc"), Markup.keyboard([
    [Markup.button.locationRequest(t(ctx, "send_loc"))],
    [t(ctx, "back")]
  ]).resize());
});

// ===================== CATALOG & CART =====================
bot.hears(["🛒 Katalog", "🛒 Каталог"], async (ctx) => {
  try {
    const { data: products } = await api.get("/products");
    if (!products.length) return ctx.reply(t(ctx, "no_products"));
    
    ctx.session.products = products; 
    
    const buttons = products.map((p) => [
      Markup.button.callback(`${p.name} — ${formatSum(p.price)}`, `pick_${p.id}`),
    ]);
    await ctx.reply(t(ctx, "choose_water"), Markup.inlineKeyboard(buttons));
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

bot.action(/pick_(\d+)/, async (ctx) => {
  const productId = Number(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  
  // Custom button layout for 5 to 10 + Custom Input
  const buttons = [
    [Markup.button.callback("5", `qty_${productId}_5`), Markup.button.callback("6", `qty_${productId}_6`), Markup.button.callback("7", `qty_${productId}_7`)],
    [Markup.button.callback("8", `qty_${productId}_8`), Markup.button.callback("9", `qty_${productId}_9`), Markup.button.callback("10", `qty_${productId}_10`)],
    [Markup.button.callback(t(ctx, "custom_qty"), `qtycustom_${productId}`)]
  ];
  await ctx.reply(t(ctx, "how_many"), Markup.inlineKeyboard(buttons));
});

bot.action(/qty_(\d+)_(\d+)/, async (ctx) => {
  const productId = Number(ctx.match[1]);
  const quantity = Number(ctx.match[2]);
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  await addToCartAndCheckout(ctx, productId, quantity);
});

bot.action(/qtycustom_(\d+)/, async (ctx) => {
  const productId = Number(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  ctx.session.selectedProductId = productId;
  ctx.session.step = "ask_custom_qty";
  await ctx.reply(t(ctx, "enter_custom_qty"));
});

async function addToCartAndCheckout(ctx, productId, quantity) {
  if (!ctx.session.cart) ctx.session.cart = [];
  
  const product = (ctx.session.products || []).find(p => p.id === productId);
  
  const existing = ctx.session.cart.find(c => c.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    ctx.session.cart.push({ 
      productId, 
      quantity, 
      name: product?.name || "Suv",
      price: product?.price || 0
    });
  }

  const cart = ctx.session.cart;
  let text = t(ctx, "cart_title") + "\n\n";
  let totalSum = 0;
  cart.forEach((item, index) => {
    const sum = item.price * item.quantity;
    totalSum += sum;
    text += `${index + 1}. ${item.name} — ${item.quantity} ta x ${formatSum(item.price)} = ${formatSum(sum)}\n`;
  });
  text += `\n💰 <b>Jami narx: ${formatSum(totalSum)} so'm</b>\n\n${t(ctx, "confirm_question")}`;

  await ctx.reply(text, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t(ctx, "confirm_yes"), "confirm_order")],
      [Markup.button.callback(t(ctx, "confirm_no"), "cancel_order")]
    ])
  });
}

bot.action("confirm_order", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  const telegramId = String(ctx.from.id);
  try {
    const { data: customer } = await api.get(`/customers/${telegramId}`);
    if (customer.latitude == null || customer.longitude == null) {
      ctx.session.step = "checkout_loc";
      await ctx.reply(t(ctx, "send_loc"), Markup.keyboard([
        [Markup.button.locationRequest(t(ctx, "send_loc"))],
        [t(ctx, "back")]
      ]).resize());
    } else {
      await askAddressForCheckout(ctx, customer);
    }
  } catch(e) {
    await ctx.reply(t(ctx, "error"));
  }
});

bot.action("cancel_order", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  ctx.session.cart = [];
  ctx.session.step = null;
  await ctx.reply(t(ctx, "order_cancelled"), getMenu(ctx));
});

bot.action("continue_shop", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  bot.handleUpdate({
    ...ctx.update,
    message: { text: t(ctx, "catalog"), chat: ctx.chat, from: ctx.from }
  });
});

bot.action("go_cart", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  await showCart(ctx);
});

async function showCart(ctx) {
  const cart = ctx.session.cart || [];
  if (!cart.length) {
    return ctx.reply(t(ctx, "cart_empty"));
  }

  let text = t(ctx, "cart_title") + "\n\n";
  let totalSum = 0;

  cart.forEach((item, index) => {
    const sum = item.price * item.quantity;
    totalSum += sum;
    text += `${index + 1}. ${item.name} — ${item.quantity} ta x ${formatSum(item.price)}\n`;
  });

  text += `\n💰 <b>Jami: ${formatSum(totalSum)}</b>`;

  await ctx.reply(text, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t(ctx, "checkout"), "checkout")],
      [Markup.button.callback(t(ctx, "clear_cart"), "clear_cart")]
    ])
  });
}

bot.action("clear_cart", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  ctx.session.cart = [];
  await ctx.reply(t(ctx, "cleared"));
});

// ===================== CHECKOUT =====================
bot.action("checkout", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  const cart = ctx.session.cart || [];
  if (!cart.length) return ctx.reply(t(ctx, "cart_empty"));

  const telegramId = String(ctx.from.id);
  try {
    const { data: customer } = await api.get(`/customers/${telegramId}`);
    
    // We already have phone from registration. 
    // Just verify location
    if (customer.latitude == null || customer.longitude == null) {
      ctx.session.step = "checkout_loc";
      return ctx.reply(t(ctx, "send_loc"), Markup.keyboard([
        [Markup.button.locationRequest(t(ctx, "send_loc"))],
        [t(ctx, "back")]
      ]).resize());
    }

    // Telefon va lokatsiya bor, manzili aniqlashtirishni so'raymiz
    await askAddressForCheckout(ctx, customer);

  } catch (e) {
    // If not found (maybe they didn't finish reg) -> force /start
    await ctx.reply("Siz bazada topilmadingiz. Iltimos /start buyrug'ini bosing.");
  }
});

async function askAddressForCheckout(ctx, customer) {
  ctx.session.step = "checkout_address";
  let text = t(ctx, "confirm_title") + "\n\n";
  text += `📞 Tel: ${customer.phone}\n`;
  text += `📍 Lokatsiya: qabul qilingan\n\n`;
  text += t(ctx, "ask_address");

  await ctx.reply(text, {
    parse_mode: "HTML",
    ...Markup.keyboard([[t(ctx, "skip")], [t(ctx, "back")]]).resize()
  });
}

// ===================== MY ORDERS =====================
bot.hears(["📦 Mening buyurtmalarim", "📦 Мои заказы"], async (ctx) => {
  const telegramId = String(ctx.from.id);
  try {
    const { data: orders } = await api.get(`/orders/customer/${telegramId}`);
    if (!orders.length) return ctx.reply(t(ctx, "no_orders"));

    let text = t(ctx, "my_orders_title");
    orders.forEach(o => {
      let statusText = "";
      switch (o.status) {
        case "new": statusText = t(ctx, "status_new"); break;
        case "assigned": statusText = t(ctx, "status_assigned"); break;
        case "delivering": statusText = t(ctx, "status_delivering"); break;
        case "done": statusText = t(ctx, "status_done"); break;
        case "cancelled": statusText = t(ctx, "status_cancelled"); break;
        default: statusText = o.status;
      }
      
      const sum = formatSum(o.totalPrice);
      const items = o.items.map(i => `${i.productName} (${i.quantity})`).join(", ");
      
      text += `\n🔹 <b>#${o.id}</b> | ${items} | ${sum}\nHolat: <b>${statusText}</b>\n`;
    });

    await ctx.reply(text, { parse_mode: "HTML" });
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

bot.catch((err, ctx) => {
  console.error("Bot xatosi:", err);
  ctx.reply("❌ Kutilmagan xatolik yuz berdi.").catch(() => {});
});

  bot.launch().then(() => console.log("✅ Yangi Mijoz Boti ishga tushdi"));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

if (require.main === module) {
  startCustomerBot();
}

module.exports = startCustomerBot;
