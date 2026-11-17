(function(){
const cfg=window.PAMASIS_CMS_CONFIG||{};
const endpoint=(cfg.supabaseUrl||"").replace(/\/$/,"")+"/functions/v1/pamasis-chat";
if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
const style=document.createElement("style");
style.textContent=`
#pamasis-chat-launch{position:fixed;right:22px;bottom:24px;z-index:9998;border:0;border-radius:999px;background:#123d2d;color:#fff;padding:15px 20px;font:700 14px "DM Sans",sans-serif;box-shadow:0 8px 30px #09241935;cursor:pointer}
#pamasis-chat-panel{position:fixed;right:22px;bottom:88px;z-index:9999;width:min(390px,calc(100vw - 28px));height:min(610px,calc(100dvh - 120px));background:#fffdf8;border:1px solid #dedbcf;border-radius:14px;box-shadow:0 18px 60px #09241935;display:none;overflow:hidden;font:14px/1.5 "DM Sans",sans-serif;color:#1b2c23}
#pamasis-chat-panel.open{display:flex;flex-direction:column}
#pamasis-chat-panel *{box-sizing:border-box}
.pc-head{background:#123d2d;color:white;padding:16px 18px;display:flex;justify-content:space-between;align-items:center}
.pc-head strong{font:800 16px Manrope,sans-serif;letter-spacing:.06em}.pc-head small{display:block;color:#d9e1d9;font-size:11px}
.pc-close{background:transparent;border:0;color:white;font-size:23px;cursor:pointer}
.pc-content{padding:16px;overflow:auto;flex:1}.pc-note{background:#f6f2e9;border-left:3px solid #b18a45;padding:11px 12px;margin-bottom:14px;color:#526057;font-size:12px}
.pc-form{display:grid;gap:9px}.pc-form label{font-size:11px;font-weight:700;color:#526057;display:grid;gap:4px}.pc-form input,.pc-form select,.pc-form textarea{width:100%;padding:10px;border:1px solid #dedbcf;border-radius:6px;background:white;color:#1b2c23;font:13px "DM Sans",sans-serif}.pc-form button,.pc-send{background:#123d2d;color:white;border:0;border-radius:6px;padding:12px;font-weight:700;cursor:pointer}
.pc-form button:disabled,.pc-send:disabled{opacity:.55;cursor:wait}.pc-small{font-size:11px;color:#657168}.pc-messages{display:grid;gap:9px;margin-bottom:12px}.pc-msg{max-width:88%;padding:10px 12px;border-radius:10px;background:#f0eee7;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.pc-msg.visitor{margin-left:auto;background:#123d2d;color:white}.pc-msg.system{border:1px solid #e4dcc9;background:#fbf7ed;color:#526057;max-width:100%}.pc-compose{display:flex;gap:8px;align-items:end}.pc-compose textarea{flex:1;resize:none;min-height:42px;max-height:100px;border:1px solid #dedbcf;border-radius:7px;padding:10px;font:13px "DM Sans",sans-serif}.pc-compose button{background:#123d2d;color:white;border:0;border-radius:7px;padding:11px 14px;font-weight:700}.pc-error{color:#a84936;font-size:12px;margin:8px 0}
@media(max-width:520px){#pamasis-chat-launch{right:14px;bottom:82px;padding:13px 16px}#pamasis-chat-panel{right:10px;bottom:136px;width:calc(100vw - 20px);height:min(580px,calc(100dvh - 160px))}}
`;
document.head.appendChild(style);
const launch=document.createElement("button");launch.id="pamasis-chat-launch";launch.type="button";launch.textContent="Chat with PAMASIS";
const panel=document.createElement("section");panel.id="pamasis-chat-panel";panel.setAttribute("aria-label","PAMASIS live chat");
panel.innerHTML='<header class="pc-head"><div><strong>PAMASIS</strong><small>How can we help your business?</small></div><button class="pc-close" aria-label="Close chat">×</button></header><div class="pc-content" id="pc-content"><div class="pc-note">Send us a message. If our team is busy, your message will be saved and we will respond as soon as someone is available.</div><div id="pc-stage"></div></div>';
document.body.append(launch,panel);
const $=id=>document.getElementById(id);
const tokenKey="pamasis_chat_visitor_token",convKey="pamasis_chat_conversation_id";
let token=localStorage.getItem(tokenKey)||crypto.randomUUID()+crypto.randomUUID();
localStorage.setItem(tokenKey,token);
let conversationId=localStorage.getItem(convKey)||"",poller=null,busy=false;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function call(payload){
 const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":cfg.supabaseAnonKey},body:JSON.stringify({...payload,visitor_token:token})});
 const data=await response.json().catch(()=>({error:"Unexpected server response"}));
 if(!response.ok)throw new Error(data.error||"Could not complete request.");
 return data;
}
function showProfile(){
 $("pc-stage").innerHTML='<form class="pc-form" id="pc-profile"><label>Your full name *<input name="full_name" required autocomplete="name" maxlength="120"></label><label>Business name *<input name="business_name" required maxlength="160"></label><label>Phone number *<input name="phone" required autocomplete="tel" maxlength="40"></label><label>Email address *<input name="email" type="email" required autocomplete="email"></label><label>What type of business do you operate?<select name="business_type" id="pc-business-type"><option value="">Choose if applicable</option><option>Restaurant / Eatery</option><option>Food vendor / Food stall</option><option>Catering business</option><option>Bakery</option><option>Hotel / Hospitality</option><option>Retail / Distribution</option><option>Manufacturer / Processor</option><option value="Other">Other</option></select></label><label id="pc-business-type-other" hidden>Please specify your business type<input name="business_type_other" maxlength="100" placeholder="e.g. Technology, construction, professional services"></label><label>Business location (city and state)<input name="location" placeholder="e.g. Owerri, Imo State"></label><label>What are you interested in?<select name="interest"><option value="">Choose an option</option><option>Palm oil / commodity supply</option><option>Business growth support</option><option>Business tools / assessment</option><option>Partnership / distribution</option><option>Something else</option></select></label><label>Approximate palm oil usage (optional)<select name="palm_oil_usage"><option value="">Not applicable / Prefer not to say</option><option>Below 25 litres per month</option><option>25–50 litres per month</option><option>51–100 litres per month</option><option>101–250 litres per month</option><option>251–500 litres per month</option><option>Above 500 litres per month</option><option>I do not currently use palm oil</option></select></label><div class="pc-small">We use these details to understand your enquiry and connect you with the right PAMASIS team member.</div><div class="pc-error" id="pc-error"></div><button type="submit" id="pc-start">Start conversation</button></form>';
 $("pc-business-type").addEventListener("change",e=>{$("pc-business-type-other").hidden=e.target.value!=="Other";});
 $("pc-profile").addEventListener("submit",async e=>{
  e.preventDefault();if(busy)return;busy=true;$("pc-start").disabled=true;$("pc-error").textContent="Connecting you…";
  const f=new FormData(e.currentTarget),location=String(f.get("location")||"").split(",");
  try{
   const data=await call({action:"start",lead:{full_name:f.get("full_name"),business_name:f.get("business_name"),phone:f.get("phone"),email:f.get("email"),business_type:f.get("business_type")==="Other"?String(f.get("business_type_other")||"Other").trim():f.get("business_type"),city:location[0]?.trim()||"",state:location.slice(1).join(",").trim(),interests:f.get("interest")?[f.get("interest")]:[],palm_oil_usage:f.get("palm_oil_usage")}});
   conversationId=data.conversation.id;localStorage.setItem(convKey,conversationId);showConversation([ {sender_type:"system",body:data.greeting} ]);startPolling();
  }catch(err){$("pc-error").textContent=err.message;$("pc-start").disabled=false;}finally{busy=false;}
 });
}
function showConversation(messages=[]){
 $("pc-stage").innerHTML='<div class="pc-messages" id="pc-messages"></div><form class="pc-compose" id="pc-compose"><textarea id="pc-body" aria-label="Your message" placeholder="Type your message…" maxlength="5000" required></textarea><button type="submit" id="pc-send">Send</button></form><div class="pc-small" style="margin-top:9px">Your conversation is saved. You can return to this chat later on this device.</div>';
 renderMessages(messages);
 $("pc-compose").addEventListener("submit",async e=>{e.preventDefault();const body=$("pc-body").value.trim();if(!body||busy)return;busy=true;$("pc-send").disabled=true;try{await call({action:"visitor_message",conversation_id:conversationId,body});$("pc-body").value="";await refresh();}catch(err){alert(err.message);}finally{busy=false;$("pc-send").disabled=false;}});
}
function renderMessages(messages){const el=$("pc-messages");if(!el)return;el.innerHTML=messages.map(m=>'<div class="pc-msg '+(m.sender_type==="visitor"?"visitor":m.sender_type==="system"?"system":"")+'">'+esc(m.body)+'</div>').join("");$("pc-content").scrollTop=$("pc-content").scrollHeight;}
async function refresh(){if(!conversationId)return;const data=await call({action:"visitor_history",conversation_id:conversationId});renderMessages(data.messages||[]);}
function startPolling(){if(poller)clearInterval(poller);poller=setInterval(()=>refresh().catch(()=>{}),5000);}
launch.addEventListener("click",async()=>{panel.classList.toggle("open");if(!panel.classList.contains("open"))return;if(conversationId){showConversation();try{await refresh();startPolling();}catch(e){localStorage.removeItem(convKey);conversationId="";showProfile();}}else showProfile();});
document.querySelectorAll("[data-open-chat]").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();if(!panel.classList.contains("open"))launch.click();}));
panel.querySelector(".pc-close").addEventListener("click",()=>panel.classList.remove("open"));
if(conversationId){/* Resume only when visitor opens the chat. */}
})();