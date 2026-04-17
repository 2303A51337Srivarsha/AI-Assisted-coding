// SmartMart — Amazon-style App Logic
let currentRole='admin', currentUser='Admin', activeSection='overview';
const _charts={}, _init={};
let shopCatFilter='', myOrders=[];

// ── ROLE SELECTION ──────────────────────────────────────────
function selectRole(role){
  document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('sel'));
  const rc=document.getElementById('rc-'+role);
  if(rc)rc.classList.add('sel');
  document.getElementById('hidden-role').value=role;
}

// ── LOGIN ───────────────────────────────────────────────────
function login(){
  const user=document.getElementById('login-user').value.trim();
  const role=document.getElementById('hidden-role').value||'customer';
  const pass=document.getElementById('login-pass').value;
  if(!user){showToast('Enter your name','warn');return;}
  if(!pass){showToast('Enter password','warn');return;}
  currentUser=user; currentRole=role;
  document.getElementById('login-screen').style.display='none';
  if(role==='customer'){
    document.getElementById('customer-app').style.display='block';
    document.getElementById('cust-name-display').textContent=user;
    CART=[]; myOrders=[];
    initShop();
  } else {
    document.getElementById('app').style.display='block';
    document.getElementById('sb-uname').textContent=user;
    document.getElementById('sb-urole').textContent=role.charAt(0).toUpperCase()+role.slice(1);
    document.getElementById('sb-initials').textContent=user.slice(0,2).toUpperCase();
    document.querySelectorAll('.admin-only').forEach(el=>el.style.display=role==='admin'?'flex':'none');
    initDashboard(); showSection('overview');
  }
}

function logout(){
  document.getElementById('app').style.display='none';
  document.getElementById('customer-app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('login-pass').value='';
  Object.keys(_init).forEach(k=>_init[k]=false);
}
function custLogout(){CART=[];logout();}

// ── TOAST ────────────────────────────────────────────────────
function showToast(msg,type='success'){
  const t=document.getElementById('toast');
  if(!t)return;
  t.textContent=msg; t.className='toast toast-'+type+' show';
  clearTimeout(t._tmr); t._tmr=setTimeout(()=>t.classList.remove('show'),2800);
}

// ── ADMIN/STAFF NAV ──────────────────────────────────────────
function showSection(id){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('active'));
  const sec=document.getElementById('sec-'+id);
  const nav=document.getElementById('nav-'+id);
  if(sec)sec.classList.add('active');
  if(nav)nav.classList.add('active');
  activeSection=id;
  if(id==='overview'&&!_init.overview){renderOverviewCharts();renderTopTable();_init.overview=true;}
  if(id==='inventory'){renderInvTable();if(!_init.invcat){renderInvCatChart();_init.invcat=true;}}
  if(id==='orders')renderOrdersTable();
  if(id==='profit'&&!_init.profit){renderProfitCharts();_init.profit=true;}
  if(id==='alerts')renderAlertsPage();
  if(id==='analytics'&&!_init.analytics){renderAnalyticsCharts();_init.analytics=true;}
  if(id==='suppliers')renderSuppliersTable();
}

// ── INIT DASHBOARD ───────────────────────────────────────────
function initDashboard(){
  refreshMetrics();
  const c=getAlertCounts(currentRole);
  const b=document.getElementById('alert-badge');
  if(b){b.textContent=c.danger;b.style.display=c.danger>0?'inline':'none';}
}

function refreshMetrics(){
  const ts=PRODUCTS.reduce((s,p)=>s+p.stock,0);
  const sold=PRODUCTS.reduce((s,p)=>s+p.sold,0);
  const rev=PRODUCTS.reduce((s,p)=>s+p.sp*p.sold,0);
  const cost=PRODUCTS.reduce((s,p)=>s+p.cp*p.sold,0);
  const profit=rev-cost;
  const low=PRODUCTS.filter(p=>p.stock<=p.reorder).length;
  const exp=PRODUCTS.filter(p=>{const d=daysExp(p.expiry);return d>=0&&d<=5;}).length;
  const pend=ORDERS.filter(o=>o.status==='Pending').length;
  sm('m-products',PRODUCTS.length); sm('m-stock',ts.toLocaleString('en-IN'));
  sm('m-sold',sold.toLocaleString('en-IN')); sm('m-revenue','₹'+Math.round(rev/1000)+'K');
  sm('m-profit','₹'+Math.round(profit/1000)+'K'); sm('m-orders',ORDERS.length);
  sm('m-pending',pend+' pending'); sm('m-lowstock',low); sm('m-expiring',exp);
}

function sm(id,val){const e=document.getElementById(id);if(e)e.textContent=val;}
function daysExp(str){const e=new Date(str),n=new Date('2026-04-01');return Math.ceil((e-n)/(864e5));}

// ── CHARTS ───────────────────────────────────────────────────
function mkChart(id,type,data,opts){
  if(_charts[id])_charts[id].destroy();
  const c=document.getElementById(id);
  if(!c)return;
  _charts[id]=new Chart(c,{type,data,options:{responsive:true,maintainAspectRatio:false,...opts}});
}

function renderOverviewCharts(){
  mkChart('weeklyChart','bar',{labels:WEEKLY.labels,datasets:[
    {label:'Revenue',data:WEEKLY.revenue,backgroundColor:'#FF9900',borderRadius:4},
    {label:'Cost',data:WEEKLY.cost,backgroundColor:'#37475a',borderRadius:4}
  ]},{plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:11}}},y:{ticks:{callback:v=>'₹'+(v/1000)+'K',font:{size:11}}}}});

  const cs={};PRODUCTS.forEach(p=>{cs[p.cat]=(cs[p.cat]||0)+p.sold;});
  const cols=['#FF9900','#067D62','#007185','#B12704','#37475a','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899','#14b8a6','#e11d48'];
  mkChart('catChart','doughnut',{labels:Object.keys(cs),datasets:[{data:Object.values(cs),backgroundColor:cols,borderWidth:0}]},{plugins:{legend:{display:false}},cutout:'60%'});
}

function renderTopTable(){
  const tbody=document.getElementById('top-tbody');
  if(!tbody)return;
  const top=[...PRODUCTS].sort((a,b)=>b.sold-a.sold).slice(0,10);
  tbody.innerHTML=top.map(p=>{
    const m=Math.round((p.sp-p.cp)/p.sp*100);
    const d=daysExp(p.expiry);
    let st=p.stock===0?'<span class="badge b-red">Out</span>':p.stock<=p.reorder?'<span class="badge b-amber">Low</span>':d<=5?'<span class="badge b-amber">Expiring</span>':'<span class="badge b-green">OK</span>';
    return`<tr><td style="font-weight:600">${p.name}</td><td>${CAT_ICON[p.cat]||''} ${p.cat}</td>
    <td style="text-align:right;font-weight:600">${p.sold.toLocaleString('en-IN')}</td>
    <td style="text-align:right;font-weight:600">₹${(p.sp*p.sold).toLocaleString('en-IN')}</td>
    <td><span style="color:${m>=25?'#067D62':m>=15?'#e47911':'#B12704'};font-weight:700">${m}%</span></td>
    <td>${st}</td></tr>`;
  }).join('');
}

function renderProfitCharts(){
  mkChart('plChart','bar',{labels:Array.from({length:30},(_,i)=>'D'+(i+1)),
    datasets:[{data:PL_30,backgroundColor:PL_30.map(v=>v>=0?'#067D62':'#B12704'),borderRadius:2}]
  },{plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10},maxRotation:0}},y:{ticks:{callback:v=>'₹'+(v/1000).toFixed(0)+'K',font:{size:11}}}}});

  const top=[...PRODUCTS].sort((a,b)=>(b.sp-b.cp)/b.sp-(a.sp-a.cp)/a.sp).slice(0,10);
  mkChart('marginChart','bar',{labels:top.map(p=>p.name.length>20?p.name.slice(0,20)+'…':p.name),
    datasets:[{data:top.map(p=>Math.round((p.sp-p.cp)/p.sp*100)),backgroundColor:'#FF9900',borderRadius:3}]
  },{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{callback:v=>v+'%',font:{size:11}}},y:{ticks:{font:{size:10}}}}});
}

function renderAnalyticsCharts(){
  mkChart('hourlyChart','line',{labels:HOURLY.labels,datasets:[{data:HOURLY.data,borderColor:'#FF9900',backgroundColor:'rgba(255,153,0,.1)',fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#FF9900'}]},{plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:11}}},y:{ticks:{font:{size:11}}}}});
  const ts=[...PRODUCTS].sort((a,b)=>b.sold-a.sold).slice(0,10);
  mkChart('topChart','bar',{labels:ts.map(p=>p.name.length>22?p.name.slice(0,22)+'…':p.name),datasets:[{data:ts.map(p=>p.sold),backgroundColor:'#007185',borderRadius:3}]},{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:11}}},y:{ticks:{font:{size:10}}}}});
  const cr={};PRODUCTS.forEach(p=>{cr[p.cat]=(cr[p.cat]||0)+p.sp*p.sold;});
  mkChart('catRevChart','bar',{labels:Object.keys(cr),datasets:[{data:Object.values(cr),backgroundColor:'#FF9900',borderRadius:3}]},{plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10},maxRotation:40}},y:{ticks:{callback:v=>'₹'+(v/1000).toFixed(0)+'K',font:{size:11}}}}});
}

function renderInvCatChart(){
  const cs={};PRODUCTS.forEach(p=>{cs[p.cat]=(cs[p.cat]||0)+p.stock;});
  mkChart('invCatChart','bar',{labels:Object.keys(cs),datasets:[{data:Object.values(cs),backgroundColor:'#37475a',borderRadius:4}]},{plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10},maxRotation:30}},y:{ticks:{font:{size:11}}}}});
}

// ── INVENTORY TABLE ──────────────────────────────────────────
let invF={cat:'',status:'',search:''};
function renderInvTable(cat,status,search){
  if(cat!==undefined)invF.cat=cat;
  if(status!==undefined)invF.status=status;
  if(search!==undefined)invF.search=search.toLowerCase();
  let data=[...PRODUCTS];
  if(invF.cat)data=data.filter(p=>p.cat===invF.cat);
  if(invF.status==='low')data=data.filter(p=>p.stock>0&&p.stock<=p.reorder);
  else if(invF.status==='out')data=data.filter(p=>p.stock===0);
  else if(invF.status==='expiring')data=data.filter(p=>daysExp(p.expiry)<=5);
  if(invF.search)data=data.filter(p=>p.name.toLowerCase().includes(invF.search)||p.cat.toLowerCase().includes(invF.search)||p.id.toLowerCase().includes(invF.search));
  sm('inv-count',data.length+' products');
  const tbody=document.getElementById('inv-tbody');
  if(!tbody)return;
  tbody.innerHTML=data.map(p=>{
    const d=daysExp(p.expiry);
    const pct=Math.min(100,Math.round(p.stock/(p.stock+p.sold+1)*100));
    const fc=pct>60?'#067D62':pct>30?'#e47911':'#B12704';
    let sb=p.stock===0?'<span class="badge b-red">Out</span>':p.stock<=p.reorder*0.3?'<span class="badge b-red">Critical</span>':p.stock<=p.reorder?'<span class="badge b-amber">Low</span>':'<span class="badge b-green">OK</span>';
    let eb=d<0?'<span class="badge b-red">Expired</span>':d<=2?`<span class="badge b-red">${d}d</span>`:d<=5?`<span class="badge b-amber">${d}d</span>`:d<=10?`<span class="badge b-blue">${d}d</span>`:`<span class="badge b-gray">${p.expiry}</span>`;
    const m=Math.round((p.sp-p.cp)/p.sp*100);
    return`<tr>
      <td style="font-family:monospace;font-size:11px;color:#aaa">${p.id}</td>
      <td><span style="font-weight:600">${p.name}</span></td>
      <td>${CAT_ICON[p.cat]||''} ${p.cat}</td>
      <td style="text-align:right;font-weight:700">${p.stock.toLocaleString('en-IN')}</td>
      <td style="text-align:right">${p.sold.toLocaleString('en-IN')}</td>
      <td><div style="display:flex;align-items:center;gap:5px"><div style="width:55px;height:5px;background:#eee;border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${fc}"></div></div><span style="font-size:11px;color:#888">${pct}%</span></div></td>
      <td style="text-align:right">₹${p.cp}</td><td style="text-align:right;font-weight:600">₹${p.sp}</td>
      <td><span style="color:${m>=25?'#067D62':m>=15?'#e47911':'#B12704'};font-weight:700">${m}%</span></td>
      <td>${eb}</td><td>${sb}</td>
      <td style="font-size:11px;color:#888">${p.supplier}</td>
    </tr>`;
  }).join('');
}

// ── ORDERS TABLE ─────────────────────────────────────────────
let ordF='all';
function renderOrdersTable(status){
  if(status!==undefined)ordF=status;
  let data=[...ORDERS];
  if(ordF!=='all')data=data.filter(o=>o.status.toLowerCase()===ordF.toLowerCase());
  sm('ord-total',ORDERS.length);
  sm('ord-del',ORDERS.filter(o=>o.status==='Delivered').length);
  sm('ord-packed',ORDERS.filter(o=>o.status==='Packed').length);
  sm('ord-pend',ORDERS.filter(o=>o.status==='Pending').length);
  const tbody=document.getElementById('orders-tbody');
  if(!tbody)return;
  const avcolors=['#fff8e1','#f3e5f5','#e3f2fd','#fce4ec','#e8f5e9','#fff3e0','#e0f7fa','#f1f8e9','#fbe9e7','#ede7f6'];
  const avtxt=['#e65100','#6a1b9a','#0d47a1','#880e4f','#1b5e20','#bf360c','#006064','#558b2f','#bf360c','#311b92'];
  tbody.innerHTML=data.map((o,i)=>{
    const init=o.customer.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const ci=i%10;
    const stB=o.status==='Pending'?'b-amber':o.status==='Packed'?'b-blue':'b-green';
    const isNew=ORDERS.indexOf(o)<3&&o.source==='online';
    const itemsSummary=o.cartItems.slice(0,2).map(c=>`${c.name.split(' ').slice(0,3).join(' ')} ×${c.qty}`).join(', ')+(o.cartItems.length>2?` +${o.cartItems.length-2}`:'');
    const totalUnits=o.cartItems.reduce((s,c)=>s+c.qty,0);
    const tooltip=o.cartItems.map(c=>`${c.name} ×${c.qty} @₹${c.price} = ₹${c.qty*c.price}`).join('\n');
    return`<tr class="${isNew?'new-order':''}" title="${tooltip}">
      <td style="font-family:monospace;font-size:11px">${o.id}${isNew?'<span class="badge b-orange" style="margin-left:4px">NEW</span>':''}</td>
      <td>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:30px;height:30px;border-radius:50%;background:${avcolors[ci]};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${avtxt[ci]};flex-shrink:0">${init}</div>
          <div><div style="font-weight:600;font-size:13px">${o.customer}</div><div style="font-size:11px;color:#888">${o.phone||'—'}</div></div>
        </div>
      </td>
      <td style="font-size:12px;color:#555;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${itemsSummary}</td>
      <td style="text-align:center;font-weight:600">${totalUnits}</td>
      <td style="text-align:right;font-weight:600">₹${o.amount.toLocaleString('en-IN')}</td>
      <td style="text-align:right;font-size:12px;color:#888">₹${o.gst||0}</td>
      <td style="text-align:right;font-weight:700;color:#067D62">₹${o.total.toLocaleString('en-IN')}</td>
      <td style="font-size:12px;color:#888">${o.time}</td>
      <td><span class="badge ${stB}">${o.status}</span></td>
      <td><button class="btn-sm btn-amz" onclick="advanceStatus('${o.id}')">Update →</button></td>
    </tr>`;
  }).join('');
}

function advanceStatus(id){
  const o=ORDERS.find(x=>x.id===id);
  if(!o)return;
  const s=['Pending','Packed','Delivered'];
  const i=s.indexOf(o.status);
  if(i<s.length-1){o.status=s[i+1];renderOrdersTable();showToast(`${o.id} → ${o.status}`,'success');}
  else showToast('Already delivered','warn');
}

function renderAlertsPage(ft='all'){
  const c=getAlertCounts(currentRole);
  sm('al-total',c.total);sm('al-danger',c.danger);sm('al-warn',c.warning);sm('al-info',c.info);sm('al-exp',c.expiry);sm('al-stk',c.stock);
  renderAlerts('alerts-container',currentRole,ft);
  document.querySelectorAll('.alert-tab').forEach(b=>b.classList.toggle('active',b.dataset.filter===ft));
}

function renderSuppliersTable(){
  const tbody=document.getElementById('sup-tbody');if(!tbody)return;
  tbody.innerHTML=SUPPLIERS.map(s=>{
    const sb=s.status==='Active'?'b-green':'b-amber';
    return`<tr><td style="font-family:monospace;font-size:11px;color:#aaa">${s.id}</td>
    <td style="font-weight:600">${s.name}</td><td style="font-size:12px">${s.cat}</td>
    <td style="font-family:monospace;font-size:12px">${s.contact}</td><td>${s.lastOrder}</td>
    <td><span class="badge b-blue">${s.products} items</span></td>
    <td><span class="badge ${sb}">${s.status}</span></td>
    ${currentRole==='admin'?`<td><button class="btn-sm btn-amz" onclick="showToast('Contacting '+s.name,'success')">Contact →</button></td>`:'<td>—</td>'}
    </tr>`;
  }).join('');
}

function populateCatFilters(){
  const sel=document.getElementById('inv-cat-filter');if(!sel)return;
  CATEGORIES.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
}
function setFBtn(btn){document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}

// ══════════════════ CUSTOMER SHOP ══════════════════
function initShop(){
  buildSubNav();
  renderShop();
  renderCart();
  updateCartBadge();
  showShopView('products');
}

function buildSubNav(){
  const sn=document.getElementById('shop-subnav');if(!sn)return;
  sn.innerHTML=`<button class="amz-subnav-btn active" onclick="filterShop('',this)">All</button>`
    +CATEGORIES.map(c=>`<button class="amz-subnav-btn" onclick="filterShop('${c}',this)">${CAT_ICON[c]||''} ${c}</button>`).join('');

  const sf=document.getElementById('shop-sidebar-cats');if(!sf)return;
  sf.innerHTML=`<div class="cat-filter-item active" onclick="filterShop('',this)"><span class="cat-filter-icon">🏠</span>All Products</div>`
    +CATEGORIES.map(c=>`<div class="cat-filter-item" onclick="filterShop('${c}',this)"><span class="cat-filter-icon">${CAT_ICON[c]||'📦'}</span>${c}</div>`).join('');
}

function filterShop(cat,btn){
  shopCatFilter=cat;
  document.querySelectorAll('.amz-subnav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.cat-filter-item').forEach(b=>b.classList.remove('active'));
  if(btn){btn.classList.add('active');
    // Also highlight sidebar
    const sideItems=document.querySelectorAll('.cat-filter-item');
    sideItems.forEach(si=>{if(si.textContent.trim().includes(cat||'All Products'))si.classList.add('active');});
  }
  showShopView('products');
  renderShop();
}

function shopSearch(q){
  showShopView('products');
  renderShop(q);
}

function renderShop(searchQ=''){
  const grid=document.getElementById('shop-grid');if(!grid)return;
  const sq=searchQ.toLowerCase();
  let prods=[...PRODUCTS];
  if(shopCatFilter)prods=prods.filter(p=>p.cat===shopCatFilter);
  if(sq)prods=prods.filter(p=>p.name.toLowerCase().includes(sq)||p.cat.toLowerCase().includes(sq)||p.supplier.toLowerCase().includes(sq));

  sm('result-count',`1-${prods.length} of ${prods.length} results`+(shopCatFilter?' for "'+shopCatFilter+'"':''));

  if(!prods.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888"><div style="font-size:48px">🔍</div><p style="margin-top:10px;font-size:15px">No results found</p></div>`;return;}

  grid.innerHTML=prods.map(p=>{
    const inCart=CART.find(c=>c.product.id===p.id);
    const d=daysExp(p.expiry);
    const stars='★'.repeat(Math.round(p.rating))+'☆'.repeat(5-Math.round(p.rating));
    let tag='';
    if(p.sold>500)tag=`<span class="pc-tag tag-deal">Best Seller</span>`;
    else if(d<=3&&d>0)tag=`<span class="pc-tag tag-low">Expiring Soon</span>`;
    else if(p.stock<=p.reorder&&p.stock>0)tag=`<span class="pc-tag tag-low">Limited Stock</span>`;
    const isPrime=p.sp>50;
    const bg=CAT_BG[p.cat]||'#f7f8f8';
    const discount=Math.round((p.sp-p.cp)/p.sp*100);
    return`<div class="product-card${p.stock===0?' out-card':''}">
      <div class="pc-img" style="background:${bg}">${CAT_ICON[p.cat]||'📦'}</div>
      <div class="pc-body">
        ${tag}
        <div class="pc-name">${p.name}</div>
        <div class="pc-stars">
          <span style="color:#FF9900;font-size:13px">${'★'.repeat(Math.round(p.rating))}</span>
          <span class="pc-reviews">${p.reviews.toLocaleString('en-IN')}</span>
        </div>
        <div class="pc-price">₹${p.sp} <span style="color:#B12704;font-size:12px">Save ${discount}%</span></div>
        ${isPrime?`<div class="pc-prime">✓ FREE Delivery by Tomorrow</div>`:''}
        <div class="pc-stock ${p.stock===0?'out':p.stock<=p.reorder?'low':''}">${p.stock===0?'Out of Stock':p.stock<=p.reorder?'Only '+p.stock+' left':'In Stock'}</div>
        <div class="pc-actions" id="ctrl-${p.id}">
          ${p.stock===0
            ?`<button class="btn-out">Currently Unavailable</button>`
            :inCart
              ?`<div class="qty-ctrl-amz"><button onclick="chgQty('${p.id}',-1)">−</button><span>${inCart.qty}</span><button onclick="chgQty('${p.id}',1)">+</button></div>`
              :`<button class="btn-atc" onclick="addToCart('${p.id}')">Add to Cart</button>`
          }
        </div>
      </div>
    </div>`;
  }).join('');
}

function addToCart(pid){
  const p=PRODUCTS.find(x=>x.id===pid);
  if(!p||p.stock<=0){showToast('Out of stock','warn');return;}
  const ex=CART.find(c=>c.product.id===pid);
  if(ex){if(ex.qty>=p.stock){showToast('Max stock: '+p.stock,'warn');return;}ex.qty++;}
  else CART.push({product:p,qty:1});
  updateCartCtrl(pid); renderCart(); updateCartBadge();
  showToast(p.name.split(' ').slice(0,3).join(' ')+' added to cart','success');
}

function chgQty(pid,delta){
  const p=PRODUCTS.find(x=>x.id===pid);
  const ex=CART.find(c=>c.product.id===pid);if(!ex)return;
  ex.qty+=delta;
  if(ex.qty<=0)CART=CART.filter(c=>c.product.id!==pid);
  else if(ex.qty>p.stock){ex.qty=p.stock;showToast('Max stock: '+p.stock,'warn');}
  updateCartCtrl(pid); renderCart(); updateCartBadge();
}

function removeFromCart(pid){CART=CART.filter(c=>c.product.id!==pid);updateCartCtrl(pid);renderCart();updateCartBadge();}

function updateCartCtrl(pid){
  const ctrl=document.getElementById('ctrl-'+pid);if(!ctrl)return;
  const p=PRODUCTS.find(x=>x.id===pid);
  const ex=CART.find(c=>c.product.id===pid);
  if(!ex||ex.qty===0)ctrl.innerHTML=p&&p.stock>0?`<button class="btn-atc" onclick="addToCart('${pid}')">Add to Cart</button>`:`<button class="btn-out">Unavailable</button>`;
  else ctrl.innerHTML=`<div class="qty-ctrl-amz"><button onclick="chgQty('${pid}',-1)">−</button><span>${ex.qty}</span><button onclick="chgQty('${pid}',1)">+</button></div>`;
}

function updateCartBadge(){
  const t=CART.reduce((s,c)=>s+c.qty,0);
  const b=document.getElementById('cart-count');
  if(b)b.textContent=t;
}

function renderCart(){
  const panel=document.getElementById('cd-items');if(!panel)return;
  const sub=CART.reduce((s,c)=>s+c.product.sp*c.qty,0);
  const gst=Math.round(sub*0.05); const grand=sub+gst;
  if(!CART.length){
    panel.innerHTML=`<div class="cd-empty"><div>🛒</div><p>Your cart is empty</p><p style="font-size:12px;color:#aaa;margin-top:4px">Add items to get started</p></div>`;
  } else {
    panel.innerHTML=CART.map(c=>`
      <div class="cart-item-row">
        <div class="ci-icon" style="background:${CAT_BG[c.product.cat]||'#f7f8f8'}">${CAT_ICON[c.product.cat]||'📦'}</div>
        <div class="ci-info">
          <div class="ci-name">${c.product.name}</div>
          <div class="ci-price">₹${c.product.sp} × ${c.qty} = <strong>₹${c.product.sp*c.qty}</strong></div>
          <div class="ci-qty">
            <button onclick="chgQty('${c.product.id}',-1)">−</button>
            <span>${c.qty}</span>
            <button onclick="chgQty('${c.product.id}',1)">+</button>
            <button class="ci-del" onclick="removeFromCart('${c.product.id}')">Remove</button>
          </div>
        </div>
      </div>`).join('');
  }
  sm('cart-sub','₹'+sub.toLocaleString('en-IN'));
  sm('cart-gst','₹'+gst.toLocaleString('en-IN'));
  sm('cart-grand','₹'+grand.toLocaleString('en-IN'));
}

function toggleCart(){document.getElementById('cart-drawer').classList.toggle('open');}
function closeCart(){document.getElementById('cart-drawer').classList.remove('open');}

function showCheckout(){
  if(!CART.length){showToast('Cart is empty','warn');return;}
  closeCart();
  // Fill order summary
  const sub=CART.reduce((s,c)=>s+c.product.sp*c.qty,0);
  const gst=Math.round(sub*0.05);
  const items=CART.map(c=>`${c.product.name} ×${c.qty} — ₹${c.product.sp*c.qty}`);
  const oi=document.getElementById('co-items-list');
  if(oi)oi.innerHTML=items.map(i=>`<div class="osb-row"><span>${i}</span></div>`).join('');
  sm('co-sub','₹'+sub.toLocaleString('en-IN'));
  sm('co-gst','₹'+gst.toLocaleString('en-IN'));
  sm('co-grand','₹'+(sub+gst).toLocaleString('en-IN'));
  document.getElementById('co-name-inp').value=currentUser;
  openModal('checkout-modal');
}

function confirmOrder(){
  const name=document.getElementById('co-name-inp').value.trim()||currentUser;
  const phone=document.getElementById('co-phone-inp').value.trim();
  const addr=document.getElementById('co-addr-inp').value.trim();
  if(!phone){showToast('Enter phone number','warn');return;}
  if(!addr){showToast('Enter delivery address','warn');return;}
  const order=placeOrder(name,phone,addr,CART);
  if(!order){showToast('Some items out of stock!','warn');return;}
  myOrders.unshift(order);
  CART=[];renderCart();updateCartBadge();
  CART.forEach(c=>updateCartCtrl(c.product.id));
  renderShop();
  closeModal('checkout-modal');
  // Show success
  sm('success-id',order.id);
  sm('success-items',order.cartItems.length+' item(s)');
  sm('success-units',order.cartItems.reduce((s,c)=>s+c.qty,0)+' units');
  sm('success-total','₹'+order.total.toLocaleString('en-IN'));
  openModal('success-modal');
}

function showShopView(view){
  document.getElementById('shop-products-view').style.display=view==='products'?'block':'none';
  document.getElementById('shop-myorders-view').style.display=view==='myorders'?'block':'none';
  document.querySelectorAll('.amz-navbtn').forEach(b=>b.classList.remove('active'));
  if(view==='myorders'){
    document.getElementById('nav-myorders').classList.add('active');
    renderMyOrders();
  }
}

function renderMyOrders(){
  const el=document.getElementById('my-orders-list');if(!el)return;
  if(!myOrders.length){el.innerHTML=`<div style="text-align:center;padding:40px;color:#888"><div style="font-size:40px">📦</div><p style="margin-top:10px">No orders placed yet</p></div>`;return;}
  const stcls={Pending:'sb-pending',Packed:'sb-packed',Delivered:'sb-delivered'};
  el.innerHTML=myOrders.map(o=>{
    // Sync status from ORDERS array
    const latest=ORDERS.find(x=>x.id===o.id)||o;
    return`<div class="my-order-card">
      <div class="moc-header">
        <div><div class="moc-id">Order # ${latest.id}</div><div class="moc-time">${latest.time}</div></div>
        <span class="status-badge ${stcls[latest.status]||'sb-pending'}">${latest.status}</span>
      </div>
      <div class="moc-body">
        <div class="moc-items">${latest.cartItems.map(c=>`${CAT_ICON[PRODUCTS.find(p=>p.id===c.pid)?.cat]||'📦'} ${c.name} ×${c.qty} — ₹${c.price*c.qty}`).join('<br>')}</div>
        <div class="moc-footer">
          <div>
            <div style="font-size:12px;color:#888">Delivery to: ${latest.address}</div>
            <div style="font-size:12px;color:#888">${latest.phone}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:#888">Subtotal: ₹${latest.amount} + GST ₹${latest.gst}</div>
            <div class="moc-total">Total: ₹${latest.total}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

window.addEventListener('DOMContentLoaded',()=>{
  populateCatFilters();
  selectRole('customer');
  document.getElementById('login-pass').addEventListener('keydown',e=>{if(e.key==='Enter')login();});
});
