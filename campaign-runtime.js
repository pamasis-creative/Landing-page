(function(){
  const section=document.getElementById('featured-campaign');
  if(!section) return;
  const cfg=window.PAMASIS_CMS_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||cfg.supabaseUrl.includes('YOUR_PROJECT')) return;
  const api=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/pamasis_campaigns?select=*&status=in.(published,scheduled)&order=sort_order.asc,created_at.desc';
  fetch(api,{headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+cfg.supabaseAnonKey}})
    .then(r=>{if(!r.ok) throw new Error('Campaign request failed');return r.json();})
    .then(rows=>{
      const now=Date.now();
      const c=rows.find(x=>(!x.starts_at||Date.parse(x.starts_at)<=now)&&(!x.ends_at||Date.parse(x.ends_at)>now));
      if(!c){section.hidden=true;return;}
      const safe=(s)=>String(s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
      section.hidden=false;
      section.className='campaign-section layout-'+(c.layout||'split');
      const media=c.media_type==='video'&&c.media_url
        ? '<video controls playsinline preload="metadata" src="'+safe(c.media_url)+'"></video>'
        : c.media_type==='image'&&c.media_url ? '<img loading="lazy" src="'+safe(c.media_url)+'" alt="'+safe(c.title)+'">' : '';
      section.innerHTML='<div class="wrap campaign-grid"><div class="campaign-copy"><div class="eyebrow">'+safe(c.eyebrow||'Featured by PAMASIS')+'</div><h2>'+safe(c.headline)+'</h2><p>'+safe(c.body).replace(/\n/g,'<br>')+'</p><a class="btn btn-primary campaign-cta" href="'+safe(c.cta_url)+'" rel="noopener">'+safe(c.cta_label)+' ↗</a></div>'+(media?'<div class="campaign-media">'+media+'</div>':'')+'</div>';
      section.querySelector('.campaign-cta').addEventListener('click',()=>{try{sessionStorage.setItem('pamasis_campaign_click_'+c.slug,String(Date.now()));}catch(e){}});
    }).catch(()=>{section.hidden=true;});
})();