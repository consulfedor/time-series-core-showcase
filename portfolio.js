"use strict";
const workspaceFrame = document.querySelector("iframe.workspace");
window.addEventListener("message", event => {
  if (!workspaceFrame || event.source !== workspaceFrame.contentWindow || event.origin !== location.origin) return;
  const data = event.data;
  if (data?.type === "portfolio-workspace-height" && Number.isFinite(data.height) && data.height > 0 && data.height < 10000) {
    workspaceFrame.style.height = `${Math.ceil(data.height) + 2}px`;
  }
});

const screenTabs = [...document.querySelectorAll('[data-screen]')];
function selectScreen(tab) {
  for (const button of screenTabs) {
    const active = button === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
  }
}
screenTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectScreen(tab));
  tab.addEventListener('keydown', event => {
    const target = {ArrowRight:(i+1)%screenTabs.length, ArrowLeft:(i+screenTabs.length-1)%screenTabs.length, Home:0, End:screenTabs.length-1}[event.key];
    if (target === undefined) return;
    event.preventDefault(); selectScreen(screenTabs[target]); screenTabs[target].focus();
  });
});

const zoom = document.querySelector('.screen-dialog');
document.querySelectorAll('[data-zoom]').forEach(link => link.addEventListener('click', event => {
  if (!zoom?.showModal || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  const source = link.querySelector('img'), target = zoom.querySelector('img');
  target.src = source.src; target.alt = source.alt;
  zoom.showModal();
}));
document.querySelector('[data-close-zoom]')?.addEventListener('click', () => zoom.close());
zoom?.addEventListener('click', event => {if (event.target === zoom) zoom.close();});

document.querySelectorAll('[data-demo-scene]').forEach(link => link.addEventListener('click', event => {
  if (!workspaceFrame || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  workspaceFrame.contentWindow.postMessage({type:'portfolio-workspace-scene',scene:link.dataset.demoScene}, location.origin);
  document.getElementById('workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}));
