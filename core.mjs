export const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXY';
export function solve(A, b) {
  A = A.map((row,i)=>[...row,b[i]]);
  for(let i=0;i<b.length;i++) {
    let k=i; for(let j=i+1;j<b.length;j++) if(Math.abs(A[j][i])>Math.abs(A[k][i])) k=j;
    [A[i],A[k]]=[A[k],A[i]];
    const d=A[i][i]; if(Math.abs(d)<1e-10) throw Error('無法對齊照片');
    for(let j=i;j<=b.length;j++) A[i][j]/=d;
    for(let r=0;r<b.length;r++) if(r!==i) {const f=A[r][i];for(let j=i;j<=b.length;j++) A[r][j]-=f*A[i][j];}
  }
  return A.map(r=>r[b.length]);
}
export function homography(from,to) {
  const a=[],b=[];
  from.forEach(([x,y],i)=>{const [u,v]=to[i];a.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);b.push(u,v);});
  const h=solve(a,b);
  return ([x,y])=>{const d=h[6]*x+h[7]*y+1;return [(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d];};
}
export const corners={front:[[977,814],[208,803],[216,186],[990,199]],back:[[160,151],[995,153],[991,808],[170,813]]};
export const rectangle=[[0,0],[1000,0],[1000,800],[0,800]];
export function connected(wires,start) {
  const visited=new Set(start?[start]:[]),queue=[...visited];
  for(let i=0;i<queue.length;i++) for(const w of wires) {const other=w.a===queue[i]?w.b:w.b===queue[i]?w.a:null;if(other&&!visited.has(other)){visited.add(other);queue.push(other);}}
  return visited;
}
export function validateProject(data,ids) {
  const colors=['#f3ad48','#f36d60','#6aaeff','#b69aff','#62d2ab'];
  if(data?.format!=='ch1067b-wiring-v1'||!Array.isArray(data.wires)||data.wires.length>1500) throw Error('這不是有效的 CH-1067B 練習檔。');
  const seen=new Set();
  return data.wires.map((w,i)=>{
    if(!ids.has(w.a)||!ids.has(w.b)||w.a===w.b||!colors.includes(w.color)||!['straight','elbow'].includes(w.route)) throw Error('練習檔含有無效孔位或接線。');
    const key=[w.a,w.b].sort().join('|');if(seen.has(key))throw Error('練習檔含有重複接線。');seen.add(key);
    return {id:i+1,a:w.a,b:w.b,color:w.color,route:w.route};
  });
}
