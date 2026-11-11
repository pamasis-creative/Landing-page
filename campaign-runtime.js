(function(){
  const cfg=window.PAMASIS_CMS_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||cfg.supabaseUrl.includes('YOUR_PROJECT'))return;
  const base=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/';
  const headers={apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+cfg.supabaseAnonKey,'Content-Type':'application/json'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qs=new URLSearchParams(location.search);
  const requested=qs.get('campaign');
  const source=qs.get('utm_source')||qs.get('source')||'direct';
  const medium=qs.get('utm_medium')||'';
  let sessionKey='';
  try{sessionKey=sessionStorage.getItem('pamasis_campaign_session')||('ps-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9));sessionStorage.setItem('pamasis_campaign_session',sessionKey);}catch(e){}
  const get=async path=>{const r=await fetch(base+path,{headers,cache:'no-store'});if(!r.ok)throw new Error('Campaign API '+r.status);return r.json();};
  const track=(id,type)=>{try{fetch(base+'pamasis_campaign_events',{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({campaign_id:id,event_type:type,source,medium,referrer_host:location.hostname,session_key:sessionKey||null})}).catch(()=>{});}catch(e){}};
  const eligible=c=>!c.is_paused&&['published','scheduled'].includes(c.status)&&(!c.starts_at||Date.parse(c.starts_at)<=Date.now())&&(!c.ends_at||Date.parse(c.ends_at)>Date.now());
  const mediaMarkup=(m)=>{const url=esc(m.source_url),title=esc(m.title||'Related PAMASIS content'),desc=esc(m.description||'');if(m.media_kind==='image')return '<img src="'+url+'" alt="'+title+'" loading="lazy">';
    if(m.media_kind==='video')return '<video controls playsinline preload="metadata" src="'+url+'"></video>';
    if(m.media_kind==='social'||m.media_kind==='link')return '<a class="campaign-media-link" href="'+url+'" target="_blank" rel="noopener noreferrer">'+(m.thumbnail_url?'<img src="'+esc(m.thumbnail_url)+'" alt="'+title+'" loading="lazy">':'')+'<span><strong>'+title+'</strong>'+(desc?'<small>'+desc+'</small>':'')+'<em>Open related content ↗</em></span></a>';
    return '';
  };
  const render=(c,assets,slot,matched)=>{const section=document.querySelector('[data-campaign-slot="'+slot+'"]');if(!section)return;
    const legacy=(!assets||!assets.length)&&c.media_url&&c.media_type!=='none'?[{media_kind:c.media_type,source_url:c.media_url,title:c.title}]:[];
    const items=assets&&assets.length?assets:legacy;
    const media=items.length?'<div class="campaign-media" data-carousel="'+esc(c.id)+'"><div class="campaign-media-track">'+items.map((m,i)=>'<div class="campaign-media-item" data-media-index="'+i+'" '+(i?'hidden':'')+'>'+mediaMarkup(m)+'</div>').join('')+'</div>'+(items.length>1?'<div class="campaign-carousel-controls"><button type="button" data-prev aria-label="Previous media">‹</button><span data-count>1 / '+items.length+'</span><button type="button" data-next aria-label="Next media">›</button></div>':'')+'</div>':'';
    const article=document.createElement('article');article.className='campaign-card layout-'+esc(c.layout||'split')+(matched?' campaign-attributed':'');
    article.innerHTML='<div class="wrap campaign-grid"><div class="campaign-copy"><div class="eyebrow">'+esc(c.eyebrow||'Featured by PAMASIS')+'</div><h2>'+esc(c.headline)+'</h2><p>'+esc(c.body).replace(/\n/g,'<br>')+'</p><a class="btn btn-primary campaign-cta" href="'+esc(c.cta_url)+'" rel="noopener noreferrer">'+esc(c.cta_label)+' ↗</a></div>'+media+'</div>';
    section.appendChild(article);section.hidden=false;
    const cta=article.querySelector('.campaign-cta');cta.addEventListener('click',()=>{track(c.id,/wa\.me|whatsapp/i.test(cta.href)?'whatsapp_click':'cta_click');try{sessionStorage.setItem('pamasis_last_campaign',c.slug);}catch(e){}});
    const carousel=article.querySelector('[data-carousel]');if(carousel&&items.length>1){let n=0,timer=null;const slides=[...carousel.querySelectorAll('[data-media-index]')],count=carousel.querySelector('[data-count]');const show=i=>{n=(i+slides.length)%slides.length;slides.forEach((s,j)=>s.hidden=j!==n);count.textContent=(n+1)+' / '+slides.length;};carousel.querySelector('[data-prev]').onclick=()=>show(n-1);carousel.querySelector('[data-next]').onclick=()=>show(n+1);if(c.auto_rotate){timer=setInterval(()=>show(n+1),Math.max(3000,Number(c.rotation_interval)||5000));carousel.addEventListener('mouseenter',()=>clearInterval(timer),{once:true});}}
    track(c.id,'impression');
    article.querySelectorAll('.campaign-media-link').forEach(a=>a.addEventListener('click',()=>track(c.id,'media_click')));
  };
  Promise.all([
    get('pamasis_campaigns?select=*&status=in.(published,scheduled)&is_paused=eq.false&order=sort_order.asc,created_at.desc'),
    get('pamasis_campaign_media?select=*&is_active=eq.true&order=display_order.asc'),
    get('pamasis_campaign_placements?select=*&order=display_order.asc')
  ]).then(([campaigns,media,placements])=>{
    const active=campaigns.filter(eligible);
    if(!active.length)return;
    const byId=id=>active.find(c=>c.id===id);
    const assets=id=>media.filter(m=>m.campaign_id===id);
    const slots=['featured','secondary','product','lead_magnet','related'];
    const matched=requested?active.find(c=>c.slug===requested):null;
    const placed=new Set();
    if(matched){render(matched,assets(matched.id),'featured',true);placed.add(matched.id);}
    slots.forEach(slot=>{
      const section=document.querySelector('[data-campaign-slot="'+slot+'"]');if(!section)return;
      const rows=placements.filter(p=>p.placement_key===slot).sort((a,b)=>a.display_order-b.display_order);
      let selected=rows.map(p=>byId(p.campaign_id)).filter(Boolean);
      if(slot==='featured'&&matched)selected=[matched];
      if(!placements.length&&slot==='featured'&&!matched)selected=active.slice(0,1);
      selected.forEach(c=>{if(placed.has(c.id))return;render(c,assets(c.id),slot,false);placed.add(c.id);});
    });
    // Any active campaign without an explicit placement remains safely discoverable in the secondary slot.
    active.filter(c=>!placed.has(c.id)).forEach(c=>render(c,assets(c.id),'secondary',false));
  }).catch(()=>{});
})();