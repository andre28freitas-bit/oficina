(() => {
  const style = document.createElement('style');
  style.textContent = `
    #publicQuoteView.publicQuote{max-width:760px;margin:28px auto;padding:0 10px}
    #publicQuoteView .card{padding:28px;border-radius:22px}
    #publicQuoteView h2{font-size:34px;line-height:1.1;margin-bottom:10px}
    #publicQuoteView .statusPill{display:none!important}
    #publicQuoteView .publicItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid #e4e7ec}
    #publicQuoteView .publicItem>div{min-width:0}
    #publicQuoteView .publicItem>div>strong{display:block;font-size:18px;line-height:1.3;margin-bottom:7px;word-break:break-word}
    #publicQuoteView .publicItem>div>small{display:block;font-size:15px;line-height:1.35;color:#667085}
    #publicQuoteView .publicItem>strong{font-size:19px;white-space:nowrap;text-align:right}
    #publicQuoteView .total{font-size:38px;font-weight:900;text-align:right;padding:18px 0 8px}
    #publicQuoteView .quoteDecisionIntro{margin:20px 0 10px;font-weight:800;font-size:17px}
    #publicQuoteView .publicDecision{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
    #publicQuoteView .publicDecision .btn{min-height:74px;padding:14px 18px;font-size:16px;line-height:1.3;white-space:normal;border-radius:14px;font-weight:900}
    #publicQuoteView .quoteApproveBtn{background:#15803d!important;border-color:#15803d!important;color:#fff!important}
    #publicQuoteView .quoteContactBtn{background:#b42318!important;border-color:#b42318!important;color:#fff!important}
    #publicQuoteView .ok{margin-top:20px;border-radius:14px;padding:15px 17px;line-height:1.45}
    @media(max-width:600px){
      #publicQuoteView.publicQuote{margin:12px auto;padding:0 8px}
      #publicQuoteView .card{padding:20px 16px;border-radius:18px}
      #publicQuoteView h2{font-size:28px}
      #publicQuoteView .publicItem{grid-template-columns:1fr;gap:7px;padding:16px 0}
      #publicQuoteView .publicItem>strong{text-align:left;font-size:18px}
      #publicQuoteView .total{text-align:left;font-size:34px;padding-top:20px}
      #publicQuoteView .publicDecision{grid-template-columns:1fr;gap:10px}
      #publicQuoteView .publicDecision .btn{min-height:70px}
    }
  `;
  document.head.appendChild(style);

  function enhancePublicQuote(){
    const root = document.getElementById('publicQuoteView');
    if(!root) return;

    root.querySelectorAll('p').forEach(p => {
      if((p.textContent || '').trim().startsWith('Válido até')) p.remove();
    });

    const approve = root.querySelector('button[onclick*="aprovado"]');
    const refuse = root.querySelector('button[onclick*="recusado"]');
    const decisions = root.querySelector('.publicDecision');
    if(decisions && !root.querySelector('.quoteDecisionIntro')){
      const intro = document.createElement('div');
      intro.className = 'quoteDecisionIntro';
      intro.textContent = 'Indique como pretende avançar:';
      decisions.parentNode.insertBefore(intro, decisions);
    }
    if(approve){
      approve.classList.add('quoteApproveBtn');
      approve.textContent = '✓ Aprovo o orçamento e quero que avancem com a reparação';
    }
    if(refuse){
      refuse.classList.add('quoteContactBtn');
      refuse.textContent = '✕ Não aprovo e quero ser contactado';
    }

    const feedback = root.querySelector('.ok');
    if(feedback){
      const text = (feedback.textContent || '').toLowerCase();
      if(text.includes('expirado')) feedback.remove();
      else if(text.includes('aprovado')) feedback.innerHTML = '<strong>Resposta registada.</strong> A oficina recebeu a sua aprovação para avançar com a reparação.';
      else if(text.includes('recusado')) feedback.innerHTML = '<strong>Resposta registada.</strong> A oficina recebeu o seu pedido de contacto.';
    }
  }

  const observer = new MutationObserver(() => enhancePublicQuote());
  observer.observe(document.documentElement, { childList:true, subtree:true });
  setTimeout(enhancePublicQuote, 0);

  window.respondPublicQuote = async function(token, decision){
    const approved = decision === 'aprovado';
    const prompt = approved
      ? 'Confirma que aprova este orçamento e quer que a oficina avance com a reparação?'
      : 'Confirma que não aprova este orçamento e quer ser contactado pela oficina?';
    if(!confirm(prompt)) return;

    const buttons = document.querySelectorAll('#publicQuoteView .publicDecision button');
    buttons.forEach(b => b.disabled = true);

    const {data,error} = await sb.rpc('oficina_responder_orcamento', {p_token:token,p_decisao:decision});
    if(error){buttons.forEach(b => b.disabled = false);return alert(error.message)}
    if(!data?.ok){buttons.forEach(b => b.disabled = false);return alert(data?.message || 'Não foi possível registar a resposta.')}

    try{
      const {data:emailData,error:emailError} = await sb.functions.invoke('oficina-orcamento-email', {body:{token,decision}});
      if(emailError || !emailData?.ok){
        if(emailData?.error === 'email_not_configured') alert('A resposta foi registada. O envio automático do email ficará ativo assim que o email da oficina for configurado.');
        else console.warn('Resposta registada, mas o email não foi enviado.', emailError || emailData);
      }
    }catch(err){
      console.warn('Resposta registada, mas houve um problema ao enviar a notificação por email.', err);
    }

    location.reload();
  };
})();