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
function normalizarFecha(v){if(!v)return null;return String(v).slice(0,10);}
/*PARTE2*/