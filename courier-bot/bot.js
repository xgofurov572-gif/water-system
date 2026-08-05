const http = require("http");
const { Telegraf, Markup, session } = require("telegraf");
const axios = require("axios");

function startCourierBot(customToken, customApiUrl) {
  const defaultToken = "8641929454:AAFXvYRmp8xpdFQyG-jZ3hObXzdr7TuqAnY";
  const BOT_TOKEN = customToken || process.env.COURIER_BOT_TOKEN || process.env.BOT_TOKEN || defaultToken;
  const API_URL = customApiUrl || process.env.API_URL || "http://localhost:4000/api";

  if (!BOT_TOKEN) {
    console.error("❌ Kuryer Boti: BOT_TOKEN ko'rsatilmagan");
    return;
  }

  const bot = new Telegraf(BOT_TOKEN);
  const httpAgent = new http.Agent({ keepAlive: true });
  const api = axios.create({ baseURL: API_URL, httpAgent });

  bot.use(session({ defaultSession: () => ({}) }));

// ===================== I18N =====================
const i18n = {
  uz: {
    not_registered: (id) =>
      `❗️ Siz kuryerlar ro'yxatida yo'qsiz.\n\nAdministratorga quyidagi ID ni bering:\n<code>${id}</code>`,
    welcome_back: (name, duty) =>
      `Assalomu alaykum, ${name}! 🚚\n\nHozirgi holat: ${duty ? "🟢 Smena ochiq" : "🔴 Smena yopiq"}`,
    choose_lang: "Tilni tanlang / Выберите язык:",
    duty_on_confirm: "✅ Smena ochildi! Endi buyurtmalarni qabul qila olasiz.",
    duty_off_confirm: "🔴 Smena yopildi. Xaritadan o'chindi. Yaxshi dam oling!",
    duty_already_on: "⚠️ Smena allaqachon ochiq.",
    duty_already_off: "⚠️ Smena allaqachon yopiq.",
    menu_orders: "📋 Buyurtmalar",
    menu_stats: "📊 Hisobot",
    menu_profile: "👤 Profilim",
    menu_duty_on: "🟢 Smenani boshlash",
    menu_duty_off: "🔴 Smenani yopish",
    menu_route: "🗺 Optimal marshrutni tuzish",
    no_orders: "✅ Hozircha sizga biriktirilgan faol buyurtma yo'q.",
    order_card: (o, items) =>
      `📦 <b>Buyurtma #${o.id}</b>\n` +
      `👤 Mijoz: ${o.customer?.fullName || "Noma'lum"}\n` +
      `📞 Tel: ${o.customer?.phone || "—"}\n` +
      `🏠 Manzil: ${o.address || "Lokatsiya orqali"}\n\n` +
      `${items}\n\n` +
      `💰 Summa: <b>${formatSum(o.totalPrice)}</b>\n` +
      `💳 To'lov turi: <b>${o.paymentType === 'karta' ? 'Karta orqali' : 'Naqd pul'}</b>\n` +
      `📦 Mijozdagi qarzdorlik: ${o.customer?.bottlesOwed || 0} ta idish`,
    btn_navigate: "🗺 Yandex Navigator",
    btn_on_way: "▶️ Yo'lga chiqdim",
    btn_done: "✅ Yetkazib berdim",
    btn_call: (phone) => `📞 ${phone}`,
    on_way_ok: (id) => `▶️ Buyurtma #${id} — yo'lda!`,
    ask_given: (id) => `Buyurtma #${id}\n\nNechta to'liq idish (suv) berildi mijozga?`,
    ask_returned: "Nechta bo'sh idish mijozdan qaytarib olindi?",
    done_ok: (id, given, ret) =>
      `✅ <b>Buyurtma #${id} yakunlandi!</b>\n\n💧 Berildi: ${given} ta\n📦 Qaytarildi: ${ret} ta bo'sh idish`,
    stats_title: "📊 <b>Bugungi hisobot</b>",
    stats_body: (s) =>
      `✅ Bajarilgan: <b>${s.ordersCount} ta</b>\n` +
      `💰 Jami tushum: <b>${formatSum(s.totalRevenue)}</b>\n` +
      `💧 Berilgan idish: <b>${s.totalBottlesGiven} ta</b>\n` +
      `📦 Qaytarilgan: <b>${s.totalBottlesReturned} ta</b>\n` +
      `🎒 Qo'limdagi bo'sh idish: <b>${s.bottlesWithCourier} ta</b>`,
    profile_title: "👤 <b>Mening profilim</b>",
    profile_body: (c) =>
      `Ismi: <b>${c.fullName}</b>\n` +
      `Telefon: ${c.phone || "—"}\n` +
      `Holat: ${c.active ? "🟢 Smena ochiq" : "🔴 Smena yopiq"}\n` +
      `🎒 Qo'limdagi bo'sh idish: <b>${c.bottlesWithCourier} ta</b>`,
    loc_ok: "📍 Lokatsiya qabul qilindi. Xaritada ko'rinasiz.",
    loc_err_noreg: "❗️ Siz kuryerlar ro'yxatida yo'qsiz.",
    loc_err: "Lokatsiya qabul qilinmadi. Xatolik yuz berdi.",
    no_state: "❗️ Jarayon topilmadi. /start bosing.",
    error: "❌ Xatolik yuz berdi. Keyinroq urinib ko'ring.",
  },
  ru: {
    not_registered: (id) =>
      `❗️ Вы не зарегистрированы как курьер.\n\nПередайте администратору этот ID:\n<code>${id}</code>`,
    welcome_back: (name, duty) =>
      `Здравствуйте, ${name}! 🚚\n\nТекущий статус: ${duty ? "🟢 Смена открыта" : "🔴 Смена закрыта"}`,
    choose_lang: "Tilni tanlang / Выберите язык:",
    duty_on_confirm: "✅ Смена открыта! Теперь вы можете принимать заказы.",
    duty_off_confirm: "🔴 Смена закрыта. Вы удалены с карты. Отдыхайте!",
    duty_already_on: "⚠️ Смена уже открыта.",
    duty_already_off: "⚠️ Смена уже закрыта.",
    menu_orders: "📋 Заказы",
    menu_stats: "📊 Отчёт",
    menu_profile: "👤 Мой профиль",
    menu_duty_on: "🟢 Начать смену",
    menu_duty_off: "🔴 Завершить смену",
    menu_route: "🗺 Составить маршрут",
    no_orders: "✅ У вас пока нет активных заказов.",
    order_card: (o, items) =>
      `📦 <b>Заказ #${o.id}</b>\n` +
      `👤 Клиент: ${o.customer?.fullName || "Неизвестно"}\n` +
      `📞 Тел: ${o.customer?.phone || "—"}\n` +
      `🏠 Адрес: ${o.address || "По геолокации"}\n\n` +
      `${items}\n\n` +
      `💰 Сумма: <b>${formatSum(o.totalPrice)}</b>\n` +
      `💳 Тип оплаты: <b>${o.paymentType === 'karta' ? 'Картой' : 'Наличными'}</b>\n` +
      `📦 Задолженность клиента: ${o.customer?.bottlesOwed || 0} бутылей`,
    btn_navigate: "🗺 Яндекс Навигатор",
    btn_on_way: "▶️ Выехал",
    btn_done: "✅ Доставил",
    btn_call: (phone) => `📞 ${phone}`,
    on_way_ok: (id) => `▶️ Заказ #${id} — в пути!`,
    ask_given: (id) => `Заказ #${id}\n\nСколько полных бутылей (воды) отдали клиенту?`,
    ask_returned: "Сколько пустых бутылей забрали у клиента?",
    done_ok: (id, given, ret) =>
      `✅ <b>Заказ #${id} завершён!</b>\n\n💧 Отдано: ${given} бут.\n📦 Возвращено: ${ret} пустых`,
    stats_title: "📊 <b>Отчёт за сегодня</b>",
    stats_body: (s) =>
      `✅ Выполнено: <b>${s.ordersCount}</b>\n` +
      `💰 Выручка: <b>${formatSum(s.totalRevenue)}</b>\n` +
      `💧 Отдано бутылей: <b>${s.totalBottlesGiven}</b>\n` +
      `📦 Возвращено: <b>${s.totalBottlesReturned}</b>\n` +
      `🎒 Пустых при себе: <b>${s.bottlesWithCourier}</b>`,
    profile_title: "👤 <b>Мой профиль</b>",
    profile_body: (c) =>
      `Имя: <b>${c.fullName}</b>\n` +
      `Телефон: ${c.phone || "—"}\n` +
      `Статус: ${c.active ? "🟢 Смена открыта" : "🔴 Смена закрыта"}\n` +
      `🎒 Пустых бутылей при себе: <b>${c.bottlesWithCourier}</b>`,
    loc_ok: "📍 Геолокация получена. Вы видны на карте.",
    loc_err_noreg: "❗️ Вы не зарегистрированы как курьер.",
    loc_err: "Геолокация не принята. Произошла ошибка.",
    no_state: "❗️ Процесс не найден. Нажмите /start.",
    error: "❌ Произошла ошибка. Попробуйте позже.",
  },
};

function t(ctx, key, ...args) {
  const lang = ctx.session?.lang || "uz";
  const val = i18n[lang]?.[key] || i18n.uz[key];
  return typeof val === "function" ? val(...args) : val;
}

function formatSum(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " so'm";
}

function yandexUrl(lat, lng) {
  return `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`;
}

function getMenu(ctx) {
  const lang = ctx.session?.lang || "uz";
  const T = i18n[lang];
  return Markup.keyboard([
    [T.menu_route],
    [T.menu_orders, T.menu_stats],
    [T.menu_profile],
    [T.menu_duty_on, T.menu_duty_off],
  ]).resize();
}

// ===================== /start =====================
bot.start(async (ctx) => {
  const telegramId = String(ctx.from.id);

  // Til tanlash
  await ctx.reply(
    "Tilni tanlang / Выберите язык:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz"),
        Markup.button.callback("🇷🇺 Русский", "lang_ru"),
      ],
    ])
  );
});

bot.action("noop", async (ctx) => {
  await ctx.answerCbQuery();
});

bot.action(/lang_(uz|ru)/, async (ctx) => {
  const lang = ctx.match[1];
  ctx.session.lang = lang;
  await ctx.answerCbQuery();

  const telegramId = String(ctx.from.id);
  try {
    const { data: courier } = await api.get(`/couriers/${telegramId}/me`);
    await ctx.reply(t(ctx, "welcome_back", courier.fullName, courier.active), {
      parse_mode: "HTML",
      ...getMenu(ctx),
    });
  } catch (e) {
    if (e.response?.status === 404) {
      await ctx.reply(t(ctx, "not_registered", telegramId), { parse_mode: "HTML" });
    } else {
      await ctx.reply(t(ctx, "error"));
    }
  }
});

// ===================== SMENA =====================
bot.hears(
  ["🟢 Smenani boshlash", "🟢 Начать смену"],
  async (ctx) => {
    const telegramId = String(ctx.from.id);
    try {
      const { data: courier } = await api.get(`/couriers/${telegramId}/me`);
      if (courier.active) {
        return ctx.reply(t(ctx, "duty_already_on"));
      }
      await api.post(`/couriers/${telegramId}/duty`, { onDuty: true });
      await ctx.reply(t(ctx, "duty_on_confirm"), getMenu(ctx));
    } catch (e) {
      await ctx.reply(t(ctx, "error"));
    }
  }
);

bot.hears(
  ["🔴 Smenani yopish", "🔴 Завершить смену"],
  async (ctx) => {
    const telegramId = String(ctx.from.id);
    try {
      const { data: courier } = await api.get(`/couriers/${telegramId}/me`);
      if (!courier.active) {
        return ctx.reply(t(ctx, "duty_already_off"));
      }
      await api.post(`/couriers/${telegramId}/duty`, { onDuty: false });
      await ctx.reply(t(ctx, "duty_off_confirm"), getMenu(ctx));
    } catch (e) {
      await ctx.reply(t(ctx, "error"));
    }
  }
);

// ===================== BUYURTMALAR =====================
bot.hears(["📋 Buyurtmalar", "📋 Заказы"], async (ctx) => {
  await sendOrderList(ctx);
});

bot.hears(["🗺 Optimal marshrutni tuzish", "🗺 Составить маршрут"], async (ctx) => {
  const telegramId = String(ctx.from.id);
  try {
    const { data: route } = await api.get(`/orders/courier/${telegramId}/route`);
    
    if (!route || route.length === 0) {
      return ctx.reply(t(ctx, "no_orders"));
    }

    let url = "https://yandex.ru/maps/?rtext=";
    // Yandex accepts max 10 points usually via URL, we already limited it to 10 in backend
    const points = route.map(o => `${o.deliveryLat},${o.deliveryLng}`);
    
    // Prefix with courier's current location? The backend calculated from courier location,
    // but the url should start with courier location for navigation if possible, or just the points.
    // If we just put points, yandex will route from user's current GPS to point 1 anyway.
    // But let's prepend courier last location just in case:
    const { data: courier } = await api.get(`/couriers/${telegramId}/me`);
    if (courier.lastLat && courier.lastLng) {
      points.unshift(`${courier.lastLat},${courier.lastLng}`);
    }

    url += points.join("~") + "&rtt=auto";

    let text = (ctx.session?.lang === 'ru') 
      ? `🗺 <b>Ваш оптимальный маршрут готов!</b>\n\nОн построен для ближайших ${route.length} заказов начиная от вашего текущего местоположения.\n\n`
      : `🗺 <b>Optimal marshrutingiz tayyor!</b>\n\nSiz turgan joydan boshlab eng yaqin ${route.length} ta buyurtma uchun yo'nalish chizildi.\n\n`;

    route.forEach((o, index) => {
      const totalBottles = o.items.reduce((sum, item) => sum + item.quantity, 0);
      const phone = o.customer?.phone || "Noma'lum";
      
      if (ctx.session?.lang === 'ru') {
        const ruPhone = o.customer?.phone || "Неизвестно";
        text += `📍 ${index + 1}-адрес: Заказ #${o.id}\n📞 Тел: ${ruPhone}\n📦 Кол-во: ${totalBottles} шт.\n\n`;
      } else {
        text += `📍 ${index + 1}-manzil: Buyurtma #${o.id}\n📞 Tel: ${phone}\n📦 Miqdor: ${totalBottles} ta\n\n`;
      }
    });

    await ctx.reply(text, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.url("🗺 Yandex Navigatorda ochish", url)]
      ])
    });

    for (const order of route) {
      await sendOrderCard(ctx, order);
    }

  } catch (e) {
    if (e.response?.status === 400) {
      const msg = ctx.session?.lang === 'ru' 
        ? "❗️ Ваша локация не определена. Начните смену и подождите обновления локации." 
        : "❗️ Lokatsiyangiz aniqlanmagan. Smenani boshlang va lokatsiya yangilanishini kuting.";
      await ctx.reply(msg);
    } else {
      await ctx.reply(t(ctx, "error"));
    }
  }
});

async function sendOrderCard(ctx, order) {
  const itemsText = order.items
    .map((i) => `• ${i.productName} × ${i.quantity} ta`)
    .join("\n");

  const text = t(ctx, "order_card", order, itemsText);

  const buttons = [];

  // Yandex Navigator (mijoz lokatsiyasi bo'lsa)
  if (order.deliveryLat != null && order.deliveryLng != null) {
    buttons.push([
      Markup.button.url(t(ctx, "btn_navigate"), yandexUrl(order.deliveryLat, order.deliveryLng)),
    ]);
  }

  // Qo'ng'iroq qilish
  if (order.customer && order.customer.phone) {
    buttons.push([
      Markup.button.callback(t(ctx, "btn_call", order.customer.phone), `noop`),
    ]);
  }

  // Holat tugmalari
  const actionRow = [];
  if (order.status === "assigned" || order.status === "new") {
    actionRow.push(
      Markup.button.callback(t(ctx, "btn_on_way"), `onway_${order.id}`)
    );
  }
  actionRow.push(
    Markup.button.callback(t(ctx, "btn_done"), `done_${order.id}`)
  );
  buttons.push(actionRow);

  await ctx.reply(text, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard(buttons),
  });
}

async function sendOrderList(ctx) {
  const telegramId = String(ctx.from.id);
  try {
    const { data: orders } = await api.get(`/orders/courier/${telegramId}`);

    if (!orders.length) {
      return ctx.reply(t(ctx, "no_orders"));
    }

    for (const order of orders) {
      await sendOrderCard(ctx, order);
    }
  } catch (e) {
    console.error(e.response?.data || e.message);
    await ctx.reply(t(ctx, "error"));
  }
}

// Yo'lga chiqdim
bot.action(/onway_(\d+)/, async (ctx) => {
  const orderId = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  try {
    await api.patch(`/orders/${orderId}/status`, { status: "delivering" });
    await ctx.reply(t(ctx, "on_way_ok", orderId), { parse_mode: "HTML" });
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

// Yetkazib berdim — berilgan idishlar sonini so'rash (qo'lda yozish)
bot.action(/done_(\d+)/, async (ctx) => {
  const orderId = Number(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  // Buyurtmadagi jami miqdorni olish
  try {
    const { data: order } = await api.get(`/orders/${orderId}`);
    const totalQty = (order.items || []).reduce((s, i) => s + i.quantity, 0);
    ctx.session.deliverState = { orderId, step: "given", orderQty: totalQty };
    await ctx.reply(
      t(ctx, "ask_given", orderId) + `\n\n(Buyurtma miqdori: <b>${totalQty} ta</b>)`,
      { parse_mode: "HTML" }
    );
  } catch(e) {
    ctx.session.deliverState = { orderId, step: "given", orderQty: null };
    await ctx.reply(t(ctx, "ask_given", orderId), { parse_mode: "HTML" });
  }
});


// Matn orqali: berilgan va qaytarilgan idishlar sonini qabul qilish
bot.on("text", async (ctx, next) => {
  const state = ctx.session.deliverState;
  if (!state) return next();

  const text = ctx.message.text.trim();
  const num = parseInt(text);

  if (isNaN(num) || num < 0) {
    await ctx.reply("❌ Iltimos faqat son yozing (masalan: 12)");
    return;
  }

  if (state.step === "given") {
    state.given = num;
    state.step = "returned";
    ctx.session.deliverState = state;

    const isExact = state.orderQty !== null && num === state.orderQty;
    if (isExact) {
      // Buyurtma miqdori bilan mos keldi — bo'sh idish sonini so'raymiz
      const msg = ctx.session?.lang === 'ru'
        ? `✅ ${num} бутылей принято.\n\nСколько пустых бутылей забрали у клиента?`
        : `✅ ${num} ta suv qabul qilindi.\n\nNechta bo'sh idish mijozdan qaytarib olindi?`;
      await ctx.reply(msg);
    } else {
      const msg = ctx.session?.lang === 'ru'
        ? `✅ Записано: ${num} бут.\n\nСколько пустых бутылей забрали у клиента?`
        : `✅ Kiritildi: ${num} ta.\n\nNechta bo'sh idish mijozdan qaytarib olindi?`;
      await ctx.reply(msg);
    }
    return;
  }

  if (state.step === "returned") {
    const returned = num;
    const given = state.given;
    const orderId = state.orderId;
    ctx.session.deliverState = null;

    try {
      await api.post(`/orders/${orderId}/deliver`, {
        bottlesGiven: given,
        bottlesReturned: returned,
      });
      await ctx.reply(t(ctx, "done_ok", orderId, given, returned), {
        parse_mode: "HTML",
        ...getMenu(ctx),
      });
    } catch (e) {
      console.error(e.response?.data || e.message);
      await ctx.reply(t(ctx, "error"));
    }
    return;
  }

  return next();
});

// ===================== HISOBOT =====================
bot.hears(["📊 Hisobot", "📊 Отчёт"], async (ctx) => {
  const telegramId = String(ctx.from.id);
  try {
    const { data: stats } = await api.get(`/couriers/${telegramId}/stats`);
    await ctx.reply(
      t(ctx, "stats_title") + "\n\n" + t(ctx, "stats_body", stats),
      { parse_mode: "HTML" }
    );
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

// ===================== PROFIL =====================
bot.hears(["👤 Profilim", "👤 Мой профиль"], async (ctx) => {
  const telegramId = String(ctx.from.id);
  try {
    const { data: courier } = await api.get(`/couriers/${telegramId}/me`);
    await ctx.reply(
      t(ctx, "profile_title") + "\n\n" + t(ctx, "profile_body", courier),
      { parse_mode: "HTML" }
    );
  } catch (e) {
    await ctx.reply(t(ctx, "error"));
  }
});

// ===================== LOKATSIYA =====================
bot.on("location", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const { latitude, longitude } = ctx.message.location;
  try {
    await api.post(`/couriers/${telegramId}/location`, {
      lat: latitude,
      lng: longitude,
    });
    await ctx.reply(t(ctx, "loc_ok"));
  } catch (e) {
    if (e.response?.status === 404) {
      await ctx.reply(t(ctx, "loc_err_noreg"));
    } else {
      await ctx.reply(t(ctx, "loc_err"));
    }
  }
});

// Jonli lokatsiya yangilanishi
bot.on("edited_message", async (ctx) => {
  if (ctx.update?.edited_message?.location) {
    const telegramId = String(ctx.from.id);
    const { latitude, longitude } = ctx.update.edited_message.location;
    try {
      await api.post(`/couriers/${telegramId}/location`, {
        lat: latitude,
        lng: longitude,
      });
      console.log(`📍 Live: ${telegramId} -> (${latitude}, ${longitude})`);
    } catch (e) {
      console.error("Jonli lokatsiya xatosi:", e.message);
    }
  }
});

// ===================== ERROR =====================
bot.catch((err, ctx) => {
  console.error("Bot xatosi:", err);
  ctx.reply("❌ Kutilmagan xatolik.").catch(() => {});
});

  bot.launch().then(() => console.log("✅ Yangi kuryer boti ishga tushdi"));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

if (require.main === module) {
  startCourierBot();
}

module.exports = startCourierBot;
