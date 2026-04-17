// SmartMart — Alert Engine
function getDaysUntilExpiry(expiryStr){
  const exp=new Date(expiryStr),now=new Date('2026-04-01');
  return Math.ceil((exp-now)/(1000*60*60*24));
}
function getStockStatus(p){
  if(p.stock===0)return'out';
  if(p.stock<=p.reorder*0.3)return'critical';
  if(p.stock<=p.reorder)return'low';
  return'ok';
}
function getExpiryLevel(p){
  const d=getDaysUntilExpiry(p.expiry);
  if(d<=0)return{level:'expired',days:d};
  if(d<=2)return{level:'critical',days:d};
  if(d<=5)return{level:'warning',days:d};
  if(d<=10)return{level:'watch',days:d};
  return{level:'ok',days:d};
}
function buildAlerts(role){
  const alerts=[];
  PRODUCTS.forEach(p=>{
    const ss=getStockStatus(p),es=getExpiryLevel(p);
    if(es.level==='expired') alerts.push({type:'expiry',level:'danger',priority:1,title:`EXPIRED: ${p.name}`,msg:`${p.stock} units expired. Remove immediately.`,product:p,badge:'EXPIRED',action:'Remove'});
    else if(es.level==='critical') alerts.push({type:'expiry',level:'danger',priority:2,title:`Expiring in ${es.days}d: ${p.name}`,msg:`${p.stock} units expire on ${p.expiry}. Discount or return.`,product:p,badge:`${es.days}d`,action:'Discount'});
    else if(es.level==='warning') alerts.push({type:'expiry',level:'warning',priority:3,title:`Expiring soon: ${p.name}`,msg:`${p.stock} units expire ${p.expiry} (${es.days} days).`,product:p,badge:`${es.days}d`,action:'Promote'});
    else if(es.level==='watch'&&role==='admin') alerts.push({type:'expiry',level:'watch',priority:4,title:`Watch: ${p.name}`,msg:`${p.stock} units expire ${p.expiry} (${es.days} days).`,product:p,badge:`${es.days}d`,action:'Monitor'});
    if(ss==='out') alerts.push({type:'stock',level:'danger',priority:1,title:`Out of Stock: ${p.name}`,msg:`0 units. Reorder: ${p.reorder}. Supplier: ${p.supplier}.`,product:p,badge:'OUT',action:'Reorder now'});
    else if(ss==='critical') alerts.push({type:'stock',level:'danger',priority:2,title:`Critical: ${p.name}`,msg:`Only ${p.stock} units (reorder @${p.reorder}). Call ${p.supplier}.`,product:p,badge:`${p.stock}`,action:'Urgent reorder'});
    else if(ss==='low') alerts.push({type:'stock',level:'warning',priority:3,title:`Low Stock: ${p.name}`,msg:`${p.stock} units remain. Reorder level: ${p.reorder}.`,product:p,badge:`${p.stock}`,action:'Reorder'});
  });
  if(role==='admin'){
    alerts.push({type:'info',level:'success',priority:5,title:'Sales target reached!',msg:'Revenue crossed ₹80,000 today.',product:null,badge:'✓',action:null});
    alerts.push({type:'info',level:'info',priority:5,title:'GST filing due Apr 15',msg:'Quarterly return due in 14 days.',product:null,badge:'GST',action:null});
    alerts.push({type:'info',level:'info',priority:5,title:'High demand: Tropicana OJ',msg:'Demand up 40% — increase order.',product:null,badge:'↑',action:'Order more'});
  }
  alerts.sort((a,b)=>a.priority-b.priority);
  return alerts;
}
function getAlertCounts(role){
  const all=buildAlerts(role);
  return{total:all.length,danger:all.filter(a=>a.level==='danger').length,warning:all.filter(a=>a.level==='warning').length,info:all.filter(a=>['info','success','watch'].includes(a.level)).length,expiry:all.filter(a=>a.type==='expiry').length,stock:all.filter(a=>a.type==='stock').length};
}
function renderAlerts(containerId,role,filterType='all'){
  const alerts=buildAlerts(role).filter(a=>filterType==='all'||a.type===filterType);
  const el=document.getElementById(containerId);
  if(!el)return;
  if(!alerts.length){el.innerHTML=`<div class="alert-empty"><div style="font-size:40px">✅</div><p>No alerts!</p></div>`;return;}
  const lc={danger:'al-danger',warning:'al-warning',watch:'al-watch',info:'al-info',success:'al-success'};
  const ic={danger:'✕',warning:'▲',watch:'i',info:'ℹ',success:'✓'};
  el.innerHTML=alerts.map(a=>{
    const typeTag=a.type==='expiry'?`<span class="atag atag-exp">EXPIRY</span>`:a.type==='stock'?`<span class="atag atag-stk">STOCK</span>`:`<span class="atag atag-inf">INFO</span>`;
    const btn=a.action?`<button class="al-btn" onclick="showToast('${a.action}: ${a.product?a.product.name:'done'}','success')">${a.action} →</button>`:'';
    const meta=a.product?`<div class="al-meta">${a.product.id} · ${a.product.cat} · ${a.product.supplier}</div>`:'';
    return`<div class="al-card ${lc[a.level]||'al-info'}">
      <div class="al-icon ${lc[a.level]}">${ic[a.level]||'i'}</div>
      <div class="al-body">
        <div class="al-head">${typeTag}<span class="al-badge">${a.badge}</span></div>
        <div class="al-title">${a.title}</div>
        <div class="al-msg">${a.msg}</div>
        ${meta}${btn}
      </div></div>`;
  }).join('');
}
