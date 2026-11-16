(function(){
const cfg=window.PAMASIS_CMS_CONFIG||{},root=document.getElementById('campaign');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=value=>{try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(e){return ''}};
const qs=new URLSearchParams(location.search),slug=qs.get('slug');
if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!slug){root.innerHTML='<div class="notice">This PAMASIS page could not be found.</div>';throw new Error('Campaign page configuration or slug missing');}
const base=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/',headers={apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+cfg.supabaseAnonKey};
const get=async path=>{const r=await fetch(base+path,{headers,cache:'no-store'});if(!r.ok)throw new Error('Content request failed');return r.json()};
Promise.all([get('pamasis_campaigns?select=*&slug=eq.'+encodeURIComponent(slug)+'&limit=1'),get('pamasis_campaign_media?select=*&is_active=eq.true&order=display_order.asc')]).then(([rows,media])=>{
const c=rows[0],now=Date.now();if(!c||c.is_paused||!['published','scheduled'].includes(c.status)||(c.starts_at&&Date.parse(c.starts_at)>now)||(c.ends_at&&Date.parse(c.ends_at)<=now)){root.innerHTML='<div class="notice">This PAMASIS content is not currently available.</div>';return;}
const assets=media.filter(m=>m.campaign_id===c.id),legacy=!assets.length&&c.media_url&&c.media_type!=='none'?[{media_kind:c.media_type,source_url:c.media_url,title:c.title}]:[],items=assets.length?assets:legacy;
const mediaHtml=items.map(m=>{const u=esc(safe(m.source_url));if(!u)return '';if(m.media_kind==='video')return '<video controls playsinline preload="metadata" src="'+u+'"></video>';if(m.media_kind==='image')return '<img loading="lazy" src="'+u+'" alt="'+esc(m.title||c.title)+'">';if(m.media_kind==='link'||m.media_kind==='social')return '<p><a href="'+u+'" target="_blank" rel="noopener">Explore related content ↗</a></p>';return ''}).join('');
const destination=safe(c.destination_url||c.cta_url),cta=destination?'<p><a class="btn" href="'+esc(destination)+'" target="_blank" rel="noopener">'+esc(c.cta_label||'Take the next step')+' ↗</a></p>':'';
document.title=esc(c.headline||c.title)+' | PAMASIS';
root.innerHTML='<div class="eyebrow">'+esc(c.eyebrow||'PAMASIS')+'</div><h1>'+esc(c.headline||c.title)+'</h1><div class="copy">'+esc(c.body||'')+'</div><div class="media">'+mediaHtml+'</div>'+cta;
}).catch(error=>{console.error(error);root.innerHTML='<div class="notice">We could not load this PAMASIS content right now. Please return to the homepage and try again.</div>'});
})();