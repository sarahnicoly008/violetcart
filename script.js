/* script.js
   Protótipo SPA: cliente + admin (simulado).
   Persistência: localStorage (simula banco).
   Autor: VioletMart Prototype
*/

const APP = {
  dbKey: 'violetmart_db_v1',
  defaultAdmin: { email: 'admin@violet.test', password: 'admin123' }
};

// ----- UTILIDADES ----- //
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

function uid(prefix='id') {
  return prefix + '_' + Math.random().toString(36).slice(2,9);
}

function formatCurrency(n){ return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

/* Simula atraso para mostrar loading */
function wait(ms=400){ return new Promise(r => setTimeout(r, ms)); }

/* DB: se não existir, cria demo */
function loadDB(){
  const raw = localStorage.getItem(APP.dbKey);
  if(raw) return JSON.parse(raw);
  // seed/demo data
  const db = {
    users: [
      { id: uid('u'), name:'Admin', email:APP.defaultAdmin.email, password:APP.defaultAdmin.password, role:'admin' },
    ],
    categories: [
      { id: 'c1', name:'Informática' },
      { id: 'c2', name:'Saúde' },
      { id: 'c3', name:'Administração' }
    ],
    banners: [
      { id: uid('b'), title:'Frete grátis acima de R$200', subtitle:'Aproveite!', image:null },
      { id: uid('b'), title:'Semana do Tech', subtitle:'Descontos imperdíveis', image:null }
    ],
    products: [
      { id: 'p1', title:'Teclado Mecânico Gamer', price:259.90, category:'c1', stock:10, images:[], rating:4.6, description:'Teclado RGB, switches azuis.' },
      { id: 'p2', title:'Monitor 24" FHD', price:699.00, category:'c1', stock:6, images:[], rating:4.3, description:'IPS, 75Hz.' },
      { id: 'p3', title:'Máscara N95 (caixa 10)', price:49.90, category:'c2', stock:50, images:[], rating:4.1, description:'Proteção eficaz.' },
      { id: 'p4', title:'Caderno Executivo', price:19.90, category:'c3', stock:120, images:[], rating:4.0, description:'Capa dura A4.' }
    ],
    orders: [],
    favorites: [],
    cart: []
  };
  localStorage.setItem(APP.dbKey, JSON.stringify(db));
  return db;
}

function saveDB(db){
  localStorage.setItem(APP.dbKey, JSON.stringify(db));
}

/* App state */
const state = {
  db: loadDB(),
  user: null, // usuario logado
  view: 'home'
};

/* ----- Inicializacao UI ----- */
document.addEventListener('DOMContentLoaded', async()=>{
  initUI();
  await renderHome();
  setupEvents();
  document.getElementById('year').textContent = new Date().getFullYear();
});

/* ----- UI RENDER ----- */
async function renderHome(){
  // banners
  const bannerRotator = $('#bannerRotator');
  bannerRotator.innerHTML = '';
  state.db.banners.forEach(b => {
    const el = document.createElement('div');
    el.className = 'banner';
    el.innerHTML = `<h3>${b.title}</h3><p>${b.subtitle || ''}</p>`;
    bannerRotator.appendChild(el);
  });

  // categories row
  const catRow = $('#categoriesRow');
  catRow.innerHTML = '';
  state.db.categories.forEach(c => {
    const el = document.createElement('div');
    el.className = 'cat';
    el.textContent = c.name;
    el.onclick = ()=>{ $('#filterCategory').value = c.id; applyFilters(); };
    catRow.appendChild(el);
  });

  // fill filter select
  const filterSel = $('#filterCategory');
  filterSel.innerHTML = `<option value="">Todas as categorias</option>` + state.db.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

  // offers: top 3 mais baratos como exemplo
  const offers = $('#offersList'); offers.innerHTML = '';
  const cheap = [...state.db.products].sort((a,b)=>a.price-b.price).slice(0,4);
  cheap.forEach(p => offers.appendChild(createProductCard(p)));

  // product list
  $('#productList').innerHTML = '';
  $('#loadingProducts').style.display = 'block';
  await wait(450);
  $('#loadingProducts').style.display = 'none';
  state.db.products.forEach(p => $('#productList').appendChild(createProductCard(p)));
  updateCartCount();
}

/* cria card de produto */
function createProductCard(p){
  const card = document.createElement('article');
  card.className = 'product-card';
  const img = p.images[0] || `https://picsum.photos/seed/${p.id}/400/300`;
  card.innerHTML = `
    <img src="${img}" alt="${p.title}" />
    <h4 title="${p.title}">${p.title}</h4>
    <div class="price">${formatCurrency(p.price)}</div>
    <div class="muted">Estoque: ${p.stock}</div>
    <div class="actions">
      <button class="btn-view" data-id="${p.id}">Ver</button>
      <button class="btn-add" data-id="${p.id}">Adicionar</button>
    </div>
  `;
  card.querySelector('.btn-view').onclick = ()=>openProduct(p.id);
  card.querySelector('.btn-add').onclick = ()=>addToCart(p.id,1);
  return card;
}

/* Abre view do produto */
function openProduct(id){
  const p = state.db.products.find(x=>x.id===id);
  if(!p){ alert('Produto não encontrado'); return; }
  $('.view.active').classList.remove('active');
  $('#productView').classList.add('active');
  // render
  $('#productDetail').innerHTML = `
    <div class="product-gallery">
      <img src="${p.images[0] || 'https://picsum.photos/seed/'+p.id+'/600/400'}" alt="${p.title}" />
    </div>
    <div class="specs">
      <h2>${p.title}</h2>
      <p class="price">${formatCurrency(p.price)}</p>
      <p>${p.description}</p>
      <p><strong>Categoria:</strong> ${categoryName(p.category)}</p>
      <p><strong>Estoque:</strong> ${p.stock}</p>
      <div class="actions">
        <button id="buyNow">Comprar agora</button>
        <button id="addFav">❤ Favoritar</button>
      </div>
      <hr/>
      <h4>Avaliações</h4>
      <p>★ ${p.rating} / 5 (simulado)</p>
    </div>
  `;
  $('#addFav').onclick = ()=>toggleFavorite(p.id);
  $('#buyNow').onclick = ()=>{ addToCart(p.id,1); openView('cart'); };
}

/* nome categoria */
function categoryName(cid){
  const it = state.db.categories.find(c=>c.id===cid);
  return it ? it.name : '-';
}

/* ----- CART ----- */
function addToCart(productId, qty=1){
  const p = state.db.products.find(x=>x.id===productId);
  if(!p){ alert('Produto inválido'); return; }
  const inCart = state.db.cart.find(i=>i.productId===productId);
  if(inCart){
    inCart.qty = Math.min(inCart.qty + qty, p.stock);
  } else {
    state.db.cart.push({ id: uid('ci'), productId, qty: Math.min(qty, p.stock) });
  }
  saveDB(state.db);
  flash('Adicionado ao carrinho');
  updateCartCount();
  if(state.view === 'cart') renderCart();
}

/* atualiza contador */
function updateCartCount(){
  const c = state.db.cart.reduce((s,i)=>s+i.qty,0);
  $('#cartCount').textContent = c;
}

/* render carrinho */
function renderCart(){
  openView('cart');
  const ct = $('#cartContainer');
  ct.innerHTML = '';
  if(state.db.cart.length===0){
    ct.innerHTML = `<div class="loading">Seu carrinho está vazio.</div>`;
    return;
  }
  const list = document.createElement('div');
  list.className = 'cart-list';
  let total = 0;
  state.db.cart.forEach(item=>{
    const p = state.db.products.find(pp => pp.id === item.productId);
    const subtotal = p.price * item.qty;
    total += subtotal;
    const row = document.createElement('div');
    row.className = 'product-card';
    row.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${p.images[0] || 'https://picsum.photos/seed/'+p.id+'/120/80'}" style="width:120px;height:80px;object-fit:cover;border-radius:6px" />
        <div style="flex:1">
          <h4>${p.title}</h4>
          <div>${formatCurrency(p.price)} x <input type="number" min="1" max="${p.stock}" value="${item.qty}" data-id="${item.id}" class="cart-qty" /></div>
        </div>
        <div style="text-align:right">
          <div>${formatCurrency(subtotal)}</div>
          <button class="remove" data-id="${item.id}">Remover</button>
        </div>
      </div>
    `;
    list.appendChild(row);
  });
  ct.appendChild(list);

  const summary = document.createElement('div');
  summary.className = 'specs';
  summary.innerHTML = `<h3>Resumo</h3><p>Total: <strong>${formatCurrency(total)}</strong></p>
    <button id="checkoutBtn">Finalizar Compra</button>`;
  ct.appendChild(summary);

  // events qty/remove
  $$('.cart-qty').forEach(inp=>{
    inp.onchange = (e)=>{
      const id = e.target.dataset.id;
      const newq = Number(e.target.value);
      const it = state.db.cart.find(x=>x.id===id);
      if(it) it.qty = Math.max(1, newq);
      saveDB(state.db);
      renderCart();
      updateCartCount();
    };
  });
  $$('.remove').forEach(btn=>{
    btn.onclick = (e)=>{
      const id = e.target.dataset.id;
      state.db.cart = state.db.cart.filter(x=>x.id!==id);
      saveDB(state.db);
      renderCart();
      updateCartCount();
    };
  });

  $('#checkoutBtn').onclick = ()=>checkout();
}

/* checkout simulado */
function checkout(){
  if(!state.user){ flash('Faça login para finalizar a compra'); showAuth(); return; }
  if(state.db.cart.length===0){ flash('Carrinho vazio'); return; }
  const newOrder = {
    id: uid('o'),
    userId: state.user.id,
    items: JSON.parse(JSON.stringify(state.db.cart)),
    total: state.db.cart.reduce((s,i)=>{
      const p = state.db.products.find(pp=>pp.id===i.productId);
      return s + (p.price * i.qty);
    },0),
    status: 'pago',
    createdAt: new Date().toISOString()
  };
  // decrementar estoque
  newOrder.items.forEach(it=>{
    const p = state.db.products.find(pp=>pp.id===it.productId);
    if(p) p.stock = Math.max(0, p.stock - it.qty);
  });
  state.db.orders.push(newOrder);
  state.db.cart = [];
  saveDB(state.db);
  flash('Compra finalizada com sucesso!');
  openView('orders');
  renderOrders();
  updateCartCount();
}

/* ----- AUTH ----- */
function showAuth(){
  $('#authModal').classList.add('open');
  $('#authModal').ariaHidden = 'false';
}
function hideAuth(){ $('#authModal').classList.remove('open'); }

function renderUserArea(){
  const ua = $('#userArea');
  ua.innerHTML = '';
  if(state.user){
    ua.innerHTML = `<div class="user-chip"><span>${state.user.name}</span> <button id="logoutBtn">Sair</button></div>`;
    $('#logoutBtn').onclick = ()=>{ state.user=null; renderUserArea(); flash('Desconectado'); };
  }else{
    ua.innerHTML = `<button id="loginBtn">Entrar</button>`;
    $('#loginBtn').onclick = showAuth;
  }
}

/* toggle favoritos */
function toggleFavorite(pid){
  const exists = state.db.favorites.includes(pid);
  if(exists) state.db.favorites = state.db.favorites.filter(x=>x!==pid);
  else state.db.favorites.push(pid);
  saveDB(state.db);
  flash(exists ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
  if(state.view === 'favorites') renderFavorites();
}

/* render favoritos */
function renderFavorites(){
  openView('favorites');
  const cont = $('#favoritesList');
  cont.innerHTML = '';
  if(state.db.favorites.length===0){ cont.innerHTML = '<div class="loading">Sem favoritos.</div>'; return; }
  state.db.favorites.forEach(pid=>{
    const p = state.db.products.find(x=>x.id===pid);
    if(p) cont.appendChild(createProductCard(p));
  });
}

/* render pedidos */
function renderOrders(){
  openView('orders');
  const cont = $('#ordersList');
  cont.innerHTML = '';
  const my = state.user ? state.db.orders.filter(o=>o.userId===state.user.id) : [];
  if(my.length===0){ cont.innerHTML = '<div class="loading">Nenhum pedido.</div>'; return; }
  my.forEach(o=>{
    const el = document.createElement('div');
    el.className = 'product-card';
    el.innerHTML = `<h4>Pedido ${o.id} - ${o.status}</h4><p>Total: ${formatCurrency(o.total)}</p><small>${new Date(o.createdAt).toLocaleString()}</small>`;
    cont.appendChild(el);
  });
}

/* ----- SEARCH & FILTERS ----- */
function applyFilters(){
  const q = $('#searchInput').value.trim().toLowerCase();
  const cat = $('#filterCategory').value;
  const sort = $('#sortSelect').value;
  const list = $('#productList');
  list.innerHTML = '';
  let results = state.db.products.filter(p=>{
    if(cat && p.category !== cat) return false;
    if(q && !(p.title.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q))) return false;
    return true;
  });
  if(sort === 'price_asc') results.sort((a,b)=>a.price-b.price);
  if(sort === 'price_desc') results.sort((a,b)=>b.price-a.price);
  results.forEach(p => list.appendChild(createProductCard(p)));
}

/* ----- ADMIN (CRUD) ----- */
function renderAdmin(section='products'){
  const main = $('#adminMain');
  main.innerHTML = '';
  if(section==='products'){
    const btnNew = document.createElement('button');
    btnNew.textContent = 'Novo Produto';
    btnNew.onclick = ()=>renderProductForm();
    main.appendChild(btnNew);

    const table = document.createElement('div');
    table.innerHTML = '<h3>Produtos</h3>';
    state.db.products.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'product-card';
      row.innerHTML = `<h4>${p.title}</h4><p>${formatCurrency(p.price)} • Estoque: ${p.stock}</p>
        <div style="display:flex;gap:8px">
          <button class="edit" data-id="${p.id}">Editar</button>
          <button class="del" data-id="${p.id}">Excluir</button>
        </div>`;
      table.appendChild(row);
    });
    main.appendChild(table);
    $$('.edit').forEach(b=>b.onclick = e=>renderProductForm(e.target.dataset.id));
    $$('.del').forEach(b=>b.onclick = e=>{
      if(!confirm('Excluir produto?')) return;
      state.db.products = state.db.products.filter(x=>x.id!==e.target.dataset.id);
      saveDB(state.db); renderAdmin('products'); renderHome();
    });
  }

  if(section==='categories'){
    const form = document.createElement('div');
    form.innerHTML = `<h3>Categorias</h3>
      <div id="catList"></div>
      <input id="newCatName" placeholder="Nova categoria" />
      <button id="addCatBtn">Adicionar</button>`;
    main.appendChild(form);
    function refresh(){
      $('#catList').innerHTML = state.db.categories.map(c=>`<div style="display:flex;justify-content:space-between"><span>${c.name}</span><button data-id="${c.id}" class="delcat">Excluir</button></div>`).join('');
      $$('.delcat').forEach(b=>b.onclick = e=>{
        state.db.categories = state.db.categories.filter(x=>x.id!==e.target.dataset.id);
        saveDB(state.db); refresh(); renderHome();
      });
    }
    refresh();
    $('#addCatBtn').onclick = ()=>{
      const v = $('#newCatName').value.trim(); if(!v) return;
      state.db.categories.push({ id: uid('c'), name:v }); saveDB(state.db); $('#newCatName').value=''; refresh(); renderHome();
    };
  }

  if(section==='banners'){
    const container = document.createElement('div'); container.innerHTML = '<h3>Banners</h3>';
    state.db.banners.forEach(b=>{
      const r = document.createElement('div');
      r.className = 'product-card';
      r.innerHTML = `<h4>${b.title}</h4><p>${b.subtitle || ''}</p><div style="display:flex;gap:8px"><button class="editb" data-id="${b.id}">Editar</button><button class="delb" data-id="${b.id}">Excluir</button></div>`;
      container.appendChild(r);
    });
    const add = document.createElement('div');
    add.innerHTML = `<input id="bnTitle" placeholder="Título" /><input id="bnSub" placeholder="Subtítulo" /><button id="addBn">Adicionar Banner</button>`;
    main.appendChild(container); main.appendChild(add);
    $('#addBn').onclick = ()=>{
      const t = $('#bnTitle').value.trim(); if(!t) return;
      state.db.banners.push({ id: uid('b'), title:t, subtitle:$('#bnSub').value });
      saveDB(state.db); renderAdmin('banners'); renderHome();
    };
    $$('.delb').forEach(b=>b.onclick = e=>{ state.db.banners = state.db.banners.filter(x=>x.id!==e.target.dataset.id); saveDB(state.db); renderAdmin('banners'); renderHome(); });
  }

  if(section==='orders'){
    const area = document.createElement('div'); area.innerHTML = '<h3>Pedidos</h3>';
    state.db.orders.forEach(o=>{
      const el = document.createElement('div');
      el.className = 'product-card';
      el.innerHTML = `<h4>Pedido ${o.id}</h4><p>Total: ${formatCurrency(o.total)}</p><p>Status: <select data-id="${o.id}" class="orderStatus"><option${o.status==='pago'?' selected':''} value="pago">Pago</option><option${o.status==='enviado'?' selected':''} value="enviado">Enviado</option><option${o.status==='entregue'?' selected':''} value="entregue">Entregue</option></select></p>`;
      area.appendChild(el);
    });
    main.appendChild(area);
    $$('.orderStatus').forEach(sel=>sel.onchange = e=>{
      const id = e.target.dataset.id; const o = state.db.orders.find(x=>x.id===id);
      if(o){ o.status = e.target.value; saveDB(state.db); flash('Status atualizado'); renderAdmin('orders'); renderOrders(); }
    });
  }
}

/* render form product (novo/editar) */
function renderProductForm(productId){
  const main = $('#adminMain'); main.innerHTML = `<h3>${productId ? 'Editar' : 'Novo'} Produto</h3>`;
  const p = state.db.products.find(x=>x.id===productId) || { title:'', price:'', stock:0, category:'', description:'' };
  main.innerHTML += `
    <div style="display:flex;flex-direction:column;gap:8px">
      <input id="pTitle" placeholder="Título" value="${escapeHtml(p.title)}" />
      <input id="pPrice" placeholder="Preço" value="${p.price}" />
      <input id="pStock" placeholder="Estoque" value="${p.stock}" />
      <select id="pCategory">${state.db.categories.map(c=>`<option value="${c.id}" ${c.id===p.category?'selected':''}>${c.name}</option>`).join('')}</select>
      <textarea id="pDesc" placeholder="Descrição">${escapeHtml(p.description||'')}</textarea>
      <button id="saveProduct">Salvar</button>
      <button id="cancelProduct">Cancelar</button>
    </div>`;
  $('#cancelProduct').onclick = ()=>renderAdmin('products');
  $('#saveProduct').onclick = ()=>{
    const obj = {
      id: productId || uid('p'),
      title: $('#pTitle').value.trim(),
      price: parseFloat($('#pPrice').value) || 0,
      stock: parseInt($('#pStock').value) || 0,
      category: $('#pCategory').value,
      description: $('#pDesc').value.trim(),
      images: [],
      rating: 4.0
    };
    if(productId){
      state.db.products = state.db.products.map(x=> x.id===productId ? obj : x);
    }else{
      state.db.products.push(obj);
    }
    saveDB(state.db);
    flash('Produto salvo');
    renderAdmin('products'); renderHome();
  };
}

/* ----- HELPERS / EVENTS ----- */
function setupEvents(){
  // menu
  $('#menuBtn').onclick = ()=> $('#sideMenu').classList.add('open');
  $('#closeMenu').onclick = ()=> $('#sideMenu').classList.remove('open');
  $$('#sideMenu a[data-view]').forEach(a=>a.onclick = (e)=>{ e.preventDefault(); openView(a.dataset.view); $('#sideMenu').classList.remove('open'); });

  // search
  $('#searchBtn').onclick = ()=>{ applyFilters(); };
  $('#searchInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') applyFilters(); });

  // product list delegates
  document.body.addEventListener('click', (e)=>{
    if(e.target.matches('[data-back]')) openView(e.target.dataset.back);
    if(e.target.id === 'cartBtn') renderCart();
    if(e.target.id === 'favoritesBtn') renderFavorites();
    if(e.target.id === 'openAdmin') openAdmin();
  });

  // auth modal
  $('#authClose').onclick = hideAuth;
  $('#showRegister').onclick = (e)=>{ e.preventDefault(); $('#loginForm').classList.add('hidden'); $('#registerForm').classList.remove('hidden'); };
  $('#showLogin').onclick = (e)=>{ e.preventDefault(); $('#registerForm').classList.add('hidden'); $('#loginForm').classList.remove('hidden'); };
  $('#loginForm').onsubmit = (e)=>{ e.preventDefault(); login($('#loginEmail').value, $('#loginPassword').value); };
  $('#registerForm').onsubmit = (e)=>{ e.preventDefault(); register($('#regName').value, $('#regEmail').value, $('#regPassword').value); };

  // admin sidebar
  $('#adminView').addEventListener('click', (e)=>{
    if(e.target.matches('[data-admin]')) renderAdmin(e.target.dataset.admin);
  });

  // back link on product view
  $$('.back').forEach(b => b.onclick = ()=> openView('home'));

  // initial user area
  renderUserArea();
}

/* login/register */
function login(email, pass){
  const u = state.db.users.find(x=>x.email===email && x.password===pass);
  if(!u){ flash('Credenciais inválidas'); return; }
  state.user = { id:u.id, name:u.name, email:u.email, role:u.role || 'customer' };
  hideAuth(); renderUserArea(); flash(`Bem-vindo(a), ${u.name}`); renderOrders();
}
function register(name,email,pass){
  if(state.db.users.some(u=>u.email===email)){ flash('E-mail já cadastrado'); return; }
  const newU = { id: uid('u'), name, email, password:pass, role:'customer' };
  state.db.users.push(newU); saveDB(state.db);
  state.user = { id:newU.id, name:newU.name, email:newU.email };
  hideAuth(); renderUserArea(); flash('Conta criada');
}

/* Open view by id */
function openView(view){
  state.view = view;
  $$('.view').forEach(v => v.classList.remove('active'));
  const viewMap = {
    home: '#homeView',
    product: '#productView',
    cart: '#cartView',
    admin: '#adminView',
    orders: '#ordersView',
    favorites: '#favoritesView',
    profile: '#profileView'
  };
  const sel = viewMap[view] || '#homeView';
  $(sel).classList.add('active');
  // specific renders
  if(view==='home') renderHome();
  if(view==='cart') renderCart();
  if(view==='favorites') renderFavorites();
  if(view==='orders') renderOrders();
}

/* Admin access prompt */
function openAdmin(){
  const pass = prompt('Senha de admin:');
  const admin = state.db.users.find(u=>u.role==='admin');
  if(!admin){ alert('Nenhum admin cadastrado'); return; }
  if(pass === admin.password){
    openView('admin'); renderAdmin('products');
  }else alert('Senha incorreta');
}

/* small helper flash */
function flash(msg, timeout=1800){
  const el = document.createElement('div');
  el.style = 'position:fixed;left:50%;transform:translateX(-50%);bottom:30px;background:#222;color:#fff;padding:10px 14px;border-radius:8px;z-index:999';
  el.textContent = msg; document.body.appendChild(el);
  setTimeout(()=>el.remove(), timeout);
}

/* escape helper */
function escapeHtml(s=''){ return s.replace(/[<>&"]/g, c=>({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' })[c]); }

/* simple init ui */
function initUI(){
  // if db empty, prefill
  updateCartCount();
  renderUserArea();
  // set default view active
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#homeView').classList.add('active');
}

/* minimal keyboard shortcuts (dev) */
document.addEventListener('keydown', (e)=>{
  if(e.key === 'g' && e.ctrlKey){ openView('admin'); renderAdmin('products'); }
});
