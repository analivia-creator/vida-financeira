const $=s=>document.querySelector(s);
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const CATS={out:['Moradia','Alimentação','Transporte','Saúde','Educação','Lazer','Contas','Outros'],in:['Salário','Extra','Investimentos','Outros']};
let D={tx:[],lim:0,tipo:'out',last:{}};
try{D=Object.assign(D,JSON.parse(localStorage.getItem('bolso')||'{}'))}catch(e){}
if(D.tipo!=='in')D.tipo='out';
const save=()=>{try{localStorage.setItem('bolso',JSON.stringify(D))}catch(e){}};
const p2=n=>String(n).padStart(2,'0');
const hoje=()=>{const d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{v=String(v).trim().replace(/[R$\s]/g,'');if(v.includes(','))v=v.replace(/\./g,'').replace(',','.');const n=parseFloat(v);return isFinite(n)?n:NaN};
const sum=(L,t)=>L.filter(x=>x.type===t).reduce((a,x)=>a+x.val,0);
const tipo=()=>document.querySelector('input[name=tipo]:checked').value;

function cats(){
  const t=tipo();let sel=D.last[t]||CATS[t][0];if(!CATS[t].includes(sel))sel=CATS[t][0];
  $('#cat').innerHTML=CATS[t].map(c=>`<label><input type="radio" name="cat" value="${c}"${c===sel?' checked':''}><span>${c}</span></label>`).join('');
}
function syncData(){
  const m=$('#mes').value;
  if(!$('#data').value.startsWith(m))$('#data').value=m===hoje().slice(0,7)?hoje():m+'-01';
}
function shift(n){
  const [y,m]=($('#mes').value||hoje().slice(0,7)).split('-').map(Number),d=new Date(y,m-1+n,1);
  $('#mes').value=d.getFullYear()+'-'+p2(d.getMonth()+1);syncData();render();
}

function render(){
  const m=$('#mes').value||hoje().slice(0,7);
  const L=D.tx.filter(t=>t.date.startsWith(m)).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  const ent=sum(L,'in'),sai=sum(L,'out'),s=ent-sai;
  $('#saldo').textContent=brl(s);$('#saldo').className='saldo'+(s<0?' neg':'');
  $('#ent').textContent=brl(ent);$('#sai').textContent=brl(sai);
  const pm=(()=>{const [y,mm]=m.split('-').map(Number),d=new Date(y,mm-2,1);return d.getFullYear()+'-'+p2(d.getMonth()+1)})();
  const ant=sum(D.tx.filter(t=>t.date.startsWith(pm)),'out');
  $('#cmp').textContent=ant>0&&sai>0?`Saídas ${sai>=ant?Math.round((sai/ant-1)*100)+'% acima':Math.round((1-sai/ant)*100)+'% abaixo'} do mês anterior (${brl(ant)}).`:'';

  const bar=$('#lbar');
  if(D.lim>0){
    const p=sai/D.lim*100;
    bar.style.width=Math.min(p,100)+'%';
    bar.className=p>100?'over':p>80?'warn':'';
    $('#ltxt').textContent=p>100
      ?`Você passou do limite em ${brl(sai-D.lim)} (${Math.round(p)}% usado).`
      :`Usou ${brl(sai)} de ${brl(D.lim)} (${Math.round(p)}%). Ainda restam ${brl(D.lim-sai)}.`;
  }else{bar.style.width='0';bar.className='';$('#ltxt').textContent='Defina um limite mensal para acompanhar seus gastos.'}

  const out={};L.filter(x=>x.type==='out').forEach(x=>out[x.cat]=(out[x.cat]||0)+x.val);
  const ord=Object.entries(out).sort((a,b)=>b[1]-a[1]);
  $('#cats').innerHTML=ord.length?ord.map(([c,v])=>{const p=v/sai*100;return `<div class="cat"><div><span>${esc(c)}</span><span>${brl(v)} · ${Math.round(p)}%</span></div><div class="barra"><i style="width:${p}%"></i></div></div>`}).join(''):'<p class="vazio">Sem saídas neste mês.</p>';

  const q=norm($('#busca').value),V=q?L.filter(t=>norm(t.desc+' '+t.cat).includes(q)):L;
  $('#lista').innerHTML=V.length?V.map(t=>`<li><span class="d">${t.date.slice(8)}/${t.date.slice(5,7)}</span><span>${esc(t.desc)}<small>${esc(t.cat)}</small></span><span class="v ${t.type==='in'?'pos':'neg'}">${t.type==='in'?'+':'−'} ${brl(t.val)}</span><span class="acts"><button data-ed="${t.id}" aria-label="Editar ${esc(t.desc)}">Editar</button><button data-id="${t.id}" aria-label="Apagar ${esc(t.desc)}">Apagar</button></span></li>`).join(''):'<li class="vazio">'+(q?'Nada encontrado.':'Nenhum lançamento neste mês. Registre o primeiro: digite o valor e toque em Adicionar.')+'</li>';
}

let editId=null;
const addM=(s,i)=>{const [y,m,d]=s.split('-').map(Number),u=new Date(y,m+i,0).getDate(),t=new Date(y,m-1+i,Math.min(d,u));return t.getFullYear()+'-'+p2(t.getMonth()+1)+'-'+p2(t.getDate())};
const r2=n=>Math.round(n*100)/100;
function sair(){editId=null;$('#sub').textContent='Adicionar';$('#canc').hidden=true;$('#repbox').hidden=false}
$('#f').addEventListener('submit',e=>{
  e.preventDefault();
  const val=num($('#valor').value),date=$('#data').value,t=tipo(),c=document.querySelector('input[name=cat]:checked').value,desc=$('#desc').value.trim()||c;
  if(!(val>0)||!date){$('#valor').focus();return}
  if(editId){const x=D.tx.find(k=>k.id===editId);if(x)Object.assign(x,{desc,val:r2(val),type:t,cat:c,date});sair()}
  else{
    const n=Math.max(1,Math.min(60,parseInt($('#rep').value)||1)),par=$('#parc').checked&&n>1,b=r2(val/n);
    for(let i=0;i<n;i++)D.tx.push({id:Date.now()+i,desc:par?`${desc} (${i+1}/${n})`:desc,val:par?(i==n-1?r2(val-b*(n-1)):b):r2(val),type:t,cat:c,date:addM(date,i)});
  }
  D.last[t]=c;D.tipo=t;save();$('#mes').value=date.slice(0,7);
  $('#valor').value='';$('#desc').value='';$('#rep').value=1;$('#parc').checked=false;$('#valor').focus();render();
});
$('#canc').addEventListener('click',()=>{sair();$('#valor').value='';$('#desc').value=''});
function editar(id){
  const x=D.tx.find(k=>String(k.id)===id);if(!x)return;editId=x.id;
  document.querySelector(`input[name=tipo][value=${x.type}]`).checked=true;D.last[x.type]=x.cat;cats();
  $('#valor').value=String(x.val).replace('.',',');$('#data').value=x.date;$('#desc').value=x.desc;
  $('#sub').textContent='Salvar alteração';$('#canc').hidden=false;$('#repbox').hidden=true;$('#valor').focus();scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('input[name=tipo]').forEach(r=>r.addEventListener('change',()=>{D.tipo=tipo();save();cats()}));
$('#mes').addEventListener('change',()=>{if(!$('#mes').value)$('#mes').value=hoje().slice(0,7);syncData();render()});
$('#ant').addEventListener('click',()=>shift(-1));
$('#prox').addEventListener('click',()=>shift(1));
$('#setlim').addEventListener('click',()=>{const n=num($('#lim').value);D.lim=n>0?n:0;if(!(n>0))$('#lim').value='';save();render()});

let undo=null,tt;
$('#lista').addEventListener('click',e=>{
  const ed=e.target.closest('button[data-ed]');if(ed){editar(ed.dataset.ed);return}
  const b=e.target.closest('button[data-id]');if(!b)return;
  undo=D.tx.find(t=>String(t.id)===b.dataset.id);
  D.tx=D.tx.filter(t=>String(t.id)!==b.dataset.id);save();render();
  $('#toast').hidden=false;clearTimeout(tt);tt=setTimeout(()=>$('#toast').hidden=true,6000);
});
$('#undo').addEventListener('click',()=>{if(undo){D.tx.push(undo);undo=null;save();render()}$('#toast').hidden=true});


const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const dmy=s=>s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const todos=()=>[...D.tx].sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
const msg=t=>$('#imsg').textContent=t;
function baixar(blob,nome){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
let xl;const lib=()=>window.XLSX?Promise.resolve():xl||(xl=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=ok;s.onerror=()=>{xl=null;no()};document.head.appendChild(s)}));

$('#csv').addEventListener('click',()=>{
  const safe=s=>{s=String(s);if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
  const rows=todos().map(t=>[dmy(t.date),t.type==='in'?'Entrada':'Saída',safe(t.cat),safe(t.desc),String(t.val).replace('.',',')].join(';'));
  baixar(new Blob(['\ufeffData;Tipo;Categoria;Descrição;Valor\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'}),'bolso.csv');msg(rows.length+' lançamentos exportados.');
});
$('#xlsx').addEventListener('click',async()=>{
  try{await lib()}catch(e){return msg('Não consegui carregar o gerador de XLSX. Verifique a internet ou use CSV.')}
  const T=todos(),mes={};
  T.forEach(t=>{const m=t.date.slice(0,7);mes[m]=mes[m]||[0,0];mes[m][t.type==='in'?0:1]+=t.val});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Data','Tipo','Categoria','Descrição','Valor'],...T.map(t=>[dmy(t.date),t.type==='in'?'Entrada':'Saída',t.cat,t.desc,t.val])]),'Lançamentos');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mês','Entradas','Saídas','Saldo'],...Object.keys(mes).sort().map(m=>[m.slice(5)+'/'+m.slice(0,4),r2(mes[m][0]),r2(mes[m][1]),r2(mes[m][0]-mes[m][1])])]),'Resumo por mês');
  XLSX.writeFile(wb,'bolso.xlsx');msg(T.length+' lançamentos exportados.');
});

function csv(t){
  t=t.replace(/^\ufeff/,'');const d=(t.split('\n')[0]||'').includes(';')?';':',',R=[];let r=[],c='',q=false;
  for(let i=0;i<t.length;i++){const h=t[i];
    if(q){if(h=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=h}
    else if(h=='"')q=true;else if(h==d){r.push(c);c=''}
    else if(h=='\n'||h=='\r'){if(h=='\r'&&t[i+1]=='\n')i++;r.push(c);c='';R.push(r);r=[]}else c+=h}
  if(c||r.length){r.push(c);R.push(r)}return R;
}
function dt(v){
  if(typeof v==='number'){const d=new Date(Date.UTC(1899,11,30)+Math.round(v)*864e5);return d.getUTCFullYear()+'-'+p2(d.getUTCMonth()+1)+'-'+p2(d.getUTCDate())}
  v=String(v).trim();let m=v.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];
  m=v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);return m?m[3]+'-'+p2(m[2])+'-'+p2(m[1]):null;
}
function importar(R){
  const H=(R.shift()||[]).map(norm),col=n=>H.findIndex(h=>h.startsWith(n));
  const [a,b,c,d,e]=['data','tipo','categoria','descri','valor'].map(col);
  if(a<0||e<0)return msg('Não achei as colunas "Data" e "Valor" na primeira linha da planilha.');
  const key=t=>[t.date,t.type,norm(t.cat),norm(t.desc),t.val].join('|'),have=new Set(D.tx.map(key));
  let ok=0,dup=0,bad=0;
  R.forEach((r,i)=>{
    if(!r.some(x=>String(x??'').trim()))return;
    const v=typeof r[e]==='number'?r[e]:num(r[e]??''),date=dt(r[a]??'');
    if(!isFinite(v)||v===0||!date){bad++;return}
    const tp=norm(r[b]),type=tp?(tp[0]==='e'||tp[0]==='r'?'in':'out'):(v<0?'out':'in');
    const c0=String(r[c]??'').trim(),cat=[...CATS.out,...CATS.in].find(k=>norm(k)===norm(c0))||c0.slice(0,30)||'Outros';
    const desc=String(r[d]??'').trim().replace(/^'(?=[=+\-@])/,'').slice(0,60)||cat;
    const t={id:Date.now()+i,desc,val:r2(Math.abs(v)),type,cat,date};
    if(have.has(key(t))){dup++;return}have.add(key(t));D.tx.push(t);ok++;
  });
  save();render();msg(`${ok} importados, ${dup} repetidos ignorados, ${bad} linhas com problema.`);
}
$('#imp').addEventListener('click',()=>$('#arq').click());
$('#arq').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{
    if(/\.csv$/i.test(f.name))importar(csv(await f.text()));
    else{await lib();const wb=XLSX.read(await f.arrayBuffer()),ws=wb.Sheets[wb.SheetNames.find(n=>norm(n).startsWith('lanc'))||wb.SheetNames[0]];importar(XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''}))}
  }catch(x){msg('Não consegui ler esse arquivo. Use uma planilha CSV ou XLSX com as colunas do Bolso (se for XLSX, é preciso internet).')}
});

$('#bk').addEventListener('click',()=>baixar(new Blob([JSON.stringify(D)],{type:'application/json'}),'bolso-backup-'+hoje()+'.json'));
$('#rs').addEventListener('click',()=>$('#arqb').click());
$('#arqb').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{
    const j=JSON.parse(await f.text());if(!Array.isArray(j.tx))throw 0;
    j.tx=j.tx.filter(t=>t&&typeof t.date==='string'&&typeof t.desc==='string'&&isFinite(t.val)&&(t.type==='in'||t.type==='out')).map(t=>({...t,cat:String(t.cat||'Outros')}));
    if(!confirm('Restaurar vai substituir os dados atuais por '+j.tx.length+' lançamentos do backup. Continuar?'))return;
    D=Object.assign({tx:[],lim:0,tipo:'out',last:{}},j);if(D.tipo!=='in')D.tipo='out';save();location.reload();
  }catch(x){msg('Esse arquivo não parece um backup do Bolso.')}
});

$('#busca').addEventListener('input',render);
const pv=()=>{document.body.classList.toggle('priv',!!D.priv);$('#priv').setAttribute('aria-pressed',!!D.priv);$('#priv').textContent=D.priv?'Mostrar valores':'Ocultar valores'};
$('#priv').addEventListener('click',()=>{D.priv=!D.priv;save();pv()});
pv();

document.querySelector(`input[name=tipo][value=${D.tipo}]`).checked=true;
$('#mes').value=hoje().slice(0,7);$('#data').value=hoje();
if(D.lim>0)$('#lim').value=String(D.lim).replace('.',',');
cats();render();
