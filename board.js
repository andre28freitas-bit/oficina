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
    body.boardMode .shell{max-width:none;padding-left:12px;padding-right:12px}
    #workshopBoardView{max-width:none}
    .workshopBoardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
    .workshopBoardTop h2{margin:0}.workshopBoardTop p{margin:5px 0 0;color:#667085}
    .workshopBoardTools{display:grid;grid-template-columns:minmax(220px,420px) auto;gap:10px;align-items:center;margin:12px 0}
    .workshopBoardTools .btn{min-height:54px;width:auto;white-space:nowrap}
    .workshopBoardStats{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin:8px 0 12px}
    .workshopBoardStat{min-width:118px;background:#fff;border:1px solid #e4e7ec;border-radius:13px;padding:10px 12px}
    .workshopBoardStat b{display:block;font-size:22px}.workshopBoardStat small{color:#667085}
    .workshopKanban{display:flex;gap:12px;overflow-x:auto;align-items:flex-start;padding:2px 2px 18px;scroll-snap-type:x proximity;min-height:55vh}
    .workshopColumn{flex:0 0 285px;background:#eef2f6;border:1px solid #e4e7ec;border-radius:17px;padding:10px;scroll-snap-align:start}
    .workshopColumnHead{position:sticky;top:72px;z-index:2;background:#eef2f6;display:flex;justify-content:space-between;gap:8px;align-items:center;padding:2px 2px 8px;font-weight:900}
    .workshopColumnCount{min-width:28px;height:28px;border-radius:999px;background:#fff;display:grid;place-items:center;font-size:13px}
    .workshopDropzone{min-height:110px;border-radius:12px;padding:1px}
    .workshopCard{background:#fff;border:1px solid #d0d5dd;border-radius:14px;padding:11px;margin:8px 0;box-shadow:0 2px 6px rgba(16,24,40,.05);cursor:pointer;touch-action:manipulation}
    .workshopCard:hover{border-color:#84adff}.workshopCardTop{display:flex;align-items:center;justify-content:space-between;gap:8px}.workshopPlate{font-size:19px;font-weight:900}.dragGrip{border:0;background:#f2f4f7;color:#475467;border-radius:9px;padding:7px 9px;font-weight:900;cursor:grab;touch-action:none;user-select:none}.dragGrip:active{cursor:grabbing}
    .workshopCard small{display:block;color:#667085;margin-top:4px;line-height:1.35}.workshopCard select{min-height:42px;font-size:14px;padding:6px 8px;margin-top:9px}
    .workshopEmpty{border:2px dashed #d0d5dd;border-radius:12px;color:#98a2b3;text-align:center;padding:24px 8px;margin:8px 0;font-size:14px}
    .workshopGhost{opacity:.35}.workshopChosen{box-shadow:0 8px 20px rgba(16,24,40,.16);transform:rotate(1deg)}.workshopDrag{opacity:.95}
    .boardSaving{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:50;background:#101828;color:#fff;border-radius:999px;padding:10px 16px;font-weight:800;box-shadow:0 5px 18px rgba(16,24,40,.25)}
    @media(max-width:700px){.workshopBoardTools{grid-template-columns:1fr}.workshopBoardTools .btn{width:100%}.workshopColumn{flex-basis:82vw;max-width:330px}.workshopColumnHead{top:67px}.nav button{font-size:11px}.nav span{font-size:19px}}
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
        <div><h2>Quadro da oficina</h2><p>Arraste cada viatura para a fase seguinte. Pode continuar a alterar o estado pelo menu do cartão.</p></div>
      </div>
      <div class="workshopBoardTools">
        <input id="workshopBoardSearch" placeholder="Pesquisar matrícula, cliente, serviço ou técnico">
        <button class="btn secondary" type="button" onclick="loadWorkshopBoard()">↻ Atualizar quadro</button>
      </div>
      <div id="workshopBoardStats" class="workshopBoardStats"></div>
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
      return `<section class="workshopColumn">
        <div class="workshopColumnHead"><span>${BOARD_STATUS[st][1]} ${BOARD_STATUS[st][0]}</span><span class="workshopColumnCount">${rows.length}</span></div>
        <div class="workshopDropzone" data-status="${st}">
          ${rows.length ? rows.map(o => {
            const v=o.oficina_viaturas||{}, c=v.oficina_clientes||{};
            return `<article class="workshopCard" data-id="${o.id}" data-vehicle-id="${o.viatura_id}" onclick="openVehicleDetailEnhanced('${o.viatura_id}')">
              <div class="workshopCardTop"><div class="workshopPlate">${esc(v.matricula||'—')}</div><button class="dragGrip" type="button" aria-label="Arrastar viatura" title="Arrastar" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()">⋮⋮</button></div>
              <small>${esc((v.marca||'')+' '+(v.modelo||''))}${v.cor?' · '+esc(v.cor):''}</small>
              <small>${esc(c.nome||'Sem cliente')} · ${esc(o.tipo_servico||'Sem serviço')}</small>
              ${o.tecnico?`<small>👨‍🔧 ${esc(o.tecnico)}</small>`:''}
              <select onclick="event.stopPropagation()" onchange="changeWorkshopBoardStatus('${o.id}',this.value,'${o.viatura_id}')">${statusOptionsBoard(o.estado)}</select>
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
    if(typeof Sortable === 'undefined') return;
    document.querySelectorAll('#workshopKanban .workshopDropzone').forEach(zone => {
      const sortable = new Sortable(zone, {
        group:'workshop-board',
        animation:180,
        draggable:'.workshopCard',
        handle:'.dragGrip',
        forceFallback:true,
        fallbackOnBody:true,
        delay:120,
        delayOnTouchOnly:true,
        touchStartThreshold:3,
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