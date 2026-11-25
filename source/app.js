'use strict';
const data=JSON.parse(document.getElementById('strategy-data').textContent), dashboard=document.getElementById('dashboard-template').innerHTML;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:1});
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const KEY='ovn-communications-2027-v2'; let state={tasks:{},projects:{},budget:3000,weights:[...data.weights]}; let persisted=true;
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored){state={...state,...stored};if(!Array.isArray(state.weights)||state.weights.length!==8)state.weights=[...data.weights]}}catch(e){persisted=false}
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){persisted=false;toast('Trình duyệt không cho lưu dữ liệu cục bộ. Hãy xuất bản sao lưu.')}}
function save(){saveLocal()}
const fb=window.__ovnFirebaseTracker;
const dirtyProjects=new Set();
const savedProjects=new Set();
const rowSaveTimers={};
let prefsTimer=null;
function syncPreferencesSoon(){
  if(!fb||!fb.getSyncState().user)return;
  clearTimeout(prefsTimer);
  prefsTimer=setTimeout(()=>{fb.savePreferences({budget:state.budget,weights:state.weights,tasks:state.tasks})},500);
}
function fmtTime(ts){if(!ts)return '';const d=new Date(ts);return d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function renderCloudBar(){
  const bar=$('#cloud-sync-bar');
  const topAuth=$('#topbar-auth');
  const sideAuth=$('#sidebar-auth');
  const dashNote=$('#dash-sync-note');
  const dashActions=$('#dash-auth-actions');
  if(!fb){
    if(bar){bar.className='cloud-bar offline';bar.innerHTML='<div class="cloud-info"><span class="cloud-dot"></span><span>Đang lưu cục bộ trên trình duyệt này.</span></div>'}
    if(topAuth)topAuth.innerHTML='';
    if(sideAuth){sideAuth.className='cloud-side offline';sideAuth.innerHTML='<div class="cloud-side-head"><span class="cloud-dot"></span><span class="cloud-side-title">Lưu cục bộ</span></div>'}
    return;
  }
  const st=fb.getSyncState();
  const stateClass=st.user?(st.syncing?'syncing':'online'):'offline';
  const userLabel=st.user?(st.user.displayName||st.user.email||'Tài khoản Google'):'';
  if(topAuth){
    if(!st.user){
      topAuth.innerHTML='<button type="button" class="btn small primary" id="topbar-signin-btn">Đăng nhập để lưu</button>';
      $('#topbar-signin-btn',topAuth).onclick=()=>fb.signIn();
    }else{
      topAuth.innerHTML=`<span class="auth-chip" title="${esc(st.user.email||userLabel)}"><span class="cloud-dot"></span><span class="auth-name">${esc(userLabel)}</span></span><button type="button" class="btn small" id="topbar-signout-btn">Đăng xuất</button>`;
      $('#topbar-signout-btn',topAuth).onclick=()=>fb.signOut();
    }
  }
  if(sideAuth){
    sideAuth.className=`cloud-side ${stateClass}`;
    if(!st.user){
      sideAuth.innerHTML='<div class="cloud-side-head"><span class="cloud-dot"></span><span class="cloud-side-title">Chế độ cục bộ</span></div><small>Đăng nhập để lưu & đồng bộ giữa các thiết bị.</small><button type="button" class="btn small primary" id="side-signin-btn">Đăng nhập Google để lưu</button>';
      $('#side-signin-btn',sideAuth).onclick=()=>fb.signIn();
    }else{
      const subTxt=st.syncing?'Đang lưu lên Cloud…':(st.lastSavedAt?`Đã lưu lúc ${fmtTime(st.lastSavedAt)}`:'Đã kết nối Cloud');
      sideAuth.innerHTML=`<div class="cloud-side-head"><span class="cloud-dot"></span><span class="cloud-side-title" title="${esc(st.user.email||userLabel)}">${esc(userLabel)}</span></div><small>${esc(subTxt)}</small><button type="button" class="btn small" id="side-signout-btn">Đăng xuất</button>`;
      $('#side-signout-btn',sideAuth).onclick=()=>fb.signOut();
    }
  }
  if(dashNote){
    dashNote.textContent=st.user?`Đã đồng bộ Cloud (${st.user.email||st.user.displayName||'Google'}).`:'Trạng thái do người dùng nhập. Đăng nhập Google để lưu vĩnh viễn và đồng bộ lên Cloud.';
  }
  if(dashActions){
    if(!st.user){
      dashActions.innerHTML='<button type="button" class="btn primary" id="dash-signin-btn">Đăng nhập Google để lưu Cloud</button><a class="btn" href="#p10/m44">Checklist 20 nhiệm vụ cấp thiết →</a>';
      $('#dash-signin-btn',dashActions).onclick=()=>fb.signIn();
    }else{
      dashActions.innerHTML='<a class="btn primary" href="#tracker">Cập nhật trạng thái Tracker →</a><a class="btn" href="#p10/m44">Checklist 20 nhiệm vụ cấp thiết →</a>';
    }
  }
  if(!bar)return;
  if(!st.user){
    bar.className='cloud-bar offline';
    bar.innerHTML=`<div class="cloud-info"><span class="cloud-dot"></span><span><strong>Chế độ cục bộ:</strong> Dữ liệu đang lưu trên trình duyệt này. Đăng nhập Google để lưu vĩnh viễn và đồng bộ giữa các thiết bị.</span></div><div class="cloud-actions"><button type="button" class="btn small primary" id="cloud-signin">Đăng nhập Google để lưu Cloud</button></div>`;
    $('#cloud-signin',bar).onclick=()=>fb.signIn();
    return;
  }
  const statusTxt=st.syncing?'Đang lưu lên Cloud…':(st.error?'Lỗi đồng bộ Cloud — dữ liệu vẫn giữ cục bộ':(st.lastSavedAt?`Đã lưu Cloud lúc ${fmtTime(st.lastSavedAt)}`:'Đã kết nối Cloud (Firestore)'));
  bar.className=`cloud-bar ${stateClass}`;
  bar.innerHTML=`<div class="cloud-info"><span class="cloud-dot"></span><span><strong>${esc(st.user.email||st.user.displayName||'Tài khoản Google')}</strong> · ${esc(statusTxt)}</span></div><div class="cloud-actions"><button type="button" class="btn small" id="cloud-save-all">Lưu tất cả</button><button type="button" class="btn small" id="cloud-signout">Đăng xuất</button></div>`;
  $('#cloud-save-all',bar).onclick=async()=>{
    const entries=data.projects.filter(p=>dirtyProjects.has(p.id)||(state.projects[p.id]&&(state.projects[p.id].status!==statuses[0]||state.projects[p.id].owner||state.projects[p.id].note))).map(p=>[p.id,getProject(p.id)]);
    if(!entries.length){toast('Tất cả dự án đã được đồng bộ.');return}
    const ok=await fb.saveProjectsBatch(entries);
    if(ok){entries.forEach(([id])=>{dirtyProjects.delete(id);savedProjects.add(id);updateRowSaveButton(id)});toast(`Đã lưu ${entries.length} dự án lên Cloud.`)}
  };
  $('#cloud-signout',bar).onclick=()=>fb.signOut();
}
function updateRowSaveButton(id){
  const btn=$(`[data-save="${id}"]`);
  if(!btn)return;
  const isDirty=dirtyProjects.has(id);
  const isSaved=savedProjects.has(id);
  btn.classList.toggle('dirty',isDirty);
  btn.classList.toggle('saved',!isDirty&&isSaved);
  btn.textContent=isDirty?'Lưu':(isSaved?'Đã lưu ✓':'Lưu');
}
async function persistProject(id,explicitNotify){
  clearTimeout(rowSaveTimers[id]);
  const rec=getProject(id);
  state.projects[id]=rec;
  saveLocal();
  const user=fb?.getSyncState().user;
  if(user){
    const btn=$(`[data-save="${id}"]`);
    if(btn){btn.textContent='Đang lưu…';btn.disabled=true}
    const ok=await fb.saveProject(id,rec);
    if(btn)btn.disabled=false;
    if(ok){
      dirtyProjects.delete(id);
      savedProjects.add(id);
      updateRowSaveButton(id);
      if(explicitNotify)toast(`Đã lưu ${id} (${rec.status}) lên Cloud.`);
    }else{
      dirtyProjects.add(id);
      updateRowSaveButton(id);
    }
  }else{
    dirtyProjects.delete(id);
    savedProjects.add(id);
    updateRowSaveButton(id);
    if(explicitNotify)toast(`Đã lưu cục bộ ${id} (${rec.status}). Đăng nhập Google để lưu lên Cloud.`);
  }
}
if(fb){
  fb.init({
    getLocalState:()=>state,
    applyRemoteProjects:(remoteProjects)=>{
      let changed=false;
      for(const [id,rec] of Object.entries(remoteProjects)){
        if(!dirtyProjects.has(id)){
          state.projects[id]={status:rec.status,owner:rec.owner,note:rec.note};
          savedProjects.add(id);
          changed=true;
        }
      }
      if(changed)saveLocal();
      if(current==='dashboard')updateDash();
      if(current==='tracker'){
        const activeInTable=$('#project-rows')?.contains(document.activeElement);
        if(activeInTable){
          updateTrackerStatsOnly();
          for(const [id,rec] of Object.entries(remoteProjects)){
            if(dirtyProjects.has(id))continue;
            const tr=$(`tr[data-id="${id}"]`);
            if(!tr)continue;
            const sel=$('[data-field="status"]',tr);
            const ow=$('[data-field="owner"]',tr);
            const nt=$('[data-field="note"]',tr);
            if(sel&&document.activeElement!==sel)sel.value=rec.status;
            if(ow&&document.activeElement!==ow)ow.value=rec.owner||'';
            if(nt&&document.activeElement!==nt)nt.value=rec.note||'';
            updateRowSaveButton(id);
          }
        }else{
          drawProjects();
        }
      }
    },
    applyRemotePreferences:(prefs)=>{
      state.budget=prefs.budget;
      state.weights=prefs.weights;
      const nextTasks={};
      prefs.completedTasks.forEach(idx=>{nextTasks[String(idx)]=true});
      state.tasks=nextTasks;
      saveLocal();
      updateTasks();
      if(current==='dashboard')updateDash();
      if($('#main [data-budget]'))bindBudget();
    },
    onSyncStateChange:()=>{renderCloudBar()},
    onToast:(msg)=>toast(msg)
  });
}
renderCloudBar();
const short=['Bối cảnh & định hướng','Kiến trúc hệ sinh thái','Đối tượng & thị trường','10 trụ cột truyền thông','Nội dung & sáng tạo','Lộ trình triển khai','Tổ chức & quản trị','Ngân sách','KPI & đánh giá','Danh mục dự án','Điều hành Giám đốc','Tổng kết chiến lược','Phụ lục & phê duyệt'];
const groups=['A · Chiến lược & quản trị','B · Thương hiệu & nhận diện','C · Sản phẩm & thương mại','D · Digital & nội dung','E · Báo chí & sự kiện','F · Danh tiếng & nội bộ'];
const statuses=['Chưa cập nhật','Chưa bắt đầu','Đang thực hiện','Hoàn thành','Tạm dừng'];
function nav(){let a=(href,icon,title)=>`<a href="${href}" data-nav="${href}"><span class="iconnav">${icon}</span>${esc(title)}</a>`;$('#nav').innerHTML='<div class="nav-label">TỔNG QUAN</div>'+a('#dashboard','▦','Dashboard chiến lược')+a('#tracker','☷','Master Project Tracker')+a('#all','▤','Tài liệu chiến lược')+'<div class="nav-label">NỘI DUNG CHIẾN LƯỢC</div>'+data.sections.map(s=>`<a href="#p${s.p}" data-nav="#p${s.p}"><span class="num">${s.p===13?'PL':String(s.p).padStart(2,'0')}</span>${esc(short[s.p-1])}</a>`).join('')+'<div class="nav-label">TRUY CẬP NHANH</div>'+a('#p6/m28','◷','Kế hoạch 90 ngày')+a('#p10/m44','✓','20 nhiệm vụ cấp thiết')+a('#p8/m35','◉','Mô phỏng ngân sách');}
nav();
let current='',toastTimer;
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>toast('Đã sao chép nội dung.')).catch(()=>fallback());else fallback();function fallback(){let t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('Đã sao chép nội dung.')}catch{toast('Không thể sao chép tự động.')}t.remove()}}
function exportFile(filename,content,type){let b=new Blob([content],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500)}
function closeNav(){$('.sidebar').classList.remove('open');$('.overlay').classList.remove('show');document.body.classList.remove('nav-open');$('#menubtn').setAttribute('aria-expanded','false')}
function render(){let route=location.hash.slice(1)||'dashboard', [page,target]=route.split('/');let m=$('#main');if(!['dashboard','all','tracker'].includes(page)&&!/^p(?:[1-9]|1[0-3])$/.test(page)){page='dashboard';target=''}
const same=current===page;current=page;document.body.classList.toggle('allmode',page==='all');let title='Dashboard chiến lược';if(!same){if(page==='dashboard'){m.innerHTML=dashboard;updateDash();renderCloudBar()}else if(page==='tracker'){title='Master Project Tracker';renderTracker()}else if(page==='all'){title='Tài liệu chiến lược';m.innerHTML=`<div class="pageheader"><div><div class="eyebrow">DOCUMENT LIBRARY / V2.0 FINAL</div><h1>Chiến lược truyền thông tổng thể 2027</h1><p>12 phần · 50 mục · Phụ lục · Nội dung chi tiết theo bản Final</p></div><button class="btn" onclick="window.print()">Tải tài liệu PDF</button></div><article class="article"><div class="introdoc">${data.intro}</div>${data.sections.map(s=>`<section class="docpart" id="part-${s.p}"><h1 class="part-title">${esc(s.title)}</h1>${s.html}</section>`).join('')}</article>`;bindWidgets()}else{let n=Number(page.slice(1)),s=data.sections[n-1];title=short[n-1];let pt=s.title.split('. ').slice(1).join('. ');m.innerHTML=`<div class="pageheader"><div><div class="eyebrow">${n===13?'APPENDIX':'CHAPTER '+String(n).padStart(2,'0')+' / 12'} · V2.0 FINAL</div><h1>${esc(pt.charAt(0)+pt.slice(1).toLowerCase())}</h1><p>${s.headings.filter(h=>h.level===2).length?s.headings.filter(h=>h.level===2).length+' mục chiến lược · ':''}Organic Việt Nam & ADIGO</p></div><a class="btn" href="#all">Xem tài liệu</a></div><div class="reader-layout"><article class="article">${s.html}</article><aside class="toc"><h4>Trong chương này</h4><div class="toclinks">${s.headings.length?s.headings.map(h=>`<a class="${h.level===3?'sub':''}" href="#p${n}/${h.id}" data-toc="${h.id}">${esc(h.title)}</a>`).join(''):'<a href="#p13">Hệ thống tài liệu và phê duyệt</a>'}</div></aside></div><div class="page-nav">${n>1?`<a class="btn" href="#p${n-1}">← ${esc(short[n-2])}</a>`:'<a class="btn" href="#dashboard">← Dashboard</a>'}${n<13?`<a class="btn" href="#p${n+1}">${esc(short[n])} →</a>`:'<a class="btn" href="#dashboard">Dashboard →</a>'}</div>`;bindWidgets()}}else if(/^p\d+$/.test(page))title=short[Number(page.slice(1))-1];else if(page==='tracker')title='Master Project Tracker';else if(page==='all')title='Tài liệu chiến lược';$('#crumb').textContent='Organic Việt Nam / '+title;$$('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav==='#'+page||a.dataset.nav===location.hash));$$('[data-toc]').forEach(a=>a.classList.toggle('active',a.dataset.toc===target));closeNav();closeSearch();if(target){requestAnimationFrame(()=>{let el=document.getElementById(target);if(el){el.scrollIntoView({block:'start',behavior:'auto'});if(target.startsWith('project-')){el.style.background='#dfefdc';setTimeout(()=>el.style.background='',2200)}}else window.scrollTo(0,0)})}else if(!same)window.scrollTo(0,0);}
window.addEventListener('hashchange',render);
function bindWidgets(){bindTasks();bindBudget()}
function bindTasks(){$$('[data-task]').forEach(el=>{el.checked=!!state.tasks[el.dataset.task];el.onchange=()=>{state.tasks[el.dataset.task]=el.checked;save();updateTasks();syncPreferencesSoon()}});$$('[data-copytasks]').forEach(b=>b.onclick=()=>copyText($$('[data-task]').map(el=>`${el.checked?'[x]':'[ ]'} ${el.nextElementSibling.innerText.replace(/\n/g,' – ')}`).join('\n')));updateTasks()}
function updateTasks(){let n=Object.values(state.tasks).filter(Boolean).length;$$('[data-checkcount]').forEach(e=>e.textContent=n+'/20');$$('[data-checkbar]').forEach(e=>e.style.width=(n*5)+'%')}
function bindBudget(){$$('[data-budget]').forEach(el=>{el.innerHTML=`<div class="notice">Mô phỏng tương tác — thay đổi không sửa nội dung và số liệu tham chiếu của chiến lược gốc.</div><div class="budget-controls"><label class="field">Tổng ngân sách năm (triệu đồng)<input type="number" data-budget-total min="0" step="100" value="${esc(state.budget)}"></label>${[1800,3000,4800].map(v=>`<button class="btn small" data-scenario="${v}">${fmt(v/1000)} tỷ</button>`).join('')}<button class="btn small" data-resetbudget>Về mặc định</button></div><div>${data.budgetnames.map((n,i)=>`<div class="budget-row"><label for="weight-${i}">${esc(n)}</label><input type="range" data-range="${i}" aria-label="Tỷ trọng ${esc(n)}" min="0" max="60" step="1" value="${state.weights[i]}"><input id="weight-${i}" type="number" data-weight="${i}" aria-label="Phần trăm ${esc(n)}" min="0" max="60" value="${state.weights[i]}"><span class="money" data-money="${i}"></span></div>`).join('')}</div><div class="budget-total" data-summary></div><button class="btn" data-copybudget>Sao chép dự toán</button> <button class="btn" data-exportbudget>Xuất CSV</button>`;function refresh(){let total=state.weights.reduce((a,b)=>a+Number(b),0),amount=Number(state.budget)||0;$$('[data-money]',el).forEach((e,i)=>e.textContent=fmt(amount*state.weights[i]/100)+' tr');let s=$('[data-summary]',el);s.classList.toggle('warn',total!==100);s.innerHTML=`<span>Tổng tỷ trọng <strong>${total}%</strong></span><span>Đã phân bổ <strong>${fmt(amount*total/100)} tr/năm</strong></span><span>Bình quân <strong>${fmt(amount*total/1200)} tr/tháng</strong></span>${total!==100?'<small>Cần điều chỉnh tổng tỷ trọng về 100%.</small>':''}`;$$('[data-scenario]',el).forEach(b=>b.classList.toggle('primary',Number(b.dataset.scenario)===amount))}function update(i,v){state.weights[i]=Math.min(60,Math.max(0,Math.round(Number(v)||0)));$(`[data-range="${i}"]`,el).value=state.weights[i];$(`[data-weight="${i}"]`,el).value=state.weights[i];save();syncPreferencesSoon();refresh()}$('[data-budget-total]',el).oninput=e=>{state.budget=Math.max(0,Number(e.target.value)||0);save();syncPreferencesSoon();refresh()};$$('[data-range]',el).forEach(e=>e.oninput=()=>update(Number(e.dataset.range),e.value));$$('[data-weight]',el).forEach(e=>e.oninput=()=>update(Number(e.dataset.weight),e.value));$$('[data-scenario]',el).forEach(b=>b.onclick=()=>{state.budget=Number(b.dataset.scenario);$('[data-budget-total]',el).value=state.budget;save();syncPreferencesSoon();refresh()});$('[data-resetbudget]',el).onclick=()=>{state.budget=3000;state.weights=[...data.weights];save();syncPreferencesSoon();bindBudget()};$('[data-copybudget]',el).onclick=()=>copyText('DỰ TOÁN NGÂN SÁCH TRUYỀN THÔNG 2027\nTổng ngân sách: '+fmt(state.budget)+' triệu đồng\n'+data.budgetnames.map((n,i)=>`${n}: ${state.weights[i]}% – ${fmt(state.budget*state.weights[i]/100)} triệu đồng`).join('\n')+'\nTổng tỷ trọng: '+state.weights.reduce((a,b)=>a+b,0)+'%');$('[data-exportbudget]',el).onclick=()=>exportFile('OrganicVN-Ngan-sach-2027.csv',csv([['Hạng mục','Tỷ trọng (%)','Ngân sách (triệu đồng)'],...data.budgetnames.map((n,i)=>[n,state.weights[i],state.budget*state.weights[i]/100])]),'text/csv;charset=utf-8');refresh()})}
const getProject=id=>state.projects[id]||{status:statuses[0],owner:'',note:''};
function stats(){let counts=Object.fromEntries(statuses.map(s=>[s,0]));data.projects.forEach(p=>{let s=getProject(p.id).status||statuses[0];counts[s]=(counts[s]||0)+1});return counts}
function updateTrackerStatsOnly(){let el=$('#tracker-stats');if(!el)return;let c=stats();el.innerHTML=statuses.map(s=>`<div class="tile"><strong>${c[s]||0}</strong><small>${s}</small></div>`).join('')}
function updateDash(){let el=$('#dash-progress');if(!el)return;let c=stats(),done=c['Hoàn thành']||0,tc=Object.values(state.tasks).filter(Boolean).length;el.innerHTML=`<div class="progresssummary"><div class="tile"><strong>${done}/57</strong><small>Dự án hoàn thành</small></div><div class="tile"><strong>${c['Đang thực hiện']||0}</strong><small>Đang thực hiện</small></div><div class="tile"><strong>${tc}/20</strong><small>Nhiệm vụ cấp thiết</small></div></div><div class="track"><span style="width:${done/57*100}%"></span></div><p class="muted" style="margin-top:8px">${c['Chưa cập nhật']||0} dự án chưa có trạng thái được nhập.</p>`}
function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')}
function renderTracker(){$('#main').innerHTML=`<div class="pageheader"><div><div class="eyebrow">EXECUTION OFFICE / MASTER PORTFOLIO</div><h1>Master Project Tracker</h1><p>57 dự án · 6 nhóm · Dữ liệu kế hoạch gốc không thay đổi.</p></div><a class="btn" href="#p10/m43">Danh mục gốc →</a></div><section class="panel"><div id="cloud-sync-bar" class="cloud-bar offline"></div><div class="statusbar" id="tracker-stats"></div><div class="filters"><label class="field searchfield">Tìm dự án<input id="pq" type="search" placeholder="Mã hoặc tên dự án…"></label><label class="field">Nhóm<select id="pg"><option value="">Tất cả nhóm</option>${groups.map((g,i)=>`<option value="${'ABCDEF'[i]}">${esc(g)}</option>`).join('')}</select></label><label class="field">Ưu tiên<select id="pp"><option value="">Tất cả</option><option>P1</option><option>P2</option><option>P3</option></select></label><label class="field">Tiến độ dự kiến<select id="pt"><option value="">Tất cả</option><option value="12/2026">12/2026</option><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>Theo tiến độ</option><option>Theo kế hoạch</option><option>Xuyên suốt</option></select></label><label class="field">Trạng thái<select id="ps"><option value="">Tất cả</option>${statuses.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label></div><div class="panel-head"><span id="tracker-count" class="muted"></span><div><button id="exportcsv" class="btn small">Xuất CSV</button> <button id="backup" class="btn small">Sao lưu JSON</button> <button id="restore" class="btn small">Khôi phục</button><input type="file" accept="application/json,.json" id="restorefile" hidden></div></div><div class="table-scroll"><table class="tracker-table"><thead><tr><th>Mã</th><th>Dự án</th><th>Ưu tiên</th><th>Kế hoạch</th><th>Trạng thái</th><th>Phụ trách</th><th>Ghi chú</th><th>Cập nhật</th></tr></thead><tbody id="project-rows"></tbody></table></div></section>`;renderCloudBar();['pq','pg','pp','pt','ps'].forEach(id=>$('#'+id).addEventListener(id==='pq'?'input':'change',drawProjects));$('#exportcsv').onclick=()=>exportFile('OrganicVN-Master-Project-2027.csv',csv([['Mã','Dự án','Ưu tiên','Tiến độ dự kiến','Trạng thái','Phụ trách','Ghi chú'],...data.projects.map(p=>[p.id,p.name,p.priority,p.schedule,getProject(p.id).status,getProject(p.id).owner,getProject(p.id).note])]),'text/csv;charset=utf-8');$('#backup').onclick=()=>exportFile('OrganicVN-2027-backup.json',JSON.stringify({version:2,state},null,2),'application/json');$('#restore').onclick=()=>$('#restorefile').click();$('#restorefile').onchange=async e=>{try{let x=JSON.parse(await e.target.files[0].text());if(x.version!==2||!x.state||typeof x.state.projects!=='object'||!Array.isArray(x.state.weights)||x.state.weights.length!==8||!x.state.weights.every(v=>typeof v==='number'&&v>=0&&v<=60))throw Error();if(!confirm('Khôi phục bản sao lưu sẽ thay thế dữ liệu theo dõi hiện tại. Tiếp tục?'))return;let s=x.state;state={tasks:{},projects:{},budget:Math.max(0,Number(s.budget)||0),weights:s.weights};for(let i=0;i<20;i++)state.tasks[i]=!!s.tasks?.[i];data.projects.forEach(p=>{let r=s.projects[p.id];if(r)state.projects[p.id]={status:statuses.includes(r.status)?r.status:statuses[0],owner:String(r.owner||''),note:String(r.note||'')}});save();if(fb&&fb.getSyncState().user){const entries=Object.entries(state.projects);if(entries.length)await fb.saveProjectsBatch(entries);await fb.savePreferences({budget:state.budget,weights:state.weights,tasks:state.tasks})}drawProjects();toast('Đã khôi phục dữ liệu.')}catch{toast('Tệp sao lưu không hợp lệ.')}e.target.value=''};drawProjects()}
function quarterMatch(schedule,q){if(!q)return true;if(q==='12/2026')return schedule.includes(q);if(/^Q\d$/.test(q)){if(schedule==='Xuyên suốt')return true;const m=[...schedule.matchAll(/Q([1-4])/g)].map(x=>+x[1]),k=+q[1];return m.length&&(k>=m[0]&&k<=m[m.length-1])}return schedule===q}
function drawProjects(){updateTrackerStatsOnly();let q=norm($('#pq').value),g=$('#pg').value,p=$('#pp').value,t=$('#pt').value,s=$('#ps').value;let list=data.projects.filter(x=>(!q||norm(x.id+' '+x.name).includes(q))&&(!g||x.id.startsWith(g))&&(!p||x.priority===p)&&quarterMatch(x.schedule,t)&&(!s||getProject(x.id).status===s));$('#tracker-count').textContent=`Hiển thị ${list.length}/57 dự án`;$('#project-rows').innerHTML=list.map(x=>{let v=getProject(x.id);let isDirty=dirtyProjects.has(x.id);let isSaved=!isDirty&&(savedProjects.has(x.id)||v.status!==statuses[0]||Boolean(v.owner)||Boolean(v.note));let btnCls=isDirty?'dirty':(isSaved?'saved':'');let btnTxt=isDirty?'Lưu':(isSaved?'Đã lưu ✓':'Lưu');return `<tr data-id="${x.id}"><td data-label="Mã"><a class="textlink" href="#p10/project-${x.id}">${x.id}</a></td><td data-label="Dự án">${esc(x.name)}</td><td data-label="Ưu tiên"><span class="priority ${x.priority.toLowerCase()}">${x.priority}</span></td><td data-label="Kế hoạch">${esc(x.schedule)}</td><td data-label="Trạng thái"><select data-field="status" aria-label="Trạng thái ${x.id}">${statuses.map(s=>`<option ${s===v.status?'selected':''}>${esc(s)}</option>`).join('')}</select></td><td data-label="Phụ trách"><input data-field="owner" type="text" value="${esc(v.owner||'')}" placeholder="Chưa phân công" aria-label="Phụ trách ${x.id}"></td><td data-label="Ghi chú"><input data-field="note" type="text" value="${esc(v.note||'')}" placeholder="Ghi chú" aria-label="Ghi chú ${x.id}"></td><td data-label="Cập nhật"><button type="button" class="btn small save-row-btn ${btnCls}" data-save="${x.id}">${btnTxt}</button></td></tr>`}).join('')||'<tr><td colspan="8">Không tìm thấy dự án phù hợp.</td></tr>';$$('[data-field]',$('#project-rows')).forEach(e=>{e.addEventListener(e.tagName==='SELECT'?'change':'input',()=>{let id=e.closest('tr').dataset.id;state.projects[id]={...getProject(id),[e.dataset.field]:e.value};saveLocal();if(e.tagName==='SELECT'){dirtyProjects.add(id);drawProjects();persistProject(id,true)}else{dirtyProjects.add(id);savedProjects.delete(id);updateRowSaveButton(id);clearTimeout(rowSaveTimers[id]);rowSaveTimers[id]=setTimeout(()=>persistProject(id,false),800)}});if(e.tagName==='INPUT'){e.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();let id=e.closest('tr').dataset.id;persistProject(id,true)}})}});$$('[data-save]',$('#project-rows')).forEach(b=>{b.onclick=()=>{let id=b.dataset.save;persistProject(id,true)}})}
function openSearch(){$('#searchoverlay').classList.add('open');$('#searchinput').focus();searchNow()}
function closeSearch(){$('#searchoverlay').classList.remove('open')}
function searchNow(){let q=$('#searchinput').value.trim(),n=norm(q),terms=n.split(/\s+/).filter(Boolean),r=$('#results');if(!n){r.innerHTML='<p class="muted" style="padding:12px 6px">Tìm kiếm tài liệu 50 mục chiến lược và 57 dự án. Có thể nhập tiếng Việt không dấu.</p>'+['ADIGO','Bao bì','KPI','Ngân sách','Báo chí','Tết 2027'].map(s=>`<button class="btn small" style="margin:4px" data-suggestion="${esc(s)}">${esc(s)}</button>`).join('');$$('[data-suggestion]',r).forEach(b=>b.onclick=()=>{$('#searchinput').value=b.dataset.suggestion;searchNow()});return}let all=data.search.map(s=>({...s,route:`#p${s.p}${s.id?'/'+s.id:''}`,kind:'Chiến lược'})).concat(data.projects.map(p=>({title:p.id+' · '+p.name,body:p.priority+' · '+p.schedule,route:'#p10/project-'+p.id,kind:'Dự án'})));let found=all.filter(x=>terms.every(t=>norm(x.title+' '+x.body).includes(t))).sort((a,b)=>Number(terms.every(t=>norm(b.title).includes(t)))-Number(terms.every(t=>norm(a.title).includes(t))));r.innerHTML=`<p class="muted" style="padding:8px 6px">${found.length} kết quả</p>`+found.slice(0,60).map(x=>{let txt=x.body.replace(/\s+/g,' '),ix=norm(txt).indexOf(terms[0]),start=Math.max(0,ix-45),excerpt=(start?'…':'')+txt.slice(start,start+160)+(txt.length>start+160?'…':'');return `<a class="result" href="${x.route}"><strong>${esc(x.title)}</strong><small>${esc(x.kind)} · ${esc(excerpt)}</small></a>`}).join('');$$('.result',r).forEach(a=>a.onclick=()=>{closeSearch();if(a.getAttribute('href')===location.hash){let id=location.hash.split('/')[1];document.getElementById(id)?.scrollIntoView()}})}
$('#searchbtn').onclick=openSearch;$('#searchclose').onclick=closeSearch;$('#searchinput').oninput=searchNow;$('#searchoverlay').onclick=e=>{if(e.target.id==='searchoverlay')closeSearch()};document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'){closeSearch();closeNav()}});$('#menubtn').onclick=()=>{$('.sidebar').classList.toggle('open');$('.overlay').classList.toggle('show');const open=$('.sidebar').classList.contains('open');document.body.classList.toggle('nav-open',open);$('#menubtn').setAttribute('aria-expanded',String(open));if(open)$('.sidebar a')?.focus()};$('.overlay').onclick=closeNav;$('#printbtn').onclick=()=>window.print();render();

window.matchMedia("(max-width: 900px)").addEventListener("change",closeNav);
