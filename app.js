const BASEROW_TABLE_ID='1313770';
const BASEROW_TOKEN='LCgQnH3caLjCOE3LmtEA8SN5olDd4TzG';
const BASEROW_BASE='https://api.baserow.io/api/database/rows/table/'+BASEROW_TABLE_ID+'/';
const HORAS=['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];
const DIAS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
let tareas=[],editandoId=null,offsetSemana=0,cargando=true;
function toISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+dd;}
function lunesDeEstaSemana(b){const d=new Date(b),day=d.getDay(),diff=(day===0?-6:1-day);d.setDate(d.getDate()+diff);d.setHours(0,0,0,0);return d;}
function fechaDeDia(i){const b=new Date();b.setDate(b.getDate()+offsetSemana*7);const l=lunesDeEstaSemana(b),f=new Date(l);f.setDate(l.getDate()+i);return f;}
function esHoy(f){const h=new Date();return f.getDate()===h.getDate()&&f.getMonth()===h.getMonth()&&f.getFullYear()===h.getFullYear();}
function normalizarDia(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);if(isNaN(n)||n<0||n>6)return null;return n;}
function normalizarHora(v){if(v===null||v===undefined||v==='')return null;return String(v);}
function normalizarFecha(v){if(!v)return null;return String(v).slice(0,10);}async function baserowFetch(url,opt){const h={'Authorization':'Token '+BASEROW_TOKEN,'Content-Type':'application/json'};const r=await fetch(url,Object.assign({},opt,{headers:h}));if(!r.ok){const e=await r.text();throw new Error('Baserow '+r.status+': '+e);}return r.json();}
async function cargarTareasDesdeBaserow(){try{let next=BASEROW_BASE+'?user_field_names=true&size=200';const acc=[];while(next){const d=await baserowFetch(next);acc.push.apply(acc,d.results||[]);next=d.next||null;}tareas=acc.map(function(row){return{id:row.id_tarea||('br-'+row.id),baserowId:row.id,nombre:row.nombre||'',cat:row.categoria||'',estado:row.estado&&row.estado.value?row.estado.value:'sininiciar',avance:Number(row.avance)||0,comentario:row.comentario||'',fecha:normalizarFecha(row.Date!=null?row.Date:row.fecha),dia:normalizarDia(row.dia),hora:normalizarHora(row.hora)};});mostrarToast('Cargadas '+tareas.length+' tareas');}catch(err){console.error(err);mostrarToast('Error: '+err.message);tareas=[];}finally{cargando=false;renderTodo();}}
function payloadDeTarea(t){return{nombre:t.nombre,categoria:t.cat||'',estado:t.estado,avance:Math.max(0,Math.min(100,Number(t.avance)||0)),comentario:t.comentario||'',Date:t.fecha||null,dia:t.dia!==null?Math.max(0,Math.min(6,t.dia)):null,hora:t.hora||null,id_tarea:t.id};}
async function crearTareaEnBaserow(t){const d=await baserowFetch(BASEROW_BASE+'?user_field_names=true',{method:'POST',body:JSON.stringify(payloadDeTarea(t))});return d.id;}
async function actualizarTareaEnBaserow(t){if(!t.baserowId){t.baserowId=await crearTareaEnBaserow(t);return;}const p=payloadDeTarea(t);delete p.id_tarea;await baserowFetch(BASEROW_BASE+t.baserowId+'/?user_field_names=true',{method:'PATCH',body:JSON.stringify(p)});}
async function eliminarTareaEnBaserow(t){if(!t.baserowId)return;await baserowFetch(BASEROW_BASE+t.baserowId+'/',{method:'DELETE'});}async function buscarTareaPorId(idTarea){
  try{
    const url=BASEROW_BASE+'?user_field_names=true&filter__id_tarea__equal='+encodeURIComponent(idTarea)+'&size=1';
    const d=await baserowFetch(url);
    return (d.results&&d.results.length>0)?d.results[0]:null;
  }catch(e){return null;}
}
async function importarHaciaBaserow(lista){
  const progreso=document.getElementById('importProgress');
  const barra=document.getElementById('importBar');
  const texto=document.getElementById('importText');
  function setProgreso(hechas,total,msg){
    if(!progreso)return;
    progreso.style.display='block';
    const pct=total>0?Math.round(hechas*100/total):0;
    if(barra)barra.style.width=pct+'%';
    if(texto)texto.textContent=(msg||'Importando')+' '+hechas+'/'+total+' ('+pct+'%)';
  }
  function ocultarProgreso(){if(progreso)progreso.style.display='none';}
  setProgreso(0,lista.length,'Importando');
  let creadas=0,actualizadas=0,errores=0;
  for(let i=0;i<lista.length;i++){
    const raw=lista[i];
    try{
      let dia=normalizarDia(raw.dia);
      let fecha=normalizarFecha(raw.fecha);
      if(!fecha&&dia!==null)fecha=toISO(fechaDeDia(dia));
      const idT=raw.id||('t'+Date.now()+'_'+i);
      const t={id:idT,nombre:raw.nombre||raw.name||'',cat:raw.cat||raw.categoria||'',estado:raw.estado||'sininiciar',avance:raw.avance||0,comentario:raw.comentario||'',fecha:fecha,dia:dia,hora:normalizarHora(raw.hora)};
      const existente=await buscarTareaPorId(idT);
      if(existente){
        t.baserowId=existente.id;
        await actualizarTareaEnBaserow(t);
        const idx=tareas.findIndex(function(x){return x.id===idT;});
        if(idx>=0)tareas[idx]=t;else tareas.push(t);
        actualizadas++;
      }else{
        t.baserowId=await crearTareaEnBaserow(t);
        tareas.push(t);
        creadas++;
      }
    }catch(err){
      console.error('Error importando:',raw.nombre||raw.id,err);
      errores++;
    }
    setProgreso(i+1,lista.length,'Importando');
    if(i%5===4)await new Promise(function(r){setTimeout(r,0);});
  }
  renderTodo();
  setProgreso(lista.length,lista.length,'Completado');
  setTimeout(ocultarProgreso,1500);
  mostrarToast('Importación: '+creadas+' nuevas, '+actualizadas+' actualizadas, '+errores+' errores');
}
function toggleSidebar(){const s=document.getElementById('sidebar');if(s)s.classList.toggle('hidden');}
function configurarDropSidebar(){const s=document.getElementById('sidebar');if(!s)return;s.addEventListener('dragover',function(e){e.preventDefault();e.stopPropagation();s.classList.add('drop-target');});s.addEventListener('dragleave',function(e){if(!s.contains(e.relatedTarget))s.classList.remove('drop-target');});s.addEventListener('drop',async function(e){e.preventDefault();e.stopPropagation();s.classList.remove('drop-target');const id=e.dataTransfer.getData('text/plain');const t=tareas.find(function(x){return x.id===id;});if(!t)return;if(t.dia===null&&t.hora===null&&t.fecha===null)return;t.dia=null;t.hora=null;t.fecha=null;renderTodo();mostrarToast('Tarea devuelta a la lista');try{await actualizarTareaEnBaserow(t);}catch(err){console.error(err);mostrarToast('Cambio local, no guardado');}});}
let seleccionadas=new Set();
function toggleSeleccionTodas(){
  const visibles=tareas.filter(function(t){return !t.fecha&&t.hora===null&&t.dia===null;});
  const todas=visibles.length>0&&visibles.every(function(t){return seleccionadas.has(t.id);});
  if(todas){seleccionadas.clear();}else{visibles.forEach(function(t){seleccionadas.add(t.id);});}
  renderLista();
}
function toggleSeleccion(id){
  if(seleccionadas.has(id))seleccionadas.delete(id);else seleccionadas.add(id);
  renderLista();
}
function actualizarBotonesSel(){
  const b2=document.getElementById('btnDeleteSel');
  if(b2)b2.style.display=seleccionadas.size>0?'inline-flex':'none';
  const visibles=tareas.filter(function(t){return !t.fecha&&t.hora===null&&t.dia===null;});
  const todas=visibles.length>0&&visibles.every(function(t){return seleccionadas.has(t.id);});
  const chk=document.getElementById('chkAllSidebar');
  if(chk){chk.checked=todas;chk.indeterminate=!todas&&seleccionadas.size>0;}
}
async function borrarSeleccionadas(){
  if(seleccionadas.size===0)return;
  if(!confirm('¿Eliminar '+seleccionadas.size+' tareas seleccionadas?'))return;
  const ids=Array.from(seleccionadas);
  const progreso=document.getElementById('importProgress');
  const barra=document.getElementById('importBar');
  const texto=document.getElementById('importText');
  if(progreso)progreso.style.display='block';
  let ok=0,err=0;
  for(let i=0;i<ids.length;i++){
    const t=tareas.find(function(x){return x.id===ids[i];});
    if(!t)continue;
    try{await eliminarTareaEnBaserow(t);ok++;}catch(e){err++;}
    if(barra)barra.style.width=Math.round((i+1)*100/ids.length)+'%';
    if(texto)texto.textContent='Eliminando '+(i+1)+'/'+ids.length;
    if(i%5===4)await new Promise(function(r){setTimeout(r,0);});
  }
  tareas=tareas.filter(function(t){return !seleccionadas.has(t.id);});
  seleccionadas.clear();
  renderTodo();
  if(progreso)setTimeout(function(){progreso.style.display='none';},1200);
  mostrarToast('Eliminadas '+ok+', errores '+err);
}
function renderLista(){const c=document.getElementById('lista');if(!c)return;const el=document.getElementById('search');const f=(el?el.value:'').toLowerCase();c.innerHTML='';const s=tareas.filter(function(t){return !t.fecha&&t.hora===null&&t.dia===null;}).filter(function(t){return !f||t.nombre.toLowerCase().indexOf(f)!==-1||(t.cat||'').toLowerCase().indexOf(f)!==-1;});const n=document.getElementById('countSinAsignar');if(n)n.textContent=s.length;if(cargando){c.innerHTML='<p style="font-size:11px;color:#9ca3af;text-align:center;padding:20px">Cargando...</p>';return;}if(s.length===0){c.innerHTML='<p style="font-size:11px;color:#9ca3af;text-align:center;padding:20px">'+(f?'Sin resultados.':'No hay tareas.')+'</p>';return;}s.forEach(function(t){const d=document.createElement('div');d.className='task-card';d.draggable=true;d.dataset.id=t.id;d.dataset.status=t.estado;if(seleccionadas.has(t.id))d.style.outline='2px solid #1f3b73';d.innerHTML='<div style="display:flex;align-items:flex-start;gap:6px"><input type="checkbox" class="sel-chk" '+(seleccionadas.has(t.id)?'checked':'')+' style="margin-top:2px;cursor:pointer"><div style="flex:1;min-width:0"><div class="cat">'+(t.cat||'General')+'</div><div class="name">'+t.nombre+'</div><div class="meta">'+t.estado+' · '+t.avance+'%</div></div></div>';const chk=d.querySelector('.sel-chk');chk.addEventListener('click',function(e){e.stopPropagation();toggleSeleccion(t.id);});d.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',t.id);});d.addEventListener('dblclick',function(){abrirModalEdicion(t.id);});c.appendChild(d);});actualizarBotonesSel();}function renderCalendario(){const th=document.getElementById('theadRow');const tb=document.getElementById('tbody');const wl=document.getElementById('weekLabel');if(!th||!tb||!wl)return;th.innerHTML='';const hh=document.createElement('th');hh.className='hour-col';hh.textContent='Hora';th.appendChild(hh);const fs=DIAS.map(function(_,i){return fechaDeDia(i);});DIAS.forEach(function(d,i){const f=fs[i];const el=document.createElement('th');if(esHoy(f))el.classList.add('today');el.title='Clic para copiar tareas del día';el.innerHTML='<div class="day-name">'+d+'</div><div class="day-date">'+f.getDate()+'-'+MESES[f.getMonth()]+'-'+f.getFullYear()+'</div>';el.addEventListener('click',function(){copiarDia(i);});th.appendChild(el);});const fi=fs[0],ff=fs[6];wl.textContent=fi.getDate()+'-'+MESES[fi.getMonth()]+' → '+ff.getDate()+'-'+MESES[ff.getMonth()]+'-'+ff.getFullYear();tb.innerHTML='';HORAS.forEach(function(h){const tr=document.createElement('tr');const tdH=document.createElement('td');tdH.className='hour';tdH.textContent=h;tr.appendChild(tdH);fs.forEach(function(fc,idx){const iso=toISO(fc);const td=document.createElement('td');td.className='slot';td.dataset.fecha=iso;td.dataset.dia=idx;td.dataset.hora=h;tareas.filter(function(t){return t.fecha===iso&&t.hora===h;}).forEach(function(t){const ch=document.createElement('div');ch.className='slot-task';ch.dataset.status=t.estado;ch.draggable=true;ch.dataset.id=t.id;ch.textContent=t.nombre;ch.title=t.nombre+'\nEstado: '+t.estado+'\nAvance: '+t.avance+'%\n'+(t.comentario||'');ch.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',t.id);});ch.addEventListener('dblclick',function(){abrirModalEdicion(t.id);});td.appendChild(ch);});td.addEventListener('dragover',function(e){e.preventDefault();td.classList.add('dragover');});td.addEventListener('dragleave',function(){td.classList.remove('dragover');});td.addEventListener('drop',async function(e){e.preventDefault();e.stopPropagation();td.classList.remove('dragover');const id=e.dataTransfer.getData('text/plain');const t=tareas.find(function(x){return x.id===id;});if(!t)return;t.fecha=td.dataset.fecha;t.hora=td.dataset.hora;t.dia=parseInt(td.dataset.dia);renderTodo();try{await actualizarTareaEnBaserow(t);}catch(err){console.error(err);mostrarToast('Cambio local, no guardado');}});tr.appendChild(td);});tb.appendChild(tr);});}
function renderTodo(){renderLista();renderCalendario();}
function cambiarSemana(d){offsetSemana+=d;renderCalendario();}
function irHoy(){offsetSemana=0;renderCalendario();}function copiarDia(idx){const f=fechaDeDia(idx);const iso=toISO(f);const dd=tareas.filter(function(t){return t.fecha===iso;}).sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'');});let txt='📅 '+DIAS[idx]+' '+f.getDate()+'-'+MESES[f.getMonth()]+'-'+f.getFullYear()+'\n\n';if(dd.length===0)txt+='(Sin tareas asignadas)';else dd.forEach(function(t){txt+='• ['+(t.hora||'—')+'] '+t.nombre+'\n   Estado: '+t.estado+' | Avance: '+t.avance+'%';if(t.comentario)txt+='\n   Nota: '+t.comentario;txt+='\n';});navigator.clipboard.writeText(txt).then(function(){mostrarToast('Día copiado');}).catch(function(){const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);mostrarToast('Día copiado');});}
function mostrarToast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2500);}
function abrirModalNueva(){editandoId=null;document.getElementById('modalTitle').textContent='Nueva tarea';document.getElementById('inpNombre').value='';document.getElementById('inpCat').value='';document.getElementById('inpEstado').value='sininiciar';document.getElementById('inpAvance').value=0;document.getElementById('inpComentario').value='';document.getElementById('modalBg').classList.add('active');}
function abrirModalEdicion(id){const t=tareas.find(function(x){return x.id===id;});if(!t)return;editandoId=id;document.getElementById('modalTitle').textContent='Editar tarea';document.getElementById('inpNombre').value=t.nombre;document.getElementById('inpCat').value=t.cat||'';document.getElementById('inpEstado').value=t.estado;document.getElementById('inpAvance').value=t.avance;document.getElementById('inpComentario').value=t.comentario||'';document.getElementById('modalBg').classList.add('active');}
function cerrarModal(){const m=document.getElementById('modalBg');if(m)m.classList.remove('active');}async function guardarTarea(){const n=document.getElementById('inpNombre').value.trim();if(!n){alert('Escribe un nombre.');return;}const d={nombre:n,cat:document.getElementById('inpCat').value.trim(),estado:document.getElementById('inpEstado').value,avance:Math.max(0,Math.min(100,parseInt(document.getElementById('inpAvance').value)||0)),comentario:document.getElementById('inpComentario').value.trim()};if(editandoId){const t=tareas.find(function(x){return x.id===editandoId;});if(!t){cerrarModal();return;}Object.assign(t,d);try{await actualizarTareaEnBaserow(t);}catch(err){mostrarToast('Error al guardar');}}else{const nv={id:'t'+Date.now(),nombre:d.nombre,cat:d.cat,estado:d.estado,avance:d.avance,comentario:d.comentario,fecha:null,dia:null,hora:null};try{nv.baserowId=await crearTareaEnBaserow(nv);tareas.push(nv);}catch(err){mostrarToast('Error al crear');}}cerrarModal();renderTodo();}
async function borrarTarea(){if(!editandoId){cerrarModal();return;}if(!confirm('¿Eliminar esta tarea?'))return;const t=tareas.find(function(x){return x.id===editandoId;});try{await eliminarTareaEnBaserow(t);}catch(err){mostrarToast('Error al eliminar');}tareas=tareas.filter(function(x){return x.id!==editandoId;});cerrarModal();renderTodo();}
function exportarJSON(){const d={version:6,exportado:new Date().toISOString(),tareas:tareas};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='tareas_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(u);mostrarToast('Respaldo exportado');}
function importarJSON(evt){const f=evt.target.files[0];if(!f)return;const r=new FileReader();r.onload=async function(e){try{const d=JSON.parse(e.target.result);const l=Array.isArray(d)?d:d.tareas;if(!Array.isArray(l))throw new Error('Formato inválido');if(!confirm('Se importarán '+l.length+' tareas. ¿Continuar?'))return;await importarHaciaBaserow(l);}catch(err){alert('Error al importar: '+err.message);}};r.readAsText(f);evt.target.value='';}
function iniciarPanel(){if(!document.getElementById('sidebar')){console.error('No se encontró #sidebar');return;}configurarDropSidebar();cargarTareasDesdeBaserow();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',iniciarPanel);}else{iniciarPanel();}