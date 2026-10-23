(function(){
  'use strict';
  const C=window.WorkspaceDemoContent;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validTabs=['bookmarks','agents','plan','docs','context','focus','translation','board'];
  const dialogDefaults=()=>({surface:'dialog',currentUser:'u1',readingTail:false,dialogScroll:0,queueExpanded:false,queuedText:'',glossed:[],selection:null,pendingBookmark:null,savedNotes:[],noteSequence:0,profile:{name:null,description:null,role:null,context:'project/brief.md',orchestrator:true,special:false,ownerOnly:false,pool:false,autostart:false,topics:null,rules:null,forbidden:null,contracts:null,model:'balanced',reasoning:'xhigh'},terminalRunning:true,terminalDraft:'',terminalEvents:[]});
  const composerDefaults=()=>({collaborationPlan:false,runtimeProfile:{model:'balanced',reasoning:'xhigh'},buffer:[],queueItems:[],composerFeedback:null,goalText:''});
  const attentionDefaults=()=>({sessionIcon:'',attentionState:'idle',soundEnabled:false,soundName:'soft',paneRef:null});
  const state={lang:new URLSearchParams(location.search).get('lang')==='en'?'en':'ru',tab:'docs',doc:'brief',view:'viewer',translated:false,context:'memory',sourceLang:'ru',plan:[true,false,false],board:[0,1,2],attachments:[],messages:[],bookmarked:false,newSession:false,mode:'collaborative',reasoning:'xhigh',architecture:'systems',zoom:1,boardNote:'',scene:'dialog',edits:{},draft:'',pending:null,...dialogDefaults(),...composerDefaults(),...attentionDefaults()};
  let tooltipAnchor=null,lastFocus=null,renderSerial=0,visibleViewport=null;
  let right=null,boardReady=false;
  const t=(k)=>C[state.lang][k]??k;
  const help=(k)=>C[state.lang].helps[k]??t(k);
  const announce=s=>{$('#sr-status').textContent=s;};
  const dialogIcons=Object.freeze({
    globe:'<svg class="dialog-icon dialog-icon-globe" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg>',
    pin:'<svg class="dialog-icon dialog-icon-pin" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14 3 7 7-3 1-4 4-1 4-3-3-6 6 5-7-3-3 4-1 4-4Z"/></svg>',
    user:'<svg class="dialog-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2Z"/></svg>',
    agent:'<svg class="dialog-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 5 4-2 4 3h3l3-3 4 2-3 10-4 5h-3l-5-5Z"/><path d="m11 6-4 4 2 2 4-3 5 6M10 14l5 5M7 16l4 4"/></svg>'
  });
  const dialogIcon=name=>dialogIcons[name]??'';
  const button=(action,label,helpKey,attrs='',icon='')=>`<button type="button" data-demo-action="${action}" data-help="${helpKey}" ${attrs}>${icon?dialogIcon(icon):''}${icon&&label?' ':''}${esc(label)}</button>`;
  const mdBox=(text,extra='')=>`<div class="md-content ${extra}" data-md="${esc(text)}"></div>`;
  const docLang=()=>state.translated?(state.lang==='ru'?'en':'ru'):state.lang;
  const docText=(id=state.doc,lang=docLang())=>state.edits[`${lang}:${id}`]??C[lang][id];
  function renderMarkdown(root=document){
    const serial=++renderSerial;
    $$('[data-md]',root).forEach(el=>{const text=el.getAttribute('data-md');el.removeAttribute('data-md');el.dataset.markdownSource=text;try{if(window.OzMarkdown?.renderInto){window.OzMarkdown.renderInto(el,text);}else if(window.OzMarkdown?.renderMarkdownLite){el.innerHTML=window.OzMarkdown.renderMarkdownLite(text);}else throw new Error('Renderer unavailable');}catch{el.innerHTML=`<p class="inline-note">${esc(t('rendererUnavailable'))}</p><pre class="markdown-fallback"></pre>`;$('pre',el).textContent=text;}});
    enhanceGenerated(root);
    const nodes=$$('.mermaid:not([data-processed])',root);
    if(nodes.length&&window.mermaid?.run){window.mermaid.run({nodes,suppressErrors:true}).then(()=>{if(serial<=renderSerial)enhanceGenerated(root);}).catch(()=>{});}
  }
  function enhanceGenerated(root=document){
    enhanceDialogFileLinks(root);
    $$('pre',root).forEach(pre=>{if(!pre.closest('[data-markdown-source]')||pre.closest('.mermaid')||pre.dataset.enhanced)return;pre.dataset.enhanced='true';const code=$('code',pre);pre.dataset.codeText=code?code.textContent:pre.textContent;if($('button',pre)||$('button',pre.parentElement))return;const b=document.createElement('button');b.type='button';b.dataset.demoAction='copy-code';b.dataset.help='codeCopy';b.dataset.demoCopy='true';b.textContent=t('copy');pre.prepend(b);});
    $$('[data-markdown-source] button',root).forEach(b=>{if(b.dataset.demoAction)return;const label=`${b.title} ${b.ariaLabel} ${b.textContent}`;b.dataset.demoAction=/mermaid|diagram|zoom|схем|масштаб/i.test(label)?'diagram-detail':'copy-code';b.dataset.help=b.dataset.demoAction==='diagram-detail'?'diagram':'codeCopy';b.removeAttribute('title');});
    $$('[data-markdown-source] a',root).forEach(a=>{if(a.dataset.docswbInlineEnhanced==='1')return;a.removeAttribute('href');a.setAttribute('role','button');a.setAttribute('tabindex','0');a.dataset.demoAction='source-doc';a.dataset.help='source';});
    $$('[data-markdown-source] input[type="checkbox"]',root).forEach(c=>{c.disabled=true;c.setAttribute('aria-label',t('exampleOnly'));});
    refreshHelp(root);
  }
  function preparedDocRef(raw){
    try{
      const url=new URL(String(raw||''),location.origin);
      if(url.pathname!=='/doc_view.html')return null;
      const path=url.searchParams.get('path')||'',file=C.files.find(item=>item.path===path);
      return file?{file,path,line:url.searchParams.get('line')||'',column:url.searchParams.get('column')||''}:null;
    }catch{return null;}
  }
  function enhanceDialogFileLinks(root){
    $$('a[href]',root).forEach(link=>{
      if(!link.closest('#chat-stream')||link.classList.contains('md-image-link')||link.dataset.docswbInlineEnhanced==='1')return;
      const ref=preparedDocRef(link.getAttribute('href'));if(!ref)return;
      link.dataset.docswbInlineEnhanced='1';link.dataset.docswbPath=ref.path;link.dataset.demoAction='dialog-file-open';link.dataset.help='dialogFileOpen';link.dataset.file=ref.file.id;link.setAttribute('role','button');
      const action=document.createElement('button');action.type='button';action.className='docswb-inline-open';action.dataset.demoAction='dialog-file-pane';action.dataset.help='dialogFilePane';action.dataset.docswbOpenInlinePath=ref.path;action.dataset.file=ref.file.id;
      if(ref.line)action.dataset.docswbOpenInlineLine=ref.line;if(ref.column)action.dataset.docswbOpenInlineColumn=ref.column;
      action.textContent='Pane';action.setAttribute('aria-label','Pane · '+ref.path);link.insertAdjacentElement('afterend',action);
    });
  }
  function paneReference(el){
    const path=el.dataset.docswbOpenInlinePath||el.dataset.docswbPath||C.files.find(f=>f.id===el.dataset.file)?.path;
    const file=C.files.find(f=>f.path===path);if(!file)return null;
    const source=el.matches('a')?preparedDocRef(el.getAttribute('href')):null;
    return {file,path,line:el.dataset.docswbOpenInlineLine||source?.line||'',column:el.dataset.docswbOpenInlineColumn||source?.column||''};
  }
  function paneButton(ref){
    return button('dialog-file-pane','Pane','dialogFilePane','class="docswb-inline-open" data-file="'+esc(ref.file.id)+'" data-docswb-open-inline-path="'+esc(ref.path)+'" data-docswb-open-inline-line="'+esc(ref.line)+'" data-docswb-open-inline-column="'+esc(ref.column)+'"');
  }
  function faviconMarkup(icon=state.sessionIcon,attention=state.attentionState){
    const badges={done:{color:'#ffc857',glyph:'&#10003;'},operator_needed:{color:'#ffc857',glyph:'&#9995;'},error:{color:'#ff5d6c',glyph:'!'}},badge=badges[attention];
    const identity=icon?'<circle cx="32" cy="32" r="18" fill="#253243" stroke="#44566c" stroke-width="1.5"/><text data-session-artwork="custom" x="32" y="38" font-size="32" text-anchor="middle" dominant-baseline="middle">'+esc(icon)+'</text>':'<g data-session-artwork="default"><circle cx="22" cy="30" r="12" fill="#47d7ac"/><circle cx="36" cy="30" r="12" fill="#5b8def" opacity=".9"/><path d="M20 30h18" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/></g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0b0f16"/>'+identity+(badge?'<rect x="4" y="4" width="56" height="56" rx="12" fill="none" stroke="'+badge.color+'" stroke-width="8"/><g data-status-marker="'+attention+'" data-status-layout="peripheral"><circle cx="50" cy="50" r="10.5" fill="#0b0f16"/><circle cx="50" cy="50" r="8" fill="'+badge.color+'"/><text x="50" y="54" font-family="Segoe UI Symbol,Arial,sans-serif" font-size="15" font-weight="900" text-anchor="middle" fill="#071018">'+badge.glyph+'</text></g>':'')+'</svg>';
  }
  function attentionLabel(kind){return t(({done:'attentionDone',operator_needed:'attentionQuestion',error:'attentionError'})[kind]||'attentionIdle');}
  function renderSessionIdentity(){
    const preview=$('#session-favicon-preview');preview.innerHTML=faviconMarkup();preview.dataset.state=state.attentionState;preview.dataset.icon=state.sessionIcon;preview.setAttribute('role','img');preview.setAttribute('aria-label',t('sessionIcon')+' · '+attentionLabel(state.attentionState));$('#sessionFavicon').href='data:image/svg+xml,'+encodeURIComponent(faviconMarkup());
  }
  function notificationExamples(){
    return '<section class="attention-examples"><h3>'+esc(t('attentionExamples'))+'</h3><div class="attention-example-controls">'+['done','operator_needed','error'].map(kind=>'<button type="button" data-demo-action="attention-example" data-help="attentionExample" data-state="'+kind+'" aria-pressed="'+(state.attentionState===kind)+'">'+faviconMarkup(state.sessionIcon,kind)+'<span>'+esc(attentionLabel(kind))+'</span></button>').join('')+'</div><p id="attention-example-result" class="inline-note" aria-live="polite">'+esc(t('attentionExamplesHint'))+'</p></section>';
  }
  function openSessionMenu(){
    openModal(t('sessionMore'),'<p class="tab-intro">'+esc(t('sessionMoreIntro'))+'</p><div class="session-more-actions">'+
      button('session-fullscreen',t('sessionFullscreen'),'sessionFullscreen','aria-pressed="'+$('#demo-shell').classList.contains('dialog-only')+'"')+'<p>'+esc(t('fullscreenValue'))+'</p>'+
      button('session-history',t('sessionHistory'),'sessionHistory')+'<p>'+esc(t('historyValue'))+'</p>'+
      button('session-help',t('sessionHelp'),'sessionHelp')+'<p>'+esc(t('sessionHelpValue'))+'</p>'+
      button('session-icon',t('sessionIcon'),'faviconIdentity','data-source-id="btnIcon"')+'<p>'+esc(t('faviconValue'))+'</p>'+
      button('session-sound',t('sessionSound')+' · '+t(state.soundEnabled?'soundOn':'soundOff'),'soundSettings','data-source-id="btnDoneSound"')+'<p>'+esc(t('soundValue'))+'</p></div>');
  }
  function openFavicon(){
    openModal(t('sessionIcon'),'<p class="tab-intro">'+esc(t('faviconValue'))+'</p><div class="favicon-tab-preview"><span id="favicon-draft-preview">'+faviconMarkup()+'</span><span>'+esc(state.profile.name??t('sessionTitle'))+'</span></div><label class="small-label" for="bmMiniFaviconInput">'+esc(t('faviconChoose'))+'</label><div class="bm-mini-icons favicon-icons" id="bmMiniFaviconIcons">'+['🧠','📌','✅','⚠️','🔑','🔧','📚','🧭'].map(icon=>'<button type="button" data-favicon-icon="'+icon+'" data-demo-action="favicon-select" data-help="faviconChoose" aria-pressed="'+(state.sessionIcon===icon)+'">'+icon+'</button>').join('')+'</div><label class="small-label" for="bmMiniFaviconInput">'+esc(t('faviconCustom'))+'</label><input class="form-select" id="bmMiniFaviconInput" data-source-id="bmMiniFaviconInput" data-help="faviconCustom" maxlength="24" value="'+esc(state.sessionIcon)+'" placeholder="'+esc(t('faviconPlaceholder'))+'"><div class="toolbar favicon-reset-row">'+button('favicon-reset',t('faviconReset'),'faviconReset')+'</div><p class="inline-note">'+esc(t('faviconExampleNote'))+'</p>'+notificationExamples());
    $('.modal-footer',$('#demo-dialog')).innerHTML=button('close-modal',t('cancel'),'close')+button('favicon-save',t('save'),'faviconSave','class="primary" data-source-id="bmMiniOk"');refreshHelp($('#demo-dialog'));
  }
  function updateFaviconDraft(){
    const input=$('#bmMiniFaviconInput');if(!input)return;$('#favicon-draft-preview').innerHTML=faviconMarkup(input.value.trim());
    $$('[data-favicon-icon]',$('#demo-dialog')).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.faviconIcon===input.value.trim())));
  }
  function openSound(){
    openModal(t('sessionSound'),'<p class="tab-intro">'+esc(t('soundValue'))+'</p><label class="sound-enabled-label"><input id="bmMiniDoneSoundEnabled" data-source-id="bmMiniDoneSoundEnabled" type="checkbox" data-demo-action="sound-enabled" data-help="soundEnable" '+(state.soundEnabled?'checked':'')+'><span>'+esc(t('soundEnable'))+'</span></label><label class="small-label" for="bmMiniDoneSoundSelect">'+esc(t('soundChoose'))+'</label><select id="bmMiniDoneSoundSelect" data-source-id="bmMiniDoneSoundSelect" class="form-select" data-demo-action="sound-select" data-help="soundChoose">'+['soft','double'].map(name=>'<option value="'+name+'" '+(state.soundName===name?'selected':'')+'>'+esc(t(name==='soft'?'soundSoft':'soundDouble'))+'</option>').join('')+'</select><div class="toolbar sound-preview-row">'+button('sound-preview',t('soundPreview'),'soundPreview','id="bmMiniDoneSoundPreview" data-source-id="bmMiniDoneSoundPreview"')+'</div><p id="sound-preview-status" class="inline-note" role="status">'+esc(t('soundPreviewHint'))+'</p>'+notificationExamples());
    $('.modal-footer',$('#demo-dialog')).innerHTML=button('close-modal',t('cancel'),'close')+button('sound-save',t('save'),'soundSave','class="primary" data-source-id="bmMiniOk"');refreshHelp($('#demo-dialog'));
  }
  let previewAudio=null;
  async function playDemoSound(name){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){announce(t('soundUnavailable'));const note=$('#sound-preview-status');if(note)note.textContent=t('soundUnavailable');return;}
    try{
      if(previewAudio)await previewAudio.close().catch(()=>{});
      const context=new Audio();previewAudio=context;if(context.state==='suspended')await context.resume();
      const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(name==='double'?660:740,now);oscillator.frequency.setValueAtTime(name==='double'?880:620,now+.13);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.055,now+.02);gain.gain.exponentialRampToValueAtTime(.001,now+.28);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(now);oscillator.stop(now+.3);
      oscillator.onended=()=>{context.close().catch(()=>{});if(previewAudio===context)previewAudio=null;};
      const note=$('#sound-preview-status');if(note)note.textContent=t('soundPlayed');announce(t('soundPlayed'));
    }catch{if(previewAudio){await previewAudio.close().catch(()=>{});previewAudio=null;}const note=$('#sound-preview-status');if(note)note.textContent=t('soundUnavailable');announce(t('soundUnavailable'));}
  }
  function runAttentionAction(action,el){
    switch(action){
      case 'dialog-file-open':{const ref=paneReference(el);if(!ref)break;saveDraft();openModal(t(ref.file.name),'<p class="tab-intro">'+esc(ref.path)+'</p>'+mdBox(docText(ref.file.id,state.lang))+'<div class="toolbar">'+paneButton(ref)+'</div>');break;}
      case 'dialog-file-pane':{const ref=paneReference(el);if(!ref)break;state.paneRef={path:ref.path,line:ref.line,column:ref.column};if($('#demo-dialog').open)closeModal();chooseDoc(ref.file.id);if(window.matchMedia('(max-width:760px)').matches)$('#workspace-panel').scrollIntoView({block:'start',behavior:'instant'});announce(t('dialogFileOpened')+' '+ref.path);break;}
      case 'session-more':openSessionMenu();break;
      case 'session-icon':openFavicon();break;
      case 'favicon-select':$('#bmMiniFaviconInput').value=el.dataset.faviconIcon;updateFaviconDraft();break;
      case 'favicon-reset':$('#bmMiniFaviconInput').value='';updateFaviconDraft();break;
      case 'favicon-save':state.sessionIcon=$('#bmMiniFaviconInput').value.trim();renderSessionIdentity();closeModal();announce(t('faviconSaved'));break;
      case 'session-sound':openSound();break;
      case 'sound-preview':void playDemoSound($('#bmMiniDoneSoundSelect').value);break;
      case 'sound-save':state.soundEnabled=$('#bmMiniDoneSoundEnabled').checked;state.soundName=$('#bmMiniDoneSoundSelect').value;closeModal();announce(t(state.soundEnabled?'soundSavedOn':'soundSavedOff'));break;
      case 'attention-example':{
        const kind=el.dataset.state;if(!['done','operator_needed','error'].includes(kind))break;state.attentionState=kind;renderSessionIdentity();updateFaviconDraft();
        $$('[data-demo-action="attention-example"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.state===kind)));
        const audible=state.soundEnabled&&['done','operator_needed'].includes(kind),note=$('#attention-example-result');if(note)note.textContent=attentionLabel(kind)+' · '+t(audible?'attentionWithSound':'attentionSilent');if(audible)void playDemoSound(state.soundName);else announce(attentionLabel(kind)+' · '+t('attentionSilent'));break;
      }
      default:return false;
    }
    return true;
  }
  function refreshHelp(root=document){
    $$('[data-label]',root).forEach(el=>el.setAttribute('aria-label',t(el.dataset.label)));
    $$('[data-help]',root).forEach(el=>{const key=el.dataset.help;el.setAttribute('aria-description',help(key));if(!el.textContent.trim()||['expand-dialog','export-dialog','workspace-help','close-modal','clear-draft','attach'].includes(el.dataset.demoAction))el.setAttribute('aria-label',t(({ 'expand-dialog':'expandDialog','export-dialog':'exportDialog','workspace-help':'workspaceHelp','close-modal':'close','clear-draft':'clearDraft','attach':'attach'})[el.dataset.demoAction]??key));});
  }
  function translateStatic(){
    document.documentElement.lang=state.lang;document.body.dataset.scene=state.scene;document.title=`MyTwoBrain · ${t('workspace')} · ${t('localLabel')}`;
    $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));$$('[data-placeholder]').forEach(el=>el.placeholder=t(el.dataset.placeholder));
    $('#chat-stream').setAttribute('aria-label',t('dialogLabel'));$('#workspace-tabs').setAttribute('aria-label',t('workspaceLabel'));refreshHelp();
  }
  function messagesFor(lang=state.lang){
    const D=C[lang];
    return D.dialogMessages.map(m=>({...m,text:m.key?D[m.key]:''})).concat(state.messages.map((m,i)=>({...m,id:`local-${i}`,time:'14:12',phase:m.role==='human'?'userPhase':'answerPhase',text:m.prepared?D.preparedReply:m.text})));
  }
  const messageById=(id,lang=state.lang)=>messagesFor(lang).find(m=>m.id===id);
  const messageElement=id=>$$('#chat-stream [data-message-id]').find(el=>el.dataset.messageId===id);
  function renderSessionHeader(){
    $('#dialog-title').textContent=`D001 · ${state.profile.name??t('sessionTitle')}`;
    $('#btnDialogSurface').setAttribute('aria-pressed',String(state.surface==='dialog'));
    $('#btnTerminalV2Surface').setAttribute('aria-pressed',String(state.surface==='terminal'));
    $('.terminal-presence').classList.toggle('is-stopped',!state.terminalRunning);
    $('.conversation-column').dataset.surface=state.surface;
    $('#chat-stream').hidden=state.surface!=='dialog';$('#dialog-queue-rail').hidden=state.surface!=='dialog';$('#terminal-view').hidden=state.surface!=='terminal';$('.composer-pane').hidden=state.surface==='terminal';
    $('#terminal-view').setAttribute('aria-label',t('terminalTitle'));renderSessionIdentity();refreshHelp($('#session-header'));
  }
  function setSurface(surface){
    if(!['dialog','terminal'].includes(surface))return;
    saveDraft();hideSelectionTools();state.surface=surface;renderSessionHeader();
    if(surface==='terminal')renderTerminal();else {$('#chat-stream').scrollTop=state.dialogScroll;renderComposer();}
  }
  function renderQueue(){
    const text=state.queuedText||t('queueSample');
    $('#dialog-queue-rail').innerHTML=`<div class="dialog-queue-head"><button id="dialog-queue-toggle" class="dialog-queue-toggle" type="button" data-demo-action="queue-toggle" data-help="queueToggle" aria-expanded="${state.queueExpanded}" aria-controls="dialog-queue-details"><strong class="queue-count">${esc(t('queuedCount'))}</strong><span class="queue-preview">${esc(text)}</span><span class="queue-chevron" aria-hidden="true">${state.queueExpanded?'⌃':'⌄'}</span></button>${button('queue-help','?','queueHelp',`class="help-q" aria-label="${esc(t('queueTitle'))}"`)}</div><div class="dialog-queue-details" id="dialog-queue-details" ${state.queueExpanded?'':'hidden'}><article class="msg msg-user queue-message"><header class="msg-head"><div class="msg-head-main"><div class="msg-head-toolbar"><span class="msg-role">${dialogIcon('user')} ${esc(t('userAuthor'))}</span><span class="queue-state">${esc(t('queueWaiting'))}</span><time class="msg-ts">14:09 · ${esc(t('queueWait'))}</time></div></div></header><div class="message-body user-text">${esc(text)}</div><footer class="queue-delivery">${button('queue-delivery',t('queueDelivery'),'queueDelivery')}</footer></article></div>`;
    if(state.queueItems.length){
      const list=$('#dialog-queue-details'),template=$('.queue-message',list),earlier=[t('queueSample'),...state.queueItems.slice(0,-1)];
      earlier.reverse().forEach(text=>{const row=template.cloneNode(true);$('.message-body',row).textContent=text;list.prepend(row);});
      $('.queue-count',$('#dialog-queue-rail')).textContent=t('queueTitle')+' · '+(state.queueItems.length+1);
    }
    refreshHelp($('#dialog-queue-rail'));
  }
  function planCard(){
    const next=state.plan.indexOf(false);
    return `<div class="agent-plan-card"><div class="agent-plan-explanation">${esc(t('agentPlanIntro'))}</div><ul class="agent-plan-steps">${C[state.lang].plans.map((p,i)=>`<li class="agent-plan-step ${!state.plan[i]?'pending':''}"><span class="plan-check" aria-hidden="true">${state.plan[i]?'✓':i===next?'◉':'○'}</span><span>${esc(p[0])} — ${esc(p[1])}</span></li>`).join('')}</ul></div>`;
  }
  function inlineGloss(m){
    const pairs=C[state.lang].glossPairs.filter(([word])=>m.text.toLowerCase().includes(word.toLowerCase()));
    return `<section class="msg-translation-panel message-inline-gloss" id="gloss-${m.id}" aria-label="${esc(t('messageGloss'))}"><h3>Gloss · ${esc(t('glossExampleLabel'))}</h3>${pairs.length?`<div class="gloss-pairs">${pairs.map(([word,meaning])=>`<span class="gloss-pair"><strong>${esc(word)}</strong> <span>(${esc(meaning)})</span></span>`).join('')}</div>`:`<p>${esc(t('glossNoTerms'))}</p>`}<p class="gloss-caption">${esc(t('glossCaption'))}</p></section>`;
  }
  function ordinaryMessage(m){
    const actions=[['translate_selection','','selectionGloss','globe'],['bookmark_selection','','selectionBookmark','pin'],['selection_actions','⋯','selectionActions'],['copy','Copy','messageCopy'],['explain','Gloss','messageGloss'],['translation_note','translation','messageTranslation']];
    const toolbar=actions.map(([action,label,key,icon],i)=>button(action,label,key,`class="msg-action ${i<3?'msg-action-icon':''}" data-msg-action="${action}" data-action="${action}" aria-label="${esc(t(key))}" ${action==='explain'?`aria-expanded="${state.glossed.includes(m.id)}" aria-controls="gloss-${m.id}"`:''}`,icon)).join('');
    const phase=m.phase==='answerPhase'?'final':m.role==='human'?'user':'commentary';
    return `<article class="msg msg-${m.role==='human'?'user':'assistant'} message ${m.role}" data-message-id="${m.id}" data-msg-id="${m.id}" data-msg-role="${m.role==='human'?'user':'assistant'}" data-msg-phase="${phase}" ${m.role==='human'?`aria-current="${state.currentUser===m.id}"`:''}><header class="msg-head"><div class="msg-head-main"><div class="msg-head-toolbar"><span class="msg-role">${dialogIcon(m.role==='human'?'user':'agent')} ${esc(t(m.role==='human'?'userAuthor':'agentAuthor'))}</span><time class="msg-ts" datetime="2026-10-20T${m.time}:00Z">20.10 · ${m.time}</time><div class="msg-actions" data-msg-actions>${toolbar}</div></div><div class="msg-head-badges"><span class="msg-phase ${phase}">${esc(t(m.phase))}</span><span class="msg-sample">${esc(t('samplePhase'))}</span></div></div></header>${m.role==='human'?`<div class="msg-body message-body md-content user-text" data-markdown-source="${esc(m.text)}">${esc(m.text)}</div>`:mdBox(m.text,'msg-body message-body')}${state.glossed.includes(m.id)?inlineGloss(m):''}</article>`;
  }
  function renderDialog(){
    const stream=$('#chat-stream'),previous=state.dialogScroll;
    stream.innerHTML=messagesFor().map(m=>m.role==='plan'?`<article class="msg msg-assistant msg-plan" data-message-id="${m.id}" data-msg-id="${m.id}" data-msg-role="assistant" data-msg-phase="plan" data-dialog-plan-card="1"><header class="msg-head"><div class="msg-head-main"><div class="msg-head-toolbar"><span class="msg-role">☑ ${esc(t('planAuthor'))}</span><time class="msg-ts">20.10 · ${m.time}</time></div><div class="msg-head-badges"><span class="msg-phase plan">PLAN</span></div></div></header><div class="msg-body">${planCard()}</div></article>`:ordinaryMessage(m)).join('');
    stream.dataset.readingTail=String(state.readingTail);renderMarkdown(stream);stream.scrollTop=previous;
  }
  function scrollToMessage(id){
    const el=messageElement(id),stream=$('#chat-stream');if(!el)return;
    const m=messageById(id);if(m?.role==='human')state.currentUser=id;
    $$('.msg-user[data-message-id]',stream).forEach(card=>card.setAttribute('aria-current',String(card.dataset.messageId===state.currentUser)));
    stream.scrollTop+=el.getBoundingClientRect().top-stream.getBoundingClientRect().top-6;state.dialogScroll=stream.scrollTop;state.readingTail=false;stream.dataset.readingTail='false';
  }
  function navigateUser(delta){
    setSurface('dialog');const users=messagesFor().filter(m=>m.role==='human');const current=Math.max(0,users.findIndex(m=>m.id===state.currentUser));const next=Math.max(0,Math.min(users.length-1,current+delta));scrollToMessage(users[next].id);announce(next===current?t(delta<0?'firstUser':'lastUser'):`${t('userAuthor')} · ${users[next].time}`);
  }
  function showLatest(){
    setSurface('dialog');const stream=$('#chat-stream'),users=messagesFor().filter(m=>m.role==='human');state.currentUser=users.at(-1)?.id??'u1';state.readingTail=true;stream.dataset.readingTail='true';
    $$('.msg-user[data-message-id]',stream).forEach(el=>el.setAttribute('aria-current',String(el.dataset.messageId===state.currentUser)));
    $$('.is-current-tail',stream).forEach(el=>el.classList.remove('is-current-tail'));stream.lastElementChild?.classList.add('is-current-tail');stream.scrollTop=stream.scrollHeight;state.dialogScroll=stream.scrollTop;announce(t('readingLatest'));
  }
  function captureSelection(){
    const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return null;
    const range=selection.getRangeAt(0),node=range.commonAncestorContainer,element=node.nodeType===1?node:node.parentElement;
    const body=element?.closest('#chat-stream .message-body'),card=body?.closest('[data-message-id]');
    if(!body||!card||!body.contains(range.startContainer)||!body.contains(range.endContainer))return null;
    const text=selection.toString().trim();if(!text)return null;state.selection={messageId:card.dataset.messageId,text};return {card,range};
  }
  function hideSelectionTools(){$('#selection-toolbar').hidden=true;}
  function showSelectionTools(){
    const selected=captureSelection();if(!selected||$('#demo-dialog').open){hideSelectionTools();return;}
    const menu=$('#selection-toolbar'),bounds=visibleBounds(),rect=selected.range.getBoundingClientRect();
    if(rect.bottom<bounds.top||rect.top>bounds.bottom){hideSelectionTools();return;}
    menu.dataset.messageId=selected.card.dataset.messageId;menu.innerHTML=button('translate_selection','Gloss','selectionGloss','','globe')+button('bookmark_selection','','selectionBookmark',`aria-label="${esc(t('selectionBookmark'))}"`,'pin')+button('selection_actions','⋯','selectionActions',`aria-label="${esc(t('selectionActions'))}"`);menu.hidden=false;refreshHelp(menu);
    const mr=menu.getBoundingClientRect();menu.style.left=`${Math.max(8,Math.min(rect.left,innerWidth-mr.width-8))}px`;menu.style.top=`${Math.max(bounds.top+8,Math.min(rect.bottom+7,bounds.bottom-mr.height-8))}px`;
  }
  function selectedContext(el){
    captureSelection();const id=el.dataset.messageId??el.closest('[data-message-id]')?.dataset.messageId??state.selection?.messageId;const m=messageById(id);
    if(!m)return null;if(state.selection?.messageId===id&&state.selection.text)return {m,text:state.selection.text};
    openModal(t('selectionRequired'),`<div id="selection-required"><p>${esc(t('selectionInstruction'))}</p><p class="small-label">${esc(t('selectionExample'))}</p><div class="selected-fragment">${esc(m.text.slice(0,280))}</div></div>`);return null;
  }
  const selectionQuote=text=>`<p class="selection-scope">${esc(t('selectionSource'))}</p><div class="selected-fragment">${esc(text)}</div>`;
  function openSelectionGloss(ctx){
    const matched=C[state.lang].glossPairs.filter(([word])=>ctx.text.toLowerCase().includes(word.toLowerCase()));const pairs=matched.length?matched:C[state.lang].glossPairs.slice(0,3);
    openModal(t('selectionGloss'),selectionQuote(ctx.text)+`<h3>${esc(t('glossExampleLabel'))}</h3>${!matched.length?`<p class="tab-intro">${esc(t('glossUnknown'))}</p>`:''}<div class="md-content"><table><thead><tr><th>${esc(t('glossWord'))}</th><th>${esc(t('glossTranslation'))}</th></tr></thead><tbody>${pairs.map(([word,meaning])=>`<tr><td>${esc(word)}</td><td>${esc(meaning)}</td></tr>`).join('')}</tbody></table></div><p class="inline-note">${esc(t('glossValue'))}</p>`);
  }
  function openBookmark(ctx){
    state.pendingBookmark={messageId:ctx.m.id,text:ctx.text};openModal(t('selectionBookmark'),selectionQuote(ctx.text)+`<label class="small-label" for="bookmark-comment">${esc(t('bookmarkComment'))}</label><textarea id="bookmark-comment" class="copy-field" rows="2" maxlength="240" data-help="bookmarkComment" placeholder="${esc(t('bookmarkCommentPlaceholder'))}"></textarea><div class="toolbar selection-menu-actions">${button('bookmark-save',t('bookmarkSave'),'bookmarkSave','class="primary"')}</div>`);
  }
  function saveBookmark(){
    const pending=state.pendingBookmark;if(!pending)return;state.savedNotes.push({id:`note-${++state.noteSequence}`,kind:'fragment',...pending,comment:$('#bookmark-comment').value.trim(),sourceLang:state.lang});state.pendingBookmark=null;closeModal();setTab('bookmarks');announce(t('bookmarkSaved'));
  }
  function saveTranslation(id){
    const m=messageById(id);if(!m||m.role==='plan')return;const target=state.lang==='ru'?'en':'ru';let note=state.savedNotes.find(n=>n.kind==='translation'&&n.messageId===id&&n.sourceLang===state.lang);
    if(!note){note={id:`note-${++state.noteSequence}`,kind:'translation',messageId:id,sourceLang:state.lang,targetLang:target,source:m.text,text:messageById(id,target)?.text??C[target].preparedReply,custom:id.startsWith('local-')&&m.role==='human'};state.savedNotes.push(note);}
    setTab('translation');announce(t('translationSaved'));
  }
  function savedTranslations(){
    return state.savedNotes.filter(n=>n.kind==='translation').slice().reverse().map(note=>`<article class="saved-translation-note" data-note-id="${note.id}" data-message-id="${note.messageId}" data-note-kind="translation"><header class="note-heading"><h3>${esc(t('savedTranslation'))}</h3><span class="pill">${esc(t('samplePhase'))}</span></header><p class="saved-note-source">D001 · ${esc(t('noteSourceLang'))}: ${note.sourceLang.toUpperCase()} → ${note.targetLang.toUpperCase()} · ${esc(t('translationScope'))}</p><p class="saved-note-source user-text">${esc(note.source.slice(0,170))}${note.source.length>170?'…':''}</p>${note.custom?`<p class="inline-note">${esc(t('translationUserNote'))}</p>`:''}${mdBox(note.custom?C[note.targetLang].preparedReply:note.text,'note-body')}<div class="toolbar">${button('return-to-message',t('returnToMessage'),'returnToMessage',`data-message-id="${note.messageId}"`)}</div></article>`).join('');
  }
  function renderHistoryResults(){
    const root=$('#session-history-results');if(!root)return;const query=$('#session-history-search').value.trim().toLowerCase();const list=messagesFor().filter(m=>m.role!=='plan'&&(!query||m.text.toLowerCase().includes(query)));
    root.innerHTML=list.map(m=>`<article class="fixture-card"><h3>${esc(t(m.role==='human'?'userAuthor':'agentAuthor'))} · ${m.time}</h3><p>${esc(m.text.slice(0,180))}${m.text.length>180?'…':''}</p>${button('return-to-message',t('open'),'returnToMessage',`data-message-id="${m.id}"`)}</article>`).join('')||`<p class="inline-note">${esc(t('historyEmpty'))}</p>`;refreshHelp(root);
  }
  function profileValue(key,fallback){return state.profile[key]??t(fallback);}
  function openProfile(){
    const p=state.profile;
    const field=(key,label,value,kind='input')=>`<label for="profile-${key}">${esc(t(label))}</label>${kind==='textarea'?`<textarea id="profile-${key}" data-help="${label}" maxlength="800">${esc(value)}</textarea>`:`<input type="text" id="profile-${key}" data-help="${label}" value="${esc(value)}" maxlength="${key==='name'?80:200}">`}`;
    const flag=(id,label,key,helpKey)=>`<label class="profile-flag"><input type="checkbox" id="profile-${id}" data-demo-action="profile-flag" data-help="${helpKey}" ${p[key]?'checked':''}><span>${esc(label)}</span></label>`;
    openModal(`D001 · ${p.name??t('sessionTitle')}`,`<form id="profile-form" class="profile-form"><section class="profile-identity" aria-label="${esc(t('profileIdentity'))}"><span class="identity-label">${esc(t('profileTerminal'))}</span><span class="identity-value">D001 · terminal_demo</span><span></span><span class="identity-label">${esc(t('profileSessionId'))}</span><code>demo-dialog-001</code>${button('copy-profile-id',t('profileCopyId'),'profileCopyId')}<div class="profile-copy-wrap" id="profile-id-copy" hidden><input id="profile-copy-value" value="demo-dialog-001" data-help="profileCopyId" readonly aria-label="${esc(t('profileSessionId'))}"><p>${esc(t('copyHint'))}</p></div></section>${field('name','profileName',profileValue('name','sessionTitle'))}${field('description','profileDescription',profileValue('description','profileDefaultDescription'),'textarea')}<section class="profile-section"><h3>${esc(t('profileRoleSection'))}</h3>${field('role','profileRole',profileValue('role','profileDefaultRole'))}<div class="profile-flags">${flag('orchestrator','Orchestrator','orchestrator','profileOrchestrator')}${flag('special','Special','special','profileSpecial')}${flag('owner-only','Fedor only','ownerOnly','profileOwnerOnly')}${flag('pool','Pool','pool','profilePool')}</div>${field('context','profileContext',p.context)}<p class="profile-help">${esc(t('profileFlagsHint'))}</p>${flag('autostart',t('profileStartup'),'autostart','profileStartup')}<p class="profile-help">${esc(t('profileStartupHint'))}</p>${button('profile-topics-toggle',`▾ ${t('profileTopicsToggle')}`,'profileTopicsToggle','id="profile-topics-toggle" class="profile-topics-toggle" aria-expanded="true" aria-controls="profile-topic-fields"')}<div id="profile-topic-fields" class="profile-topic-fields">${field('topics','profileTopics',profileValue('topics','profileDefaultTopics'),'textarea')}${field('rules','profileRules',profileValue('rules','profileDefaultRules'),'textarea')}${field('forbidden','profileForbidden',profileValue('forbidden','profileDefaultForbidden'),'textarea')}${field('contracts','profileContracts',profileValue('contracts','profileDefaultContracts'),'textarea')}</div></section><section class="profile-section"><h3>${esc(t('profileRuntime'))}</h3><div class="profile-runtime-grid"><div><label for="profile-model">${esc(t('profileModel'))}</label><select id="profile-model" data-demo-action="profile-select" data-help="profileModel"><option value="balanced" ${p.model==='balanced'?'selected':''}>${esc(t('profileBalanced'))}</option><option value="deep" ${p.model==='deep'?'selected':''}>${esc(t('profileDeep'))}</option></select></div><div><label for="profile-reasoning">${esc(t('profileReasoning'))}</label><select id="profile-reasoning" data-demo-action="profile-select" data-help="profileReasoning">${['medium','high','xhigh'].map(v=>`<option value="${v}" ${p.reasoning===v?'selected':''}>${v}</option>`).join('')}</select></div></div><p class="profile-help">${esc(t('profileRuntimeHint'))}</p></section></form>`);
    const dialog=$('#demo-dialog');dialog.classList.add('profile-modal');$('.modal-footer',dialog).innerHTML=button('profile-cancel',t('cancel'),'profileCancel')+button('profile-save',t('saveProfile'),'profileSave','class="profile-save"');refreshHelp(dialog);requestAnimationFrame(()=>$('#profile-name')?.focus());
  }
  function saveProfile(){
    const name=$('#profile-name');if(!name.value.trim()){name.setCustomValidity(t('profileNameRequired'));name.reportValidity();return;}name.setCustomValidity('');const next={...state.profile};
    ['name','description','role','context','topics','rules','forbidden','contracts'].forEach(key=>next[key]=$(`#profile-${key}`).value.trim());
    [['orchestrator','orchestrator'],['special','special'],['ownerOnly','owner-only'],['pool','pool'],['autostart','autostart']].forEach(([key,id])=>next[key]=$(`#profile-${id}`).checked);
    if(next.pool){next.special=false;next.ownerOnly=false;}next.model=$('#profile-model').value;next.reasoning=$('#profile-reasoning').value;state.profile=next;state.reasoning=next.reasoning;closeModal();renderSessionHeader();renderComposer();announce(t('profileSaved'));
  }
  function renderTerminal(){
    const prior=$('#terminal-output')?.scrollTop??0,activeAction=document.activeElement?.dataset.demoAction;
    $('#terminal-view').innerHTML=`<header class="terminal-title-row"><h2>${esc(t('terminalTitle'))}</h2>${button('terminal-help','?','terminalHelp',`aria-label="${esc(t('terminalHelp'))}"`)}</header><p class="terminal-summary">${esc(t('terminalSummary'))} · <span class="terminal-runtime-state ${state.terminalRunning?'':'is-stopped'}">${esc(t(state.terminalRunning?'terminalRunning':'terminalStopped'))}</span></p><div class="terminal-controls">${button(state.terminalRunning?'terminal-stop':'terminal-start',state.terminalRunning?'Stop runtime':'Start runtime',state.terminalRunning?'terminalStop':'terminalStart')}${button('terminal-restart','Restart agent','terminalRestart')}${button('terminal-refresh','Upd','terminalRefresh')}${button('terminal-end','End','terminalEnd')}${button('terminal-live','Live PTY','terminalLive')}</div><pre id="terminal-output" class="terminal-output" tabindex="0" aria-label="${esc(t('terminalSummary'))}"></pre><form id="terminal-form" class="terminal-input-row"><label for="terminal-input" class="visually-hidden">${esc(t('terminalInput'))}</label><input id="terminal-input" type="text" data-help="terminalInput" autocomplete="off" placeholder="${esc(t('terminalInputPlaceholder'))}" value="${esc(state.terminalDraft)}"><button type="submit" data-demo-action="terminal-send" data-help="terminalSend">${esc(t('terminalSend'))}</button></form><p class="terminal-footnote">${esc(t('terminalFootnote'))}</p>`;
    $('#terminal-output').textContent=t('terminalInitial')+state.terminalEvents.map(e=>`\n\n${e.text!==undefined?`${t('terminalInputLog')}\n${e.text}\n${t('terminalInputNotice')}`:t(e.key)}`).join('');$('#terminal-output').scrollTop=prior;refreshHelp($('#terminal-view'));const nextAction=['terminal-stop','terminal-start'].includes(activeAction)?(state.terminalRunning?'terminal-stop':'terminal-start'):activeAction;if(nextAction)$$('#terminal-view [data-demo-action]').find(b=>b.dataset.demoAction===nextAction)?.focus({preventScroll:true});
  }
  function terminalEvent(key){
    state.terminalDraft=$('#terminal-input')?.value??state.terminalDraft;state.terminalEvents.push({key});renderTerminal();renderSessionHeader();$('#terminal-output').scrollTop=$('#terminal-output').scrollHeight;announce(t(key));
  }
  function terminalSend(){
    const input=$('#terminal-input'),text=input.value.trim();if(!text){input.setCustomValidity(t('terminalEmpty'));input.reportValidity();return;}input.setCustomValidity('');state.terminalEvents.push({text});state.terminalDraft='';renderTerminal();$('#terminal-output').scrollTop=$('#terminal-output').scrollHeight;$('#terminal-input').focus();announce(t('terminalInputNotice'));
  }
  function runDialogAction(action,el){
    switch(action){
      case 'dialog-view':setSurface('dialog');break;
      case 'terminal-view':setSurface('terminal');break;
      case 'profile':openProfile();break;
      case 'profile-cancel':closeModal();break;
      case 'profile-save':saveProfile();break;
      case 'copy-profile-id':$('#profile-id-copy').hidden=false;$('#profile-copy-value').focus();$('#profile-copy-value').select();break;
      case 'profile-topics-toggle':{const fields=$('#profile-topic-fields');fields.hidden=!fields.hidden;el.setAttribute('aria-expanded',String(!fields.hidden));el.textContent=`${fields.hidden?'▸':'▾'} ${t('profileTopicsToggle')}`;break;}
      case 'session-bookmark':setTab('bookmarks');break;
      case 'previous-message':navigateUser(-1);break;
      case 'next-message':navigateUser(1);break;
      case 'new-messages':showLatest();break;
      case 'session-more':openModal(t('sessionMore'),`<p class="tab-intro">${esc(t('sessionMoreIntro'))}</p><div class="session-more-actions">${button('session-fullscreen',t('sessionFullscreen'),'sessionFullscreen',`aria-pressed="${$('#demo-shell').classList.contains('dialog-only')}"`)}<p>${esc(t('fullscreenValue'))}</p>${button('session-history',t('sessionHistory'),'sessionHistory')}<p>${esc(t('historyValue'))}</p>${button('session-help',t('sessionHelp'),'sessionHelp')}<p>${esc(t('sessionHelpValue'))}</p></div>`);break;
      case 'session-fullscreen':closeModal();$('#demo-shell').classList.toggle('dialog-only');announce(t('fullscreenValue'));break;
      case 'session-history':openModal(t('sessionHistory'),`<label class="small-label" for="session-history-search">${esc(t('historySearch'))}</label><input id="session-history-search" type="search" class="history-search" data-help="historySearch" placeholder="${esc(t('historySearch'))}"><div id="session-history-results"></div>`);renderHistoryResults();break;
      case 'session-help':modalMarkdown(t('sessionHelp'),t('sessionHelpBody'));break;
      case 'queue-toggle':state.queueExpanded=!state.queueExpanded;renderQueue();$('#dialog-queue-toggle').focus();break;
      case 'queue-help':modalMarkdown(t('queueTitle'),`${t('queueLocal')}\n\n${t('queueDeliveryTable')}`);break;
      case 'queue-delivery':modalMarkdown(t('queueDeliveryTitle'),`${t('queueLocal')}\n\n${t('queueDeliveryTable')}`);break;
      case 'translate_selection':{const ctx=selectedContext(el);if(ctx)openSelectionGloss(ctx);break;}
      case 'bookmark_selection':{const ctx=selectedContext(el);if(ctx)openBookmark(ctx);break;}
      case 'selection_actions':{const ctx=selectedContext(el);if(ctx)openModal(t('selectionActions'),selectionQuote(ctx.text)+`<div class="toolbar selection-menu-actions" data-message-id="${ctx.m.id}">${button('selection-copy','Copy','selectionCopy')}${button('translate_selection','Gloss','selectionGloss')}${button('bookmark_selection',t('bookmark'),'selectionBookmark','','pin')}</div>`);break;}
      case 'selection-copy':{const ctx=selectedContext(el);if(ctx)copyModal(ctx.text,t('selectionSource'));break;}
      case 'bookmark-save':saveBookmark();break;
      case 'copy':{const m=messageById(el.closest('[data-message-id]')?.dataset.messageId);if(m)copyModal(m.text,t('messageCopy'));break;}
      case 'explain':{const card=el.closest('[data-message-id]'),m=messageById(card?.dataset.messageId);if(!m)break;const index=state.glossed.indexOf(m.id);if(index>=0){state.glossed.splice(index,1);$(`#gloss-${m.id}`,card)?.remove();}else{state.glossed.push(m.id);card.insertAdjacentHTML('beforeend',inlineGloss(m));}el.setAttribute('aria-expanded',String(index<0));break;}
      case 'translation_note':saveTranslation(el.closest('[data-message-id]')?.dataset.messageId);break;
      case 'return-to-message':{const id=el.dataset.messageId;if($('#demo-dialog').open)closeModal();setSurface('dialog');scrollToMessage(id);messageElement(id)?.scrollIntoView({block:'nearest',inline:'nearest'});break;}
      case 'terminal-help':modalMarkdown(t('terminalHelp'),`${t('terminalIntro')}\n\n${t('terminalHelpTable')}`);break;
      case 'terminal-stop':state.terminalRunning=false;terminalEvent('terminalStoppedLog');break;
      case 'terminal-start':state.terminalRunning=true;terminalEvent('terminalStartedLog');break;
      case 'terminal-restart':openModal(t('terminalRestartTitle'),`<p class="tab-intro">${esc(t('terminalRestartIntro'))}</p><div class="fixture-card"><h3>${esc(t('terminalRestartState'))}</h3><p class="restart-current-state">D001 · ${esc(t(state.terminalRunning?'terminalRunning':'terminalStopped'))}</p><p>${esc(t('terminalRestartSnapshot'))}</p></div>${mdBox(t('terminalRestartSteps'))}`);$('.modal-footer',$('#demo-dialog')).innerHTML=button('close-modal',t('cancel'),'close')+button('terminal-confirm-restart',t('terminalRestartConfirm'),'terminalConfirmRestart','class="primary"');refreshHelp($('#demo-dialog'));break;
      case 'terminal-confirm-restart':closeModal();state.terminalRunning=true;terminalEvent('terminalRestartLog');break;
      case 'terminal-refresh':terminalEvent('terminalRefreshLog');break;
      case 'terminal-end':$('#terminal-output').scrollTop=$('#terminal-output').scrollHeight;break;
      case 'terminal-live':openModal('Live PTY',`<p class="tab-intro">${esc(t('terminalLiveIntro'))}</p><pre class="terminal-output terminal-live-example">${esc(t('terminalLiveExample'))}</pre><p class="inline-note">${esc(t('terminalLiveNote'))}</p><div class="toolbar">${button('terminal-snapshot','V2 snapshot','terminalSnapshot')}</div>`);break;
      case 'terminal-snapshot':closeModal();break;
      case 'terminal-send':terminalSend();break;
      default:return false;
    }
    return true;
  }
  function renderAttachments(){
    $('#attachment-list').innerHTML=state.attachments.map(id=>`<span class="attachment-chip">${esc(id==='composer-image'?'interface-example.png':t(C.files.find(f=>f.id===id)?.name??'attach'))}${button('remove-attachment','×','remove',`data-file="${id}" aria-label="${esc(t('remove'))}"`)}</span>`).join('');refreshHelp($('#attachment-list'));
  }
  function renderWorkspace(){
    $$('#workspace-tabs [data-tab]').forEach(b=>{b.classList.add('session-side-tab');b.classList.toggle('active',b.dataset.tab===state.tab);b.setAttribute('aria-selected',String(b.dataset.tab===state.tab));b.tabIndex=b.dataset.tab===state.tab?0:-1;});
    const p=$('#workspace-panel');p.hidden=state.tab==='board';p.setAttribute('aria-labelledby',`tab-${state.tab}`);
    const boardHost=$('#workspace-board-container');boardHost.hidden=state.tab!=='board';
    const renderers={docs:()=>right?right.docs():docs(),agents:()=>right?right.agents():agents(),bookmarks:bookmarks,plan:plan,translation:translation,board:()=>'',context:context,focus:focus};p.innerHTML=renderers[state.tab]();renderMarkdown(p);refreshHelp(p);right?.afterRender();
    if(state.tab==='board'){
      if(!$('#workspace-board-frame')){const iframe=document.createElement('iframe');iframe.id='workspace-board-frame';iframe.title=t('boardTitle');iframe.setAttribute('sandbox','allow-scripts');iframe.src='./workspace-board/workspace-board.html?lang='+state.lang;boardHost.appendChild(iframe);}
      syncBoardLanguage();
    }
    if(state.tab==='docs'&&state.paneRef?.path===C.files.find(f=>f.id===state.doc)?.path){const ref=document.createElement('p');ref.id='doc-source-reference';ref.className='doc-source-reference';ref.textContent=t('dialogFileOrigin')+' '+state.paneRef.path+(state.paneRef.line?':'+state.paneRef.line+(state.paneRef.column?':'+state.paneRef.column:''):'');$('.document-address',p)?.insertAdjacentElement('afterend',ref);}
    // Keep the outer Knowledge chooser in sync with the real inner workspace view.
    if(parentOrigin&&window.parent!==window&&(state.tab==='board'||state.tab==='context')){
      window.parent.postMessage({type:'portfolio-workspace-inner-view',view:state.tab==='board'?'board':state.context},parentOrigin);
    }
  }
  function docs(){
    const keys=['viewer','edit','explorer','pane','original','translation'];
    const toolbar=keys.map(k=>button(`doc-${k}`,t(k),k,`aria-pressed="${['original','translation'].includes(k)?String(k==='translation'?state.translated:!state.translated):String(state.view===k)}"`)).join('');
    let content;
    if(state.view==='explorer')content=`<p class="tab-intro">${esc(t('docsIntro'))}</p>${fileRows('choose-doc')}`;
    else if(state.view==='edit')content=`<label class="small-label" for="doc-editor">Markdown · ${esc(t(C.files.find(f=>f.id===state.doc).name))}</label><textarea class="docswb-editor doc-editor" id="doc-editor" data-source-id="docsWorkbenchEditor" data-help="edit">${esc(docText())}</textarea><div class="toolbar" style="margin-top:10px">${button('save-doc',t('save'),'save','class="primary"')}${button('source-doc',t('showSource'),'source')}</div>`;
    else content=`<div class="doc-kicker"><span>${esc(t('docVersion'))}</span>${state.translated?`<span class="translated-badge">${esc(t('translation'))}</span>`:'<span>Markdown</span>'}</div>${mdBox(docText(),'docswb-preview')}`;
    return `<div class="session-side-action-row doc-toolbar">${toolbar}</div><div class="document-address"><label for="doc-path" class="visually-hidden">${esc(t('documentPath'))}</label><input id="doc-path" value="${esc(C.files.find(f=>f.id===state.doc).path)}" data-help="documentPath" spellcheck="false">${button('open-path',t('open'),'open')}${button('doc-viewer',t('view'),'view')}</div><div class="docswb-content-shell pane-content ${state.view==='viewer'?'doc-paper':''}">${content}</div>`;
  }
  function fileRows(action){return C.files.map(f=>`<div class="file-row"><div><strong>${esc(t(f.name))}</strong><small>${esc(f.path)}</small></div>${button(action,t(action==='attach-file'?'add':'open'),'select',`data-file="${f.id}"`)}</div>`).join('');}
  function agents(){return `<div class="pane-content"><p class="tab-intro">${esc(t('agentsIntro'))}</p>${C[state.lang].agents.map((a,i)=>`<article class="fixture-card"><h3>${esc(a[0])}<span class="pill">${esc(t('exampleData'))}</span></h3><p>${esc(a[1])}</p><small>${esc(t('formatted'))}: ${esc(a[2])}</small><div class="toolbar">${button('agent-detail',t('details'),'details',`data-index="${i}"`)}</div></article>`).join('')}</div>`;}
  function bookmarks(){
    const saved=state.savedNotes.filter(n=>n.kind==='fragment').map(note=>`<article class="fixture-card saved-bookmark" data-note-id="${note.id}" data-note-kind="fragment"><h3>${esc(t('bookmarkFromMessage'))}</h3><p class="saved-note-text">${esc(note.text)}</p>${note.comment?`<p class="saved-note-comment">${esc(note.comment)}</p>`:''}<div class="toolbar">${button('bookmark-detail',t('open'),'details',`data-note-id="${note.id}"`)}${button('return-to-message',t('returnToMessage'),'returnToMessage',`data-message-id="${note.messageId}"`)}</div></article>`).join('');
    return `<div class="pane-content"><p class="tab-intro">${esc(t('bookmarksIntro'))}</p>${saved}${C[state.lang].bookmarks.concat(state.bookmarked?[[t('dialog'),t('prompt')]]:[]).map((b,i)=>`<article class="fixture-card"><h3>${esc(b[0])}</h3><p>${esc(b[1])}</p><div class="toolbar">${button('bookmark-detail',t('open'),'details',`data-index="${i}"`)}${button('choose-doc',t('toDocs'),'toDocs','data-file="brief"')}</div></article>`).join('')}</div>`;
  }
  function plan(){return `<div class="pane-content"><p class="tab-intro">${esc(t('planIntro'))}</p><div class="metric-row"><div class="metric"><strong>${state.plan.filter(Boolean).length} / 3</strong><span>${esc(t('progress'))}</span></div><div class="metric"><strong>${state.plan.every(Boolean)?'✓':state.plan.indexOf(false)+1}</strong><span>${esc(t('next'))}</span></div></div>${C[state.lang].plans.map((p,i)=>`<label class="plan-item ${state.plan[i]?'done':''}"><input type="checkbox" data-plan="${i}" data-demo-action="plan-toggle" data-help="markDone" ${state.plan[i]?'checked':''}><span><strong>${esc(p[0])}</strong><small>${esc(p[1])}</small></span></label>`).join('')}<div class="toolbar tab-empty-space">${button('choose-doc',t('toDocs'),'toDocs','data-file="brief"')}${button('plan-detail',t('acceptance'),'details')}</div></div>`;}
  function translation(){return `<div class="session-side-action-row doc-toolbar">${button('translation-source',t('original'),'original',`aria-pressed="${!state.translated}"`)}${button('translation-target',t('translation'),'translation',`aria-pressed="${state.translated}"`)}${button('voice',t('voice'),'voice')}</div><div class="pane-content">${savedTranslations()}<label class="small-label" for="source-language">${esc(t('languageLabel'))}</label><select class="form-select" id="source-language" data-demo-action="source-language" data-help="language"><option value="ru" ${state.sourceLang==='ru'?'selected':''}>${esc(t('sourceRu'))}</option><option value="en" ${state.sourceLang==='en'?'selected':''}>${esc(t('sourceEn'))}</option></select><p class="inline-note">${esc(t('translationNote'))}</p>${mdBox(C[state.translated?(state.sourceLang==='ru'?'en':'ru'):state.sourceLang].transcript)}<div class="toolbar tab-empty-space">${button('choose-doc',t('voiceOpen'),'toDocs','data-file="transcript"')}</div></div>`;}
  function context(){const text=state.context==='ontology'?t('ontologyText'):state.context==='terms'?t('glossary'):t('contextSummary')+t('memoryText');return `<div class="pane-content"><p class="tab-intro">${esc(t('contextIntro'))}</p><div class="context-switch">${['memory','ontology','terms'].map(k=>button('context-view',t(k),k,`data-context="${k}" class="${state.context===k?'active':''}" aria-pressed="${state.context===k}"`)).join('')}</div>${mdBox(text)}<div class="toolbar tab-empty-space">${button('context-detail',t('details'),'details')}${button('choose-doc',t('toDocs'),'toDocs',`data-file="${state.context==='terms'?'glossary':'brief'}"`)}</div></div>`;}
  function focus(){
    const components=state.architecture==='components';
    const graph=state.lang==='ru'?(components?'flowchart TD\n A["Диалог"] --> B["Composer"]\n B --> C["Сессия выполнения"]\n A --> D["Markdown renderer"]\n D --> E["Документы и схемы"]\n C --> D':'flowchart TD\n A["Человек"] --> B["Рабочее место"]\n B --> C["Сессия выполнения"]\n B --> D["Материалы"]\n B --> E["Контекст"]\n C --> D'):(components?'flowchart TD\n A["Dialog"] --> B["Composer"]\n B --> C["Execution session"]\n A --> D["Markdown renderer"]\n D --> E["Documents and diagrams"]\n C --> D':'flowchart TD\n A["Human"] --> B["Workspace"]\n B --> C["Execution session"]\n B --> D["Materials"]\n B --> E["Context"]\n C --> D');
    return `<div class="architecture-focus-pane architecture-focus-shell pane-content"><p class="tab-intro">${esc(t('focusIntro'))}</p><div class="architecture-focus-hero architecture-focus-toolbar"><label class="small-label" for="architecture-level">${esc(t('architectureLevel'))}</label><select id="architecture-level" class="form-select" data-demo-action="architecture-level" data-help="architectureLevel"><option value="systems" ${!components?'selected':''}>${esc(t('architectureSystem'))}</option><option value="components" ${components?'selected':''}>${esc(t('architectureComponents'))}</option></select><div class="toolbar">${button('architecture-refresh',t('architectureRefresh'),'architectureRefresh')}${button('architecture-sources',t('architectureSources'),'architectureSources')}</div></div><div class="metric-row"><div class="metric"><strong class="architecture-value">${esc(t('architectureSnapshot'))}</strong><span>${esc(t('architectureFreshness'))}</span></div><div class="metric"><strong class="architecture-value">${esc(t('architectureSample'))}</strong><span>${esc(t('architectureHealth'))}</span></div></div><section class="architecture-focus-frame-card architecture-focus-graph">${mdBox('```mermaid\n'+graph+'\n```')}</section><div class="architecture-component-list">${['Dialog','Runtime','Docs','Context'].map(k=>`<article class="fixture-card"><h3>${esc(t('architecture'+k))}</h3>${button('architecture-detail',t('architectureDetail'),'architectureDetail',`data-component="${k}"`)}</article>`).join('')}</div></div>`;
  }
  function openModal(title,content){
    requestVisibleViewport();hideTooltip();const d=$('#demo-dialog');
    if(!d.open){const active=document.activeElement;lastFocus=active?.closest('#selection-toolbar')?$('.msg-actions button[data-demo-action="'+active.dataset.demoAction+'"]',messageElement(state.selection?.messageId)??document):active;}
    hideSelectionTools();d.classList.remove('profile-modal');$('#modal-title').textContent=title;$('#modal-body').innerHTML=content;
    $('.modal-footer',d).innerHTML=`<span>${esc(t('exampleData'))}</span>${button('close-modal',t('close'),'close','class="primary"')}`;
    renderMarkdown($('#modal-body'));refreshHelp(d);if(!d.open)d.showModal();d.append($('#business-tooltip'));
  }
  function closeModal(){const d=$('#demo-dialog');document.body.append($('#business-tooltip'));if(d.open)d.close();if(lastFocus?.isConnected)lastFocus.focus();}
  function copyModal(text,title=t('copy')){openModal(title,`<p class="tab-intro">${esc(t('copyHint'))}</p><label class="visually-hidden" for="copy-source">${esc(t('source'))}</label><textarea id="copy-source" class="copy-field" readonly>${esc(text)}</textarea>`);requestAnimationFrame(()=>{$('#copy-source')?.focus();$('#copy-source')?.select();});}
  function modalMarkdown(title,text,key){openModal(title,mdBox(text),key);}
  function chooseDoc(id){if(!C.files.some(f=>f.id===id))return;saveDraft();state.doc=id;state.view='viewer';state.tab='docs';state.translated=false;right?.chooseDoc(id);renderWorkspace();}
  function syncBoardLanguage(){if(boardReady)$('#workspace-board-frame')?.contentWindow?.postMessage({type:'portfolio-board-language',language:state.lang},'*');}
  function saveDraft(){const editor=$('#doc-editor');if(editor)state.edits[`${docLang()}:${state.doc}`]=editor.value;state.draft=$('#composer-input').value;const ti=$('#terminal-input');if(ti)state.terminalDraft=ti.value;if(state.surface==='dialog')state.dialogScroll=$('#chat-stream').scrollTop;}
  function setTab(tab,focusTab=false){if(!validTabs.includes(tab))return;saveDraft();state.tab=tab;renderWorkspace();if(focusTab)$(`#tab-${tab}`).focus();}
  function renderAll(){translateStatic();renderDialog();renderQueue();renderSessionHeader();if(state.surface==='terminal')renderTerminal();renderWorkspace();renderAttachments();renderComposer();$('#composer-input').value=state.draft;}
  function setLanguage(lang){
    if(!['ru','en'].includes(lang)||lang===state.lang)return;
    const soundDraft=state.scene==='alerts'&&$('#demo-dialog').open&&$('#bmMiniDoneSoundEnabled')
      ?{enabled:$('#bmMiniDoneSoundEnabled').checked,name:$('#bmMiniDoneSoundSelect').value}:null;
    saveDraft();state.lang=lang;hideTooltip();if($('#demo-dialog').open)closeModal();renderAll();syncBoardLanguage();
    if(soundDraft){openSound();$('#bmMiniDoneSoundEnabled').checked=soundDraft.enabled;$('#bmMiniDoneSoundSelect').value=soundDraft.name;}
    const tab=$(`#tab-${state.tab}`),tabs=$('#workspace-tabs');
    if(tab&&tabs){
      const box=tab.getBoundingClientRect(),rail=tabs.getBoundingClientRect();
      if(box.left<rail.left)tabs.scrollLeft-=rail.left-box.left;
      else if(box.right>rail.right)tabs.scrollLeft+=box.right-rail.right;
    }
    if(state.scene==='composer'&&state.surface==='dialog'){
      const input=$('#composer-input');input.scrollIntoView({block:'start',behavior:'instant'});input.focus({preventScroll:true});
    }
  }
  function composerPending(){return state.profile.model!==state.runtimeProfile.model||state.profile.reasoning!==state.runtimeProfile.reasoning;}
  function composerModelLabel(value){return t(value==='deep'?'profileDeep':'profileBalanced');}
  function composerFeedback(key,error=false){state.composerFeedback={key,error};renderComposerFeedback();announce(t(key));}
  function renderComposerFeedback(){const el=$('#composer-feedback'),f=state.composerFeedback;el.hidden=!f;el.classList.toggle('is-error',Boolean(f?.error));el.textContent=f?t(f.key):'';}
  function renderComposer(){
    const pending=composerPending(),profile=state.profile;
    const statusIcon=state.terminalRunning?'<path d="M7 3h10M7 21h10M8 3v5l4 4-4 4v5m8-18v5l-4 4 4 4v5"/>':'<rect x="5" y="5" width="14" height="14" rx="2"/>';
    $('#composer-presence').innerHTML='<div class="runtime-composer-presence-meta"><div class="runtime-composer-presence-main">'+
      '<button type="button" class="runtime-composer-presence-pill" data-source-id="runtimeComposerPresenceLabel" data-demo-action="status" data-help="composerPresence" aria-label="'+esc(t('composerPresence'))+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+statusIcon+'</svg><span data-source-id="runtimeComposerPresenceTimer">'+(state.terminalRunning?'00:02:18':esc(t('composerStopped')) )+'</span></button>'+
      button('composer-cv','cv','composerCv','class="runtime-composer-presence-cv" data-source-id="runtimeComposerPresenceCv"')+
      button('composer-context','Comp 38%','composerContext','class="runtime-composer-generation" data-source-id="runtimeComposerGeneration"')+
      button('composer-help','?','composerHelp','class="runtime-composer-presence-facts-toggle" data-source-id="runtimeComposerPresenceFactsToggle" aria-label="'+esc(t('composerHelp'))+'"')+
      '</div><div class="runtime-composer-profile">'+
      button('composer-plan',state.collaborationPlan?'Plan!':'Plan','composerPlan','class="runtime-composer-plan-btn" data-source-id="runtimeComposerPlanModeBtn" aria-pressed="'+state.collaborationPlan+'"')+
      '<select id="composer-model" class="runtime-live-profile-model" data-source-id="runtimeComposerModel" data-demo-action="composer-model" data-help="composerModel" aria-label="'+esc(t('composerModel'))+'">'+['balanced','deep'].map(v=>'<option value="'+v+'" '+(profile.model===v?'selected':'')+'>'+esc(composerModelLabel(v))+'</option>').join('')+'</select>'+
      '<select id="composer-reasoning" class="runtime-composer-reasoning" data-source-id="runtimeComposerReasoning" data-demo-action="composer-reasoning" data-help="composerReasoning" aria-label="'+esc(t('composerReasoning'))+'">'+['xhigh','high','medium'].map(v=>'<option value="'+v+'" '+(profile.reasoning===v?'selected':'')+'>'+v+'</option>').join('')+'</select>'+
      (pending?button('composer-profile-state',t('composerPending'),'composerPendingHelp','class="runtime-live-profile-state" data-source-id="runtimeLiveProfileState"')+button('composer-profile-cancel',t('cancel'),'composerPendingCancel','class="runtime-live-profile-cancel" data-source-id="runtimeLiveProfileCancel"'):'')+'</div></div>';
    $('#composer-input').lang=state.lang;renderComposerFeedback();refreshHelp($('#composer-presence'));
  }
  function setComposerDraft(value){state.draft=value;$('#composer-input').value=value;$('#composer-input').setCustomValidity('');}
  function recordComposer(kind,text,outcome){state.buffer.push({kind,text,outcome});if(state.buffer.length>20)state.buffer.shift();}
  function openBuff(){
    openModal('Buff', '<p class="tab-intro">'+esc(t('composerBuffIntro'))+'</p><div data-source-id="runtimeComposerHistoryList" id="composer-buffer-list">'+(state.buffer.length?state.buffer.map((m,i)=>'<article class="fixture-card composer-receipt" data-buffer-kind="'+esc(m.kind)+'"><h3>'+esc(m.kind)+' <span class="pill">'+esc(t(m.outcome))+'</span></h3><p class="user-text">'+esc(m.text)+'</p><p class="composer-receipt-meta">'+esc(t('exampleData'))+' · '+(i+1)+'</p></article>').join(''):'<p class="inline-note">'+esc(t('buffEmpty'))+'</p>')+'</div>');
    $('.modal-footer',$('#demo-dialog')).innerHTML=button('buff-clean','Clean','composerBuffClean','data-source-id="runtimeComposerHistoryClearAll" class="runtime-composer-btn-danger"')+button('close-modal',t('close'),'close','data-source-id="runtimeComposerHistoryClose"');refreshHelp($('#demo-dialog'));
  }
  function openComposerPending(){
    openModal(t('composerProfileTitle'),'<p class="tab-intro">'+esc(t('composerPendingIntro'))+'</p><div class="fixture-card"><h3>'+esc(t('composerConfirmed'))+'</h3><p>'+esc(composerModelLabel(state.runtimeProfile.model))+' · '+esc(state.runtimeProfile.reasoning)+'</p></div><div class="fixture-card"><h3>'+esc(t('composerChosen'))+'</h3><p>'+esc(composerModelLabel(state.profile.model))+' · '+esc(state.profile.reasoning)+'</p></div><p class="inline-note">'+esc(t('composerProfileProof'))+'</p>');
    $('.modal-footer',$('#demo-dialog')).innerHTML=button('composer-profile-cancel',t('cancel'),'composerPendingCancel')+button('composer-profile-confirm',t('composerShowConfirmation'),'composerProfileConfirm','class="primary"');refreshHelp($('#demo-dialog'));
  }
  function confirmComposerProfile(){state.runtimeProfile={model:state.profile.model,reasoning:state.profile.reasoning};renderComposer();}
  function send(queueOnly=false){
    const value=$('#composer-input').value.trim();
    if(!value){composerFeedback(queueOnly?'composerEmptyQueue':'emptyPrompt',true);$('#composer-input').focus();return;}
    if(composerPending()){openComposerPending();return;}
    if(queueOnly){
      state.queueItems.push(value);state.queuedText=value;state.queueExpanded=true;renderQueue();recordComposer('Tab',value,'composerQueued');composerFeedback('composerQueueSuccess');
    }else{
      state.messages.push({role:'human',text:value},{role:'assistant',prepared:true});recordComposer('Send',value,'composerDelivered');renderDialog();showLatest();composerFeedback('composerSendSuccess');
    }
    setComposerDraft('');state.attachments=[];renderAttachments();$('#composer-input').focus();
  }
  function openComposerNote(){
    openModal('Note','<p class="tab-intro">'+esc(t('composerNoteIntro'))+'</p><label class="small-label" for="composer-note-kind">'+esc(t('composerNoteKind'))+'</label><select id="composer-note-kind" class="form-select" data-help="composerNote"><option value="clarify">'+esc(t('composerClarify'))+'</option><option value="question">'+esc(t('composerQuestion'))+'</option></select><label class="small-label" for="composer-note-text">'+esc(t('composerNoteText'))+'</label><textarea id="composer-note-text" class="composer-modal-text" rows="4" data-help="composerNote" placeholder="'+esc(t('composerNotePlaceholder'))+'">'+esc(state.draft||t('composerNoteSample'))+'</textarea><p class="inline-note">'+esc(t('composerDraftPreserved'))+'</p>');
    $('#composer-note-kind').dataset.demoAction='composer-note-kind';
    $('.modal-footer',$('#demo-dialog')).innerHTML=button('close-modal',t('cancel'),'close')+button('composer-note-send',t('composerShowDelivery'),'composerNoteSend','class="primary"');refreshHelp($('#demo-dialog'));
  }
  function openComposerGoal(){
    openModal('Goal','<p class="tab-intro">'+esc(t('composerGoalIntro'))+'</p><label class="small-label" for="composer-goal-text">'+esc(t('composerGoalObjective'))+'</label><textarea id="composer-goal-text" class="composer-modal-text" rows="4" data-help="composerGoal">'+esc(state.goalText||t('composerGoalSample'))+'</textarea><p class="inline-note">'+esc(t('composerGoalBoundary'))+'</p>');
    $('.modal-footer',$('#demo-dialog')).innerHTML=button('close-modal',t('cancel'),'close')+button('composer-goal-confirm',t('composerGoalSet'),'composerGoalSet','class="primary"');refreshHelp($('#demo-dialog'));
  }
  function runComposerAction(action,el){
    switch(action){
      case 'buff':openBuff();break;
      case 'buff-clean':state.buffer=[];openBuff();composerFeedback('composerBuffCleaned');break;
      case 'clear-draft':setComposerDraft('');$('#composer-input').focus();composerFeedback('composerCleared');break;
      case 'composer-plan':state.collaborationPlan=!state.collaborationPlan;renderComposer();$('[data-demo-action="composer-plan"]').focus();composerFeedback(state.collaborationPlan?'composerPlanOn':'composerPlanOff');break;
      case 'composer-cv':modalMarkdown(t('composerCv'),t('composerVersionsBody'));break;
      case 'composer-context':modalMarkdown(t('composerContext'),t('composerContextBody'));break;
      case 'composer-help':case 'status':modalMarkdown(t('composerHelp'),t('composerFactsBody')+'\n\n**'+t('composerCurrentState')+':** '+t(state.terminalRunning?'composerWorking':'composerStopped')+'.');break;
      case 'composer-profile-state':openComposerPending();break;
      case 'composer-profile-cancel':state.profile.model=state.runtimeProfile.model;state.profile.reasoning=state.runtimeProfile.reasoning;state.reasoning=state.profile.reasoning;if($('#demo-dialog').open)closeModal();renderComposer();composerFeedback('composerProfileCancelled');break;
      case 'composer-profile-confirm':confirmComposerProfile();closeModal();composerFeedback('composerProfileConfirmed');break;
      case 'continue':openModal(t('continueTitle'),'<p class="tab-intro">'+esc(t('composerContinueIntro'))+'</p><div class="fixture-card"><h3>'+esc(t('composerExactCommand'))+'</h3><pre id="composer-continue-command">'+esc(t('composerContinueCommand'))+'</pre></div>'+mdBox(t('composerContinueBody')));$('.modal-footer',$('#demo-dialog')).innerHTML=button('close-modal',t('cancel'),'close')+button('composer-continue-confirm',t('composerConfirmContinue'),'composerContinueConfirm','class="primary"');refreshHelp($('#demo-dialog'));break;
      case 'composer-continue-confirm':recordComposer('Continue',t('composerContinueCommand'),'composerDelivered');closeModal();composerFeedback('composerContinueSuccess');break;
      case 'composer-note':openComposerNote();break;
      case 'composer-note-send':{const text=$('#composer-note-text').value.trim();if(!text){$('#composer-note-text').focus();$('#composer-note-text').setCustomValidity(t('emptyPrompt'));$('#composer-note-text').reportValidity();break;}const kind=$('#composer-note-kind').value;recordComposer('Note · '+kind,text,'composerDelivered');modalMarkdown('Note',t(kind==='clarify'?'composerClarifyResult':'composerQuestionResult')+'\n\n> '+text.replace(/\n/g,'\n> ')+'\n\n'+t('composerDraftPreserved'));composerFeedback('composerNoteSuccess');break;}
      case 'composer-goal':openComposerGoal();break;
      case 'composer-goal-confirm':{const text=$('#composer-goal-text').value.trim();if(!text){$('#composer-goal-text').focus();$('#composer-goal-text').setCustomValidity(t('emptyPrompt'));$('#composer-goal-text').reportValidity();break;}state.goalText=text;recordComposer('Goal',text,'composerGoalAccepted');modalMarkdown('Goal',t('composerGoalResult')+'\n\n> '+text.replace(/\n/g,'\n> ')+'\n\n'+t('composerGoalBoundary'));composerFeedback('composerGoalSuccess');break;}
      case 'attach':openModal(t('attach'),'<p class="tab-intro">'+esc(t('composerImageIntro'))+'</p><figure class="composer-image-example"><svg viewBox="0 0 460 170" role="img" aria-label="'+esc(t('composerImageAlt'))+'"><rect x="1" y="1" width="458" height="168" rx="12" fill="#101b29" stroke="#47617b"/><rect x="18" y="20" width="250" height="128" rx="6" fill="#203147"/><rect x="286" y="20" width="155" height="128" rx="6" fill="#29352a"/><path d="M32 40h130m-130 18h218M32 85h218m-218 18h180m118-61h98m-98 20h98m-98 20h78" stroke="#9db3bf" stroke-width="5" stroke-linecap="round"/><circle cx="240" cy="126" r="9" fill="#d3be85"/></svg><figcaption>'+esc(t('composerImageCaption'))+'</figcaption></figure><div class="toolbar">'+button('composer-attach-image',t('composerInsertImage'),'composerInsertImage','class="primary"')+'</div>');break;
      case 'composer-attach-image':{const field=$('#composer-input'),start=field.selectionStart??field.value.length,end=field.selectionEnd??start,link='![interface-example.png](artifacts/example/interface-example.png)';setComposerDraft(field.value.slice(0,start)+(start&&field.value[start-1]!=='\n'?'\n':'')+link+'\n'+field.value.slice(end));if(!state.attachments.includes('composer-image'))state.attachments.push('composer-image');renderAttachments();closeModal();field.focus();composerFeedback('composerImageInserted');break;}
      case 'remove-attachment':if(el.dataset.file!=='composer-image')return false;state.attachments=state.attachments.filter(id=>id!=='composer-image');setComposerDraft($('#composer-input').value.replaceAll('![interface-example.png](artifacts/example/interface-example.png)',''));renderAttachments();composerFeedback('removed');break;
      case 'queue':send(true);break;
      case 'send':send();break;
      default:return false;
    }
    return true;
  }
  function runAction(action,el){
    if(right?.action(action,el))return;
    if(runAttentionAction(action,el))return;
    if(runComposerAction(action,el))return;
    if(runDialogAction(action,el))return;
    switch(action){
      case 'tab':setTab(el.dataset.tab);break;
      case 'guide':modalMarkdown(t('guide'),state.lang==='ru'?'## Три области одной задачи\n\n1. **Диалог:** прочитайте оформленный ответ, таблицу и схему.\n2. **Задача и состояние:** добавьте материал, введите задачу и откройте пример ответа.\n3. **Рабочее пространство:** переключайте вкладки, редактируйте документ и отмечайте этапы плана.\n\n> Наведите указатель на кнопку или перейдите к ней клавишей Tab: подсказка объяснит её пользу. Все данные в этой демонстрации подготовлены заранее.':'## Three areas of one task\n\n1. **Dialog:** read a formatted reply, a table and a diagram.\n2. **Task and status:** attach a material, enter a task and open an example reply.\n3. **Workspace:** switch tabs, edit a document and complete plan steps.\n\n> Hover over a control or focus it with Tab to see its purpose. All data in this demonstration is prepared in advance.','guide');break;
      case 'buff':openModal(t('buff'),`<p class="tab-intro">${esc(t('buffIntro'))}</p>${state.messages.filter(m=>m.role==='human').length?state.messages.filter(m=>m.role==='human').map((m,i)=>`<article class="fixture-card"><h3>${i+1} · ${esc(t('localLabel'))}</h3><p class="user-text">${esc(m.text)}</p><span class="pill">${esc(t('done'))}</span></article>`).join(''):`<p class="inline-note">${esc(t('buffEmpty'))}</p>`}`);break;
      case 'clear-draft':state.draft='';$('#composer-input').value='';$('#composer-input').focus();announce(t('clearDraft'));break;
      case 'continue':openModal(t('continueTitle'),`${mdBox(state.lang==='ru'?'## Текущая цель\n\nСогласовать краткий план проекта и проверить основной сценарий.\n\n**Ближайший шаг:** открыть рабочий документ, сверить критерии и продолжить с текущего состояния.\n\n> Continue помогает сохранять цель через несколько этапов работы.':'## Current goal\n\nAgree on the project brief and review the primary scenario.\n\n**Next step:** open the working document, check the criteria and continue from the current state.\n\n> Continue helps maintain the goal across several stages of work.')}<div class="toolbar">${button('modal-choose-doc',t('toDocs'),'toDocs','data-file="brief"')}</div>`);break;
      case 'queue':state.queuedText=$('#composer-input').value.trim()||t('queueSample');state.queueExpanded=true;renderQueue();modalMarkdown(t('queueTitle'),state.lang==='ru'?'## Уточнение для следующего хода\n\n> После текущего шага проверь, что в плане есть критерии готовности.\n\n| Действие | Когда полезно |\n|---|---|\n| Send | Уточнить текущую работу сейчас |\n| Tab | Подготовить сообщение для следующего хода |\n| Buff | Проверить историю отправленных сообщений |\n\nЭто пример назначения кнопки. Набранный вами текст остаётся в поле задачи.':'## A clarification for the next turn\n\n> After the current step, verify that the plan has acceptance criteria.\n\n| Action | When it helps |\n|---|---|\n| Send | Clarify the current work now |\n| Tab | Prepare a message for the next turn |\n| Buff | Inspect sent-message history |\n\nThis illustrates the control’s purpose. Your draft remains in the task field.');break;
      case 'board-tool':{const tool=el.dataset.tool;const keys={select:'boardSelect',rectangle:'boardRectangle',diamond:'boardDiamond',arrow:'boardArrow',text:'boardText'};if(tool==='text'){openModal(t('boardAddNote'),`<label class="small-label" for="board-note">${esc(t('boardNoteLabel'))}</label><textarea id="board-note" class="copy-field" maxlength="76" placeholder="${esc(t('boardNotePlaceholder'))}" data-help="boardText">${esc(state.boardNote)}</textarea><div class="toolbar" style="margin-top:12px">${button('board-save-note',t('boardSaveNote'),'boardSaveNote','class="primary"')}</div>`);}else modalMarkdown(t(keys[tool]),`## ${t(keys[tool])}\n\n${help(keys[tool])}\n\n${tool==='arrow'?`**${t('boardHuman')} → ${t('boardMaterials')}**\n\n${t('boardLink')}`:tool==='diamond'?`**${t('boardReview')} → ${t('boardDecision')}**\n\n${t('acceptance')}: ${t('focusAcceptance')}`:`**${t('boardMaterials')}**\n\n- ${t('briefName')}\n- ${t('researchName')}\n- ${t('glossaryName')}`}`);break;}
      case 'board-save-note':state.boardNote=$('#board-note').value.trim();closeModal();renderWorkspace();announce(t('saved'));break;
      case 'board-zoom-in':state.zoom=Math.min(1.6,Math.round((state.zoom+0.2)*10)/10);renderWorkspace();break;
      case 'board-zoom-out':state.zoom=Math.max(0.6,Math.round((state.zoom-0.2)*10)/10);renderWorkspace();break;
      case 'board-zoom-reset':state.zoom=1;renderWorkspace();break;
      case 'board-export':copyModal(`${t('boardTitle')}\n\n${t('boardHuman')} → ${t('boardMaterials')} → ${t('boardReview')}\n${t('boardReview')} → ${t('boardDecision')}\n${t('boardReview')} → ${t('boardRefine')} → ${t('boardResult')}\n\n${state.boardNote}`,t('boardExport'));break;
      case 'architecture-refresh':modalMarkdown(t('architectureRefresh'),`## ${t('architectureTitle')}\n\n${t('architectureUpdateNotice')}\n\n| ${t('architectureSources')} | ${t('architectureRelation')} |\n|---|---|\n| AppDescriptor | ${t('architectureComponents')} |\n| C4 | ${t('architectureSystem')} |\n| Runtime health | ${t('architectureHealth')} |\n\n> ${t('exampleData')}`);break;
      case 'architecture-sources':modalMarkdown(t('architectureSources'),state.lang==='ru'?'## Основания архитектурного обзора\n\n- **AppDescriptor:** состав приложения и его компоненты.\n- **C4:** уровни систем и связи между ними.\n- **Runtime health:** состояние исполнения и актуальность наблюдений.\n\n| Вопрос | Что помогает понять |\n|---|---|\n| Из чего состоит система? | Компоненты и их назначение |\n| Что с чем связано? | Используемые материалы и потоки результатов |\n| Насколько свежи сведения? | Момент наблюдения и признаки устаревания |\n\n> В этой демонстрации показан подготовленный снимок.':'## Architecture overview sources\n\n- **AppDescriptor:** the application structure and its components.\n- **C4:** system levels and relations.\n- **Runtime health:** execution status and observation freshness.\n\n| Question | What it clarifies |\n|---|---|\n| What makes up the system? | Components and their purpose |\n| How are parts connected? | Materials used and results passed on |\n| How fresh is the information? | Observation timing and signs of staleness |\n\n> This demonstration shows a prepared snapshot.');break;
      case 'architecture-detail':{const k=el.dataset.component;const descriptions=state.lang==='ru'?{Dialog:'Связывает постановку задачи, обсуждение и оформленный ответ. Использует панель взаимодействия и показывает материалы.',Runtime:'Исполняет принятую задачу и возвращает ход работы и результат в диалог.',Docs:'Хранит рабочие документы и показывает их рядом с обсуждением. Использует Markdown renderer для текста, таблиц и схем.',Context:'Связывает принятые решения, основания, риски и следующий шаг.'}:{Dialog:'Connects task definition, discussion and formatted replies. Uses the interaction panel and displays materials.',Runtime:'Executes the accepted task and returns progress and results to the conversation.',Docs:'Keeps working documents beside their discussion. Uses the Markdown renderer for text, tables and diagrams.',Context:'Connects accepted decisions, evidence, risks and the next step.'};modalMarkdown(t('architecture'+k),`## ${t('architecture'+k)}\n\n${descriptions[k]}\n\n| ${t('architectureFreshness')} | ${t('architectureHealth')} |\n|---|---|\n| ${t('architectureSnapshot')} | ${t('architectureSample')} |`);break;}
      case 'reset':right?.reset();$('#workspace-board-frame')?.contentWindow?.postMessage({type:'portfolio-board-reset'},'*');Object.assign(state,{tab:'docs',doc:'brief',view:'viewer',translated:false,context:'memory',sourceLang:'ru',plan:[true,false,false],board:[0,1,2],attachments:[],messages:[],bookmarked:false,newSession:false,mode:'collaborative',reasoning:'xhigh',architecture:'systems',zoom:1,boardNote:'',scene:'dialog',edits:{},draft:'',...dialogDefaults(),...composerDefaults(),...attentionDefaults()});$('#demo-shell').classList.remove('dialog-only');renderAll();announce(t('resetDone'));break;
      case 'sessions':openModal(t('sessions'),`<p class="tab-intro">${esc(help('sessions'))}</p><div class="fixture-card"><h3>${esc(t('sessionName'))}</h3><p>${esc(t('prompt'))}</p>${button('restore-session',t('open'),'select')}</div><div class="fixture-card"><h3>${esc(t('transcriptName'))}</h3><p>${esc(t('voiceNote'))}</p>${button('session-transcript',t('open'),'select')}</div>`);break;
      case 'restore-session':state.newSession=false;state.messages=[];renderDialog();closeModal();chooseDoc('brief');break;
      case 'session-transcript':closeModal();chooseDoc('transcript');break;
      case 'insert-prompt':$('#composer-input').value=t('newPrompt');state.draft=t('newPrompt');$('#composer-input').focus();break;
      case 'export-dialog':copyModal((state.newSession?'':`${t('prompt')}\n\n${t('answer')}`)+state.messages.map(m=>`\n\n${m.prepared?t('preparedReply'):m.text}`).join(''),t('exportDialog'));break;
      case 'expand-dialog':$('#demo-shell').classList.toggle('dialog-only');el.setAttribute('aria-pressed',String($('#demo-shell').classList.contains('dialog-only')));break;
      case 'status':modalMarkdown(t('status'),state.lang==='ru'?'## Состояние задачи\n\n| Состояние | Что видит человек |\n|---|---|\n| Готов к примеру | Можно задать задачу или открыть материал |\n| Выполнение | В рабочем интерфейсе виден ход работы |\n| Нужен ответ | Требуется уточнение или решение человека |\n| Завершено | Есть результат и следующий шаг |\n\nСейчас открыт подготовленный сценарий: кнопка отправки добавляет пример ответа в ленту.':'## Task status\n\n| State | What the human sees |\n|---|---|\n| Ready for example | A task can be entered or a material opened |\n| In progress | The working interface shows progress |\n| Needs a reply | A clarification or decision is required |\n| Complete | A result and a next step are available |\n\nThis is a prepared scenario: Send adds an example reply to the conversation.');break;
      case 'attach':openModal(t('attach'),`<p class="tab-intro">${esc(help('attach'))}</p>${fileRows('attach-file')}`);break;
      case 'attach-file':if(!state.attachments.includes(el.dataset.file))state.attachments.push(el.dataset.file);renderAttachments();closeModal();announce(t('attached'));break;
      case 'remove-attachment':state.attachments=state.attachments.filter(x=>x!==el.dataset.file);renderAttachments();announce(t('removed'));break;
      case 'settings':openModal(t('modelProfile'),`<p class="tab-intro">${esc(t('modelExplanation'))}</p><div class="fixture-card"><span class="small-label">${esc(t('modelProfile'))}</span><h3>6.1 Sol <span class="pill">${esc(t('exampleData'))}</span></h3></div><label for="reasoning-level" class="small-label">${esc(t('reasoningLevel'))}</label><select id="reasoning-level" class="form-select" data-demo-action="reasoning-select" data-help="reasoning">${['medium','high','xhigh'].map(k=>`<option value="${k}" ${state.reasoning===k?'selected':''}>${k}</option>`).join('')}</select><p class="inline-note">${esc(t('reasoningExplanation'))}</p>`);break;
      case 'voice':openModal(t('voice'),`<p class="tab-intro">${esc(t('voiceNote'))}</p>${mdBox(state.lang==='ru'?'### Пример передачи материала\n\n1. В BabelVoice появляется текст расшифровки.\n2. Текст становится материалом задачи.\n3. В рабочем документе фиксируются решения встречи.\n\n> В этом окне можно открыть готовую расшифровку и её перевод.':'### Example material handoff\n\n1. BabelVoice produces a transcript.\n2. The text becomes task material.\n3. A working document records meeting decisions.\n\n> Open the prepared transcript and its translation from this window.')}<div class="toolbar">${button('open-transcript',t('voiceOpen'),'toDocs','class="primary"')}${button('open-translation',t('translation'),'translation')}</div>`);break;
      case 'open-transcript':closeModal();chooseDoc('transcript');break;
      case 'open-translation':closeModal();state.tab='translation';state.translated=true;renderWorkspace();break;
      case 'stop':if(state.pending){clearTimeout(state.pending);state.pending=null;}announce(t('stopped'));modalMarkdown(t('stop'),`> ${t('stopped')}\n\n${help('stop')}`);break;
      case 'send':send();break;
      case 'workspace-help':modalMarkdown(t('workspaceHelp'),`## ${t('workspace')}\n\n| ${state.lang==='ru'?'Раздел':'Area'} | ${state.lang==='ru'?'Польза':'Purpose'} |\n|---|---|\n${validTabs.map(k=>`| ${t('tab'+k[0].toUpperCase()+k.slice(1))} | ${help('tab'+k[0].toUpperCase()+k.slice(1))} |`).join('\n')}`);break;
      case 'doc-viewer':case 'doc-edit':case 'doc-explorer':saveDraft();state.view=action.slice(4);renderWorkspace();break;
      case 'doc-pane':modalMarkdown(t('pane'),state.lang==='ru'?'## Материал рядом с обсуждением\n\n**Просмотр** показывает оформленный документ. **Редактор** позволяет уточнить текст. **Проводник** связывает задачу с несколькими материалами.\n\nИзмените абзац в редакторе, сохраните пример и вернитесь в просмотр: результат появится в этой же панели.\n\n> Переключение вкладок сохраняет текущий документ и ваши изменения в этой демонстрации.':'## A material beside its discussion\n\n**Viewer** shows the formatted document. **Edit** lets you refine the text. **Explorer** connects a task to several materials.\n\nEdit a paragraph, save the example and return to Viewer: the result appears in the same pane.\n\n> Switching tabs keeps the current document and your changes in this demonstration.');break;
      case 'doc-original':case 'doc-translation':saveDraft();state.translated=action==='doc-translation';state.view='viewer';renderWorkspace();break;
      case 'open-path':{const path=$('#doc-path').value.trim().toLowerCase();const f=C.files.find(f=>f.path.toLowerCase()===path||f.path.split('/').pop()===path||t(f.name).toLowerCase()===path);if(f)chooseDoc(f.id);else openModal(t('chooseFile'),`<p class="inline-note">${esc(t('fileNote'))}</p>${fileRows('modal-choose-doc')}`);break;}
      case 'modal-choose-doc':closeModal();chooseDoc(el.dataset.file);break;
      case 'save-doc':saveDraft();state.view='viewer';renderWorkspace();announce(t('saved'));break;
      case 'source-doc':copyModal(docText(),t('source'));break;
      case 'choose-doc':chooseDoc(el.dataset.file);break;
      case 'open-result':chooseDoc('brief');break;
      case 'copy-message':copyModal($('.md-content',el.closest('.message'))?.dataset.markdownSource??t('answer'));break;
      case 'copy-code':{const pre=el.closest('pre')??el.closest('[class*="code"]')?.querySelector('pre');const text=pre?.dataset.codeText??$('code',pre??el.parentElement)?.textContent??el.closest('[data-markdown-source]')?.dataset.markdownSource??docText();copyModal(text);break;}
      case 'diagram-detail':{const block=el.closest('[data-markdown-source]');const text=block?.dataset.markdownSource??t('ontologyText');const match=text.match(/```mermaid\n([\s\S]*?)```/);modalMarkdown(state.lang==='ru'?'Схема задачи':'Task diagram',`\`\`\`mermaid\n${match?match[1]:''}\n\`\`\`\n\n${help('diagram')}`);break;}
      case 'bookmark':state.bookmarked=true;announce(t('bookmarkAdded'));if(state.tab==='bookmarks')renderWorkspace();modalMarkdown(t('tabBookmarks'),`> ${t('bookmarkAdded')}\n\n**${t('sessionName')}**\n\n${t('prompt')}`);break;
      case 'bookmark-detail':{const note=state.savedNotes.find(n=>n.id===el.dataset.noteId);if(note){openModal(t('bookmarkFromMessage'),selectionQuote(note.text)+(note.comment?`<p class="user-text">${esc(note.comment)}</p>`:'')+`<div class="toolbar">${button('return-to-message',t('returnToMessage'),'returnToMessage',`data-message-id="${note.messageId}"`)}</div>`);break;}const item=C[state.lang].bookmarks[+el.dataset.index]??[t('dialog'),t('prompt')];modalMarkdown(item[0],`## ${item[0]}\n\n> ${item[1]}\n\n${help('tabBookmarks')}`);break;}
      case 'agent-detail':{const a=C[state.lang].agents[+el.dataset.index];modalMarkdown(a[0],`## ${a[0]}\n\n${a[1]}\n\n**${state.lang==='ru'?'Ожидаемый результат':'Expected result'}:** ${a[2]}\n\n${+el.dataset.index===2?`### ${t('acceptance')}\n\n- ${t('focusAcceptance')}\n- ${t('plans')[2][1]}`:t(+el.dataset.index===0?'memoryText':'research')}`);break;}
      case 'plan-detail':modalMarkdown(t('acceptance'),t('brief'));break;
      case 'board-detail':{const card=C[state.lang].boardCards[+el.dataset.index];modalMarkdown(card[0],`## ${card[0]}\n\n${card[1]}\n\n### ${t('acceptance')}\n\n${t('focusAcceptance')}\n\n**${state.lang==='ru'?'Состояние':'State'}:** ${C[state.lang].boardColumns[state.board[+el.dataset.index]]}`);break;}
      case 'move-card':state.board[+el.dataset.index]=(state.board[+el.dataset.index]+1)%3;renderWorkspace();announce(C[state.lang].boardColumns[state.board[+el.dataset.index]]);break;
      case 'context-view':state.context=el.dataset.context;renderWorkspace();break;
      case 'context-detail':modalMarkdown(t('context'),t(state.context==='ontology'?'ontologyText':state.context==='terms'?'glossary':'memoryText'));break;
      case 'focus-plan':setTab('plan');break;
      case 'focus-detail':openModal(t('clearFocus'),`<p class="tab-intro">${esc(t('focusIntro'))}</p>${C[state.lang].plans.map((p,i)=>`<div class="fixture-card"><h3>${esc(p[0])}</h3><p>${esc(p[1])}</p>${button('focus-select',t('select'),'focus',`data-index="${i}"`)}</div>`).join('')}`);break;
      case 'focus-select':closeModal();setTab('plan');$(`[data-plan="${el.dataset.index}"]`)?.focus();break;
      case 'translation-source':state.translated=false;renderWorkspace();break;
      case 'translation-target':state.translated=true;renderWorkspace();break;
      case 'close-modal':closeModal();break;
    }
  }
  function visibleBounds(){const top=visibleViewport?Math.max(0,Math.min(visibleViewport.top,innerHeight-1)):0;const height=visibleViewport?Math.max(1,Math.min(visibleViewport.height,innerHeight-top)):innerHeight;return {top,height,bottom:top+height};}
  function requestVisibleViewport(){if(parentOrigin&&window.parent!==window)window.parent.postMessage({type:'portfolio-demo-viewport-request'},parentOrigin);}
  function applyVisibleViewport(top,height){if(typeof top!=='number'||typeof height!=='number'||!Number.isFinite(top)||!Number.isFinite(height)||height<=0)return;const boundedTop=Math.max(0,Math.min(top,innerHeight-1));visibleViewport={top:boundedTop,height:Math.max(1,Math.min(height,innerHeight-boundedTop))};const bounds=visibleBounds();document.documentElement.style.setProperty('--demo-visible-top',`${bounds.top}px`);document.documentElement.style.setProperty('--demo-visible-height',`${bounds.height}px`);if(tooltipAnchor?.isConnected&&!$('#business-tooltip').hidden)positionTooltip(tooltipAnchor);}
  function positionTooltip(el){const tip=$('#business-tooltip'),r=el.getBoundingClientRect(),tr=tip.getBoundingClientRect(),bounds=visibleBounds();const left=Math.max(10,Math.min(r.left,innerWidth-tr.width-10));let top=r.bottom+7;if(top+tr.height>bounds.bottom-10)top=r.top-tr.height-7;top=Math.max(bounds.top+10,Math.min(top,bounds.bottom-tr.height-10));tip.style.left=`${left}px`;tip.style.top=`${top}px`;}
  function showTooltip(el){const key=el.dataset.help;if(!key)return;if(tooltipAnchor&&tooltipAnchor!==el)tooltipAnchor.removeAttribute('aria-describedby');tooltipAnchor=el;const tip=$('#business-tooltip');tip.textContent=help(key);tip.hidden=false;el.setAttribute('aria-describedby','business-tooltip');positionTooltip(el);}
  function hideTooltip(){if(tooltipAnchor)tooltipAnchor.removeAttribute('aria-describedby');tooltipAnchor=null;$('#business-tooltip').hidden=true;}
  function updateTooltipPosition(){if(tooltipAnchor?.isConnected&&tooltipAnchor===document.activeElement){positionTooltip(tooltipAnchor);}else hideTooltip();}
  window.addEventListener('click',e=>{const el=e.target.closest('[data-demo-action]');if(!el)return;const action=el.dataset.demoAction;if(action.startsWith('r47-')&&el.matches('input[type="checkbox"],select'))return;if(['plan-toggle','source-language','mode-select','architecture-level','reasoning-select','profile-select','profile-flag','composer-model','composer-reasoning','composer-note-kind','sound-enabled','sound-select'].includes(action))return;e.preventDefault();e.stopImmediatePropagation();hideTooltip();runAction(action,el);},true);
  document.addEventListener('change',event=>right?.onChange(event));
  document.addEventListener('input',event=>right?.onInput(event));
  document.addEventListener('keydown',event=>right?.onKeydown(event));
  document.addEventListener('auxclick',e=>{if(e.target.closest('a[data-docswb-inline-enhanced="1"]'))e.preventDefault();});
  document.addEventListener('input',e=>{if(e.target.id==='bmMiniFaviconInput')updateFaviconDraft();});
  document.addEventListener('change',e=>{if(e.target.id==='composer-model'||e.target.id==='composer-reasoning'){const id=e.target.id;state.profile[id==='composer-model'?'model':'reasoning']=e.target.value;state.reasoning=state.profile.reasoning;renderComposer();$('#'+id).focus();announce(t('composerPendingIntro'));}});
  document.addEventListener('submit',e=>{if(e.target.id==='composer-form'){e.preventDefault();send();}if(e.target.id==='profile-form'){e.preventDefault();saveProfile();}if(e.target.id==='terminal-form'){e.preventDefault();terminalSend();}});
  document.addEventListener('change',e=>{if(e.target.id==='profile-pool'&&e.target.checked){$('#profile-special').checked=false;$('#profile-owner-only').checked=false;}if(['profile-special','profile-owner-only'].includes(e.target.id)&&e.target.checked)$('#profile-pool').checked=false;if(e.target.dataset.plan!==undefined){state.plan[+e.target.dataset.plan]=e.target.checked;renderWorkspace();const card=$('.msg-plan .msg-body');if(card)card.innerHTML=planCard();announce(`${state.plan.filter(Boolean).length} / 3 ${t('progress')}`);}if(e.target.id==='source-language'){state.sourceLang=e.target.value;renderWorkspace();}if(e.target.id==='architecture-level'){state.architecture=e.target.value;renderWorkspace();}if(e.target.id==='reasoning-level'){state.reasoning=e.target.value;announce(`${t('reasoningLevel')}: ${state.reasoning}`);}if(e.target.id==='working-mode'){state.mode=e.target.value;announce(e.target.selectedOptions[0].textContent);}});
  document.addEventListener('keydown',e=>{const el=e.target.closest('a[role=button][data-demo-action]');if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();el.click();}});
  document.addEventListener('input',e=>{if(['composer-input','terminal-input','profile-name','composer-note-text','composer-goal-text'].includes(e.target.id))e.target.setCustomValidity('');if(e.target.id==='composer-input')state.draft=e.target.value;if(e.target.id==='terminal-input')state.terminalDraft=e.target.value;if(e.target.id==='session-history-search')renderHistoryResults();});
  document.addEventListener('selectionchange',()=>{if(!captureSelection())hideSelectionTools();});
  document.addEventListener('pointerdown',e=>{if(e.target.closest('#selection-toolbar')){captureSelection();e.preventDefault();}});
  document.addEventListener('pointerup',e=>{if(!e.target.closest('#selection-toolbar'))showSelectionTools();});
  document.addEventListener('keyup',e=>{if(e.shiftKey)showSelectionTools();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideSelectionTools();if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)&&!$('#demo-dialog').open){e.preventDefault();navigateUser(e.key==='ArrowUp'?-1:1);}});
  $('#chat-stream').addEventListener('scroll',()=>{if(state.surface==='dialog')state.dialogScroll=$('#chat-stream').scrollTop;hideSelectionTools();});
  document.addEventListener('pointerover',e=>{const el=e.target.closest('[data-help]');if(!el)return;const focused=document.activeElement?.closest('[data-help]');if(tooltipAnchor===focused&&focused&&el!==focused)return;showTooltip(el);});
  document.addEventListener('pointermove',e=>{const el=e.target.closest('[data-help]');if(el&&el!==tooltipAnchor)showTooltip(el);});
  document.addEventListener('pointerout',e=>{if(tooltipAnchor&&tooltipAnchor.contains(e.target)&&!tooltipAnchor.contains(e.relatedTarget)&&tooltipAnchor!==document.activeElement)hideTooltip();});
  document.addEventListener('focusin',e=>{const el=e.target.closest('[data-help]');if(el)showTooltip(el);});document.addEventListener('focusout',e=>{if(tooltipAnchor?.contains(e.target))hideTooltip();});document.addEventListener('scroll',updateTooltipPosition,true);window.addEventListener('resize',updateTooltipPosition);
  $('#workspace-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const index=validTabs.indexOf(state.tab),next=e.key==='Home'?0:e.key==='End'?7:(index+(e.key==='ArrowRight'?1:7))%8;setTab(validTabs[next],true);});
  $('#composer-input').addEventListener('keydown',e=>{
    if(e.isComposing||e.key==='Process'||e.keyCode===229)return;
    const shortcut=e.ctrlKey||e.metaKey;
    if(shortcut&&['a','z','y'].includes(e.key.toLowerCase())){e.stopPropagation();return;}
    if(e.key==='Tab'&&!e.shiftKey&&!shortcut&&!e.altKey){e.preventDefault();send(true);return;}
    if(shortcut&&e.key==='Enter'&&!e.shiftKey&&!e.altKey){e.preventDefault();if(e.currentTarget.value.trim())send();}
  });
  $('#demo-dialog').addEventListener('cancel',e=>{e.preventDefault();closeModal();});$('#demo-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  let parentOrigin=null;try{parentOrigin=new URL(document.referrer).origin;}catch{/* An absent or invalid referrer keeps parent messages disabled. */}
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||!parentOrigin||event.origin!==parentOrigin||!event.data||typeof event.data!=='object')return;
    const data=event.data;
    if(data.type==='portfolio-demo-viewport'){applyVisibleViewport(data.top,data.height);return;}
    if(data.type==='portfolio-language'&&['ru','en'].includes(data.language)){setLanguage(data.language);return;}
    if(data.type!=='portfolio-demo-scene'||!['dialog','composer','docs','agents','plan','memory','voice','ontology','terms','board','translation','alerts'].includes(data.scene))return;
    saveDraft();closeModal();state.scene=data.scene;document.body.dataset.scene=data.scene;
    if(['dialog','composer'].includes(data.scene))setSurface('dialog');
    switch(data.scene){
      case 'docs':state.tab='docs';state.view='explorer';break;
      case 'agents':case 'plan':case 'board':state.tab=data.scene;break;
      case 'memory':case 'ontology':case 'terms':state.tab='context';state.context=data.scene;break;
      case 'translation':state.tab='translation';break;
      case 'voice':state.tab='translation';state.doc='transcript';state.translated=false;break;
      // Dialog, composer and attention work beside the current material.
      // Navigating to them never replaces the selected file or local draft.
    }
    $('#demo-shell').classList.remove('dialog-only');renderWorkspace();
    if(data.reveal)requestAnimationFrame(()=>{
      if(state.scene!==data.scene)return;
      // Scrolling an element in a sandboxed iframe also moves the portfolio
      // page. The parent owns global navigation; the demo owns only its panes.
      if(data.scene==='composer')$('#composer-input')?.focus({preventScroll:true});
      if(data.scene==='alerts')openSound();
    });
  });
  window.addEventListener('message',event=>{const child=$('#workspace-board-frame');if(!child||event.source!==child.contentWindow||!['null',location.origin].includes(event.origin)||event.data?.source!=='portfolio-board')return;if(event.data.type==='ready'){boardReady=true;syncBoardLanguage();}});
  right=window.WorkspaceDemoRight.create({state,C,t,help,esc,button,mdBox,docLang,docText,saveDraft,renderWorkspace,renderMarkdown,refreshHelp,openModal,closeModal,modalMarkdown,announce,chooseDoc});
  if(window.mermaid?.initialize)window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',themeVariables:{primaryColor:'#344727',primaryBorderColor:'#859768',primaryTextColor:'#e8e3ca',lineColor:'#b8ab78',secondaryColor:'#26351c',tertiaryColor:'#192614',background:'#182313',fontFamily:'system-ui'},flowchart:{htmlLabels:false,useMaxWidth:true}});
  document.body.dataset.scene=state.scene;renderAll();document.body.dataset.ready='true';requestVisibleViewport();
})();

