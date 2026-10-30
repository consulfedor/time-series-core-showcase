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
  header.querySelectorAll('nav a').forEach((a,i)=>{a.textContent=labels[i];a.href=header.dataset.base+'en/'+paths[i];});
  header.querySelector('nav').setAttribute('aria-label','Site navigation');
  header.querySelector('.portfolio-nav-brand').href=header.dataset.base+'en/';
  header.querySelector('[data-portfolio-contents] summary').textContent='On this page';
 }
 const synchronize=()=>header.querySelectorAll('[data-portfolio-language]').forEach(a=>{const u=new URL(a.href);u.hash=location.hash;a.href=u.href;});
 synchronize();window.addEventListener('hashchange',synchronize);
 header.querySelectorAll('[data-portfolio-language]').forEach(a=>a.addEventListener('click',synchronize));
 const contents=header.querySelector('[data-portfolio-contents]'),menu=contents.querySelector('div');
 const seen=new Set();
 document.querySelectorAll('body>header.site-header a[href],body>header.masthead a[href],body>header.essay-nav a[href]').forEach(a=>{
  const url=new URL(a.href,location.href),same=url.origin===location.origin&&url.pathname.replace(/index.html$/,'')===location.pathname.replace(/index.html$/,'');
  if(!same||!url.hash||seen.has(url.hash)||!document.getElementById(decodeURIComponent(url.hash.slice(1))))return;
  seen.add(url.hash);const link=document.createElement('a');link.href=url.hash;link.textContent=a.textContent.trim();link.addEventListener('click',()=>{contents.open=false;});menu.append(link);
 });
 contents.hidden=seen.size===0;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&contents.open){contents.open=false;contents.querySelector('summary').focus();}});
 document.addEventListener('click',e=>{if(contents.open&&!contents.contains(e.target))contents.open=false;});
})();
