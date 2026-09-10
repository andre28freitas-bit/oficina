(() => {
  const PDF_ENDPOINT = 'https://tfqzzhpehrkkxmrpwkas.supabase.co/functions/v1/oficina-orcamento-pdf';

  const style = document.createElement('style');
  style.textContent = `
    .quoteSendBox{margin-top:12px;padding-top:12px;border-top:1px solid #eaecf0}
    .quoteSendLabel{font-size:13px;color:#667085;font-weight:800;margin-bottom:8px}
    .quoteSendActions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .quoteSendActions button{min-height:44px;border:0;border-radius:10px;padding:10px 9px;font-weight:800;background:#eef4ff;color:#1849a9;font-size:13px}
    @media(max-width:600px){.quoteSendActions{grid-template-columns:1fr}.quoteSendActions button{min-height:49px;font-size:14px}}
  `;
  document.head.appendChild(style);

  const publicQuoteLink = token => `${location.origin}${location.pathname}?quote=${token}`;
  const pdfLink = token => `${PDF_ENDPOINT}?token=${encodeURIComponent(token)}`;
  const cleanPhone = phone => String(phone||'').replace(/\D/g,'').replace(/^00/,'');
  const escAttr = value => String(value||'').replace(/'/g,"\\'");

  function quoteMessage(plate, token, attached=false){
    const vehicle = plate ? ` ${plate}` : '';
    return attached
      ? `Olá, boa tarde. Já efetuámos o orçamento para a sua viatura${vehicle}, que segue em anexo. Pode também consultar e responder ao orçamento aqui: ${publicQuoteLink(token)}. Obrigado.`
      : `Olá, boa tarde. Já efetuámos o orçamento para a sua viatura${vehicle}. Pode consultar e responder ao orçamento aqui: ${publicQuoteLink(token)}. Obrigado.`;
  }

  window.sendQuoteWhatsApp = function(phone, plate, token){
    window.open(`https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(quoteMessage(plate,token,false))}`,'_blank');
  };

  window.sendQuoteEmail = function(email, plate, token){
    const subject = `Orçamento da oficina${plate ? ' - '+plate : ''}`;
    const body = quoteMessage(plate,token,false);
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  window.shareQuotePdf = async function(token, plate){
    try{
      const res = await fetch(pdfLink(token), {cache:'no-store'});
      if(!res.ok) throw new Error('Não foi possível gerar o PDF.');
      const blob = await res.blob();
      const safePlate = String(plate||'orcamento').replace(/[^a-zA-Z0-9_-]/g,'-');
      const file = new File([blob],`orcamento-${safePlate}.pdf`,{type:'application/pdf'});
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({title:`Orçamento ${plate||''}`.trim(),text:quoteMessage(plate,token,true),files:[file]});
        return;
      }
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      alert('O PDF foi descarregado. No computador, anexe-o ao WhatsApp ou email. No telemóvel, o botão “Partilhar PDF” permite escolher WhatsApp, Mail ou outra app compatível.');
    }catch(err){alert(err?.message||'Não foi possível preparar o orçamento para partilha.')}
  };

  function removeDuplicateQuoteCommunication(root){
    root.querySelectorAll('.reminderCard').forEach(card=>{
      const txt=(card.textContent||'').toLowerCase();
      if((txt.includes('orçamento')||txt.includes('orcamento')) && (txt.includes('?quote=')||txt.includes('entre em contacto connosco para confirmar'))) card.remove();
    });
  }

  async function decorateQuoteCards(vehicleId){
    const root=document.getElementById('vehicleDetailContent'); if(!root)return;
    const [{data:v},{data:quotes}]=await Promise.all([
      sb.from('oficina_viaturas').select('matricula,oficina_clientes(telefone,email)').eq('id',vehicleId).single(),
      sb.from('oficina_orcamentos').select('token,total,estado,criado_em').eq('viatura_id',vehicleId).order('criado_em',{ascending:false}).limit(10)
    ]);
    removeDuplicateQuoteCommunication(root);
    if(!quotes?.length)return;
    const cards=[...root.querySelectorAll('.quoteCard')];
    cards.forEach((card,i)=>{
      const q=quotes[i]; if(!q)return;
      card.querySelector('.tinyActions')?.remove();
      card.querySelector('.quoteSendBox')?.remove();
      const phone=v?.oficina_clientes?.telefone||'',email=v?.oficina_clientes?.email||'',plate=v?.matricula||'';
      const box=document.createElement('div');box.className='quoteSendBox';
      box.innerHTML=`<div class="quoteSendLabel">Enviar orçamento ao cliente</div><div class="quoteSendActions"><button type="button" onclick="shareQuotePdf('${q.token}','${escAttr(plate)}')">📎 Partilhar PDF</button>${phone?`<button type="button" onclick="sendQuoteWhatsApp('${escAttr(phone)}','${escAttr(plate)}','${q.token}')">WhatsApp</button>`:''}${email?`<button type="button" onclick="sendQuoteEmail('${escAttr(email)}','${escAttr(plate)}','${q.token}')">Email</button>`:''}</div>`;
      card.appendChild(box);
    });
  }

  const previousOpenVehicle=window.openVehicleDetailEnhanced;
  if(typeof previousOpenVehicle==='function'){
    window.openVehicleDetailEnhanced=async function(vehicleId,origin='vehicles'){
      await previousOpenVehicle(vehicleId,origin);
      await decorateQuoteCards(vehicleId);
    };
  }
})();