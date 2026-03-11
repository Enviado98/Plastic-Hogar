// =============================================
// PLASTIC-HOGAR · ADMIN.JS
// Versión 0.1 · Panel de Administración
// =============================================

const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaWxqemtrZGlka2xhZnByaHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MDg5MiwiZXhwIjoyMDg4ODM2ODkyfQ.sKa8RtmpDGLam7dYVaKDOgXQ7jDabaSMPmZzmjQYbCI';

// Admin credentials (demo — hardcoded)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'plastic2025';

// Supabase admin client (service role)
const { createClient } = supabase;
const adminDb = createClient(
  'https://uoiljzkkdidklafprhtg.supabase.co',
  SUPABASE_SERVICE_KEY
);

// Estado
let adminProducts = [];
let deleteTargetId = null;
let isEditing = false;
let imageFile = null;

// =============================================
//  LOGIN
// =============================================

function checkLogin() {
  return sessionStorage.getItem('ph_admin') === 'true';
}

function showPanel() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  loadAdminProducts();
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-panel').classList.add('hidden');
}

document.getElementById('btn-login')?.addEventListener('click', doLogin);
document.getElementById('login-pass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem('ph_admin', 'true');
    err.classList.add('hidden');
    showPanel();
  } else {
    err.classList.remove('hidden');
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
  }
}

document.getElementById('btn-logout')?.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.removeItem('ph_admin');
  showLogin();
});

// =============================================
//  NAVEGACIÓN SIDEBAR
// =============================================

document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    showView(view);
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

function showView(name) {
  document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.remove('hidden');

  const titles = {
    productos: 'Gestión de Productos',
    nuevo: isEditing ? 'Editar Producto' : 'Nuevo Producto'
  };
  const titleEl = document.getElementById('admin-view-title');
  if (titleEl) titleEl.textContent = titles[name] || 'Admin';
}

document.getElementById('btn-go-nuevo')?.addEventListener('click', () => {
  resetForm();
  showView('nuevo');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector('[data-view="nuevo"]')?.classList.add('active');
});

// =============================================
//  CARGAR PRODUCTOS ADMIN
// =============================================

async function loadAdminProducts() {
  const listEl = document.getElementById('admin-productos-list');
  listEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando...</p></div>';

  try {
    const { data, error } = await adminDb
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    adminProducts = data || [];

    document.getElementById('stat-total').textContent = adminProducts.length;

    renderAdminTable(adminProducts);
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="loading-state"><p>⚠️ Error: ${err.message}</p></div>`;
  }
}

function renderAdminTable(list) {
  const listEl = document.getElementById('admin-productos-list');

  if (!list || list.length === 0) {
    listEl.innerHTML = `<div class="loading-state"><p>No hay productos aún. ¡Agrega el primero!</p></div>`;
    return;
  }

  const stockLabel = { disponible: 'Disponible', agotado: 'Agotado', limitado: 'Stock Limitado' };
  const getCatEmoji = (cat) => ({ vasos:'🥤', pozuelos:'🍽️', recipientes:'📦', limpieza:'🧹', cocina:'🍳', otros:'✨' }[cat] || '🏠');

  listEl.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Imagen</th>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => `
          <tr>
            <td>
              ${p.imagen_url
                ? `<img class="tbl-img" src="${p.imagen_url}" alt="${p.nombre}" onerror="this.outerHTML='<div class=tbl-no-img>${getCatEmoji(p.categoria)}</div>'">`
                : `<div class="tbl-no-img">${getCatEmoji(p.categoria)}</div>`
              }
            </td>
            <td><span class="tbl-name">${p.nombre}</span></td>
            <td><span class="tbl-cat">${getCatEmoji(p.categoria)} ${p.categoria || 'otros'}</span></td>
            <td class="tbl-price">${formatAdminPrice(p.precio)}</td>
            <td><span class="tbl-stock stock-${p.stock}">${stockLabel[p.stock] || p.stock}</span></td>
            <td>
              <div class="tbl-actions">
                <button class="btn-edit" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-del" onclick="confirmDelete('${p.id}')"><i class="fas fa-trash"></i> Eliminar</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function formatAdminPrice(p) {
  if (!p && p !== 0) return '—';
  return new Intl.NumberFormat('es-CU', { minimumFractionDigits: 2 }).format(p) + ' CUP';
}

// =============================================
//  BÚSQUEDA ADMIN
// =============================================

document.getElementById('admin-search')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = adminProducts.filter(p =>
    p.nombre?.toLowerCase().includes(q) ||
    p.categoria?.toLowerCase().includes(q) ||
    p.descripcion?.toLowerCase().includes(q)
  );
  renderAdminTable(filtered);
});

// =============================================
//  FORMULARIO NUEVO/EDITAR
// =============================================

function resetForm() {
  isEditing = false;
  imageFile = null;
  document.getElementById('edit-id').value = '';
  document.getElementById('prod-nombre').value = '';
  document.getElementById('prod-categoria').value = '';
  document.getElementById('prod-desc').value = '';
  document.getElementById('prod-precio').value = '';
  document.getElementById('prod-stock').value = 'disponible';
  document.getElementById('prod-imagen-url').value = '';
  document.getElementById('img-preview').classList.add('hidden');
  document.getElementById('upload-placeholder').classList.remove('hidden');
  document.getElementById('btn-save-text').textContent = 'Guardar Producto';
  document.getElementById('form-title').textContent = 'Nuevo Producto';
  hideFeedback();
}

function editProduct(id) {
  const p = adminProducts.find(x => x.id === id);
  if (!p) return;

  isEditing = true;
  document.getElementById('edit-id').value = p.id;
  document.getElementById('prod-nombre').value = p.nombre || '';
  document.getElementById('prod-categoria').value = p.categoria || '';
  document.getElementById('prod-desc').value = p.descripcion || '';
  document.getElementById('prod-precio').value = p.precio || '';
  document.getElementById('prod-stock').value = p.stock || 'disponible';
  document.getElementById('prod-imagen-url').value = p.imagen_url || '';

  if (p.imagen_url) {
    const preview = document.getElementById('img-preview');
    preview.src = p.imagen_url;
    preview.classList.remove('hidden');
    document.getElementById('upload-placeholder').classList.add('hidden');
  } else {
    document.getElementById('img-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
  }

  document.getElementById('btn-save-text').textContent = 'Actualizar Producto';
  document.getElementById('form-title').textContent = 'Editar Producto';

  showView('nuevo');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector('[data-view="nuevo"]')?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Preview de imagen seleccionada
document.getElementById('prod-imagen')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showFeedback('La imagen supera el límite de 5MB.', 'error');
    return;
  }
  imageFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('img-preview');
    preview.src = ev.target.result;
    preview.classList.remove('hidden');
    document.getElementById('upload-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
});

// Preview de URL pegada
document.getElementById('prod-imagen-url')?.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url) {
    const preview = document.getElementById('img-preview');
    preview.src = url;
    preview.classList.remove('hidden');
    document.getElementById('upload-placeholder').classList.add('hidden');
    imageFile = null;
  } else {
    document.getElementById('img-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
  }
});

// =============================================
//  GUARDAR PRODUCTO
// =============================================

document.getElementById('btn-save-product')?.addEventListener('click', saveProduct);

async function saveProduct() {
  const nombre = document.getElementById('prod-nombre').value.trim();
  const categoria = document.getElementById('prod-categoria').value;
  const descripcion = document.getElementById('prod-desc').value.trim();
  const precio = parseFloat(document.getElementById('prod-precio').value);
  const stock = document.getElementById('prod-stock').value;
  let imagen_url = document.getElementById('prod-imagen-url').value.trim();
  const editId = document.getElementById('edit-id').value;

  if (!nombre) { showFeedback('El nombre es obligatorio.', 'error'); return; }
  if (!categoria) { showFeedback('Selecciona una categoría.', 'error'); return; }
  if (isNaN(precio) || precio < 0) { showFeedback('Ingresa un precio válido.', 'error'); return; }

  const btn = document.getElementById('btn-save-product');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  try {
    // Subir imagen si hay archivo
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const fileName = `producto_${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await adminDb.storage
        .from('productos-img')
        .upload(fileName, imageFile, { upsert: true });

      if (uploadError) {
        // Si storage no está configurado, usar URL de data
        console.warn('Storage error, usando URL de datos:', uploadError.message);
        imagen_url = await fileToDataUrl(imageFile);
      } else {
        const { data: publicData } = adminDb.storage
          .from('productos-img')
          .getPublicUrl(fileName);
        imagen_url = publicData.publicUrl;
      }
    }

    const payload = { nombre, categoria, descripcion, precio, stock, imagen_url };

    let result;
    if (isEditing && editId) {
      result = await adminDb.from('productos').update(payload).eq('id', editId);
    } else {
      result = await adminDb.from('productos').insert([payload]);
    }

    if (result.error) throw result.error;

    showFeedback(isEditing ? '✅ Producto actualizado correctamente.' : '✅ Producto guardado correctamente.', 'success');
    await loadAdminProducts();

    setTimeout(() => {
      showView('productos');
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      document.querySelector('[data-view="productos"]')?.classList.add('active');
      resetForm();
    }, 1200);

  } catch (err) {
    console.error(err);
    showFeedback(`❌ Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">' + (isEditing ? 'Actualizar Producto' : 'Guardar Producto') + '</span>';
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// =============================================
//  ELIMINAR PRODUCTO
// =============================================

function confirmDelete(id) {
  deleteTargetId = id;
  document.getElementById('confirm-modal').classList.remove('hidden');
}

document.getElementById('confirm-cancel')?.addEventListener('click', () => {
  deleteTargetId = null;
  document.getElementById('confirm-modal').classList.add('hidden');
});

document.getElementById('confirm-delete')?.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  document.getElementById('confirm-modal').classList.add('hidden');

  try {
    const { error } = await adminDb.from('productos').delete().eq('id', deleteTargetId);
    if (error) throw error;
    await loadAdminProducts();
  } catch (err) {
    alert('Error eliminando: ' + err.message);
  }
  deleteTargetId = null;
});

// Cerrar modal al clickar fuera
document.getElementById('confirm-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('confirm-modal')) {
    deleteTargetId = null;
    document.getElementById('confirm-modal').classList.add('hidden');
  }
});

// =============================================
//  CANCELAR FORMULARIO
// =============================================

document.getElementById('btn-cancel-form')?.addEventListener('click', () => {
  resetForm();
  showView('productos');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector('[data-view="productos"]')?.classList.add('active');
});

// =============================================
//  FEEDBACK
// =============================================

function showFeedback(msg, type) {
  const el = document.getElementById('form-feedback');
  if (!el) return;
  el.textContent = msg;
  el.className = `form-feedback ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => hideFeedback(), 4000);
}

function hideFeedback() {
  const el = document.getElementById('form-feedback');
  if (el) el.classList.add('hidden');
}

// =============================================
//  INIT ADMIN
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('admin-panel')) return;

  if (checkLogin()) {
    showPanel();
  } else {
    showLogin();
  }
});

