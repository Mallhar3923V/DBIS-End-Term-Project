(() => {
  'use strict';
  const products = window.PRICESENSE_PRODUCTS || [];
  const money = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});
  const artSrc = name => window.PRICESENSE_ASSET_MAP?.[name] || `assets/${name}`;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  const LS_KEY = 'pricesense-demo-watchlist-v1';
  let saved = new Set();
  let category = 'All';
  let search = '';
  let sortBy = 'featured';
  let chartRange = 30;
  let toastTimeout;
  let lastFocus = null;
  try { saved = new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]').map(Number).filter(Number.isFinite)); } catch(e) { saved = new Set(); }
  const categories = ['All',...new Set(products.map(p=>p.category))];

  function notify(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(()=>node.classList.remove('show'),2900);
  }
  function saveStorage() {
    try { localStorage.setItem(LS_KEY,JSON.stringify([...saved])); } catch(e) {/* demo still works without storage */}
  }
  function renderCategories() {
    $('#categoryFilters').innerHTML=categories.map(c=>`<button type="button" data-category="${escapeHTML(c)}" class="${c===category?'active':''}" aria-pressed="${c===category}">${escapeHTML(c)}</button>`).join('');
  }
  function filteredProducts(){
    let matches=products.filter(p=>(category==='All'||p.category===category)&&`${p.brand} ${p.name} ${p.description} ${p.category} ${p.model}`.toLowerCase().includes(search.toLowerCase()));
    if(sortBy==='lowest') matches.sort((a,b)=>a.price-b.price);
    else if(sortBy==='discount') matches.sort((a,b)=>((b.oldPrice-b.price)/b.oldPrice)-((a.oldPrice-a.price)/a.oldPrice));
    else if(sortBy==='name') matches.sort((a,b)=>`${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
    return matches;
  }
  function productCard(p){
    const percent=Math.round((1-p.price/p.oldPrice)*100);
    return `<article class="product-card" data-product-id="${p.id}" data-tone="${escapeHTML(p.color)}">
      <div class="product-image color-${escapeHTML(p.color)}"><span class="card-badge">${escapeHTML(p.tag)}</span>
      <button type="button" class="save-button ${saved.has(p.id)?'is-saved':''}" data-save="${p.id}" aria-label="${saved.has(p.id)?'Remove from':'Save to'} watchlist: ${escapeHTML(p.brand+' '+p.name)}" aria-pressed="${saved.has(p.id)}">${heartIcon}</button>
      <img src="${escapeHTML(artSrc(p.art))}" alt="Illustration of ${escapeHTML(p.brand+' '+p.name)}" loading="lazy"></div>
      <div class="card-body"><div class="card-meta"><span>${escapeHTML(p.brand.toUpperCase())} / ${escapeHTML(p.category.toUpperCase())}</span><span>★ ${p.rating.toFixed(1)}</span></div>
      <h3>${escapeHTML(p.name)}</h3><p class="card-description">${escapeHTML(p.description)}</p>
      <div class="card-divider"></div><div class="card-price-row"><div><strong>${money(p.price)}</strong><span class="old-price">${money(p.oldPrice)}</span></div><span class="drop-pill">↘ ${percent}%</span></div>
      <div class="card-foot"><span class="store-count">${p.stores.length} stores compared*</span><button class="compare-btn" type="button" data-compare="${p.id}">Compare prices ↗</button></div></div>
    </article>`;
  }
  function renderProducts(){
    const matches=filteredProducts();
    $('#productGrid').innerHTML=matches.map(productCard).join('');
    $('#resultsCount').textContent=`${matches.length} ${matches.length===1?'product':'products'} found`;
    $('#emptyState').hidden=matches.length!==0;
    $('#productGrid').hidden=matches.length===0;
  }
  function updateSaved(){
    $('#savedCount').textContent=saved.size;
    const chosen=products.filter(p=>saved.has(p.id));
    $('#savedProducts').innerHTML=chosen.length ? chosen.map(p=>`<div class="saved-item"><img src="${escapeHTML(artSrc(p.art))}" alt="" loading="lazy"><div><strong>${escapeHTML(p.brand+' '+p.name)}</strong><small>From ${money(p.price)} · Sample price</small><button type="button" class="small-compare" data-drawer-compare="${p.id}">Compare ↗</button></div><button type="button" class="remove-saved" data-remove="${p.id}" aria-label="Remove ${escapeHTML(p.name)}">×</button></div>`).join('') : '<div class="saved-empty"><span>♡</span><h3>Your shortlist is empty.</h3><p>Tap the heart on a product to keep it here. No account required for this preview.</p></div>';
  }
  function toggleSaved(id){
    const p=products.find(p=>p.id===id); if(!p)return;
    if(saved.has(id)){saved.delete(id);notify(`${p.name} removed from your watchlist`);}else{saved.add(id);notify(`${p.name} saved to your watchlist`);}
    saveStorage(); updateSaved();
    // Preserve card nodes, focus and scroll position when one heart changes.
    const control = $(`#productGrid [data-save="${id}"]`);
    if (control) {
      control.classList.toggle('is-saved', saved.has(id));
      control.setAttribute('aria-pressed', String(saved.has(id)));
      control.setAttribute('aria-label', `${saved.has(id)?'Remove from':'Save to'} watchlist: ${p.brand} ${p.name}`);
    }
  }
  function openDrawer(){
    lastFocus=document.activeElement;
    $('#drawerBackdrop').hidden=false;
    $('#watchDrawer').classList.add('open');
    $('#watchDrawer').setAttribute('aria-hidden','false');
    $('#watchDrawer').inert=false;
    $('#topbar').inert=true;
    $('#main').inert=true;
    $('.footer').inert=true;
    document.body.style.overflow='hidden';
    $('#closeDrawer').focus();
  }
  function closeDrawer(){
    $('#watchDrawer').classList.remove('open');
    $('#watchDrawer').setAttribute('aria-hidden','true');
    $('#watchDrawer').inert=true;
    $('#topbar').inert=false;
    $('#main').inert=false;
    $('.footer').inert=false;
    $('#drawerBackdrop').hidden=true;
    document.body.style.overflow='';
    lastFocus?.focus?.();
  }
  function openCompare(id){
    const p=products.find(p=>p.id===id); if(!p)return;
    if($('#watchDrawer').classList.contains('open'))closeDrawer();
    const offers=p.stores.map(s=>({...s,total:s.base+s.delivery})).sort((a,b)=>Number(b.available)-Number(a.available)||a.total-b.total);
    const best=offers.find(s=>s.available)?.total;
    $('#compareContent').innerHTML=`<div class="modal-product"><img src="${escapeHTML(artSrc(p.art))}" alt=""><div><small>${escapeHTML(p.brand.toUpperCase())} / ${escapeHTML(p.category.toUpperCase())}</small><h2 id="compareTitle">${escapeHTML(p.name)}</h2><p>${escapeHTML(p.model)}</p></div></div><span class="modal-label">ILLUSTRATIVE LISTINGS · SORTED BY TOTAL COST</span><div class="modal-list">${offers.map(s=>`<div class="modal-row ${s.available&&s.total===best?'best':''}"><div><strong>${escapeHTML(s.name)}</strong><small>${s.available? (s.total===best?'✳ Lowest demo total':'In stock'):'Out of stock'} · Delivery ${s.delivery===0?'free':money(s.delivery)}</small></div><div class="modal-price"><b>${money(s.total)}</b><small>Item: ${money(s.base)}</small></div></div>`).join('')}</div><p class="modal-note">* Demonstration only. Store availability, product ratings, discounts and prices are invented sample values—not live marketplace data. Total cost includes delivery; conditional coupons are not calculated.</p><div class="modal-actions"><button type="button" class="modal-secondary" id="modalSave">${saved.has(id)?'♡ Remove from saved':'♡ Save this product'}</button><button type="button" class="modal-primary" id="modalDone">Done ↗</button></div>`;
    $('#modalSave').addEventListener('click',()=>{toggleSaved(id);$('#modalSave').textContent=saved.has(id)?'♡ Remove from saved':'♡ Save this product';});
    $('#modalDone').addEventListener('click',()=>$('#compareDialog').close());
    $('#compareDialog').showModal();
  }
  function renderChart(){
    const data=products[0].history[chartRange]; if(!data) return;
    const min=Math.min(...data), max=Math.max(...data), padding=Math.max((max-min)*.13,450), ymin=min-padding, ymax=max+padding;
    const toX=i=>20+(i/(data.length-1))*560;
    const toY=v=>196-((v-ymin)/(ymax-ymin))*178;
    const poly=data.map((v,i)=>`${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    const path=data.map((v,i)=>`${i?'L':'M'}${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');
    const area=`${path} L580 205 L20 205 Z`;
    const grid=[15,72,130,188].map(y=>`<line x1="20" y1="${y}" x2="580" y2="${y}" stroke="#5a7690" stroke-dasharray="3 6" stroke-width="1"/>`).join('');
    $('#historyChart').innerHTML=`<defs><linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86e2f2" stop-opacity=".30"/><stop offset="1" stop-color="#86e2f2" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#priceGradient)"/><path d="${path}" fill="none" stroke="#86e2f2" stroke-width="3.7" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="580" cy="${toY(data.at(-1))}" r="6" fill="#86e2f2" stroke="#1b2b3d" stroke-width="3"/><polyline points="${poly}" fill="none" stroke="transparent" stroke-width="18" data-hoverline="true"/>`;
    $('#historyChart').setAttribute('aria-label',`Illustrative ${chartRange}-day price observations for Sony WH-1000XM5, from ${money(data[0])} to ${money(data.at(-1))}`);
    const pct=((data.at(-1)-data[0])/data[0]*100).toFixed(1);
    $('#chartChange').textContent=`${Number(pct)<=0?'↓':'↑'} ${Math.abs(Number(pct)).toFixed(1)}% over period`;
    $('#chartCurrent').textContent=money(data.at(-1));
    $('#chartHigh').textContent=money(Math.ceil(ymax/1000)*1000);
    $('#chartMid').textContent=money(Math.round((ymax+ymin)/2000)*1000);
    $('#chartLow').textContent=money(Math.floor(ymin/1000)*1000);
    $('#chartPeriodLabel').textContent=`Past ${chartRange===365?'year':chartRange+' days'}`;
    $$('.range-buttons button').forEach(b=>{const isOn=Number(b.dataset.range)===chartRange;b.classList.toggle('selected',isOn);b.setAttribute('aria-pressed',String(isOn));});
  }
  function setupChartHover(){
    const svg=$('#historyChart'), tip=$('#chartTooltip');
    svg.addEventListener('pointermove',e=>{
      const rect=svg.getBoundingClientRect(), rel=(e.clientX-rect.left)/rect.width;
      const data=products[0].history[chartRange];const index=Math.max(0,Math.min(data.length-1,Math.round((rel*600-20)/560*(data.length-1))));
      tip.hidden=false;tip.textContent=`Observation ${index+1}: ${money(data[index])}`;
      const xp=(20+(index/(data.length-1))*560)/600*rect.width;
      const plotRect=$('#chartPlot').getBoundingClientRect();
      tip.style.left=`${rect.left-plotRect.left+xp}px`;
      tip.style.top=`${rect.top-plotRect.top+40}px`;
    });
    svg.addEventListener('pointerleave',()=>tip.hidden=true);
  }
  const storyScenes=[
    {title:'All stores.<br>One clear winner.',text:'Compare prices without the tab-juggling.',metric:'−7.4%',label:'01 / COMPARE'},
    {title:'The real price.<br>Over time.',text:'See the full trend behind the price tag.',metric:'30D TREND',label:'02 / UNDERSTAND'},
    {title:'One less thing.<br>To remember.',text:'Keep your favorites ready to track.',metric:'♡ SAVED',label:'03 / WATCH'}
  ];
  function setStoryScene(index){
    const s=storyScenes[index]; if(!s)return;
    $('#storyStage').dataset.scene=String(index);
    $('#storyScreenTitle').innerHTML=s.title;
    $('#storyScreenText').textContent=s.text;
    $('#storyMetric').textContent=s.metric;
    $('#sceneLabel').textContent=s.label;
    $$('.story-step').forEach((node,i)=>node.classList.toggle('active',i===index));
  }
  function setupStoryObserver(){
    const nodes=$$('.story-step');
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){if(entry.isIntersecting)setStoryScene(Number(entry.target.dataset.step));}
    },{rootMargin:'-38% 0px -39% 0px',threshold:0});
    nodes.forEach(node=>observer.observe(node));
  }
  function setupReveal(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});
    },{threshold:.09,rootMargin:'0px 0px 60px 0px'});
    $$('.section-header, .story-heading, .insights-copy, .chart-card, .closing-inner').forEach(el=>{el.classList.add('reveal');observer.observe(el);});
  }
  function setupScroll(){
    let pending=false;
    let scrollRange=1;
    const progress=$('#readingProgress');
    const topbar=$('#topbar');
    function measure(){scrollRange=Math.max(1,document.documentElement.scrollHeight-innerHeight);schedule();}
    function frame(){
      progress.style.transform=`scaleX(${Math.max(0,Math.min(1,window.scrollY/scrollRange))})`;
      topbar.classList.toggle('is-scrolled',window.scrollY>30);
      pending=false;
    }
    function schedule(){if(!pending){requestAnimationFrame(frame);pending=true;}}
    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',measure,{passive:true});
    new ResizeObserver(measure).observe(document.body);
    measure();
  }
  function setupEvents(){
    $('#categoryFilters').addEventListener('click',e=>{const button=e.target.closest('[data-category]');if(!button)return;category=button.dataset.category;renderCategories();renderProducts();});
    $('#productSearch').addEventListener('input',e=>{search=e.target.value.trim();renderProducts();});
    $('#sortSelect').addEventListener('change',e=>{sortBy=e.target.value;renderProducts();});
    $('#productGrid').addEventListener('click',e=>{const saveBtn=e.target.closest('[data-save]'),compareBtn=e.target.closest('[data-compare]');if(saveBtn)toggleSaved(Number(saveBtn.dataset.save));else if(compareBtn)openCompare(Number(compareBtn.dataset.compare));});
    $('#heroSearchForm').addEventListener('submit',e=>{e.preventDefault();const q=$('#heroSearch').value.trim();$('#productSearch').value=q;search=q;category='All';renderCategories();renderProducts();$('#explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});$('#productSearch').focus({preventScroll:true});});
    $('#resetFilters').addEventListener('click',()=>{search='';category='All';sortBy='featured';$('#productSearch').value='';$('#heroSearch').value='';$('#sortSelect').value='featured';renderCategories();renderProducts();});
    $('#watchlistButton').addEventListener('click',openDrawer);
    $('#closeDrawer').addEventListener('click',closeDrawer);
    $('#drawerBackdrop').addEventListener('click',closeDrawer);
    $('#drawerExplore').addEventListener('click',closeDrawer);
    $('#savedProducts').addEventListener('click',e=>{const rem=e.target.closest('[data-remove]'),cmp=e.target.closest('[data-drawer-compare]');if(rem)toggleSaved(Number(rem.dataset.remove));else if(cmp)openCompare(Number(cmp.dataset.drawerCompare));});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#watchDrawer').classList.contains('open'))closeDrawer();});
    $('#closeCompare').addEventListener('click',()=>$('#compareDialog').close());
    $('#compareDialog').addEventListener('click',e=>{if(e.target===$('#compareDialog'))$('#compareDialog').close();});
    $$('.range-buttons button').forEach(button=>button.addEventListener('click',()=>{chartRange=Number(button.dataset.range);renderChart();}));
    $('#menuToggle').addEventListener('click',()=>{const opened=$('#navLinks').classList.toggle('menu-open');$('#menuToggle').setAttribute('aria-expanded',String(opened));});
    $$('#navLinks a').forEach(link=>link.addEventListener('click',()=>{$('#navLinks').classList.remove('menu-open');$('#menuToggle').setAttribute('aria-expanded','false');}));
  }
  function init(){renderCategories();renderProducts();updateSaved();renderChart();setupChartHover();setupEvents();setupStoryObserver();setupReveal();setupScroll();}
  init();
})();
