(() => {
  let techs = [];
  let selectedTechIds = new Set();

  const style = document.createElement('style');
  style.textContent = `
    .techPicker{margin-top:12px;padding:14px;border:1px solid #d0d5dd;border-radius:14px;background:#f8fafc}
    .techPickerHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
    .techPickerHead strong{font-size:15px}.techPickerHint{font-size:13px;color:#667085;margin-bottom:10px;line-height:1.4}
    .techChoices{display:flex;flex-wrap:wrap;gap:8px}
    .techChoice{position:relative}.techChoice input{position:absolute;opacity:0;pointer-events:none}
    .techChoice span{display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#344054;font-weight:800;cursor:pointer;user-select:none}
    .techChoice input:checked+span{background:#eaf2ff;border-color:#2e6bdc;color:#1849a9;box-shadow:0 0 0 1px #2e6bdc inset}
    .techEmpty{font-size:14px;color:#667085;padding:8px 0}
    .techManageBtn{border:0;background:#eef4ff;color:#1849a9;border-radius:9px;padding:8px 10px;font-weight:800;white-space:nowrap}
    .techCard{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:13px;margin:10px 0;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .techCardMain{min-width:0}.techCardMain strong{display:block;font-size:17px}.techCardMain small{display:block;color:#667085;margin-top:4px;line-height:1.4}
    .techCardActions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.techCardActions button{border:0;border-radius:9px;padding:8px 10px;font-weight:800;background:#eef4ff;color:#1849a9}
    .techInactive{opacity:.58}.techFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.techActiveRow{display:flex;align-items:center;gap:9px;margin:12px 0}.techActiveRow input{width:auto;min-height:auto}
    @media(max-width:650px){.techCard{align-items:flex-start;flex-direction:column}.techCardActions{width:100%}.techCardActions button{flex:1}.techFormGrid{grid-template-columns:1fr}.techPickerHead{align-items:flex-start}}
  `;
  document.head.appendChild(style);

  function ensureTechniciansHomeButton(){
    const home = document.getElementById('homeView');
    if(!home || document.getElementById('techniciansHomeBtn')) return;
    const grid = home.querySelector('.grid2');
    if(!grid) return;
    const btn = document.createElement('button');
    btn.id = 'techniciansHomeBtn';
    btn.className = 'tile';
    btn.innerHTML = '<span>👨‍🔧</span>Técnicos';
    btn.onclick = () => openTechniciansView();
    grid.appendChild(btn);
  }

  function ensureTechniciansView(){
    if(document.getElementById('techniciansView')) return;
    const main = document.querySelector('main.shell');
    if(!main) return;
    const sec = document.createElement('section');
    sec.id = 'techniciansView';
    sec.className = 'view';
    sec.innerHTML = `
      <button class="back" type="button" onclick="showView('homeView')">← Voltar</button>
      <div class="sectionHead"><h2>Técnicos da oficina</h2><button class="btn primary compact" type="button" onclick="openTechnicianForm()">＋ Novo</button></div>
      <p class="muted">Crie os técnicos uma vez e depois selecione um ou vários em cada intervenção.</p>
      <div id="technicianFormCard" class="card hidden">
        <h3 id="technicianFormTitle">Novo técnico</h3>
        <input id="technicianId" type="hidden">
        <label>Nome <span class="required">*</span></label><input id="technicianName" placeholder="Ex.: João Silva">
        <div class="techFormGrid"><div><label>Telemóvel</label><input id="technicianPhone" type="tel"></div><div><label>Email</label><input id="technicianEmail" type="email"></div></div>
        <label class="techActiveRow"><input id="technicianActive" type="checkbox" checked> Técnico ativo</label>
        <button class="btn primary" type="button" onclick="saveTechnician()">✓ Guardar técnico</button>
        <button class="btn secondary" type="button" onclick="closeTechnicianForm()">Cancelar</button>
        <div id="technicianMsg"></div>
      </div>
      <div id="technicianList"></div>`;
    main.appendChild(sec);
  }

  async function loadTechnicians(includeInactive=true){
    let q = sb.from('oficina_tecnicos').select('*').order('nome',{ascending:true});
    if(!includeInactive) q = q.eq('ativo',true);
    const {data,error} = await q;
    if(error){ console.warn('Erro a carregar técnicos',error); return []; }
    techs = data || [];
    return techs;
  }

  window.openTechniciansView = async function(){
    ensureTechniciansView();
    showView('techniciansView');
    await renderTechnicians();
  };

  window.openTechnicianForm = function(t=null){
    ensureTechniciansView();
    document.getElementById('technicianFormCard')?.classList.remove('hidden');
    document.getElementById('technicianFormTitle').textContent = t ? 'Editar técnico' : 'Novo técnico';
    document.getElementById('technicianId').value = t?.id || '';
    document.getElementById('technicianName').value = t?.nome || '';
    document.getElementById('technicianPhone').value = t?.telefone || '';
    document.getElementById('technicianEmail').value = t?.email || '';
    document.getElementById('technicianActive').checked = t ? !!t.ativo : true;
    document.getElementById('technicianMsg').innerHTML = '';
    document.getElementById('technicianName').focus();
  };

  window.closeTechnicianForm = function(){
    document.getElementById('technicianFormCard')?.classList.add('hidden');
  };

  window.editTechnician = async function(id){
    const t = techs.find(x=>x.id===id) || (await loadTechnicians(true)).find(x=>x.id===id);
    if(t) openTechnicianForm(t);
  };

  window.toggleTechnician = async function(id,active){
    const {error} = await sb.from('oficina_tecnicos').update({ativo:active,atualizado_em:new Date().toISOString()}).eq('id',id);
    if(error) return alert(error.message);
    await renderTechnicians();
    await refreshTechnicianPicker();
  };

  window.saveTechnician = async function(){
    const id = document.getElementById('technicianId').value;
    const payload = {
      nome: document.getElementById('technicianName').value.trim(),
      telefone: document.getElementById('technicianPhone').value.trim() || null,
      email: document.getElementById('technicianEmail').value.trim() || null,
      ativo: document.getElementById('technicianActive').checked,
      atualizado_em: new Date().toISOString()
    };
    if(!payload.nome){ document.getElementById('technicianMsg').innerHTML='<div class="error">Indique o nome do técnico.</div>'; return; }
    const result = id ? await sb.from('oficina_tecnicos').update(payload).eq('id',id) : await sb.from('oficina_tecnicos').insert(payload);
    if(result.error){ document.getElementById('technicianMsg').innerHTML=`<div class="error">${result.error.message}</div>`; return; }
    closeTechnicianForm();
    await renderTechnicians();
    await refreshTechnicianPicker();
  };

  async function renderTechnicians(){
    ensureTechniciansView();
    const list = document.getElementById('technicianList');
    if(!list) return;
    list.innerHTML = '<div class="card">A carregar técnicos…</div>';
    const rows = await loadTechnicians(true);
    list.innerHTML = rows.length ? rows.map(t=>`<div class="techCard ${t.ativo?'':'techInactive'}"><div class="techCardMain"><strong>👨‍🔧 ${esc(t.nome)}</strong><small>${esc([t.telefone,t.email].filter(Boolean).join(' · ') || (t.ativo?'Ativo':'Inativo'))}</small>${!t.ativo?'<small>Inativo — não aparece nas novas intervenções.</small>':''}</div><div class="techCardActions"><button type="button" onclick="editTechnician('${t.id}')">Editar</button><button type="button" onclick="toggleTechnician('${t.id}',${t.ativo?'false':'true'})">${t.ativo?'Desativar':'Reativar'}</button></div></div>`).join('') : '<div class="card"><div class="emptySmall">Ainda não existem técnicos. Crie o primeiro em “＋ Novo”.</div></div>';
  }

  function findOpsTechnicianInput(){ return document.getElementById('opsTechnician'); }

  function ensureTechnicianPicker(){
    const legacy = findOpsTechnicianInput();
    if(!legacy || document.getElementById('technicianPicker')) return;
    const label = [...document.querySelectorAll('#opsOrderCard label')].find(l=>l.getAttribute('for')==='opsTechnician' || (l.textContent||'').trim().startsWith('Técnico / mecânico'));
    if(label) label.style.display='none';
    legacy.type='hidden';
    legacy.style.display='none';
    const box = document.createElement('div');
    box.id='technicianPicker';
    box.className='techPicker';
    box.innerHTML=`<div class="techPickerHead"><strong>Técnicos responsáveis</strong><button class="techManageBtn" type="button" onclick="openTechniciansView()">Gerir técnicos</button></div><div class="techPickerHint">Pode selecionar mais do que um técnico. Isto permite que a mesma viatura passe por várias pessoas durante a reparação.</div><div id="technicianChoices" class="techChoices"><div class="techEmpty">A carregar técnicos…</div></div>`;
    legacy.insertAdjacentElement('afterend',box);
    refreshTechnicianPicker();
  }

  async function refreshTechnicianPicker(){
    ensureTechnicianPicker();
    const choices=document.getElementById('technicianChoices');
    if(!choices) return;
    const rows=await loadTechnicians(false);
    selectedTechIds = new Set([...selectedTechIds].filter(id=>rows.some(t=>t.id===id)));
    choices.innerHTML = rows.length ? rows.map(t=>`<label class="techChoice"><input type="checkbox" value="${t.id}" ${selectedTechIds.has(t.id)?'checked':''} onchange="toggleTechnicianSelection('${t.id}',this.checked)"><span>👨‍🔧 ${esc(t.nome)}</span></label>`).join('') : '<div class="techEmpty">Ainda não existem técnicos. Use “Gerir técnicos” para criar o primeiro.</div>';
    syncLegacyTechnicianField();
  }
  window.refreshTechnicianPicker = refreshTechnicianPicker;

  window.toggleTechnicianSelection = function(id,checked){
    if(checked) selectedTechIds.add(id); else selectedTechIds.delete(id);
    syncLegacyTechnicianField();
  };

  function syncLegacyTechnicianField(){
    const legacy=findOpsTechnicianInput(); if(!legacy)return;
    const names=[...selectedTechIds].map(id=>techs.find(t=>t.id===id)?.nome).filter(Boolean);
    legacy.value=names.join(' · ');
  }

  async function attachTechniciansToLatestIntervention(ctx){
    if(!ctx.vehicleId || !ctx.ids.length) return;
    const {data:intv,error} = await sb.from('oficina_intervencoes').select('id').eq('viatura_id',ctx.vehicleId).eq('quilometragem',ctx.km).eq('tipo_servico',ctx.service).order('criado_em',{ascending:false}).limit(1).single();
    if(error || !intv) throw error || new Error('Não foi possível localizar a intervenção guardada.');
    const {data:{user}} = await sb.auth.getUser();
    await sb.from('oficina_intervencao_tecnicos').delete().eq('intervencao_id',intv.id);
    const rows=ctx.ids.map(tecnico_id=>({user_id:user.id,intervencao_id:intv.id,tecnico_id}));
    const {error:insertError}=await sb.from('oficina_intervencao_tecnicos').insert(rows);
    if(insertError) throw insertError;
    const names=ctx.ids.map(id=>ctx.techMap.get(id)).filter(Boolean).join(' · ');
    await sb.from('oficina_intervencoes').update({tecnico:names||null,atualizado_em:new Date().toISOString()}).eq('id',intv.id);
  }

  function wrapSaveIntervention(){
    const previous=window.saveIntervention;
    if(typeof previous!=='function' || previous.__techWrapped) return;
    const wrapped=async function(){
      ensureTechnicianPicker();
      const vehicleId=(typeof selectedVehicle!=='undefined'&&selectedVehicle)?selectedVehicle.id:null;
      const ctx={
        vehicleId,
        km:Number(document.getElementById('intKm')?.value||0),
        service:document.getElementById('serviceType')?.value.trim()||'',
        ids:[...selectedTechIds],
        techMap:new Map(techs.map(t=>[t.id,t.nome]))
      };
      syncLegacyTechnicianField();
      await previous();
      if(!document.getElementById('intMsg')?.querySelector('.ok')) return;
      try{
        if(ctx.ids.length) await attachTechniciansToLatestIntervention(ctx);
        selectedTechIds.clear();
        syncLegacyTechnicianField();
        await refreshTechnicianPicker();
      }catch(err){
        const msg=document.getElementById('intMsg');
        if(msg) msg.innerHTML += `<div class="error">A intervenção foi guardada, mas não foi possível associar os técnicos: ${esc(err?.message||err)}</div>`;
      }
    };
    wrapped.__techWrapped=true;
    window.saveIntervention=wrapped;
  }

  const previousShow=window.showView;
  if(typeof previousShow==='function'){
    window.showView=function(id){
      previousShow(id);
      if(id==='interventionView') setTimeout(()=>{ensureTechnicianPicker();refreshTechnicianPicker();wrapSaveIntervention()},0);
    };
  }

  ensureTechniciansHomeButton();
  ensureTechniciansView();
  setTimeout(()=>{ensureTechnicianPicker();wrapSaveIntervention()},0);
})();