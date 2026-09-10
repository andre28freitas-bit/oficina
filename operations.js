(() => {
  const STATUS = {
    entrada:['Entrada','📥'], diagnostico:['Diagnóstico','🔎'], aguarda_aprovacao:['A aguardar aprovação','⏳'],
    aguarda_pecas:['A aguardar peças','📦'], reparacao:['Em reparação','🔧'], pronto:['Pronto','✅'], entregue:['Entregue','🚙']
  };
  const ACTIVE = ['entrada','diagnostico','aguarda_aprovacao','aguarda_pecas','reparacao','pronto'];
  const INSPECTION_DEFAULTS=['Pneus','Travões','Luzes','Óleo / níveis','Bateria','Fugas','Danos exteriores'];
  let inspectionSeq=0;

  const style=document.createElement('style');
  style.textContent=`
    .opsStats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.opsStat{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:12px}.opsStat b{display:block;font-size:24px}.opsStat small{color:#667085}
    .quickSearchResults{display:grid;gap:8px;margin-top:8px}.quickResult{border:1px solid #e4e7ec;border-radius:12px;background:#fff;padding:10px 12px;text-align:left;width:100%}.quickResult b{display:block}.quickResult small{color:#667085}
    .boardWrap{display:flex;gap:12px;overflow-x:auto;padding:4px 0 10px;scroll-snap-type:x proximity}.boardCol{min-width:245px;width:245px;background:#eef2f6;border-radius:16px;padding:10px;scroll-snap-align:start}.boardColTitle{font-weight:900;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.boardCard{background:#fff;border:1px solid #e4e7ec;border-radius:13px;padding:11px;margin:8px 0;box-shadow:0 1px 4px rgba(16,24,40,.05);cursor:pointer}.boardCard .plateBig{font-size:19px;font-weight:900}.boardCard small{display:block;color:#667085;margin-top:3px}.boardCard select{min-height:40px;font-size:14px;padding:6px;margin-top:8px}.boardEmpty{color:#98a2b3;font-size:14px;padding:12px 4px}
    .opsSection{background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:16px;margin:12px 0}.opsSection h3{margin-bottom:10px}.inspectionRow{border:1px solid #e4e7ec;border-radius:14px;padding:11px;margin:9px 0}.inspectionTop{display:grid;grid-template-columns:1fr 145px;gap:8px}.inspectionPhotos{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.inspectionPhotos button{min-height:44px;border:1px solid #b2ccff;background:#f5f8ff;color:#1849a9;border-radius:10px;font-weight:800}.inspectionPreview img{width:90px;height:68px;object-fit:cover;border-radius:9px;margin-top:7px}.quoteRow{display:grid;grid-template-columns:1fr 75px 105px 42px;gap:7px;align-items:end;margin:8px 0}.quoteRow input{min-height:46px;font-size:15px;padding:8px}.quoteRow button{height:46px;border:0;border-radius:10px;background:#fee4e2;color:#912018;font-weight:900}.quoteTotal{text-align:right;font-size:20px;font-weight:900;margin-top:10px}.opsHint{font-size:14px;color:#667085;margin:-4px 0 10px}.statusPill{display:inline-block;border-radius:999px;padding:5px 9px;background:#eef4ff;color:#1849a9;font-weight:800;font-size:13px}.reminderCard,.quoteCard{border:1px solid #e4e7ec;border-radius:13px;padding:11px;margin:8px 0;background:#fff}.reminderCard strong,.quoteCard strong{display:block}.reminderCard small,.quoteCard small{display:block;color:#667085;margin-top:3px}.tinyActions{display:flex;gap:7px;margin-top:8px}.tinyActions button,.tinyActions a{flex:1;text-align:center;border:0;border-radius:9px;padding:9px 7px;font-weight:800;text-decoration:none;background:#eef4ff;color:#1849a9;font-size:13px}.publicQuote{max-width:620px;margin:24px auto}.publicQuote .total{font-size:30px;font-weight:900;text-align:right}.publicItem{display:grid;grid-template-columns:1fr auto;gap:10px;padding:12px 0;border-bottom:1px solid #eaecf0}.publicDecision{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.opsBadgeDanger{background:#fee4e2;color:#912018}.opsBadgeWarn{background:#fff3cd;color:#7a4d00}.opsBadgeOk{background:#dcfae6;color:#05603a}
    @media(max-width:600px){.opsStats{grid-template-columns:1fr 1fr}.quoteRow{grid-template-columns:1fr 64px 88px 40px}.inspectionTop{grid-template-columns:1fr 120px}.publicDecision{grid-template-columns:1fr}}
  `;document.head.appendChild(style);

  function euro(n){return Number(n||0).toLocaleString('pt-PT',{style:'currency',currency:'EUR'})}
  function cleanPhone(p){return String(p||'').replace(/\D/g,'').replace(/^00/,'')}
  function qLink(token){return `${location.origin}${location.pathname}?quote=${token}`}
  function statusOptions(current){return Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${k===current?'selected':''}>${v[1]} ${v[0]}</option>`).join('')}

  function ensureOpsHome(){
    const home=$('homeView'); if(!home||$('opsHome'))return;
    const block=document.createElement('div');block.id='opsHome';
    block.innerHTML=`<div class="card"><h3>Pesquisa rápida</h3><input id="opsQuickSearch" placeholder="Matrícula, cliente, telefone, email ou NIF"><div id="opsQuickResults" class="quickSearchResults"></div></div>
      <div id="opsStats" class="opsStats"></div>
      <div class="card"><div class="sectionHead"><h3>Quadro da oficina</h3><button class="btn secondary compact" onclick="loadOpsDashboard()">↻</button></div><div class="opsHint">Veja em que fase está cada viatura e altere o estado diretamente.</div><div id="opsBoard" class="boardWrap"></div></div>
      <div class="card"><h3>Lembretes de manutenção</h3><div id="opsReminders"></div></div>`;
    const summary=home.querySelector('.card:last-child'); summary?.insertAdjacentElement('beforebegin',block);
    $('opsQuickSearch').addEventListener('input',renderQuickSearch);
  }

  async function renderQuickSearch(){
    const q=String($('opsQuickSearch')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),box=$('opsQuickResults');
    if(!q||!box){if(box)box.innerHTML='';return}
    await Promise.all([loadClients(false),loadVehicles(false)]);
    const cs=clients.filter(c=>`${c.nome} ${c.telefone||''} ${c.email||''} ${c.nif||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)).slice(0,4);
    const vs=vehicles.filter(v=>`${v.matricula} ${v.marca||''} ${v.modelo||''} ${v.cor||''} ${v.oficina_clientes?.nome||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)).slice(0,5);
    box.innerHTML=[...cs.map(c=>`<button class="quickResult" onclick="openClientDetailEnhanced('${c.id}')"><b>👤 ${esc(c.nome)}</b><small>${esc([c.telefone,c.email,c.nif?`NIF ${c.nif}`:null].filter(Boolean).join(' · '))}</small></button>`),...vs.map(v=>`<button class="quickResult" onclick="openVehicleDetailEnhanced('${v.id}')"><b>🚗 ${esc(v.matricula)} · ${esc(v.marca||'')} ${esc(v.modelo||'')}</b><small>${esc(v.oficina_clientes?.nome||'Sem cliente')}</small></button>`)].join('')||'<div class="emptySmall">Sem resultados.</div>';
  }

  window.loadOpsDashboard=async function(){
    ensureOpsHome();
    const {data:orders,error}=await sb.from('oficina_intervencoes').select('id,viatura_id,data,quilometragem,tipo_servico,estado,tecnico,aprovacao_estado,oficina_viaturas(matricula,marca,modelo,cliente_id,oficina_clientes(nome,telefone,email))').in('estado',ACTIVE).order('criado_em',{ascending:false});
    if(error){$('opsBoard').innerHTML=`<div class="error">${esc(error.message)}</div>`;return}
    const rows=orders||[];
    const ready=rows.filter(x=>x.estado==='pronto').length,wait=rows.filter(x=>x.estado==='aguarda_aprovacao').length;
    const {data:rems}=await sb.from('oficina_lembretes').select('*,oficina_viaturas(matricula,marca,modelo,quilometragem_atual,oficina_clientes(nome,telefone,email))').eq('estado','ativo').order('data_prevista',{ascending:true});
    const reminders=rems||[],today=new Date(),soon=new Date(Date.now()+14*86400000);
    const due=reminders.filter(r=>(r.data_prevista&&new Date(r.data_prevista+'T23:59:59')<=soon)||(r.km_previstos&&Number(r.oficina_viaturas?.quilometragem_atual||0)>=Number(r.km_previstos)-1000));
    $('opsStats').innerHTML=`<div class="opsStat"><b>${rows.length}</b><small>Viaturas abertas</small></div><div class="opsStat"><b>${wait}</b><small>Aprovações</small></div><div class="opsStat"><b>${ready}</b><small>Prontas</small></div><div class="opsStat"><b>${due.length}</b><small>Lembretes próximos</small></div>`;
    $('opsBoard').innerHTML=ACTIVE.map(st=>{const arr=rows.filter(x=>x.estado===st);return `<div class="boardCol"><div class="boardColTitle"><span>${STATUS[st][1]} ${STATUS[st][0]}</span><span>${arr.length}</span></div>${arr.length?arr.map(o=>`<div class="boardCard" onclick="openVehicleDetailEnhanced('${o.viatura_id}')"><div class="plateBig">${esc(o.oficina_viaturas?.matricula||'—')}</div><small>${esc((o.oficina_viaturas?.marca||'')+' '+(o.oficina_viaturas?.modelo||''))}</small><small>${esc(o.oficina_viaturas?.oficina_clientes?.nome||'Sem cliente')} · ${esc(o.tipo_servico)}</small>${o.tecnico?`<small>👨‍🔧 ${esc(o.tecnico)}</small>`:''}<select onclick="event.stopPropagation()" onchange="updateWorkStatus('${o.id}',this.value,'${o.viatura_id}')">${statusOptions(o.estado)}</select></div>`).join(''):'<div class="boardEmpty">Sem viaturas.</div>'}</div>`}).join('');
    $('opsReminders').innerHTML=due.length?due.slice(0,8).map(r=>{const overdue=r.data_prevista&&new Date(r.data_prevista+'T23:59:59')<today;return `<div class="reminderCard"><strong>${esc(r.oficina_viaturas?.matricula||'')} · ${esc(r.tipo)}</strong><small>${r.data_prevista?`Data: ${esc(r.data_prevista)}${overdue?' · em atraso':''}`:''}${r.km_previstos?`${r.data_prevista?' · ':''}${Number(r.km_previstos).toLocaleString('pt-PT')} km`:''}</small><small>${esc(r.oficina_viaturas?.oficina_clientes?.nome||'')}</small><div class="tinyActions"><button onclick="openVehicleDetailEnhanced('${r.viatura_id}')">Abrir viatura</button><button onclick="completeReminder('${r.id}')">Concluir</button></div></div>`}).join(''):'<div class="emptySmall">Sem lembretes próximos.</div>';
  };

  window.updateWorkStatus=async function(id,status,vehicleId){
    const payload={estado:status,atualizado_em:new Date().toISOString(),fechada_em:status==='entregue'?new Date().toISOString():null};
    const {error}=await sb.from('oficina_intervencoes').update(payload).eq('id',id); if(error)return alert(error.message);
    if(status==='pronto') await autoPrepareCommunication(id,vehicleId,'pronto');
    if(status==='aguarda_aprovacao') await autoPrepareCommunication(id,vehicleId,'aprovacao');
    await loadOpsDashboard();
  };

  async function autoPrepareCommunication(interventionId,vehicleId,type){
    const {data:v}=await sb.from('oficina_viaturas').select('id,matricula,cliente_id,oficina_clientes(nome,telefone,email)').eq('id',vehicleId).single(); if(!v?.cliente_id)return;
    const msg=type==='pronto'?`A sua viatura ${v.matricula} está pronta para levantamento. Obrigado.`:`Temos um orçamento/intervenção pendente de aprovação para a viatura ${v.matricula}. Entre em contacto connosco para confirmar.`;
    const {data:existing}=await sb.from('oficina_comunicacoes').select('id').eq('intervencao_id',interventionId).eq('mensagem',msg).limit(1);
    if(!existing?.length) await sb.from('oficina_comunicacoes').insert({cliente_id:v.cliente_id,viatura_id:vehicleId,intervencao_id:interventionId,canal:'manual',mensagem:msg,estado:'preparado'});
  }

  window.completeReminder=async id=>{await sb.from('oficina_lembretes').update({estado:'concluido',atualizado_em:new Date().toISOString()}).eq('id',id);loadOpsDashboard()};

  function ensureInterventionOps(){
    const view=$('interventionView');if(!view||$('opsOrderCard'))return;
    const cards=[...view.querySelectorAll(':scope > .card')],entryCard=cards[1],workCard=cards[2];
    const order=document.createElement('div');order.id='opsOrderCard';order.className='opsSection';order.innerHTML=`<h3>3. Ordem de reparação</h3><label>Estado</label><select id="opsState">${statusOptions('entrada')}</select><label>Problema reportado pelo cliente</label><textarea id="opsProblem" placeholder="Ex.: ruído ao travar, luz de motor, revisão..."></textarea><label>Diagnóstico</label><textarea id="opsDiagnosis" placeholder="O que foi encontrado"></textarea><label>Técnico / mecânico</label><input id="opsTechnician" placeholder="Nome do responsável">`;
    entryCard.insertAdjacentElement('afterend',order);
    const inspection=document.createElement('div');inspection.id='opsInspectionCard';inspection.className='opsSection';inspection.innerHTML=`<h3>4. Inspeção visual</h3><div class="opsHint">Registe o estado e, quando necessário, uma fotografia. As fotografias ficam ligadas a esta intervenção.</div><div id="opsInspectionRows"></div><div class="grid2"><select id="opsInspectionPreset">${INSPECTION_DEFAULTS.map(x=>`<option>${x}</option>`).join('')}<option value="Outro">Outro</option></select><button type="button" class="btn secondary" onclick="addInspectionRow()">＋ Verificação</button></div>`;
    order.insertAdjacentElement('afterend',inspection);
    const h=workCard.querySelector('h3');if(h)h.textContent='5. Trabalho realizado';
    const final=document.createElement('div');final.id='opsFinalCard';final.className='opsSection';final.innerHTML=`<h3>6. Orçamento e guardar</h3><div class="opsHint">Opcional. Se adicionar valores, será criado um orçamento com link para aprovação do cliente.</div><div id="opsQuoteRows"></div><button type="button" class="btn secondary" onclick="addQuoteRow()">＋ Linha de orçamento</button><div id="opsQuoteTotal" class="quoteTotal">Total: 0,00 €</div><label>Validade do orçamento</label><input id="opsQuoteValidity" type="date"><label>Notas do orçamento</label><textarea id="opsQuoteNotes" placeholder="Opcional"></textarea>`;
    workCard.insertAdjacentElement('afterend',final);
    const btn=$('saveInterventionBtn'),msg=$('intMsg'); if(btn)final.appendChild(btn); if(msg)final.appendChild(msg);
    INSPECTION_DEFAULTS.slice(0,5).forEach(x=>addInspectionRow(x));
  }

  window.addInspectionRow=function(label=null){
    ensureInterventionOps();const preset=$('opsInspectionPreset')?.value||'Outro',name=label||preset,id=++inspectionSeq,wrap=document.createElement('div');wrap.className='inspectionRow';wrap.dataset.i=id;
    wrap.innerHTML=`<div class="inspectionTop"><input class="inspItem" value="${esc(name==='Outro'?'':name)}" placeholder="Ponto a verificar"><select class="inspState"><option value="ok">✅ OK</option><option value="atencao">⚠️ Atenção</option><option value="urgente">🔴 Urgente</option></select></div><input class="inspNotes" placeholder="Nota opcional" style="margin-top:7px"><div class="inspectionPhotos"><button type="button" onclick="document.getElementById('inspCam${id}').click()">📷 Tirar fotografia</button><button type="button" onclick="document.getElementById('inspUp${id}').click()">🖼️ Carregar fotografia</button></div><input id="inspCam${id}" class="inspFile hidden" type="file" accept="image/*" capture="environment"><input id="inspUp${id}" class="inspFile hidden" type="file" accept="image/*"><div class="inspectionPreview"></div>`;
    $('opsInspectionRows').appendChild(wrap);wrap.querySelectorAll('.inspFile').forEach(inp=>inp.onchange=e=>{const f=e.target.files[0];if(f){wrap._file=f;wrap.querySelector('.inspectionPreview').innerHTML=`<img src="${URL.createObjectURL(f)}">`}e.target.value=''})
  };

  window.addQuoteRow=function(){
    ensureInterventionOps();const wrap=document.createElement('div');wrap.className='quoteRow';wrap.innerHTML=`<input class="quoteDesc" placeholder="Serviço ou peça"><input class="quoteQty" type="number" step="0.01" min="0" value="1"><input class="quotePrice" type="number" step="0.01" min="0" placeholder="€"><button type="button" onclick="this.parentElement.remove();calcQuoteTotal()">×</button>`;$('opsQuoteRows').appendChild(wrap);wrap.querySelectorAll('input').forEach(i=>i.addEventListener('input',calcQuoteTotal));calcQuoteTotal()
  };
  window.calcQuoteTotal=function(){const total=[...document.querySelectorAll('.quoteRow')].reduce((s,r)=>s+(Number(r.querySelector('.quoteQty').value)||0)*(Number(r.querySelector('.quotePrice').value)||0),0);if($('opsQuoteTotal'))$('opsQuoteTotal').textContent=`Total: ${euro(total)}`;return total};

  function collectOps(){
    const inspections=[...document.querySelectorAll('.inspectionRow')].map(r=>({item:r.querySelector('.inspItem').value.trim(),estado:r.querySelector('.inspState').value,notas:r.querySelector('.inspNotes').value.trim()||null,file:r._file||null})).filter(x=>x.item);
    const quote=[...document.querySelectorAll('.quoteRow')].map(r=>({descricao:r.querySelector('.quoteDesc').value.trim(),quantidade:Number(r.querySelector('.quoteQty').value)||1,preco_unitario:Number(r.querySelector('.quotePrice').value)||0})).filter(x=>x.descricao&&(x.preco_unitario>0));
    return {estado:$('opsState')?.value||'entrada',problema:$('opsProblem')?.value.trim()||null,diagnostico:$('opsDiagnosis')?.value.trim()||null,tecnico:$('opsTechnician')?.value.trim()||null,inspections,quote,validade:$('opsQuoteValidity')?.value||null,quoteNotes:$('opsQuoteNotes')?.value.trim()||null};
  }

  async function uploadInspectionPhoto(file,intId){const {data:{user}}=await sb.auth.getUser(),ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=`${user.id}/inspections/${intId}/${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from('oficina-fotos').upload(path,file,{contentType:file.type||'image/jpeg'});if(error)throw error;return path}

  const baseSave=window.saveIntervention;
  window.saveIntervention=async function(){
    ensureInterventionOps();
    if(!selectedVehicle||selectedVehicle.matricula!==$('intPlate').value.trim().toUpperCase())await findVehicleByPlate();
    if(!selectedVehicle)return;
    const ctx={vehicleId:selectedVehicle.id,km:Number($('intKm').value),tipo:$('serviceType').value.trim(),data:$('intDate').value,ops:collectOps()};
    await baseSave();
    if(!$('intMsg')?.querySelector('.ok'))return;
    try{
      const {data:intv,error:qerr}=await sb.from('oficina_intervencoes').select('*').eq('viatura_id',ctx.vehicleId).eq('quilometragem',ctx.km).eq('tipo_servico',ctx.tipo).order('criado_em',{ascending:false}).limit(1).single();if(qerr)throw qerr;
      const finalState=ctx.ops.quote.length?'aguarda_aprovacao':ctx.ops.estado;
      const upd=await sb.from('oficina_intervencoes').update({estado:finalState,problema_reportado:ctx.ops.problema,diagnostico:ctx.ops.diagnostico,tecnico:ctx.ops.tecnico,orcamento_total:ctx.ops.quote.length?calcRows(ctx.ops.quote):null,atualizado_em:new Date().toISOString()}).eq('id',intv.id);if(upd.error)throw upd.error;
      for(const i of ctx.ops.inspections){let path=null;if(i.file)path=await uploadInspectionPhoto(i.file,intv.id);const r=await sb.from('oficina_inspecoes').insert({intervencao_id:intv.id,item:i.item,estado:i.estado,notas:i.notas,foto_caminho_storage:path});if(r.error)throw r.error}
      let link='';
      if(ctx.ops.quote.length){const total=calcRows(ctx.ops.quote),{data:o,error:oe}=await sb.from('oficina_orcamentos').insert({intervencao_id:intv.id,viatura_id:ctx.vehicleId,validade:ctx.ops.validade,notas:ctx.ops.quoteNotes,total}).select().single();if(oe)throw oe;const ir=await sb.from('oficina_orcamento_itens').insert(ctx.ops.quote.map(x=>({...x,orcamento_id:o.id})));if(ir.error)throw ir.error;link=qLink(o.token);await autoPrepareCommunication(intv.id,ctx.vehicleId,'aprovacao')}
      resetOpsForm();await loadOpsDashboard();
      $('intMsg').innerHTML=`<div class="ok">✓ Intervenção guardada com sucesso.${link?`<br><br><strong>Orçamento criado.</strong><br><button class="btn secondary" style="margin-top:8px" onclick="copyText('${link}')">Copiar link de aprovação</button>`:''}</div>`;
    }catch(err){$('intMsg').innerHTML+=`<div class="error">A intervenção foi guardada, mas houve um erro nos dados adicionais: ${esc(err.message||err)}</div>`}
  };
  function calcRows(rows){return rows.reduce((s,x)=>s+Number(x.quantidade||0)*Number(x.preco_unitario||0),0)}
  function resetOpsForm(){if($('opsState'))$('opsState').value='entrada';['opsProblem','opsDiagnosis','opsTechnician','opsQuoteNotes'].forEach(id=>{if($(id))$(id).value=''});if($('opsQuoteValidity'))$('opsQuoteValidity').value='';if($('opsQuoteRows'))$('opsQuoteRows').innerHTML='';if($('opsInspectionRows')){$('opsInspectionRows').innerHTML='';INSPECTION_DEFAULTS.slice(0,5).forEach(x=>addInspectionRow(x))}calcQuoteTotal()}

  window.copyText=async function(text){try{await navigator.clipboard.writeText(text);alert('Link copiado.')}catch{prompt('Copie o link:',text)}};

  const baseVehicleDetail=window.openVehicleDetailEnhanced;
  window.openVehicleDetailEnhanced=async function(vehicleId,origin='vehicles'){
    await baseVehicleDetail(vehicleId,origin);await appendVehicleOps(vehicleId);
  };

  async function appendVehicleOps(vehicleId){
    const root=$('vehicleDetailContent');if(!root)return;
    const {data:v}=await sb.from('oficina_viaturas').select('*,oficina_clientes(id,nome,telefone,email)').eq('id',vehicleId).single();if(!v)return;
    const [{data:rems},{data:quotes},{data:comms}]=await Promise.all([
      sb.from('oficina_lembretes').select('*').eq('viatura_id',vehicleId).eq('estado','ativo').order('data_prevista',{ascending:true}),
      sb.from('oficina_orcamentos').select('*').eq('viatura_id',vehicleId).order('criado_em',{ascending:false}).limit(10),
      sb.from('oficina_comunicacoes').select('*').eq('viatura_id',vehicleId).order('criado_em',{ascending:false}).limit(5)
    ]);
    const panel=document.createElement('div');panel.id='vehicleOpsPanel';panel.innerHTML=`
      <div class="sectionTitleRow"><h3>Lembretes de manutenção</h3></div><div class="opsSection"><div id="vehicleReminderList">${(rems||[]).length?(rems||[]).map(r=>`<div class="reminderCard"><strong>${esc(r.tipo)}</strong><small>${r.data_prevista?`Data: ${esc(r.data_prevista)}`:''}${r.km_previstos?`${r.data_prevista?' · ':''}${Number(r.km_previstos).toLocaleString('pt-PT')} km`:''}</small><div class="tinyActions"><button onclick="completeReminder('${r.id}');openVehicleDetailEnhanced('${vehicleId}')">Concluir</button></div></div>`).join(''):'<div class="emptySmall">Sem lembretes ativos.</div>'}</div><label>Tipo</label><select id="remType"><option>Revisão</option><option>Óleo e filtro</option><option>Travões</option><option>Pneus</option><option>Inspeção periódica</option><option>Distribuição</option><option>Outro</option></select><div class="grid2"><div><label>Data</label><input id="remDate" type="date"></div><div><label>Km</label><input id="remKm" type="number"></div></div><label>Notas</label><input id="remNotes"><button class="btn secondary" style="margin-top:10px" onclick="saveReminder('${vehicleId}')">＋ Criar lembrete</button></div>
      <div class="sectionTitleRow"><h3>Orçamentos</h3></div><div class="opsSection">${(quotes||[]).length?(quotes||[]).map(o=>`<div class="quoteCard"><strong>${euro(o.total)} · <span class="statusPill">${esc(o.estado)}</span></strong><small>${esc(o.criado_em.slice(0,10))}${o.validade?' · válido até '+esc(o.validade):''}</small><div class="tinyActions"><button onclick="copyText('${qLink(o.token)}')">Copiar link</button></div></div>`).join(''):'<div class="emptySmall">Sem orçamentos.</div>'}</div>
      <div class="sectionTitleRow"><h3>Comunicação com o cliente</h3></div><div class="opsSection"><div class="opsHint">As mensagens são preparadas automaticamente conforme o estado. O envio automático por SMS/WhatsApp requer ligar um fornecedor externo.</div>${(comms||[]).length?(comms||[]).map(c=>`<div class="reminderCard"><strong>${esc(c.mensagem)}</strong><small>${esc(c.estado)} · ${esc(c.criado_em.slice(0,16).replace('T',' '))}</small><div class="tinyActions">${v.oficina_clientes?.telefone?`<button onclick="sendPreparedMessage('${c.id}','sms','${esc(v.oficina_clientes.telefone)}','${encodeURIComponent(c.mensagem)}')">SMS</button><button onclick="sendPreparedMessage('${c.id}','whatsapp','${esc(v.oficina_clientes.telefone)}','${encodeURIComponent(c.mensagem)}')">WhatsApp</button>`:''}${v.oficina_clientes?.email?`<button onclick="sendPreparedMessage('${c.id}','email','${esc(v.oficina_clientes.email)}','${encodeURIComponent(c.mensagem)}')">Email</button>`:''}</div></div>`).join(''):'<div class="emptySmall">Sem mensagens preparadas.</div>'}</div>`;
    root.appendChild(panel);
  }

  window.saveReminder=async function(vehicleId){const payload={viatura_id:vehicleId,tipo:$('remType').value,data_prevista:$('remDate').value||null,km_previstos:Number($('remKm').value)||null,notas:$('remNotes').value.trim()||null};if(!payload.data_prevista&&!payload.km_previstos)return alert('Indique uma data ou quilometragem.');const {error}=await sb.from('oficina_lembretes').insert(payload);if(error)return alert(error.message);await openVehicleDetailEnhanced(vehicleId);loadOpsDashboard()};

  window.sendPreparedMessage=async function(id,channel,target,msgEncoded){const msg=decodeURIComponent(msgEncoded);await sb.from('oficina_comunicacoes').update({canal:channel,estado:'enviado',enviado_em:new Date().toISOString()}).eq('id',id);if(channel==='sms')location.href=`sms:${cleanPhone(target)}?&body=${encodeURIComponent(msg)}`;else if(channel==='whatsapp')window.open(`https://wa.me/${cleanPhone(target)}?text=${encodeURIComponent(msg)}`,'_blank');else location.href=`mailto:${target}?subject=${encodeURIComponent('Atualização da oficina')}&body=${encodeURIComponent(msg)}`};

  function ensurePublicQuoteView(){if($('publicQuoteView'))return;const sec=document.createElement('section');sec.id='publicQuoteView';sec.className='view publicQuote';document.querySelector('main.shell').appendChild(sec)}
  async function renderPublicQuote(token){ensurePublicQuoteView();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('publicQuoteView').classList.add('active');$('bottomNav')?.classList.add('hidden');$('logoutBtn')?.classList.add('hidden');$('publicQuoteView').innerHTML='<div class="card">A carregar orçamento…</div>';const {data,error}=await sb.rpc('oficina_orcamento_publico',{p_token:token});if(error||!data){$('publicQuoteView').innerHTML='<div class="card"><h2>Orçamento indisponível</h2><p>O link não é válido ou já não está disponível.</p></div>';return}const d=data;$('publicQuoteView').innerHTML=`<div class="card"><h2>Orçamento da oficina</h2><p class="muted">${esc(d.viatura?.matricula||'')} · ${esc((d.viatura?.marca||'')+' '+(d.viatura?.modelo||''))}</p><span class="statusPill">${esc(d.estado)}</span><div style="margin-top:16px">${(d.itens||[]).map(i=>`<div class="publicItem"><div><strong>${esc(i.descricao)}</strong><small class="muted">${Number(i.quantidade).toLocaleString('pt-PT')} × ${euro(i.preco_unitario)}</small></div><strong>${euro(i.subtotal)}</strong></div>`).join('')}</div><div class="total">${euro(d.total)}</div>${d.notas?`<p>${esc(d.notas)}</p>`:''}${d.validade?`<p class="muted">Válido até ${esc(d.validade)}</p>`:''}${d.estado==='pendente'?`<div class="publicDecision"><button class="btn primary" onclick="respondPublicQuote('${token}','aprovado')">✓ Aprovar orçamento</button><button class="btn danger" onclick="respondPublicQuote('${token}','recusado')">Recusar</button></div>`:`<div class="ok">Resposta registada: <strong>${esc(d.estado)}</strong>.</div>`}</div>`}
  window.respondPublicQuote=async function(token,decision){if(!confirm(decision==='aprovado'?'Confirma a aprovação deste orçamento?':'Confirma que pretende recusar este orçamento?'))return;const {data,error}=await sb.rpc('oficina_responder_orcamento',{p_token:token,p_decisao:decision});if(error)return alert(error.message);if(!data?.ok)return alert(data?.message||'Não foi possível registar a resposta.');renderPublicQuote(token)};

  const originalShow=window.showView;
  window.showView=function(id){originalShow(id);if(id==='homeView')setTimeout(loadOpsDashboard,0);if(id==='interventionView')setTimeout(ensureInterventionOps,0)};
  const originalDash=window.loadDashboard;
  window.loadDashboard=async function(){await originalDash();await loadOpsDashboard()};

  ensureOpsHome();ensureInterventionOps();
  const token=new URLSearchParams(location.search).get('quote');if(token)renderPublicQuote(token);else sb.auth.getSession().then(({data:{session}})=>{if(session)loadOpsDashboard()});
})();