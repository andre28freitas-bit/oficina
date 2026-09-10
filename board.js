(() => {
  const BOARD_STATUS = {
    entrada: ['Entrada', '📥'],
    diagnostico: ['Diagnóstico', '🔎'],
    aguarda_aprovacao: ['A aguardar aprovação', '⏳'],
    aguarda_pecas: ['A aguardar peças', '📦'],
    reparacao: ['Em reparação', '🔧'],
    pronto: ['Pronto', '✅']
  };
  const BOARD_ACTIVE = Object.keys(BOARD_STATUS);
  let boardRows = [];
  let boardSearch = '';
  let boardSortables = [];

  const style = document.createElement('style');
  style.textContent = `
    .nav{grid-template-columns:repeat(5,1fr)!important}
    body.boardMode .shell{max-width:none;padding-left:14px;padding-right:14px}
    #workshopBoardView{max-width:none}
    .workshopBoardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
    .workshopBoardTop h2{margin:0}.workshopBoardTop p{margin:6px 0 0;color:#667085;line-height:1.45}
    .workshopBoardTools{display:grid;grid-template-columns:minmax(220px,420px) auto;gap:10px;align-items:center;margin:14px 0}
    .workshopBoardTools .btn{min-height:54px;width:auto;white-space:nowrap}
    .workshopBoardStats{display:grid;grid-template-columns:repeat(6,minmax(105px,1fr));gap:9px;margin:10px 0 18px}
    .workshopBoardStat{min-width:0;background:#fff;border:1px solid #d0d5dd;border-radius:14px;padding:11px 12px;box-shadow:0 1px 3px rgba(16,24,40,.04)}
    .workshopBoardStat b{display:block;font-size:23px;line-height:1}.workshopBoardStat small{display:block;color:#667085;margin-top:6px;font-size:12px;line-height:1.2}
    .workshopKanban{display:flex;gap:16px;overflow-x:auto;align-items:flex-start;padding:3px 3px 22px;scroll-snap-type:x proximity;min-height:55vh}
    .workshopColumn{flex:0 0 294px;background:#f8fafc;border:1px solid #cfd6df;border-top:4px solid #667085;border-radius:18px;padding:12px;scroll-snap-align:start;box-shadow:0 2px 8px rgba(16,24,40,.05)}
    .workshopColumn.status-diagnostico{border-top-color:#2563eb}.workshopColumn.status-aguarda_aprovacao{border-top-color:#d97706}.workshopColumn.status-aguarda_pecas{border-top-color:#7c3aed}.workshopColumn.status-reparacao{border-top-color:#0f766e}.workshopColumn.status-pronto{border-top-color:#15803d}
    .workshopColumnHead{position:sticky;top:72px;z-index:2;background:#fff;border:1px solid #e4e7ec;border-radius:12px;display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 11px;font-weight:900;margin-bottom:10px;box-shadow:0 1px 3px rgba(16,24,40,.04)}
    .workshopColumnCount{min-width:29px;height:29px;border-radius:999px;background:#f2f4f7;display:grid;place-items:center;font-size:13px}
    .workshopDropzone{min-height:118px;border-radius:12px;padding:1px}
    .workshopCard{background:#fff;border:1px solid #cfd6df;border-radius:15px;padding:13px;margin:11px 0;box-shadow:0 3px 10px rgba(16,24,40,.07);cursor:pointer;touch-action:manipulation}
    .workshopCard:hover{border-color:#84adff}.workshopCardTop{display:flex;align-items:center;justify-content:space-between;gap:10px}.workshopPlate{font-size:20px;font-weight:900;letter-spacing:.2px}
    .dragGrip{display:inline-flex;align-items:center;gap:5px;border:1px solid #cbd5e1;background:#f8fafc;color:#344054;border-radius:10px;padding:8px 10px;font-weight:900;cursor:grab;touch-action:none;user-select:none;font-size:12px}.dragGrip:active{cursor:grabbing}.dragGripIcon{font-size:16px;line-height:1}
    .workshopCard small{display:block;color:#667085;margin-top:7px;line-height:1.42}.workshopCard select{min-height:44px;font-size:14px;padding:7px 9px;margin-top:11px}
    .workshopEmpty{border:2px dashed #cbd5e1;border-radius:12px;color:#98a2b3;text-align:center;padding:26px 8px;margin:10px 0;font-size:14px;background:rgba(255,255,255,.55)}
    .workshopGhost{opacity:.28}.workshopChosen{box-shadow:0 10px 26px rgba(16,24,40,.22);transform:scale(1.01)}.workshopDrag{opacity:.95}
    .boardSaving{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:50;background:#101828;color:#fff;border-radius:999px;padding:10px 16px;font-weight:800;box-shadow:0 5px 18px rgba(16,24,40,.25)}
    .mobileDragHint{display:none}
    @media(max-width:900px){.workshopBoardStats{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:700px){
      body.boardMode .shell{padding-left:10px;padding-right:10px}
      .workshopBoardTop{margin-bottom:8px}.workshopBoardTop p{font-size:14px}
      .workshopBoardTools{grid-template-columns:1fr;gap:8px;margin:10px 0 12px}.workshopBoardTools .btn{width:100%;min-height:48px}
      .workshopBoardStats{grid-template-columns:repeat(2,1fr);gap:8px;margin:8px 0 16px}.workshopBoardStat{padding:10px}.workshopBoardStat b{font-size:21px}.workshopBoardStat small{font-size:11px}
      .mobileDragHint{display:block;background:#eef4ff;color:#1849a9;border:1px solid #b2ccff;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:700;margin:0 0 14px}
      .workshopKanban{display:grid;grid-template-columns:1fr;gap:16px;overflow:visible;min-height:0;padding:0 0 18px;scroll-snap-type:none}
      .workshopColumn{width:100%;max-width:none;min-width:0;flex:auto;padding:11px;border-radius:16px}
      .workshopColumnHead{position:static;margin-bottom:11px;padding:10px 12px}
      .workshopDropzone{min-height:82px}
      .workshopCard{margin:12px 0;padding:13px;border-width:1.5px;box-shadow:0 3px 12px rgba(16,24,40,.08)}
      .workshopCard small{margin-top:8px}.dragGrip{padding:9px 11px}.nav button{font-size:11px}.nav span{font-size:19px}
    }
  `;
  document.head.appendChild(style);

  function statusOptionsBoard(current){
    const all = {...BOARD_STATUS, entregue:['Entregue','🚙']};
    return Object.entries(all).map(([key,val]) => `<option value="${key}" ${key===current?'selected':''}>${val[1]} ${val[0]}</option>`).join('');
  }

  function ensureBoardView(){
    const main = document.querySelector('main.shell');
    if(!main || $('workshopBoardView')) return;
    const section = document.createElement('section');
    section.id = 'workshopBoardView';
    section.className = 'view';
    section.innerHTML = `
      <div class="workshopBoardTop">
        <div><h2>Quadro da oficina</h2><p>Veja rapidamente onde está cada viatura e mova-a entre fases sem abrir a ficha.</p></div>
      </div>
      <div class="workshopBoardTools">
        <input id="workshopBoardSearch" placeholder="Pesquisar matrícula, cliente, serviço ou técnico">
        <button class="btn secondary" type="button" onclick="loadWorkshopBoard()">↻ Atualizar quadro</button>
      </div>
      <div id="workshopBoardStats" class="workshopBoardStats"></div>
      <div class="mobileDragHint">↕ Para mudar uma viatura de fase, mantenha premido o botão <strong>Arrastar</strong> e mova o cartão para a secção pretendida.</div>
      <div id="workshopKanban" class="workshopKanban"></div>`;
    main.appendChild(section);
    $('workshopBoardSearch').addEventListener('input', e => {
      boardSearch = String(e.target.value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      renderWorkshopBoard();
    });
  }

  function ensureBoardNav(){
    const nav = $('bottomNav');
    if(!nav || $('boardNavBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'boardNavBtn';
    btn.type = 'button';
    btn.innerHTML = '<span>▦</span>Quadro';
    btn.onclick = () => openWorkshopBoard();
    nav.appendChild(btn);
  }

  const originalShowView = window.showView;
  window.showView = function(id){
    document.body.classList.toggle('boardMode', id === 'workshopBoardView');
    return originalShowView(id);
  };

  window.openWorkshopBoard = async function(){
    ensureBoardView();
    ensureBoardNav();
    showView('workshopBoardView');
    await loadWorkshopBoard();
  };

  window.loadWorkshopBoard = async function(){
    ensureBoardView();
    const kanban = $('workshopKanban');
    if(kanban) kanban.innerHTML = '<div class="emptySmall">A carregar quadro…</div>';
    const {data,error} = await sb.from('oficina_intervencoes')
      .select('id,viatura_id,data,tipo_servico,estado,tecnico,aprovacao_estado,oficina_viaturas(matricula,marca,modelo,cor,oficina_clientes(nome,telefone))')
      .in('estado', BOARD_ACTIVE)
      .order('criado_em',{ascending:false});
    if(error){
      if(kanban) kanban.innerHTML = `<div class="error">${esc(error.message)}</div>`;
      return;
    }
    boardRows = data || [];
    renderWorkshopBoard();
  };

  function rowMatches(o){
    if(!boardSearch) return true;
    const v=o.oficina_viaturas||{}, c=v.oficina_clientes||{};
    const hay = `${v.matricula||''} ${v.marca||''} ${v.modelo||''} ${v.cor||''} ${c.nome||''} ${c.telefone||''} ${o.tipo_servico||''} ${o.tecnico||''}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return hay.includes(boardSearch);
  }

  function renderWorkshopBoard(){
    ensureBoardView();
    const visible = boardRows.filter(rowMatches);
    $('workshopBoardStats').innerHTML = BOARD_ACTIVE.map(st => {
      const count = visible.filter(x=>x.estado===st).length;
      return `<div class="workshopBoardStat"><b>${count}</b><small>${BOARD_STATUS[st][0]}</small></div>`;
    }).join('');

    $('workshopKanban').innerHTML = BOARD_ACTIVE.map(st => {
      const rows = visible.filter(x=>x.estado===st);
      return `<section class="workshopColumn status-${st}">
        <div class="workshopColumnHead"><span>${BOARD_STATUS[st][1]} ${BOARD_STATUS[st][0]}</span><span class="workshopColumnCount">${rows.length}</span></div>
        <div class="workshopDropzone" data-status="${st}">
          ${rows.length ? rows.map(o => {
            const v=o.oficina_viaturas||{}, c=v.oficina_clientes||{};
            return `<article class="workshopCard" data-id="${o.id}" data-vehicle-id="${o.viatura_id}" onclick="openVehicleDetailEnhanced('${o.viatura_id}')">
              <div class="workshopCardTop"><div class="workshopPlate">${esc(v.matricula||'—')}</div><button class="dragGrip" type="button" aria-label="Arrastar viatura" title="Arrastar para outra fase" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()"><span class="dragGripIcon">⋮⋮</span><span>Arrastar</span></button></div>
              <small><strong>${esc((v.marca||'')+' '+(v.modelo||''))}</strong>${v.cor?' · '+esc(v.cor):''}</small>
              <small>${esc(c.nome||'Sem cliente')}</small>
              <small>${esc(o.tipo_servico||'Sem serviço')}${o.tecnico?` · 👨‍🔧 ${esc(o.tecnico)}`:''}</small>
              <select aria-label="Alterar estado" onclick="event.stopPropagation()" onchange="changeWorkshopBoardStatus('${o.id}',this.value,'${o.viatura_id}')">${statusOptionsBoard(o.estado)}</select>
            </article>`;
          }).join('') : '<div class="workshopEmpty">Arraste uma viatura para aqui</div>'}
        </div>
      </section>`;
    }).join('');
    initBoardDragDrop();
  }

  function initBoardDragDrop(){
    boardSortables.forEach(s=>s.destroy());
    boardSortables=[];
    if(typeof Sortable === 'undefined'){
      console.warn('Drag and drop indisponível: SortableJS não carregou.');
      return;
    }
    document.querySelectorAll('#workshopKanban .workshopDropzone').forEach(zone => {
      const sortable = new Sortable(zone, {
        group:'workshop-board',
        animation:200,
        draggable:'.workshopCard',
        handle:'.dragGrip',
        forceFallback:true,
        fallbackOnBody:true,
        fallbackTolerance:4,
        delay:100,
        delayOnTouchOnly:true,
        touchStartThreshold:4,
        ghostClass:'workshopGhost',
        chosenClass:'workshopChosen',
        dragClass:'workshopDrag',
        onEnd: async evt => {
          const id = evt.item?.dataset.id;
          const vehicleId = evt.item?.dataset.vehicleId;
          const newStatus = evt.to?.dataset.status;
          const oldStatus = evt.from?.dataset.status;
          if(!id || !newStatus || newStatus===oldStatus) return;
          await persistBoardStatus(id,newStatus,vehicleId);
        }
      });
      boardSortables.push(sortable);
    });
  }

  async function persistBoardStatus(id,status,vehicleId){
    showBoardSaving('A atualizar estado…');
    try{
      if(typeof window.updateWorkStatus === 'function') await window.updateWorkStatus(id,status,vehicleId);
      else {
        const {error}=await sb.from('oficina_intervencoes').update({estado:status,atualizado_em:new Date().toISOString()}).eq('id',id);
        if(error) throw error;
      }
      await loadWorkshopBoard();
    }catch(err){
      alert('Não foi possível alterar o estado: '+(err?.message||err));
      await loadWorkshopBoard();
    }finally{hideBoardSaving()}
  }

  window.changeWorkshopBoardStatus = async function(id,status,vehicleId){
    await persistBoardStatus(id,status,vehicleId);
  };

  function showBoardSaving(text){
    let el=$('boardSaving');
    if(!el){el=document.createElement('div');el.id='boardSaving';el.className='boardSaving';document.body.appendChild(el)}
    el.textContent=text;el.classList.remove('hidden');
  }
  function hideBoardSaving(){const el=$('boardSaving');if(el)el.classList.add('hidden')}

  ensureBoardView();
  ensureBoardNav();
})();