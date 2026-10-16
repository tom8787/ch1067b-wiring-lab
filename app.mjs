import {ROWS,homography,corners,rectangle,connected,validateProject} from './core.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const colors=[['#f3ad48','琥珀黃'],['#f36d60','珊瑚紅'],['#6aaeff','天空藍'],['#b69aff','薰衣紫'],['#62d2ab','薄荷綠']];
const key='ch1067b-wiring-v1';
let holes=[],byId=new Map(),wires=[],undoStack=[],redoStack=[],start=null,end=null,selected=null,face='back',color=colors[0][0],route='elbow',zoom=1,mode='free',network=false,toastTimer;
const guides=[['A1','A5'],['D3','H3'],['K6','K10']];
const imageCache={};
const maps=Object.fromEntries(['front','back'].map(f=>[f,homography(corners[f],rectangle)]));
function svg(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el;}
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function persist(){try{localStorage.setItem(key,JSON.stringify({format:key,wires}));$('saveState').textContent='已儲存於此瀏覽器';}catch{$('saveState').textContent='無法自動儲存，請匯出練習檔';}}
function snapshot(){undoStack.push(structuredClone(wires));if(undoStack.length>100)undoStack.shift();redoStack=[];}
function updateHistory(){ $('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;}
function commit(){persist();renderWires();updateHistory();renderGuides();}
function viewSize(){return face==='back'?[800,1000]:[1000,800];}
function orient([x,y]){return face==='back'?[y,1000-x]:[x,y];}
function point(id){return orient(byId.get(id).points[face]);}
function path(w){const a=byId.get(w.a).points[face],b=byId.get(w.b).points[face];return (w.route==='straight'?[a,b]:[a,[b[0],a[1]],b]).map(orient).map((p,i)=>`${i?'L':'M'}${p}`).join(' ');}
function normalize(value){const s=value.trim().toUpperCase().replace(/\s+/g,'');if(byId.has(s))return s;const found=holes.find(h=>h.label.toUpperCase().replace(/\s+/g,'')===s);return found?.id||null;}
function setStart(id){start=id;end=null;selected=null;network=false;$('startPoint').value=byId.get(id).label;$('endPoint').value='';renderSelection();$('instruction').textContent=`起點 ${byId.get(id).label}：請選擇終點`;renderWires();}
function cancel(){start=null;end=null;selected=null;network=false;$('startPoint').value='';$('endPoint').value='';$('instruction').textContent='點選任一孔位，開始第一條接線';renderSelection();renderWires();}
function addWire(){
  const a=normalize($('startPoint').value),b=normalize($('endPoint').value);
  if(!a||!b)return notify('請選擇兩個有效孔位，例如 A1 與 A5。');
  if(a===b)return notify('起點與終點必須是不同的孔位。');
  if(wires.some(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a)))return notify('這兩個孔位之間已經有接線。');
  if(wires.length>=1500)return notify('本次練習已達 1500 條接線，請先匯出或刪除部分導線。');
  snapshot();wires.push({id:Math.max(0,...wires.map(w=>w.id))+1,a,b,color,route});
  const label=`${byId.get(a).label} → ${byId.get(b).label}`;cancel();commit();notify(`已建立 ${label}`);
}
function pick(id){if(!start){setStart(id);}else if(start===id){cancel();}else{end=id;$('endPoint').value=byId.get(id).label;addWire();}}
function renderHoles(){
  $('holes').replaceChildren();
  $('components').replaceChildren();
  for(const h of holes){const[x,y]=point(h.id);const el=svg('circle',{cx:x,cy:y,r:10,class:'hole','data-hole':h.id,role:'button',tabindex:-1,'aria-label':`孔位 ${h.label}`});
    if(h.preinstalled)$('components').append(svg('circle',{cx:x,cy:y,r:6.5,fill:'#cbd2d8',stroke:'#f7fafc','stroke-width':1.2,class:'component-mark','data-component':h.id,'pointer-events':'none'}));
    el.append(svg('title',{},h.label+(h.preinstalled?'（原有零件）':'')));el.addEventListener('click',()=>pick(h.id));el.addEventListener('mouseenter',()=>$('hoverLabel').textContent=h.label);el.addEventListener('mouseleave',()=>$('hoverLabel').textContent='—');el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(h.id);}});$('holes').append(el);
  }
  renderSelection();
}
function renderSelection(){
  const net=network&&start?connected(wires,start):new Set();
  for(const el of $('holes').children){el.classList.toggle('selected',el.dataset.hole===start);el.classList.toggle('connected',net.has(el.dataset.hole));}
  $('markers').replaceChildren();
  if(start){const[x,y]=point(start);const label=byId.get(start).label;const g=svg('g');g.append(svg('rect',{x:x-5,y:y-40,width:Math.max(46,label.length*11+13),height:27,rx:5,class:'marker'}),svg('text',{x:x+3,y:y-21,class:'marker-text'},label));$('markers').append(g);}
  $('network').classList.toggle('active',network);
}
function selectWire(id){selected=id;network=false;const w=wires.find(w=>w.id===id);start=w.a;end=w.b;$('startPoint').value=byId.get(w.a).label;$('endPoint').value=byId.get(w.b).label;$('instruction').textContent=`已選取 ${byId.get(w.a).label} → ${byId.get(w.b).label}`;renderWires();renderSelection();}
function renderWires(){
  $('wires').replaceChildren();$('wireList').replaceChildren();
  for(const[widx,w]of wires.entries()){
    const g=svg('g');const hit=svg('path',{d:path(w),class:'wire-hit','data-wire':w.id});hit.addEventListener('click',()=>selectWire(w.id));g.append(hit,svg('path',{d:path(w),stroke:w.color,'stroke-width':selected===w.id?6:4,class:`wire${selected===w.id?' selected':''}`}));
    for(const id of[w.a,w.b]){const[x,y]=point(id);g.append(svg('circle',{cx:x,cy:y,r:4,fill:w.color,stroke:'#fff7','stroke-width':1,class:'wire-end'}));}$('wires').append(g);
    const btn=document.createElement('button');btn.className=`wire-row${selected===w.id?' active':''}`;btn.setAttribute('aria-label',`選取接線 ${byId.get(w.a).label} 到 ${byId.get(w.b).label}`);const swatch=document.createElement('i');swatch.style.background=w.color;const label=document.createElement('span');label.textContent=`${byId.get(w.a).label} → ${byId.get(w.b).label}`;const idx=document.createElement('span');idx.className='wire-index';idx.textContent=String(widx+1).padStart(2,'0');btn.append(swatch,label,idx);btn.onclick=()=>selectWire(w.id);$('wireList').append(btn);
  }
  if(!wires.length){const empty=document.createElement('div');empty.className='wire-empty';empty.innerHTML='<strong>你的第一條線，從這裡開始</strong>點選板上兩個孔位，即可建立接線。';$('wireList').append(empty);}
  $('wireCount').textContent=wires.length;$('listCount').textContent=String(wires.length).padStart(2,'0');$('selectedWire').hidden=selected===null;$('clear').disabled=!wires.length;
}
function renderGuides(){
  $('guidePanel').hidden=mode!=='guide';$('targets').replaceChildren();
  const done=guides.map(([a,b])=>connected(wires,a).has(b));$('guideProgress').textContent=`${done.filter(Boolean).length} / 3`;$('guideSteps').replaceChildren();
  guides.forEach(([a,b],i)=>{const li=document.createElement('li');li.textContent=`${a} → ${b}`;li.classList.toggle('complete',done[i]);$('guideSteps').append(li);});
  if(mode==='guide'){const next=done.indexOf(false);$('guideMessage').textContent=next<0?'已完成！可以切回自由練習，試著建立自己的接線。':'跟著板上光圈，依序點選兩個孔位。';if(next>=0)for(const id of guides[next]){const[x,y]=point(id);$('targets').append(svg('circle',{cx:x,cy:y,r:16,class:'target-ring'}));}}
}
function setMode(next){mode=next;$('freeMode').classList.toggle('active',mode==='free');$('guideMode').classList.toggle('active',mode==='guide');$('freeMode').setAttribute('aria-pressed',mode==='free');$('guideMode').setAttribute('aria-pressed',mode==='guide');renderGuides();}
function triangle(ctx,img,src,dst){
  const [[x0,y0],[x1,y1],[x2,y2]]=src,[[u0,v0],[u1,v1],[u2,v2]]=dst;
  const den=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);if(Math.abs(den)<1e-8)return;
  const a=((u1-u0)*(y2-y0)-(u2-u0)*(y1-y0))/den,c=((x1-x0)*(u2-u0)-(x2-x0)*(u1-u0))/den;
  const b=((v1-v0)*(y2-y0)-(v2-v0)*(y1-y0))/den,d=((x1-x0)*(v2-v0)-(x2-x0)*(v1-v0))/den;
  ctx.save();ctx.beginPath();dst.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,u0-a*x0-c*y0,v0-b*x0-d*y0);ctx.drawImage(img,0,0);ctx.restore();
}
function renderPhoto(){
  const ctx=$('photo').getContext('2d');ctx.resetTransform();ctx.clearRect(0,0,$('photo').width,$('photo').height);ctx.scale(1.2,1.2);
  const inv=homography(rectangle,corners[face]),img=imageCache[face];const n=24;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const q=[[c*1000/n,r*800/n],[(c+1)*1000/n,r*800/n],[(c+1)*1000/n,(r+1)*800/n],[c*1000/n,(r+1)*800/n]];
    for(const inds of [[0,1,2],[0,2,3]])triangle(ctx,img,inds.map(i=>inv(q[i])),inds.map(i=>orient(q[i])));
  }
}
function setFace(next){face=next;const[width,height]=viewSize();$('board').setAttribute('viewBox',`0 0 ${width} ${height}`);$('photo').width=width*1.2;$('photo').height=height*1.2;$('boardStage').style.aspectRatio=`${width} / ${height}`;$('backFace').classList.toggle('active',face==='back');$('frontFace').classList.toggle('active',face==='front');$('backFace').setAttribute('aria-pressed',face==='back');$('frontFace').setAttribute('aria-pressed',face==='front');$('faceLabel').textContent=face==='back'?'BACK / 焊接面':'FRONT / 零件面';renderPhoto();renderHoles();renderWires();renderGuides();setZoom(zoom);}
function setZoom(next){zoom=Math.min(2.5,Math.max(.75,next));const vp=$('boardViewport'),style=getComputedStyle(vp),availableWidth=vp.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),[width,height]=viewSize();const base=window.innerWidth<=760?availableWidth:Math.min(availableWidth,(vp.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-18)*width/height,850);$('zoomReset').textContent=`${Math.round(zoom*100)}%`;$('boardStage').style.width=`${Math.max(250,base)*zoom}px`;$('boardStage').style.maxWidth='none';}
function undo(){if(!undoStack.length)return;redoStack.push(structuredClone(wires));wires=undoStack.pop();cancel();commit();notify('已復原');}
function redo(){if(!redoStack.length)return;undoStack.push(structuredClone(wires));wires=redoStack.pop();cancel();commit();notify('已重做');}
function deleteSelected(){if(selected===null)return;snapshot();wires=wires.filter(w=>w.id!==selected);cancel();commit();notify('已刪除接線，可按復原恢復');}
async function init(){
  const response=await fetch('holes.json?v=20261016-silver42');if(!response.ok)throw Error('孔位資料讀取失敗，請重新整理。');holes=await response.json();
  for(const h of holes){h.points=Object.fromEntries(['front','back'].map(f=>[f,maps[f](h.raw[f])]));byId.set(h.id,h);const option=document.createElement('option');option.value=h.label;$('holeOptions').append(option);}
  await Promise.all(['front','back'].map(f=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{imageCache[f]=img;resolve();};img.onerror=()=>reject(Error('電路板照片載入失敗，請重新整理。'));img.src=`board-${f}.jpg`;})));
  try{const saved=localStorage.getItem(key);if(saved)wires=validateProject(JSON.parse(saved),new Set(byId.keys()));}catch{notify('舊存檔無法讀取，已開啟空白練習。');}
  colors.forEach(([value,name])=>{const b=document.createElement('button');b.style.background=value;b.setAttribute('aria-label',name);b.setAttribute('title',name);b.setAttribute('aria-pressed',value===color);b.classList.toggle('active',value===color);b.onclick=()=>{color=value;$('colorName').textContent=name;for(const el of $('colors').children){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);}};$('colors').append(b);});
  $('backFace').onclick=()=>setFace('back');$('frontFace').onclick=()=>setFace('front');$('freeMode').onclick=()=>setMode('free');$('guideMode').onclick=()=>setMode('guide');
  $('addWire').onclick=addWire;$('cancel').onclick=cancel;$('undo').onclick=undo;$('redo').onclick=redo;$('deleteSelected').onclick=deleteSelected;
  $('zoomIn').onclick=()=>setZoom(zoom+.25);$('zoomOut').onclick=()=>setZoom(zoom-.25);$('zoomReset').onclick=()=>setZoom(1);
  for(const next of ['elbow','straight'])$(next).onclick=()=>{route=next;for(const id of ['elbow','straight']){$(id).classList.toggle('active',next===id);$(id).setAttribute('aria-pressed',next===id);}};
  $('startPoint').addEventListener('change',()=>{const id=normalize($('startPoint').value);if(id){start=id;selected=null;network=false;renderSelection();renderWires();}});
  for(const id of ['startPoint','endPoint'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter')addWire();});
  $('network').onclick=()=>{const id=normalize($('startPoint').value);if(!id)return notify('先點選一個孔位，或在起點欄輸入座標。');start=id;network=!network;renderSelection();const size=connected(wires,start).size;notify(network?`你的導線共連通 ${size} 個孔位（未計板上銅箔）`:'已關閉連通顯示');};
  $('help').onclick=()=>$('helpDialog').showModal();document.querySelector('.dialog-close').onclick=()=>$('helpDialog').close();$('startGuide').onclick=()=>{$('helpDialog').close();setMode('guide');};
  $('clear').onclick=()=>$('clearDialog').showModal();$('keepWires').onclick=()=>$('clearDialog').close();$('confirmClear').onclick=()=>{snapshot();wires=[];cancel();commit();$('clearDialog').close();notify('已清空，可按復原恢復');};
  $('export').onclick=()=>{const blob=new Blob([JSON.stringify({format:key,board:'CH-1067B',exportedAt:new Date().toISOString(),wires},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`CH-1067B-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已匯出練習檔');};
  $('import').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>2e6)throw Error('練習檔過大，請選擇 2 MB 以下的 JSON 檔案。');const next=validateProject(JSON.parse(await f.text()),new Set(byId.keys()));snapshot();wires=next;cancel();commit();notify(`已匯入 ${wires.length} 條接線`);}catch(err){notify(err instanceof SyntaxError?'檔案不是有效的 JSON。':err.message);}finally{e.target.value='';}};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))cancel();if(/INPUT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}if(e.key==='Delete'||e.key==='Backspace'){if(selected!==null){e.preventDefault();deleteSelected();}}if(e.key==='?')$('helpDialog').showModal();});
  setFace('back');setZoom(1);window.addEventListener('resize',()=>setZoom(zoom));updateHistory();
}
init().catch(err=>{notify(err.message);$('instruction').textContent=err.message;});
