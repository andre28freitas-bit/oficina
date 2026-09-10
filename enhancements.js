(() => {
  const normClient = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const plateKeyClient = s => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g,'');

  const style = document.createElement('style');
  style.textContent = `
    #vehicleClient{display:none}
    .vehicleClientPicker{margin-top:4px}
    .vehicleClientResults{display:grid;gap:7px;margin-top:8px}
    .vehicleClientPick{width:100%;text-align:left;border:1px solid #d0d5dd;border-radius:12px;background:#fff;padding:11px 12px;cursor:pointer}
    .vehicleClientPick strong{display:block;font-size:16px}
    .vehicleClientPick small{display:block;color:#667085;margin-top:3px;line-height:1.35}
    .vehicleSelectedClient{border:2px solid #84adff;background:#f5f8ff;border-radius:13px;padding:11px 12px;margin-top:9px;display:flex;align-items:center;justify-content:space-between;gap:10px}
    .vehicleSelectedClient strong{display:block}
    .vehicleSelectedClient small{display:block;color:#667085;margin-top:3px;line-height:1.35}
    .vehicleSelectedClient button{border:0;background:#eef4ff;color:#1849a9;border-radius:9px;padding:8px 10px;font-weight:800;white-space:nowrap}
    .associateVehicleBox{margin-top:14px;padding:13px;border:1px solid #d0d5dd;border-radius:14px;background:#f9fafb}
    .associateVehicleBox>strong{display:block;margin-bottom:5px}
    .associateVehicleHint{font-size:14px;color:#667085;margin:0 0 9px;line-height:1.4}
    .associateVehicleActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    .associateVehicleActions .btn{min-height:50px;font-size:15px;padding:9px}
    .clientIdentity{font-size:14px;color:#667085;line-height:1.45;margin-top:4px}
    @media(max-width:480px){.associateVehicleActions{grid-template-columns:1fr}.vehicleSelectedClient{align-items:flex-start}}
  `;
  document.head.appendChild(style);

  function clientIdentityEnhanced(c){
    return [c.email,c.telefone,c.nif ? `NIF ${c.nif}` : null].filter(Boolean).join(' · ') || 'Sem contactos adicionais';
  }

  function ensureClientPicker(){
    const select = $('vehicleClient');
    if(!select || $('vehicleClientSearchEnhanced')) return;

    const label = select.previousElementSibling;
    if(label && label.tagName==='LABEL') label.innerHTML='Associar a cliente <span class="required">*</span>';

    const wrap = document.createElement('div');
    wrap.className = 'vehicleClientPicker';
    wrap.innerHTML = `
      <input id="vehicleClientSearchEnhanced" placeholder="Pesquisar por nome, email, telemóvel ou NIF" autocomplete="off">
      <div id="vehicleSelectedClientEnhanced"></div>
      <div id="vehicleClientResultsEnhanced" class="vehicleClientResults"></div>
    `;
    select.insertAdjacentElement('afterend', wrap);

    $('vehicleClientSearchEnhanced').addEventListener('input', renderVehicleClientResultsEnhanced);
  }

  function renderVehicleSelectedClientEnhanced(){
    ensureClientPicker();
    const select = $('vehicleClient');
    const box = $('vehicleSelectedClientEnhanced');
    if(!select || !box) return;

    const c = clients.find(x => x.id === select.value);
    if(!c){
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `<div class="vehicleSelectedClient">
      <div><strong>✓ ${esc(c.nome)}</strong><small>${esc(clientIdentityEnhanced(c))}</small></div>
      <button type="button" onclick="clearVehicleClientEnhanced()">Alterar</button>
    </div>`;
  }

  window.clearVehicleClientEnhanced = function(){
    ensureClientPicker();
    $('vehicleClient').value = '';
    $('vehicleClientSearchEnhanced').value = '';
    $('vehicleClientResultsEnhanced').innerHTML = '';
    renderVehicleSelectedClientEnhanced();
    $('vehicleClientSearchEnhanced').focus();
  };

  window.chooseVehicleClientEnhanced = function(id){
    ensureClientPicker();
    const c = clients.find(x => x.id === id);
    if(!c) return;
    $('vehicleClient').value = id;
    $('vehicleClientSearchEnhanced').value = c.nome;
    $('vehicleClientResultsEnhanced').innerHTML = '';
    renderVehicleSelectedClientEnhanced();
  };

  window.renderVehicleClientResultsEnhanced = function(){
    ensureClientPicker();
    const q = normClient($('vehicleClientSearchEnhanced').value);
    const box = $('vehicleClientResultsEnhanced');
    if(!q){
      box.innerHTML = '';
      return;
    }

    const found = clients
      .filter(c => normClient(`${c.nome} ${c.email||''} ${c.telefone||''} ${c.nif||''}`).includes(q))
      .slice(0,8);

    box.innerHTML = found.length
      ? found.map(c => `<button type="button" class="vehicleClientPick" onclick="chooseVehicleClientEnhanced('${c.id}')">
          <strong>${esc(c.nome)}</strong>
          <small>${esc(clientIdentityEnhanced(c))}</small>
        </button>`).join('')
      : '<div class="error">Nenhum cliente encontrado.</div>';
  };

  const originalOpenVehicleForm = window.openVehicleForm;
  window.openVehicleForm = async function(v=null,presetClientId=null,presetPlate=''){
    await originalOpenVehicleForm(v,presetClientId);
    ensureClientPicker();

    const selected = clients.find(c => c.id === $('vehicleClient').value);
    $('vehicleClientSearchEnhanced').value = selected?.nome || '';
    $('vehicleClientResultsEnhanced').innerHTML = '';
    renderVehicleSelectedClientEnhanced();

    if(!v && presetPlate) $('vehiclePlate').value = presetPlate.toUpperCase();
  };

  window.renderClients = function(){
    const q = normClient($('clientSearch').value);

    const arr = clients.filter(c => {
      const cv = vehicles.filter(v => v.cliente_id === c.id);
      const hay = [
        c.nome,c.telefone,c.email,c.nif,
        ...cv.flatMap(v => [v.matricula,v.marca,v.modelo,v.cor])
      ].join(' ');
      return normClient(hay).includes(q);
    });

    $('clientList').innerHTML = arr.length ? arr.map(c => {
      const cv = vehicles.filter(v => v.cliente_id === c.id);
      const plateInput = `associatePlate_${c.id}`;
      const msgId = `associateMsg_${c.id}`;

      return `<div class="clientCard">
        <div class="clientTop">
          <div>
            <strong style="font-size:20px">${esc(c.nome)}</strong>
            <div class="clientIdentity">${esc(clientIdentityEnhanced(c))}</div>
          </div>
          <button class="mini" onclick="editClient('${c.id}')">Editar</button>
        </div>

        <div class="clientVehicles">
          <strong>Viaturas (${cv.length})</strong>
          ${cv.length ? cv.map(v => `<div class="clientVehicle">
            ${v._fotoUrl ? `<img src="${esc(v._fotoUrl)}" alt="${esc(v.matricula)}">` : '<div class="carPlaceholder">🚗</div>'}
            <div class="meta">
              <div class="plate">${esc(v.matricula)}</div>
              <small class="muted">${esc(v.marca||'')} ${esc(v.modelo||'')}${v.cor ? ' · '+esc(v.cor) : ''}</small>
            </div>
            <button class="mini" onclick="openVehicleFromClient('${v.id}')">Abrir</button>
          </div>`).join('') : '<div class="muted" style="padding:12px 0">Sem viaturas associadas.</div>'}

          <div class="associateVehicleBox">
            <strong>Adicionar ou associar viatura</strong>
            <p class="associateVehicleHint">Introduza a matrícula. Pode associar uma viatura já registada ou criar uma nova já ligada a este cliente.</p>
            <input id="${plateInput}" class="uppercase" placeholder="00-AA-00" autocomplete="off">
            <div class="associateVehicleActions">
              <button class="btn secondary" onclick="associateVehicleByPlateEnhanced('${c.id}','${plateInput}','${msgId}')">Associar existente</button>
              <button class="btn primary" onclick="newVehicleForClientEnhanced('${c.id}','${plateInput}')">＋ Criar nova viatura</button>
            </div>
            <div id="${msgId}"></div>
          </div>
        </div>
      </div>`;
    }).join('') : '<div class="empty">Ainda não existem clientes.</div>';
  };

  window.associateVehicleByPlateEnhanced = async function(clientId,inputId,msgId){
    const box = $(msgId);
    box.innerHTML = '';
    const raw = $(inputId).value.trim();
    if(!raw){
      box.innerHTML = '<div class="error">Introduza a matrícula.</div>';
      return;
    }

    await loadVehicles(false);
    const vehicle = vehicles.find(v => plateKeyClient(v.matricula) === plateKeyClient(raw));

    if(!vehicle){
      box.innerHTML = '<div class="error">Esta matrícula ainda não está registada. Use “Criar nova viatura”.</div>';
      return;
    }

    if(vehicle.cliente_id === clientId){
      box.innerHTML = '<div class="ok">✓ Esta viatura já está associada a este cliente.</div>';
      return;
    }

    const target = clients.find(c => c.id === clientId);
    if(vehicle.cliente_id){
      const current = clients.find(c => c.id === vehicle.cliente_id);
      const ok = confirm(`A matrícula ${vehicle.matricula} está associada a ${current?.nome || 'outro cliente'}. Pretende transferi-la para ${target?.nome || 'este cliente'}?`);
      if(!ok) return;
    }

    const {error} = await sb.from('oficina_viaturas')
      .update({cliente_id:clientId,atualizado_em:new Date().toISOString()})
      .eq('id',vehicle.id);

    if(error){
      box.innerHTML = `<div class="error">${esc(error.message)}</div>`;
      return;
    }

    await loadVehicles(false);
    renderClients();
    await loadDashboard();
  };

  window.newVehicleForClientEnhanced = function(clientId,inputId){
    const plate = $(inputId)?.value.trim().toUpperCase() || '';
    showView('vehiclesView');
    setTimeout(() => window.openVehicleForm(null,clientId,plate),80);
  };

  if($('clientSearch')) $('clientSearch').placeholder='Pesquisar nome, email, telemóvel, NIF ou matrícula';
  ensureClientPicker();
})();