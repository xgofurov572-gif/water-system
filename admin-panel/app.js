// ================= Auth & umumiy sozlamalar =================
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const username = localStorage.getItem('username');

if (!token) {
  window.location.href = '/login.html';
}

document.getElementById('userLabel').textContent =
  `${username || ''} ${role ? '(' + (role === 'admin' ? 'Admin' : 'Operator') + ')' : ''}`;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login.html';
    throw new Error('Sessiya tugadi');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

function formatSum(n) {
  return Number(n || 0).toLocaleString('ru-RU') + " so'm";
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ================= Rol asosida ko'rinishni sozlash =================
if (role !== 'admin') {
  document.querySelectorAll('[data-admin-only="1"]').forEach((el) => el.remove());
}

// ================= Tab boshqaruvi =================
const tabButtons = document.querySelectorAll('#tabs button[data-tab]');
tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));

  if (tab === 'orders') loadOrders();
  if (tab === 'couriers') loadCouriers();
  if (tab === 'warehouse') loadWarehouse();
  if (tab === 'customers') loadCustomers();
  if (tab === 'stats') loadStats('day');
  if (tab === 'products') loadProducts();
  if (tab === 'map') loadMap();
}

// ================= KURYERLAR XARITASI =================
let leafletMap = null;
let courierMarkers = {};
let mapInterval = null;

async function loadMap() {
  if (!leafletMap) {
    leafletMap = L.map('map').setView([41.2995, 69.2401], 12); // Tashkent markazi
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(leafletMap);
  }

  fetchCouriersLocations();
  if (mapInterval) clearInterval(mapInterval);
  mapInterval = setInterval(fetchCouriersLocations, 10000);
}

async function fetchCouriersLocations() {
  if (document.getElementById('tab-map').classList.contains('hidden')) {
    clearInterval(mapInterval);
    mapInterval = null;
    return;
  }
  try {
    const locations = await api('/couriers/locations');
    locations.forEach(c => {
      if (c.lastLat && c.lastLng) {
        if (!courierMarkers[c.id]) {
          courierMarkers[c.id] = L.marker([c.lastLat, c.lastLng]).addTo(leafletMap);
        } else {
          courierMarkers[c.id].setLatLng([c.lastLat, c.lastLng]);
        }
        
        let updateTime = new Date(c.lastLocationUpdate).toLocaleTimeString('uz-UZ');
        courierMarkers[c.id].bindPopup(`<b>${c.fullName}</b><br>📞 ${c.phone || '—'}<br><small>So'nggi yangilanish: ${updateTime}</small>`);
      }
    });
  } catch(e) {
    console.error("Xarita yuklanishida xato:", e);
  }
}

// ================= ZAKAZLAR (Kanban) =================
const STATUS_COLUMNS = [
  { key: 'new', label: '🆕 Yangi', color: 'bg-amber-50 border-amber-200' },
  { key: 'assigned', label: '🚚 Biriktirilgan', color: 'bg-blue-50 border-blue-200' },
  { key: 'delivering', label: '🛵 Yetkazilmoqda', color: 'bg-purple-50 border-purple-200' },
  { key: 'done', label: '✅ Yopilgan', color: 'bg-green-50 border-green-200' },
];

let allCouriersCache = [];
let assignOrderId = null;

async function loadOrders() {
  const board = document.getElementById('ordersBoard');
  board.innerHTML = '<p class="text-slate-400 text-sm col-span-4">Yuklanmoqda...</p>';

  try {
    const [orders, couriers] = await Promise.all([api('/orders'), api('/couriers')]);
    allCouriersCache = couriers;
    board.innerHTML = '';

    STATUS_COLUMNS.forEach((col) => {
      const colOrders = orders.filter((o) => o.status === col.key);
      const colEl = document.createElement('div');
      colEl.className = `kanban-col rounded-xl border-2 border-dashed ${col.color} p-3`;
      colEl.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-slate-600 text-sm">${col.label}</h3>
          <span class="text-xs bg-white rounded-full px-2 py-0.5 text-slate-500">${colOrders.length}</span>
        </div>
        <div class="space-y-3" id="col-${col.key}"></div>
      `;
      board.appendChild(colEl);

      const container = colEl.querySelector(`#col-${col.key}`);
      if (!colOrders.length) {
        container.innerHTML = '<p class="text-xs text-slate-400">Bo\'sh</p>';
      }
      colOrders.forEach((o) => container.appendChild(renderOrderCard(o)));
    });
  } catch (e) {
    board.innerHTML = `<p class="text-red-500 text-sm col-span-4">${e.message}</p>`;
  }
}

function renderOrderCard(o) {
  const el = document.createElement('div');
  el.className = 'card p-3 text-sm';
  const itemsText = o.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ');

  let actions = '';
  if (o.status === 'new') {
    actions += `<button data-assign="${o.id}" class="text-xs bg-brand text-white px-2 py-1 rounded-lg mt-2 mr-1">Kuryerga biriktirish</button>`;
  }
  if (o.status === 'assigned') {
    actions += `<button data-startdeliver="${o.id}" class="text-xs bg-purple-600 text-white px-2 py-1 rounded-lg mt-2 mr-1">Yo'lga chiqdi</button>`;
  }
  if (role === 'admin' && o.status !== 'done' && o.status !== 'cancelled') {
    actions += `<button data-cancel="${o.id}" class="text-xs bg-red-500 text-white px-2 py-1 rounded-lg mt-2">Bekor qilish</button>`;
  }

  el.innerHTML = `
    <div class="flex justify-between items-start mb-1">
      <span class="font-semibold text-slate-700">#${o.id}</span>
      <span class="text-xs text-slate-400">${formatDate(o.createdAt)}</span>
    </div>
    <div class="text-slate-600">${o.customer?.fullName || 'Noma\'lum mijoz'}</div>
    <div class="text-slate-400 text-xs">${o.customer?.phone || ''}</div>
    <div class="text-xs text-slate-500 mt-1">${itemsText}</div>
    <div class="font-medium text-slate-700 mt-1">${formatSum(o.totalPrice)} - ${o.paymentType === 'karta' ? '💳 Karta' : '💵 Naqd'}</div>
    ${o.courier ? `<div class="text-xs text-blue-600 mt-1">🚚 ${o.courier.fullName}</div>` : ''}
    ${o.status === 'done' ? `<div class="text-xs text-green-600 mt-1">Berildi: ${o.bottlesGiven} / Qaytdi: ${o.bottlesReturned}</div>` : ''}
    <div>${actions}</div>
  `;
  return el;
}

document.getElementById('refreshOrders').addEventListener('click', loadOrders);

document.getElementById('ordersBoard').addEventListener('click', async (e) => {
  const assignId = e.target.dataset.assign;
  const startDeliverId = e.target.dataset.startdeliver;
  const cancelId = e.target.dataset.cancel;

  if (assignId) openAssignModal(Number(assignId));
  if (startDeliverId) {
    try {
      await api(`/orders/${startDeliverId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'delivering' }) });
      loadOrders();
    } catch (err) { alert(err.message); }
  }
  if (cancelId) {
    if (!confirm('Buyurtmani bekor qilishga ishonchingiz komilmi?')) return;
    try {
      await api(`/orders/${cancelId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
      loadOrders();
    } catch (err) { alert(err.message); }
  }
});

function openAssignModal(orderId) {
  assignOrderId = orderId;
  const select = document.getElementById('assignCourierSelect');
  const activeCouriers = allCouriersCache.filter((c) => c.active);
  select.innerHTML = activeCouriers
    .map((c) => `<option value="${c.id}">${c.fullName} (${c.bottlesWithCourier} ta idish bilan)</option>`)
    .join('');
  if (!activeCouriers.length) {
    select.innerHTML = '<option value="">Faol kuryer topilmadi</option>';
  }
  document.getElementById('assignModal').classList.remove('hidden');
  document.getElementById('assignModal').classList.add('flex');
}

document.getElementById('assignCancelBtn').addEventListener('click', () => {
  document.getElementById('assignModal').classList.add('hidden');
  document.getElementById('assignModal').classList.remove('flex');
});

document.getElementById('assignConfirmBtn').addEventListener('click', async () => {
  const courierId = document.getElementById('assignCourierSelect').value;
  if (!courierId) return;
  try {
    await api(`/orders/${assignOrderId}/assign`, { method: 'PATCH', body: JSON.stringify({ courierId }) });
    document.getElementById('assignModal').classList.add('hidden');
    document.getElementById('assignModal').classList.remove('flex');
    loadOrders();
  } catch (err) {
    alert(err.message);
  }
});

// ================= KURYERLAR =================
async function loadCouriers() {
  const list = document.getElementById('couriersList');
  list.innerHTML = '<p class="text-slate-400 text-sm">Yuklanmoqda...</p>';
  try {
    const couriers = await api('/couriers');
    allCouriersCache = couriers;
    list.innerHTML = '';
    if (!couriers.length) list.innerHTML = '<p class="text-slate-400 text-sm">Hozircha kuryer yo\'q.</p>';

    couriers.forEach((c) => {
      const el = document.createElement('div');
      el.className = 'card p-4';
      el.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold text-slate-700">${c.fullName}</div>
            <div class="text-xs text-slate-400">${c.phone || '—'}</div>
          </div>
          <span class="status-pill ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
            ${c.active ? 'Faol' : 'Faol emas'}
          </span>
        </div>
        <div class="mt-2 text-sm text-slate-600 flex items-center gap-2">
          📦 Kuryerdagi bo'sh idishlar: 
          ${role === 'admin' ? `
            <input type="number" id="edit-bottles-${c.id}" value="${c.bottlesWithCourier}" class="border rounded-lg px-2 py-1 text-xs w-16" />
            <button data-updatebottles="${c.id}" class="bg-blue-600 text-white text-xs px-2 py-1 rounded-lg">Saqlash</button>
          ` : `<b>${c.bottlesWithCourier}</b>`}
        </div>
        ${role === 'admin' ? `
          <div class="flex gap-2 mt-3 pt-3 border-t">
            <input type="number" min="1" placeholder="Soni" id="return-${c.id}" class="border rounded-lg px-2 py-1 text-xs w-20" />
            <button data-return="${c.id}" class="bg-slate-600 text-white text-xs px-2 py-1 rounded-lg">Omborga qaytarish</button>
            <button data-toggle="${c.id}" data-active="${c.active}" class="text-xs px-2 py-1 rounded-lg border ml-auto">${c.active ? 'Faolsizlantirish' : 'Faollashtirish'}</button>
          </div>
        ` : ''}
      `;
      list.appendChild(el);
    });
  } catch (e) {
    list.innerHTML = `<p class="text-red-500 text-sm">${e.message}</p>`;
  }
}

document.getElementById('couriersList').addEventListener('click', async (e) => {
  const returnId = e.target.dataset.return;
  const toggleId = e.target.dataset.toggle;

  if (returnId) {
    const input = document.getElementById(`return-${returnId}`);
    const count = Number(input.value);
    if (!count || count <= 0) return alert("To'g'ri son kiriting");
    try {
      await api(`/couriers/${returnId}/return-empties`, { method: 'POST', body: JSON.stringify({ count }) });
      loadCouriers();
    } catch (err) { alert(err.message); }
  }

  if (toggleId) {
    const currentActive = e.target.dataset.active === 'true' || e.target.dataset.active === '1';
    try {
      await api(`/couriers/${toggleId}`, { method: 'PATCH', body: JSON.stringify({ active: !currentActive }) });
      loadCouriers();
    } catch (err) { alert(err.message); }
  }

  const updateBottlesId = e.target.dataset.updatebottles;
  if (updateBottlesId) {
    const input = document.getElementById(`edit-bottles-${updateBottlesId}`);
    const bottlesWithCourier = Number(input.value);
    if (isNaN(bottlesWithCourier) || bottlesWithCourier < 0) return alert("To'g'ri son kiriting");
    try {
      await api(`/couriers/${updateBottlesId}`, { method: 'PATCH', body: JSON.stringify({ bottlesWithCourier }) });
      loadCouriers();
    } catch (err) { alert(err.message); }
  }
});

if (role === 'admin') {
  const addBtn = document.getElementById('addCourierBtn');
  addBtn.classList.remove('hidden');
  addBtn.addEventListener('click', () => {
    document.getElementById('courierAddForm').classList.toggle('hidden');
  });
  document.getElementById('saveCourierBtn').addEventListener('click', async () => {
    const telegramId = document.getElementById('courierTelegramId').value.trim();
    const fullName = document.getElementById('courierFullName').value.trim();
    const phone = document.getElementById('courierPhone').value.trim();
    if (!telegramId || !fullName) return alert('Telegram ID va F.I.Sh majburiy');
    try {
      await api('/couriers', { method: 'POST', body: JSON.stringify({ telegramId, fullName, phone }) });
      document.getElementById('courierTelegramId').value = '';
      document.getElementById('courierFullName').value = '';
      document.getElementById('courierPhone').value = '';
      document.getElementById('courierAddForm').classList.add('hidden');
      loadCouriers();
    } catch (err) { alert(err.message); }
  });
}

// ================= IDISHLAR BALANSI =================
async function loadWarehouse() {
  const cards = document.getElementById('warehouseCards');
  cards.innerHTML = '<p class="text-slate-400 text-sm col-span-4">Yuklanmoqda...</p>';
  try {
    const data = await api('/warehouse');
    cards.innerHTML = `
      ${statCard('🏭 Zavoddan jami kelgan', data.warehouse.totalReceived || 0, 'text-emerald-600')}
      ${statCard('✅ Jami yetkazib berilgan', data.warehouse.totalDelivered || 0, 'text-green-600')}
      ${statCard('💧 Ombordagi qoldiq (mavjud)', data.warehouse.fullBottles, 'text-blue-600')}
      ${statCard('📦 Mijozlardagi idish qarzi', data.withCustomers, 'text-amber-600')}
      ${statCard('🚚 Kuryerlardagi bo\'sh idish', data.withCouriers, 'text-purple-600')}
    `;
    if (role === 'admin') {
      document.getElementById('restockForm').classList.remove('hidden');
    }
  } catch (e) {
    cards.innerHTML = `<p class="text-red-500 text-sm col-span-4">${e.message}</p>`;
  }
}

function statCard(label, value, colorClass) {
  return `
    <div class="card p-4">
      <div class="text-xs text-slate-500 mb-1">${label}</div>
      <div class="text-2xl font-bold ${colorClass}">${value}</div>
    </div>
  `;
}

document.getElementById('restockBtn')?.addEventListener('click', async () => {
  const count = Number(document.getElementById('restockCount').value);
  if (!count || count <= 0) return alert("To'g'ri son kiriting");
  try {
    await api('/warehouse/restock', { method: 'POST', body: JSON.stringify({ fullBottles: count }) });
    document.getElementById('restockCount').value = '';
    loadWarehouse();
  } catch (err) { alert(err.message); }
});

// ================= MIJOZLAR =================
async function loadCustomers() {
  const tbody = document.getElementById('customersTable');
  tbody.innerHTML = '<tr><td class="px-4 py-3 text-slate-400" colspan="4">Yuklanmoqda...</td></tr>';
  try {
    const customers = await api('/customers');
    tbody.innerHTML = '';
    if (!customers.length) {
      tbody.innerHTML = '<tr><td class="px-4 py-3 text-slate-400" colspan="4">Mijozlar yo\'q</td></tr>';
    }
    customers.forEach((c) => {
      const tr = document.createElement('tr');
      tr.className = 'border-t';
      tr.innerHTML = `
        <td class="px-4 py-2">${c.fullName || 'Noma\'lum'}</td>
        <td class="px-4 py-2">${c.phone || '—'}</td>
        <td class="px-4 py-2 ${c.bottlesOwed > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}">
          ${c.bottlesOwed} ta ${c.bottlesOwed > 0 ? '⚠️' : ''}
        </td>
        <td class="px-4 py-2 text-slate-400 text-xs">${formatDate(c.createdAt)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td class="px-4 py-3 text-red-500" colspan="4">${e.message}</td></tr>`;
  }
}

// ================= STATISTIKA (faqat Admin) =================
document.querySelectorAll('.period-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active', 'bg-brand', 'text-white'));
    btn.classList.add('bg-brand', 'text-white');
    loadStats(btn.dataset.period);
  });
});

async function loadStats(period) {
  const salesCards = document.getElementById('salesCards');
  if (!salesCards) return;
  salesCards.innerHTML = '<p class="text-slate-400 text-sm col-span-2">Yuklanmoqda...</p>';
  try {
    const [sales, topCustomers, courierPerf] = await Promise.all([
      api(`/stats/sales?period=${period}`),
      api('/stats/top-customers'),
      api('/stats/couriers-performance'),
    ]);

    salesCards.innerHTML = `
      ${statCard('💰 Tushum', formatSum(sales.totalRevenue), 'text-green-600')}
      ${statCard('📦 Buyurtmalar soni', sales.ordersCount, 'text-blue-600')}
    `;

    const topTable = document.getElementById('topCustomersTable');
    topTable.innerHTML = topCustomers.length
      ? topCustomers.map((c) => `
          <tr class="border-t">
            <td class="py-1">${c.fullName}</td>
            <td class="py-1">${c.ordersCount}</td>
            <td class="py-1">${formatSum(c.totalSpent)}</td>
          </tr>`).join('')
      : '<tr><td class="py-2 text-slate-400" colspan="3">Ma\'lumot yo\'q</td></tr>';

    const perfTable = document.getElementById('courierPerfTable');
    perfTable.innerHTML = courierPerf.length
      ? courierPerf.map((c) => `
          <tr class="border-t">
            <td class="py-1">${c.fullName}</td>
            <td class="py-1">${c.completedOrders}</td>
            <td class="py-1">${c.avgDeliveryMinutes} daqiqa</td>
          </tr>`).join('')
      : '<tr><td class="py-2 text-slate-400" colspan="3">Ma\'lumot yo\'q</td></tr>';
  } catch (e) {
    salesCards.innerHTML = `<p class="text-red-500 text-sm col-span-2">${e.message}</p>`;
  }
}

// ================= MAHSULOTLAR (faqat Admin) =================
document.getElementById('addProductBtn')?.addEventListener('click', () => {
  document.getElementById('productAddForm').classList.toggle('hidden');
});

document.getElementById('saveProductBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('productName').value.trim();
  const price = Number(document.getElementById('productPrice').value);
  const volumeLiters = Number(document.getElementById('productVolume').value) || 18.9;
  if (!name || !price) return alert('Nomi va narxi majburiy');
  try {
    await api('/products', { method: 'POST', body: JSON.stringify({ name, price, volumeLiters }) });
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productAddForm').classList.add('hidden');
    loadProducts();
  } catch (err) { alert(err.message); }
});

async function loadProducts() {
  const list = document.getElementById('productsList');
  if (!list) return;
  list.innerHTML = '<p class="text-slate-400 text-sm">Yuklanmoqda...</p>';
  try {
    const products = await api('/products/all');
    list.innerHTML = '';
    products.forEach((p) => {
      const el = document.createElement('div');
      el.className = 'card p-4';
      el.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold text-slate-700">${p.name}</div>
            <div class="text-xs text-slate-400">${p.volumeLiters} litr</div>
          </div>
          <span class="status-pill ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
            ${p.active ? 'Faol' : 'Nofaol'}
          </span>
        </div>
        <div class="mt-2 font-medium text-slate-700">${formatSum(p.price)}</div>
        <button data-toggleproduct="${p.id}" data-active="${p.active}" class="text-xs px-2 py-1 rounded-lg border mt-2">
          ${p.active ? 'Nofaol qilish' : 'Faollashtirish'}
        </button>
      `;
      list.appendChild(el);
    });
  } catch (e) {
    list.innerHTML = `<p class="text-red-500 text-sm">${e.message}</p>`;
  }
}

document.getElementById('productsList')?.addEventListener('click', async (e) => {
  const id = e.target.dataset.toggleproduct;
  if (!id) return;
  const currentActive = e.target.dataset.active === 'true' || e.target.dataset.active === '1';
  try {
    await api(`/products/${id}`, { method: 'PATCH', body: JSON.stringify({ active: !currentActive }) });
    loadProducts();
  } catch (err) { alert(err.message); }
});

// ================= Boshlang'ich yuklash =================
switchTab('orders');
