// =============================================
// PLASTIC-HOGAR · APP.JS
// Versión 0.1 · Lógica de la Tienda
// =============================================

const SUPABASE_URL = 'https://uoiljzkkdidklafprhtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaWxqemtrZGlka2xhZnByaHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjA4OTIsImV4cCI6MjA4ODgzNjg5Mn0.mNBFzRbTZKERuTk5NtZE0UZVTqx5R6j0wd8dIcobdbI';

const WA_NUMBER = '5356919014';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// INICIALIZAR TABLA EN SUPABASE (si no existe)
// Se hace via SQL en el dashboard de Supabase:
// CREATE TABLE IF NOT EXISTS productos (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   nombre text NOT NULL,
//   descripcion text,
//   precio numeric NOT NULL DEFAULT 0,
//   categoria text DEFAULT 'otros',
//   imagen_url text,
//   stock text DEFAULT 'disponible',
//   created_at timestamptz DEFAULT now()
// );
// =============================================

// Estado global
let allProducts = [];
let activeCategory = 'todos';
let searchQuery = '';

// =============================================
//  HELPERS
// =============================================

function formatPrice(p) {
  if (!p && p !== 0) return '—';
  return new Intl.NumberFormat('es-CU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(p) + ' CUP';
}

function getCatEmoji(cat) {
  const map = {
    vasos: '🥤', pozuelos: '🍽️', recipientes: '📦',
    limpieza: '🧹', cocina: '🍳', otros: '✨'
  };
  return map[cat] || '🏠';
}

function buildWaLink(product) {
  const msg = encodeURIComponent(
    `¡Hola! Vi el producto *${product.nombre}* por *${formatPrice(product.precio)}* en Plastic-Hogar y me interesa. ¿Está disponible?`
  );
  return `https://wa.me/${WA_NUMBER}?text=${msg}`;
}

function filterProducts() {
  return allProducts.filter(p => {
    const matchCat = activeCategory === 'todos' || p.categoria === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
      (p.categoria && p.categoria.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });
}

// =============================================
//  RENDER TIENDA
// =============================================

function renderProducts(list) {
  const grid = document.getElementById('productos-grid');
  const empty = document.getElementById('empty-state');
  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML = '';
    empty && empty.classList.remove('hidden');
    return;
  }
  empty && empty.classList.add('hidden');

  grid.innerHTML = list.map((p, i) => `
    <div class="product-card" data-id="${p.id}" style="animation-delay:${i * 0.06}s">
      <div class="product-img-wrap">
        ${p.imagen_url
          ? `<img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'product-no-img\'>${getCatEmoji(p.categoria)}</div>'">`
          : `<div class="product-no-img">${getCatEmoji(p.categoria)}</div>`
        }
        ${p.stock === 'agotado' ? '<span class="product-badge agotado">Agotado</span>' : ''}
        ${p.stock === 'limitado' ? '<span class="product-badge limitado">Limitado</span>' : ''}
        ${p.stock === 'disponible' ? '<span class="product-badge">Disponible</span>' : ''}
      </div>
      <div class="product-body">
        <div class="product-cat">${getCatEmoji(p.categoria)} ${p.categoria || 'otros'}</div>
        <h3 class="product-name">${p.nombre}</h3>
        ${p.descripcion ? `<p class="product-desc">${p.descripcion}</p>` : ''}
        <div class="product-footer">
          <div class="product-price">${formatPrice(p.precio)}</div>
          <a href="${buildWaLink(p)}" target="_blank" class="btn-comprar" onclick="event.stopPropagation()">
            <i class="fab fa-whatsapp"></i> Comprar
          </a>
        </div>
      </div>
    </div>
  `).join('');

  // Click en tarjeta → modal
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-comprar')) return;
      const id = card.dataset.id;
      const product = allProducts.find(p => p.id === id);
      if (product) openModal(product);
    });
  });
}

// =============================================
//  MODAL
// =============================================

function openModal(p) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  document.getElementById('modal-img').src = p.imagen_url || '';
  document.getElementById('modal-img').style.display = p.imagen_url ? 'block' : 'none';
  document.getElementById('modal-cat').textContent = `${getCatEmoji(p.categoria)} ${p.categoria || ''}`;
  document.getElementById('modal-name').textContent = p.nombre;
  document.getElementById('modal-desc').textContent = p.descripcion || 'Sin descripción disponible.';
  document.getElementById('modal-price').textContent = formatPrice(p.precio);
  document.getElementById('modal-wa-btn').href = buildWaLink(p);

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// =============================================
//  SUPABASE — CARGAR PRODUCTOS
// =============================================

async function loadProducts() {
  const grid = document.getElementById('productos-grid');
  if (!grid) return [];

  try {
    const { data, error } = await db
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error cargando productos:', err);
    if (grid) {
      grid.innerHTML = `<div class="loading-state"><p>⚠️ Error cargando productos. Verifica la conexión.</p></div>`;
    }
    return [];
  }
}

// =============================================
//  INIT TIENDA
// =============================================

async function initStore() {
  // Burger menu
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }

  // Cargar productos
  const grid = document.getElementById('productos-grid');
  if (grid) {
    allProducts = await loadProducts();
    renderProducts(filterProducts());

    // Suscripción real-time
    db.channel('productos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, async () => {
        allProducts = await loadProducts();
        renderProducts(filterProducts());
      })
      .subscribe();
  }

  // Filtros de categoría
  document.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeCategory = card.dataset.cat;
      renderProducts(filterProducts());
    });
  });

  // Búsqueda
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderProducts(filterProducts());
    });
  }

  // Modal
  const modalClose = document.getElementById('modal-close');
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// =============================================
//  ARRANCAR
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('productos-grid')) {
    initStore();
  }
});

