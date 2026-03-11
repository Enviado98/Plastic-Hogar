// =============================================
// PLASTIC-HOGAR · ADMIN.JS v0.1
// =============================================

const SUPABASE_URL_ADMIN    = 'https://uoiljzkkdidklafprhtg.supabase.co';
const SUPABASE_SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaWxqemtrZGlka2xhZnByaHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MDg5MiwiZXhwIjoyMDg4ODM2ODkyfQ.sKa8RtmpDGLam7dYVaKDOgXQ7jDabaSMPmZzmjQYbCI';
const ADMIN_USER            = 'admin';
const ADMIN_PASS            = 'plastic2025';

document.addEventListener('DOMContentLoaded', function () {

  // --- Supabase client ---
  const adminDb = supabase.createClient(SUPABASE_URL_ADMIN, SUPABASE_SERVICE_KEY);

  // --- Estado ---
  let adminProducts  = [];
  let deleteTargetId = null;
  let isEditing      = false;
  let imageFile      = null;

  // ============================================================
  //  HELPERS
  // ============================================================
  function $(id) { return document.getElementById(id); }

  function formatPrice(p) {
    if (p === null || p === undefined || p === '') return '—';
    return new Intl.NumberFormat('es-CU', { minimumFractionDigits: 2 }).format(p) + ' CUP';
  }

  function getCatEmoji(cat) {
    var m = { vasos:'🥤', pozuelos:'🍽️', recipientes:'📦', limpieza:'🧹', cocina:'🍳', otros:'✨' };
    return m[cat] || '🏠';
  }

  function showFeedback(msg, type) {
    var el = $('form-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'form-feedback ' + type;
    el.classList.remove('hidden');
    setTimeout(function(){ el.classList.add('hidden'); }, 4000);
  }

  // ============================================================
  //  LOGIN
  // ============================================================
  function checkLogin()  { return sessionStorage.getItem('ph_admin') === 'true'; }

  function showPanel() {
    $('login-screen').classList.add('hidden');
    $('admin-panel').classList.remove('hidden');
    loadAdminProducts();
  }

  function showLogin() {
    $('login-screen').classList.remove('hidden');
    $('admin-panel').classList.add('hidden');
  }

  function doLogin() {
    var user = $('login-user').value.trim();
    var pass = $('login-pass').value;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem('ph_admin', 'true');
      $('login-error').classList.add('hidden');
      showPanel();
    } else {
      $('login-error').classList.remove('hidden');
      $('login-pass').value = '';
      $('login-pass').focus();
    }
  }

  $('btn-login').addEventListener('click', doLogin);
  $('login-pass').addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
  $('login-user').addEventListener('keydown', function(e){ if(e.key==='Enter') $('login-pass').focus(); });

  $('btn-logout').addEventListener('click', function(e){
    e.preventDefault();
    sessionStorage.removeItem('ph_admin');
    showLogin();
  });

  // ============================================================
  //  NAVEGACIÓN
  // ============================================================
  function showView(name) {
    document.querySelectorAll('.admin-view').forEach(function(v){ v.classList.add('hidden'); });
    var el = $('view-' + name);
    if (el) el.classList.remove('hidden');

    var titles = { productos: 'Gestión de Productos', nuevo: isEditing ? 'Editar Producto' : 'Nuevo Producto' };
    var titleEl = $('admin-view-title');
    if (titleEl) titleEl.textContent = titles[name] || 'Admin';

    document.querySelectorAll('.sidebar-link').forEach(function(l){ l.classList.remove('active'); });
    var activeLink = document.querySelector('[data-view="' + name + '"]');
    if (activeLink) activeLink.classList.add('active');
  }

  document.querySelectorAll('.sidebar-link[data-view]').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var view = link.dataset.view;
      if (view === 'nuevo') resetForm();
      showView(view);
    });
  });

  $('btn-go-nuevo').addEventListener('click', function(){ resetForm(); showView('nuevo'); });
  $('btn-cancel-form').addEventListener('click', function(){ resetForm(); showView('productos'); });

  // ============================================================
  //  CARGAR PRODUCTOS
  // ============================================================
  async function loadAdminProducts() {
    var listEl = $('admin-productos-list');
    listEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando...</p></div>';
    try {
      var res = await adminDb.from('productos').select('*').order('created_at', { ascending: false });
      if (res.error) throw res.error;
      adminProducts = res.data || [];
      $('stat-total').textContent = adminProducts.length;
      renderAdminTable(adminProducts);
    } catch(err) {
      console.error(err);
      listEl.innerHTML = '<div class="loading-state"><p>⚠️ Error: ' + err.message + '</p></div>';
    }
  }

  // ============================================================
  //  RENDER TABLA
  // ============================================================
  function renderAdminTable(list) {
    var listEl = $('admin-productos-list');
    if (!list || list.length === 0) {
      listEl.innerHTML = '<div class="loading-state"><p>No hay productos. ¡Agrega el primero!</p></div>';
      return;
    }
    var stockLabel = { disponible:'Disponible', agotado:'Agotado', limitado:'Stock Limitado' };
    var rows = list.map(function(p){
      var imgHtml = p.imagen_url
        ? '<img class="tbl-img" src="' + p.imagen_url + '" alt="" onerror="this.style.display=\'none\'">'
        : '<div class="tbl-no-img">' + getCatEmoji(p.categoria) + '</div>';
      return '<tr>' +
        '<td>' + imgHtml + '</td>' +
        '<td><span class="tbl-name">' + p.nombre + '</span></td>' +
        '<td><span class="tbl-cat">' + getCatEmoji(p.categoria) + ' ' + (p.categoria||'otros') + '</span></td>' +
        '<td class="tbl-price">' + formatPrice(p.precio) + '</td>' +
        '<td><span class="tbl-stock stock-' + p.stock + '">' + (stockLabel[p.stock]||p.stock) + '</span></td>' +
        '<td><div class="tbl-actions">' +
          '<button class="btn-edit" data-id="' + p.id + '"><i class="fas fa-edit"></i> Editar</button>' +
          '<button class="btn-del"  data-id="' + p.id + '"><i class="fas fa-trash"></i> Eliminar</button>' +
        '</div></td></tr>';
    }).join('');

    listEl.innerHTML = '<table class="admin-table"><thead><tr>' +
      '<th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    listEl.querySelectorAll('.btn-edit').forEach(function(btn){
      btn.addEventListener('click', function(){ editProduct(btn.dataset.id); });
    });
    listEl.querySelectorAll('.btn-del').forEach(function(btn){
      btn.addEventListener('click', function(){ confirmDelete(btn.dataset.id); });
    });
  }

  // ============================================================
  //  BÚSQUEDA
  // ============================================================
  $('admin-search').addEventListener('input', function(e){
    var q = e.target.value.toLowerCase();
    var filtered = adminProducts.filter(function(p){
      return (p.nombre&&p.nombre.toLowerCase().includes(q))||
             (p.categoria&&p.categoria.toLowerCase().includes(q))||
             (p.descripcion&&p.descripcion.toLowerCase().includes(q));
    });
    renderAdminTable(filtered);
  });

  // ============================================================
  //  FORMULARIO
  // ============================================================
  function resetForm() {
    isEditing = false; imageFile = null;
    $('edit-id').value          = '';
    $('prod-nombre').value      = '';
    $('prod-categoria').value   = '';
    $('prod-desc').value        = '';
    $('prod-precio').value      = '';
    $('prod-stock').value       = 'disponible';
    $('prod-imagen-url').value  = '';
    $('img-preview').classList.add('hidden');
    $('upload-placeholder').classList.remove('hidden');
    $('btn-save-text').textContent = 'Guardar Producto';
    $('form-title').textContent    = 'Nuevo Producto';
    $('form-feedback').classList.add('hidden');
  }

  function editProduct(id) {
    var p = adminProducts.find(function(x){ return x.id === id; });
    if (!p) return;
    isEditing = true;
    $('edit-id').value          = p.id;
    $('prod-nombre').value      = p.nombre      || '';
    $('prod-categoria').value   = p.categoria   || '';
    $('prod-desc').value        = p.descripcion || '';
    $('prod-precio').value      = p.precio      || '';
    $('prod-stock').value       = p.stock       || 'disponible';
    $('prod-imagen-url').value  = p.imagen_url  || '';
    if (p.imagen_url) {
      $('img-preview').src = p.imagen_url;
      $('img-preview').classList.remove('hidden');
      $('upload-placeholder').classList.add('hidden');
    } else {
      $('img-preview').classList.add('hidden');
      $('upload-placeholder').classList.remove('hidden');
    }
    $('btn-save-text').textContent = 'Actualizar Producto';
    $('form-title').textContent    = 'Editar Producto';
    showView('nuevo');
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  $('prod-imagen').addEventListener('change', function(e){
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { showFeedback('Imagen supera 5MB.','error'); return; }
    imageFile = file;
    var reader = new FileReader();
    reader.onload = function(ev){
      $('img-preview').src = ev.target.result;
      $('img-preview').classList.remove('hidden');
      $('upload-placeholder').classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });

  $('prod-imagen-url').addEventListener('input', function(e){
    var url = e.target.value.trim();
    if (url) {
      $('img-preview').src = url;
      $('img-preview').classList.remove('hidden');
      $('upload-placeholder').classList.add('hidden');
      imageFile = null;
    } else {
      $('img-preview').classList.add('hidden');
      $('upload-placeholder').classList.remove('hidden');
    }
  });

  // ============================================================
  //  GUARDAR
  // ============================================================
  $('btn-save-product').addEventListener('click', saveProduct);

  async function saveProduct() {
    var nombre      = $('prod-nombre').value.trim();
    var categoria   = $('prod-categoria').value;
    var descripcion = $('prod-desc').value.trim();
    var precio      = parseFloat($('prod-precio').value);
    var stock       = $('prod-stock').value;
    var imagen_url  = $('prod-imagen-url').value.trim();
    var editId      = $('edit-id').value;

    if (!nombre)                     { showFeedback('El nombre es obligatorio.','error');  return; }
    if (!categoria)                  { showFeedback('Selecciona una categoría.','error');   return; }
    if (isNaN(precio) || precio < 0) { showFeedback('Precio inválido.','error');            return; }

    var btn = $('btn-save-product');
    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      if (imageFile) {
        var ext      = imageFile.name.split('.').pop();
        var fileName = 'producto_' + Date.now() + '.' + ext;
        var up = await adminDb.storage.from('productos-img').upload(fileName, imageFile, { upsert:true });
        if (up.error) {
          imagen_url = await fileToDataUrl(imageFile);
        } else {
          var pub = adminDb.storage.from('productos-img').getPublicUrl(fileName);
          imagen_url = pub.data.publicUrl;
        }
      }

      var payload = { nombre, categoria, descripcion, precio, stock, imagen_url };
      var result  = isEditing && editId
        ? await adminDb.from('productos').update(payload).eq('id', editId)
        : await adminDb.from('productos').insert([payload]);

      if (result.error) throw result.error;

      showFeedback(isEditing ? '✅ Producto actualizado.' : '✅ Producto guardado.', 'success');
      await loadAdminProducts();
      setTimeout(function(){ resetForm(); showView('productos'); }, 1200);

    } catch(err) {
      console.error(err);
      showFeedback('❌ Error: ' + err.message, 'error');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">' + (isEditing?'Actualizar':'Guardar') + ' Producto</span>';
    }
  }

  function fileToDataUrl(file) {
    return new Promise(function(resolve){
      var r = new FileReader();
      r.onload = function(e){ resolve(e.target.result); };
      r.readAsDataURL(file);
    });
  }

  // ============================================================
  //  ELIMINAR
  // ============================================================
  function confirmDelete(id) {
    deleteTargetId = id;
    $('confirm-modal').classList.remove('hidden');
  }

  $('confirm-cancel').addEventListener('click', function(){
    deleteTargetId = null;
    $('confirm-modal').classList.add('hidden');
  });

  $('confirm-delete').addEventListener('click', async function(){
    if (!deleteTargetId) return;
    $('confirm-modal').classList.add('hidden');
    try {
      var res = await adminDb.from('productos').delete().eq('id', deleteTargetId);
      if (res.error) throw res.error;
      await loadAdminProducts();
    } catch(err) { alert('Error: ' + err.message); }
    deleteTargetId = null;
  });

  $('confirm-modal').addEventListener('click', function(e){
    if (e.target === $('confirm-modal')) {
      deleteTargetId = null;
      $('confirm-modal').classList.add('hidden');
    }
  });

  // ============================================================
  //  INIT
  // ============================================================
  if (checkLogin()) {
    showPanel();
  } else {
    showLogin();
  }

}); // fin DOMContentLoaded
