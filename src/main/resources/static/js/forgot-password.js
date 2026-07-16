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



function renderStaticIcons(){
  document.body.innerHTML = document.body.innerHTML.replace(/\$\{ICON\.(\w+)\}/g, (m,k)=>ICON[k]||'');
}
renderStaticIcons();



function goStep(n) {
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById('step-' + i);
    if (stepEl) {
      stepEl.style.display = (i === n) ? '' : 'none';
    }
  }

  // Update dots (we have 3 dots representing the first 3 steps, step 4 is success)
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById('dot-' + i);
    if (dot) {
      if (i === n || (n === 4 && i === 3)) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    }
  }
  if(n===2) document.getElementById('link-email').textContent = document.getElementById('fp-email').value || 'email của bạn';
}
let currentResetToken = '';

async function sendLink() {
  const email = document.getElementById('fp-email').value.trim();
  if (!email) {
    alert('Vui lòng nhập email');
    return;
  }
  
  const btn = event ? event.target : null;
  let originalText = 'Gửi liên kết đặt lại';
  if (btn) {
    originalText = btn.textContent;
    btn.textContent = 'Đang xử lý...';
    btn.disabled = true;
  }

  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (response.ok) {
      goStep(2);
      document.getElementById('link-email').textContent = email;
    } else {
      const error = await response.json();
      alert(error.message || 'Không thể gửi OTP. Vui lòng kiểm tra lại email.');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }
}

async function verifyOtp() {
  const email = document.getElementById('fp-email').value.trim();
  const otp = document.getElementById('fp-otp').value.trim();
  
  if (!otp) {
    alert('Vui lòng nhập mã OTP');
    return;
  }
  
  const btn = document.getElementById('btn-verify-otp');
  const originalText = btn.textContent;
  btn.textContent = 'Đang xác minh...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    if (response.ok) {
      const data = await response.json();
      currentResetToken = data.resetToken || '';
      goStep(3);
    } else {
      const error = await response.json();
      alert(error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function resetPassword() {
  const newPassword = document.getElementById('fp-pass').value;
  const confirmPassword = document.getElementById('fp-confirm').value;
  
  if (!newPassword || newPassword.length < 8) {
    alert('Mật khẩu mới phải có ít nhất 8 ký tự');
    return;
  }
  if (newPassword !== confirmPassword) {
    alert('Mật khẩu xác nhận không khớp');
    return;
  }
  
  const btn = document.getElementById('btn-reset-pass');
  const originalText = btn.textContent;
  btn.textContent = 'Đang xử lý...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        resetToken: currentResetToken, 
        newPassword: newPassword, 
        confirmPassword: confirmPassword 
      })
    });
    
    if (response.ok) {
      goStep(4);
    } else {
      const error = await response.json();
      alert(error.message || 'Không thể đặt lại mật khẩu.');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function resetForgot(){ 
    window.location.href = '/login';
}

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


goStep(1);