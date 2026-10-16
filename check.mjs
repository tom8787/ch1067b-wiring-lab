import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homography,corners,rectangle,connected,validateProject} from './core.mjs';
const holes=JSON.parse(readFileSync(new URL('./holes.json',import.meta.url),'utf8'));
const ids=new Set(holes.map(h=>h.id));assert.equal(holes.length,501);assert.equal(ids.size,501);
assert.equal(holes.filter(h=>h.id.startsWith('TOP:')).length,19);
assert.equal(holes.filter(h=>h.id.startsWith('BOTTOM:')).length,12);
for(const id of ['TOP:EXT','TOP:1','TOP:18','BOTTOM:EXT','BOTTOM:1','BOTTOM:11'])assert.ok(ids.has(id),`Missing edge endpoint ${id}`);
for(const face of ['front','back']){const map=homography(corners[face],rectangle);corners[face].forEach((p,i)=>map(p).forEach((v,j)=>assert.ok(Math.abs(v-rectangle[i][j])<1e-7)));for(const h of holes){const[x,y]=map(h.raw[face]);assert.ok(x>0&&x<1000&&y>0&&y<800,`${face} ${h.id} outside board`);}}
for(const h of holes){const front=homography(corners.front,rectangle)(h.raw.front),back=homography(corners.back,rectangle)(h.raw.back);assert.ok(Math.abs(front[0]+back[0]-1000)<30,`${h.id} mirror X`);assert.ok(Math.abs(front[1]-back[1])<30,`${h.id} mirror Y`);}
const wire=(a,b,id)=>({a,b,id,color:'#f3ad48',route:'elbow'});
const graph=[wire('A1','A2',1),wire('A2','A3',2),wire('A3','A1',3),wire('B1','B2',4)];
assert.deepEqual([...connected(graph,'A1')].sort(),['A1','A2','A3']);assert.deepEqual([...connected(graph,'C1')],['C1']);
assert.equal(validateProject({format:'ch1067b-wiring-v1',wires:graph},ids).length,4);
assert.equal(validateProject({format:'ch1067b-wiring-v1',wires:[wire('TOP:18','BOTTOM:11',1),wire('TOP:EXT','A1',2)]},ids).length,2);
assert.throws(()=>validateProject({format:'ch1067b-wiring-v1',wires:[wire('A1','ZZ1',1)]},ids));assert.throws(()=>validateProject({format:'ch1067b-wiring-v1',wires:[wire('A1','A2',1),wire('A2','A1',2)]},ids));assert.throws(()=>validateProject({format:'other',wires:[]},ids));
console.log('PASS: 501 unique endpoints including both edge rows, photograph transforms, mirrored correspondence, transitive connectivity, and old/new endpoint import validation.');
