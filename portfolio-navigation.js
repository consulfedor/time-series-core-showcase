/* Global navigation is a presentation: it does not change author content. */
(()=>{
 'use strict';
 const header=document.querySelector('[data-portfolio-nav]');if(!header)return;
 if(window.self!==window.top){document.documentElement.dataset.portfolioEmbedded='true';return;}
 const setHeight=()=>document.documentElement.style.setProperty('--portfolio-nav-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
 if(typeof ResizeObserver==='function')new ResizeObserver(setHeight).observe(header);
 setHeight();window.addEventListener('resize',setHeight);
 const params=new URLSearchParams(location.search);
 const isDome=header.dataset.route.startsWith('dome-house/');
 if(isDome&&params.get('lang')==='en'){
  header.querySelectorAll('[data-portfolio-language]').forEach(a=>{if(a.dataset.portfolioLanguage==='en')a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  header.querySelector('.portfolio-nav-brand span').textContent='Fedor';
  const paths=['','mytwobrain/','examples/research-foundations.html','cv/'];
  const labels=['Home','Systems','People','CV'];
  header.querySelectorAll('[data-portfolio-destination]').forEach((a,i)=>{a.textContent=labels[i];a.href=header.dataset.base+'en/'+paths[i];});
  header.querySelector('nav').setAttribute('aria-label','Site navigation');
  header.querySelector('.portfolio-nav-brand').href=header.dataset.base+'en/';
  const summary=header.querySelector('[data-portfolio-contents] summary');summary.setAttribute('aria-label','Home sections');summary.title='Home sections';
 }
 const synchronize=()=>header.querySelectorAll('[data-portfolio-language]').forEach(a=>{const u=new URL(a.href);u.hash=location.hash;a.href=u.href;});
 synchronize();window.addEventListener('hashchange',synchronize);
 header.querySelectorAll('[data-portfolio-language]').forEach(a=>a.addEventListener('click',synchronize));
 const contents=header.querySelector('[data-portfolio-contents]');
 const entry=contents.closest('[data-portfolio-entry]'),home=entry.querySelector('[data-portfolio-destination=home]');
 const summary=contents.querySelector('summary'),menu=contents.querySelector('ul'),status=contents.querySelector('.portfolio-section-status');
 const english=header.dataset.route.startsWith('en/')||(isDome&&params.get('lang')==='en');
 const normalPath=url=>new URL(url,location.href).pathname.replace(/index\.html$/,'');
 const isHome=normalPath(home.href)===normalPath(location.href);
 const collect=(doc,source)=>{
  const base=new URL(source),seen=new Set(),items=[];
  doc.querySelectorAll('body>header.site-header a[href],body>header.masthead a[href],body>header.essay-nav a[href]').forEach(a=>{
   const url=new URL(a.getAttribute('href'),base);
   if(url.origin!==base.origin||normalPath(url)!==normalPath(base)||!url.hash||seen.has(url.hash))return;
   const id=decodeURIComponent(url.hash.slice(1));if(!doc.getElementById(id))return;
   const label=a.textContent.trim();if(!label)return;seen.add(url.hash);items.push({hash:url.hash,label,id});
  });
  return items;
 };
 const populate=items=>{
  if(!items.length)throw new Error('Home section navigation is unavailable');
  menu.replaceChildren();
  for(const item of items){
   const row=document.createElement('li'),link=document.createElement('a'),label=document.createElement('span'),action=document.createElement('span');
   const url=new URL(home.href);url.hash=item.hash;link.href=isHome?item.hash:url.href;link.dataset.portfolioSection=item.id;
   label.textContent=item.label;action.className='portfolio-section-action';action.textContent='→';action.setAttribute('aria-hidden','true');link.append(label,action);
   link.addEventListener('click',()=>{contents.open=false;if(isHome){const target=document.getElementById(item.id);if(target){const added=!target.hasAttribute('tabindex');if(added){target.tabIndex=-1;target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});}setTimeout(()=>target.focus({preventScroll:true}),0);}}});
   row.append(link);menu.append(row);
  }
  status.hidden=true;contents.dataset.sectionsReady='true';
 };
 let loading=null;
 const load=()=>{
  if(contents.dataset.sectionsReady==='true')return Promise.resolve();
  if(loading)return loading;
  status.hidden=false;status.textContent=english?'Loading sections…':'Загрузка разделов…';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  loading=(async()=>{
   const url=new URL(home.href);url.hash='';if(url.origin!==location.origin)throw new Error('Home must remain on this site');
   const response=await fetch(url,{cache:'no-cache',credentials:'same-origin',signal:controller.signal});if(!response.ok)throw new Error('Home request failed');
   populate(collect(new DOMParser().parseFromString(await response.text(),'text/html'),url.href));
  })().catch(()=>{status.hidden=false;status.textContent=english?'Sections are unavailable. Open Home using the link above.':'Разделы недоступны. Откройте главную по ссылке выше.';loading=null;}).finally(()=>clearTimeout(timeout));
  return loading;
 };
 if(isHome){const items=collect(document,location.href);if(items.length)populate(items);}
 contents.hidden=false;
 const align=()=>{entry.dataset.menuAlign=entry.getBoundingClientRect().left>innerWidth/2?'end':'start';};
 const open=()=>{align();load();contents.open=true;};
 entry.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')open();});
 entry.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&!entry.contains(document.activeElement))contents.open=false;});
 home.addEventListener('focus',open);
 summary.addEventListener('click',()=>{align();load();});
 contents.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(contents.open)));
 entry.addEventListener('focusout',event=>{if(!entry.contains(event.relatedTarget))contents.open=false;});
 window.addEventListener('resize',align);align();
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&contents.open&&!document.querySelector('dialog[open]')){event.preventDefault();contents.open=false;summary.focus({preventScroll:true});}});
 document.addEventListener('click',event=>{if(contents.open&&!entry.contains(event.target))contents.open=false;});
})();
