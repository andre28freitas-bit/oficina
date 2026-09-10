(() => {
  const PDF_ENDPOINT = 'https://tfqzzhpehrkkxmrpwkas.supabase.co/functions/v1/oficina-orcamento-pdf';

  const style = document.createElement('style');
  style.textContent = `
    .quoteSendBox{margin-top:10px;padding-top:10px;border-top:1px solid #eaecf0}
    .quoteSendLabel{font-size:13px;color:#667085;font-weight:700;margin-bottom:7px}
    .quoteSendActions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    .quoteSendActions button,.quoteSendActions a{min-height:42px;border:0;border-radius:9px;padding:9px 8px;font-weight:800;text-decoration:none;text-align:center;background:#eef4ff;color:#1849a9;font-size:13px;display:flex;align-items:center;justify-content:center}
    @media(max-width:600px){.quoteSendActions{grid-template-columns:1fr}.quoteSendActions button,.quoteSendActions a{min-height:48px;font-size:14px}}
  `;
  document.head.appendChild(style);

  function publicQuoteLink(token){
    return `${location.origin}${location.pathname}?quote=${token}`;
  }

  function pdfLink(token){
    return `${PDF_ENDPOINT}?token=${encodeURIComponent(token)}`;
  }

  function quoteMessage(plate, token, withAttachment=false){
    const p = plate ? ` ${plate}` : '';
    if(withAttachment){
      return `Olá, boa tarde. Já efetuámos o orçamento para a sua viatura${p}, que segue em anexo. Pode também consultar e responder ao orçamento aqui: ${publicQuoteLink(token)}. Obrigado.`;
    }
    return `Olá, boa tarde. Já efetuámos o orçamento para a sua viatura${p}. Pode consultar e responder ao orçamento aqui: ${publicQuoteLink(token)}. Obrigado.`;
  }

  window.openQuotePdf = function(token){
    window.open(pdfLink(token), '_blank');
  };

  window.sendQuoteWhatsApp = function(phone, plate, token){
    const msg = quoteMessage(plate, token, false);
    window.open(`https://wa.me/${String(phone||'').replace(/\D/g,'').replace(/^00/,'')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  window.shareQuotePdf = async function(token, plate){
    try{
      const res = await fetch(pdfLink(token));
      if(!res.ok) throw new Error('Não foi possível gerar o PDF.');
      const blob = await res.blob();
      const safePlate = String(plate||'orcamento').replace(/[^a-zA-Z0-9_-]/g,'-');
      const file = new File([blob], `orcamento-${safePlate}.pdf`, {type:'application/pdf'});
      const msg = quoteMessage(plate, token, true);

      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({title:`Orçamento ${plate||''}`.trim(), text:msg, files:[file]});
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      alert('O PDF foi descarregado. No computador, anexe-o manualmente no WhatsApp. No telemóvel, use o botão “Partilhar PDF” para o enviar diretamente para o WhatsApp quando o navegador suportar partilha de ficheiros.');
    }catch(err){
      alert(err?.message || 'Não foi possível preparar o orçamento para partilha.');
    }
  };

  async function fixPreparedQuoteMessages(vehicleId){
    try{
      const [{data:v},{data:quotes},{data:comms}] = await Promise.all([
        sb.from('oficina_viaturas').select('id,matricula').eq('id',vehicleId).single(),
        sb.from('oficina_orcamentos').select('intervencao_id,token').eq('viatura_id',vehicleId),
        sb.from('oficina_comunicacoes').select('id,intervencao_id,mensagem,estado').eq('viatura_id',vehicleId)
      ]);
      if(!v) return;
      const tokenByIntervention = new Map((quotes||[]).map(q=>[q.intervencao_id,q.token]));
      for(const c of (comms||[])){
        const token = tokenByIntervention.get(c.intervencao_id);
        if(!token) continue;
        const old = String(c.mensagem||'');
        if(old.includes('Temos um orçamento/intervenção pendente de aprovação') || old.includes('Entre em contacto connosco para confirmar')){
          const mensagem = quoteMessage(v.matricula, token, false);
          await sb.from('oficina_comunicacoes').update({mensagem}).eq('id',c.id);
        }
      }
    }catch(err){ console.warn('Não foi possível atualizar as mensagens antigas do orçamento.',err); }
  }

  async function decorateQuoteCards(vehicleId){
    const root = document.getElementById('vehicleDetailContent');
    if(!root) return;
    const {data:v} = await sb.from('oficina_viaturas').select('matricula,oficina_clientes(telefone)').eq('id',vehicleId).single();
    const {data:quotes} = await sb.from('oficina_orcamentos').select('token,total,estado,criado_em').eq('viatura_id',vehicleId).order('criado_em',{ascending:false}).limit(10);
    if(!quotes?.length) return;
    const cards = [...root.querySelectorAll('.quoteCard')];
    cards.forEach((card,i)=>{
      const q=quotes[i]; if(!q || card.querySelector('.quoteSendBox')) return;
      const phone=v?.oficina_clientes?.telefone||'';
      const box=document.createElement('div');box.className='quoteSendBox';
      box.innerHTML=`<div class="quoteSendLabel">Enviar orçamento ao cliente</div><div class="quoteSendActions"><button type="button" onclick="shareQuotePdf('${q.token}','${String(v?.matricula||'').replace(/'/g,"\\'")}')">📎 Partilhar PDF</button><button type="button" onclick="openQuotePdf('${q.token}')">📄 Abrir PDF</button>${phone?`<button type="button" onclick="sendQuoteWhatsApp('${String(phone).replace(/'/g,"\\'")}','${String(v?.matricula||'').replace(/'/g,"\\'")}','${q.token}')">WhatsApp + link</button>`:''}</div>`;
      card.appendChild(box);
    });
  }

  const previousOpenVehicle = window.openVehicleDetailEnhanced;
  if(typeof previousOpenVehicle === 'function'){
    window.openVehicleDetailEnhanced = async function(vehicleId, origin='vehicles'){
      await fixPreparedQuoteMessages(vehicleId);
      await previousOpenVehicle(vehicleId,origin);
      await decorateQuoteCards(vehicleId);
    };
  }

  const previousUpdateStatus = window.updateWorkStatus;
  if(typeof previousUpdateStatus === 'function'){
    window.updateWorkStatus = async function(id,status,vehicleId){
      await previousUpdateStatus(id,status,vehicleId);
      if(status==='aguarda_aprovacao') await fixPreparedQuoteMessages(vehicleId);
    };
  }

  const previousSave = window.saveIntervention;
  if(typeof previousSave === 'function'){
    window.saveIntervention = async function(){
      const vehicleId = (typeof selectedVehicle !== 'undefined' && selectedVehicle) ? selectedVehicle.id : null;
      await previousSave();
      if(vehicleId) await fixPreparedQuoteMessages(vehicleId);
    };
  }
})();