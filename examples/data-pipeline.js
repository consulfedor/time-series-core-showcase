"use strict";
(() => {
  const values=[55,61,58,69,72,66,78,74,86,82,92,89,95,84,91,102,98,108,104,116,110,119,123,118];
  const absent=i=>i>=9&&i<=12;
  function render(mode){
    const missing=mode==='gap';
    document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===mode)));
    const pieces=values.map((v,i)=>{const x=38+i*38;const height=v*1.25;return missing&&absent(i)?`<rect x="${x}" y="35" width="24" height="165" fill="url(#hatch)" stroke="#d0aa54" stroke-dasharray="3 3"/>`:`<rect x="${x}" y="${200-height}" width="24" height="${height}" rx="3" fill="${absent(i)?'#d0aa54':'#85cab1'}"/>`;}).join('');
    document.getElementById('series').innerHTML=`<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#d0aa543f"/></pattern></defs><path d="M24 200H950" stroke="#42515b"/><g font-family="sans-serif" font-size="12" fill="#b6c4cf"><text x="24" y="23">${missing?'20 из 24 интервалов':'24 из 24 интервалов'}</text><text x="24" y="228">Начало диапазона</text><text x="808" y="228">Конец диапазона</text></g>${pieces}`;
    document.getElementById('series-status').textContent=missing?'Пропущены четыре интервала. Последующий расчёт нельзя считать полным.':mode==='repair'?'Диапазон восполнен. Наличие всех записей ещё нужно подтвердить проверкой.':'В учебном примере присутствуют все 24 интервала, повторов нет. Отчёт готов к рассмотрению.';
  }
  document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.state)));
  render('gap');
})();
