(() => {
  const token = new URLSearchParams(location.search).get('quote');
  if(!token) return;

  const ENDPOINT='https://tfqzzhpehrkkxmrpwkas.supabase.co/functions/v1/oficina-orcamento-publico';
  const euro=n=>Number(n||0).toLocaleString('pt-PT',{style:'currency',currency:'EUR'});
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let lastQuote=null;
  let guarding=false;

  const style=document.createElement('style');
  style.textContent=`
    body.publicQuoteMode .top{display:none!important}
    body.publicQuoteMode .shell{max-width:820px;padding-top:18px}
    #publicQuoteView.publicQuote{max-width:760px;margin:28px auto;padding:0 10px}
    #publicQuoteView .card{padding:28px;border-radius:22px}
    #publicQuoteView h2{font-size:34px;line-height:1.1;margin:0 0 10px}
    #publicQuoteView .pqVehicle{color:#667085;font-size:18px;margin-bottom:18px}
    #publicQuoteView .pqItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid #e4e7ec}
    #publicQuoteView .pqItemName{font-size:18px;font-weight:900;line-height:1.3;margin-bottom:6px}
    #publicQuoteView .pqMeta{color:#667085;font-size:15px}
    #publicQuoteView .pqSubtotal{font-size:19px;font-weight:900;white-space:nowrap}
    #publicQuoteView .pqTotal{font-size:38px;font-weight:900;text-align:right;padding:20px 0 10px}
    #publicQuoteView .pqIntro{font-size:17px;font-weight:800;margin:20px 0 10px}
    #publicQuoteView .pqActions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    #publicQuoteView .pqActions button{min-height:76px;border:0;border-radius:14px;color:#fff;font-size:16px;font-weight:900;line-height:1.3;padding:14px 18px;cursor:pointer}
    #publicQuoteView .pqApprove{background:#15803d}.pqReject{background:#b42318}
    #publicQuoteView .pqAnswer{margin-top:20px;padding:15px 17px;border-radius:14px;background:#dcfae6;color:#05603a;font-weight:700;line-height:1.45}
    #publicQuoteView .pqError{padding:18px;border-radius:14px;background:#fee4e2;color:#912018}
    @media(max-width:600px){body.publicQuoteMode .shell{padding:10px}#publicQuoteView.publicQuote{margin:8px auto;padding:0}#publicQuoteView .card{padding:20px 16px}#publicQuoteView h2{font-size:28px}#publicQuoteView .pqItem{grid-template-columns:1fr;gap:7px}#publicQuoteView .pqSubtotal{text-align:left}#publicQuoteView .pqTotal{text-align:left;font-size:34px}#publicQuoteView .pqActions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function ensureView(){
    document.body.classList.add('publicQuoteMode');
    let sec=document.getElementById('publicQuoteView');
    if(!sec){sec=document.createElement('section');sec.id='publicQuoteView';sec.className='view publicQuote';document.querySelector('main.shell').appendChild(sec)}
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    sec.classList.add('active');
    document.getElementById('bottomNav')?.classList.add('hidden');
    document.getElementById('logoutBtn')?.classList.add('hidden');
    return sec;
  }

  async function request(url,opts={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{return await fetch(url,{...opts,cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
  }

  async function load(){
    const root=ensureView();
    root.innerHTML='<div class="card">A carregar orçamento…</div>';
    try{
      const res=await request(`${ENDPOINT}?token=${encodeURIComponent(token)}`);
      const payload=await res.json().catch(()=>null);
      if(!res.ok||!payload?.ok) throw new Error('Não foi possível carregar este orçamento.');
      lastQuote=payload.quote;
      render(lastQuote);
    }catch(err){
      lastQuote=null;
      root.innerHTML=`<div class="card"><h2>Orçamento indisponível</h2><div class="pqError">${esc(err?.name==='AbortError'?'O carregamento demorou demasiado. Tente novamente.':err?.message||'Não foi possível carregar o orçamento.')}</div></div>`;
    }
  }

  function render(d){
    guarding=true;
    const root=ensureView(),v=d.viatura||{},answered=d.estado==='aprovado'||d.estado==='recusado';
    root.innerHTML=`<div class="card"><h2>Orçamento da oficina</h2><div class="pqVehicle">${esc(v.matricula||'')} · ${esc(v.marca||'')} ${esc(v.modelo||'')}</div><div>${(d.itens||[]).map(i=>`<div class="pqItem"><div><div class="pqItemName">${esc(i.descricao)}</div><div class="pqMeta">${Number(i.quantidade||0).toLocaleString('pt-PT')} × ${euro(i.preco_unitario)}</div></div><div class="pqSubtotal">${euro(i.subtotal)}</div></div>`).join('')}</div><div class="pqTotal">${euro(d.total)}</div>${d.notas?`<p>${esc(d.notas)}</p>`:''}${!answered?`<div class="pqIntro">Indique como pretende avançar:</div><div class="pqActions"><button class="pqApprove" onclick="publicQuoteDecisionV2('aprovado')">✓ Aprovo o orçamento e quero que avancem com a reparação</button><button class="pqReject" onclick="publicQuoteDecisionV2('recusado')">✕ Não aprovo e quero ser contactado</button></div>`:`<div class="pqAnswer">${d.estado==='aprovado'?'Resposta registada. A oficina recebeu a sua aprovação para avançar com a reparação.':'Resposta registada. A oficina recebeu o seu pedido de contacto.'}</div>`}</div>`;
    setTimeout(()=>guarding=false,0);
  }

  window.publicQuoteDecisionV2=async function(decision){
    const approved=decision==='aprovado';
    if(!confirm(approved?'Confirma que aprova este orçamento e quer que a oficina avance com a reparação?':'Confirma que não aprova este orçamento e quer ser contactado pela oficina?'))return;
    document.querySelectorAll('#publicQuoteView .pqActions button').forEach(b=>b.disabled=true);
    try{
      const res=await request(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,decision})});
      const data=await res.json().catch(()=>null);
      if(!res.ok||!data?.ok)throw new Error(data?.error==='already_answered'?'Este orçamento já tem uma resposta registada.':'Não foi possível registar a resposta.');
      await load();
    }catch(err){alert(err?.message||'Não foi possível registar a resposta.');document.querySelectorAll('#publicQuoteView .pqActions button').forEach(b=>b.disabled=false)}
  };

  const observer=new MutationObserver(()=>{
    if(guarding||!lastQuote)return;
    const root=document.getElementById('publicQuoteView');
    if(root&&root.classList.contains('active')&&!root.querySelector('.pqTotal')) render(lastQuote);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(load,0);
})();