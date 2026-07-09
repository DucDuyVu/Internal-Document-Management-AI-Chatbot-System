const ICON = {
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l9 7 9-7"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 8 11 8a21.7 21.7 0 01-2.94 4.19M14.12 14.12a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.5 12.5L20 3M17 6l3 3M14 9l2 2"/></svg>'
};

const RAIL = {
  forgot: `<div class="rail-icon">${ICON.mail}</div><h1>Khôi phục truy cập</h1><ul><li>Liên kết chỉ có hiệu lực 15 phút</li><li>Kiểm tra cả thư mục spam</li><li>Liên kết chỉ dùng được một lần</li></ul>`,
  change: `<div class="rail-icon">${ICON.lock}</div><h1>Bảo mật tài khoản</h1><ul><li>Không dùng lại mật khẩu cũ</li><li>Kết hợp chữ, số và ký tự đặc biệt</li><li>Đăng xuất thiết bị lạ sau khi đổi</li></ul>`
};

function renderStaticIcons(){
  document.body.innerHTML = document.body.innerHTML.replace(/\$\{ICON\.(\w+)\}/g, (m,k)=>ICON[k]||'');
}
renderStaticIcons();

function setMode(m){
  const isForgot = m === 'forgot';
  document.getElementById('forgot-flow').style.display = isForgot ? '' : 'none';
  document.getElementById('change-flow').style.display = isForgot ? 'none' : '';
  document.getElementById('tab-forgot').classList.toggle('active', isForgot);
  document.getElementById('tab-change').classList.toggle('active', !isForgot);
  document.getElementById('rail').innerHTML = RAIL[m];
}

function goStep(n){
  for(let i=1;i<=4;i++) document.getElementById('step-'+i).style.display = (i===n) ? '' : 'none';
  const boundary = {1:0,2:1,3:2,4:3}[n];
  for(let i=1;i<=3;i++){
    const nd = document.getElementById('node-'+i);
    nd.classList.remove('done','current');
    if(i < boundary+1 || n===4){ nd.classList.add('done'); nd.innerHTML = ICON.check.replace('viewBox','style="width:11px;height:11px;stroke:#fff" viewBox'); }
    else if(i === boundary+1){ nd.classList.add('current'); nd.textContent = i; }
    else { nd.textContent = i; }
  }
  document.getElementById('line-1').classList.toggle('done', n>1);
  document.getElementById('line-2').classList.toggle('done', n>2);
  if(n===2) document.getElementById('link-email').textContent = document.getElementById('fp-email').value || 'email của bạn';
}
function sendLink(){ goStep(2); }
function resetForgot(){ goStep(1); document.getElementById('fp-email').value=''; }

function togglePass(id, btn){
  const el = document.getElementById(id);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  btn.innerHTML = show ? ICON.eyeOff : ICON.eye;
}

function updateStrength(inputId, prefix){
  const v = document.getElementById(inputId).value;
  const len = v.length >= 8, mixCase = /[a-z]/.test(v) && /[A-Z]/.test(v), num = /[0-9]/.test(v), sym = /[^A-Za-z0-9]/.test(v);
  const score = [len, mixCase, num, sym].filter(Boolean).length;
  const pct = [0,25,55,80,100][score];
  const colors = ['var(--border)','var(--danger)','var(--warning)','var(--warning)','var(--success)'];
  const labels = ['Độ mạnh','Yếu','Trung bình','Khá','Mạnh'];
  const labelColors = ['var(--muted-2)','var(--danger)','var(--warning)','var(--warning)','var(--accent-ink)'];
  document.getElementById(prefix+'-cap').style.width = pct+'%';
  document.getElementById(prefix+'-cap').style.background = colors[score];
  document.getElementById(prefix+'-label').textContent = labels[score];
  document.getElementById(prefix+'-label').style.color = labelColors[score];
}

function checkMatch(passId, confirmId, msgId){
  const p = document.getElementById(passId).value, c = document.getElementById(confirmId).value;
  const el = document.getElementById(msgId);
  if(!c){ el.textContent=''; return; }
  if(p===c){ el.textContent='Mật khẩu khớp'; el.style.color='var(--accent-ink)'; }
  else { el.textContent='Mật khẩu không khớp'; el.style.color='var(--danger)'; }
}

function showSaved(){ document.getElementById('cp-saved').style.display='flex'; }

let rt = 30;
setInterval(()=>{
  if(rt>0){
    rt--;
    const el = document.getElementById('rs-count');
    if(el) el.textContent = rt;
    if(rt===0){
      const a = document.getElementById('resend-link');
      a.classList.add('active');
      a.textContent = 'Gửi lại liên kết';
    }
  }
}, 1000);

let et = 900;
setInterval(()=>{
  if(et>0){
    et--;
    const m = Math.floor(et/60), s = et%60;
    const el = document.getElementById('expiry');
    if(el) el.textContent = (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  }
}, 1000);

setMode('forgot');
goStep(1);