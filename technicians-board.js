(() => {
  const style=document.createElement('style');
  style.textContent=`
    .boardTechBtn{width:100%;min-height:40px;margin-top:8px;border:1px solid #b2ccff;border-radius:9px;background:#f5f8ff;color:#1849a9;font-weight:800;cursor:pointer}
    .techModalBackdrop{position:fixed;inset:0;background:rgba(15,23,42,.56);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
    .techModal{width:min(520px,100%);max-height:85vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 22px 60px rgba(15,23,42,.28)}
    .techModal h3{margin:0 0 6px}.techModal p{margin:0 0 15px;color:#667085;line-height:1.4}.techModalChoices{display:grid;gap:8px;margin:12px 0 18px}
    .techModalChoice{display:flex;align-items:center;gap:10px;border:1px solid #d0d5dd;border-radius:12px;padding:12px;cursor:pointer}.techModalChoice input{width:auto;min-height:auto}.techModalChoice strong{font-size:15px}
    .techModalActions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.techModalActions button{min-height:48px}
    @media(max-width:600px){.techModalActions{grid-template-columns:1fr}.techModal{padding:17px}}
  `;document.head.appendChild(style);

  function ensureModal(){
    let el=document.getElementById('boardTechModal');
    if(el)return el;
    el=document.createElement('div');el.id='boardTechModal';el.className='techModalBackdrop hidden';
    el.innerHTML=`<div class="techModal" onclick="event.stopPropagation()"><h3>Técnicos da intervenção</h3><p>Selecione todos os técnicos que estão ou estiveram envolvidos nesta reparação.</p><div id="boardTechChoices" class="techModalChoices"></div><div class="techModalActions"><button class="btn primary" id="boardTechSave" type="button">✓ Guardar técnicos</button><button class="btn secondary" type="button" onclick="closeBoardTechnicians()">Cancelar</button></div></div>`;
    el.onclick=()=>closeBoardTechnicians();document.body.appendChild(el);return el;
  }

  window.closeBoardTechnicians=function(){document.getElementById('boardTechModal')?.classList.add('hidden')};

  window.openBoardTechnicians=async function(interventionId){
    const modal=ensureModal(),choices=document.getElementById('boardTechChoices');
    modal.classList.remove('hidden');choices.innerHTML='<div class="techEmpty">A carregar técnicos…</div>';
    const [{data:techs,error:te},{data:assigned,error:ae}]=await Promise.all([
      sb.from('oficina_tecnicos').select('id,nome,ativo').order('nome',{ascending:true}),
      sb.from('oficina_intervencao_tecnicos').select('tecnico_id').eq('intervencao_id',interventionId)
    ]);
    if(te||ae){choices.innerHTML=`<div class="error">${(te||ae).message}</div>`;return}
    const selected=new Set((assigned||[]).map(x=>x.tecnico_id));
    const visible=(techs||[]).filter(t=>t.ativo||selected.has(t.id));
    choices.innerHTML=visible.length?visible.map(t=>`<label class="techModalChoice"><input type="checkbox" value="${t.id}" ${selected.has(t.id)?'checked':''}><strong>${t.ativo?'👨‍🔧':'⏸️'} ${esc(t.nome)}</strong></label>`).join(''):'<div class="techEmpty">Ainda não existem técnicos. Crie-os primeiro na secção “Técnicos”.</div>';
    document.getElementById('boardTechSave').onclick=()=>saveBoardTechnicians(interventionId,techs||[]);
  };

  window.saveBoardTechnicians=async function(interventionId,techs){
    const ids=[...document.querySelectorAll('#boardTechChoices input:checked')].map(x=>x.value),btn=document.getElementById('boardTechSave');
    btn.disabled=true;btn.textContent='A guardar…';
    try{
      const del=await sb.from('oficina_intervencao_tecnicos').delete().eq('intervencao_id',interventionId);if(del.error)throw del.error;
      if(ids.length){const ins=await sb.from('oficina_intervencao_tecnicos').insert(ids.map(tecnico_id=>({intervencao_id:interventionId,tecnico_id})));if(ins.error)throw ins.error}
      const names=ids.map(id=>techs.find(t=>t.id===id)?.nome).filter(Boolean).join(' · ');
      const upd=await sb.from('oficina_intervencoes').update({tecnico:names||null,atualizado_em:new Date().toISOString()}).eq('id',interventionId);if(upd.error)throw upd.error;
      closeBoardTechnicians();
      if(typeof loadWorkshopBoard==='function')await loadWorkshopBoard();
      if(typeof loadOpsDashboard==='function')loadOpsDashboard();
    }catch(err){alert('Não foi possível guardar os técnicos: '+(err?.message||err))}finally{btn.disabled=false;btn.textContent='✓ Guardar técnicos'}
  };

  function decorateBoard(){
    document.querySelectorAll('#workshopKanban .workshopCard').forEach(card=>{
      if(card.querySelector('.boardTechBtn'))return;
      const id=card.dataset.id;if(!id)return;
      const btn=document.createElement('button');btn.type='button';btn.className='boardTechBtn';btn.textContent='👨‍🔧 Técnicos';
      btn.onclick=e=>{e.stopPropagation();openBoardTechnicians(id)};
      card.appendChild(btn);
    });
  }

  const observer=new MutationObserver(decorateBoard);observer.observe(document.documentElement,{childList:true,subtree:true});
  ensureModal();setTimeout(decorateBoard,0);
})();