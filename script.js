const $=s=>document.querySelector(s);
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const CATS={out:['Moradia','Alimentação','Transporte','Saúde','Educação','Lazer','Contas','Outros'],in:['Salário','Extra','Investimentos','Outros']};
let D={v:1,tx:[],lim:0,tipo:'out',last:{},cats:{out:[],in:[]},dividas:[],contas:[]};
try{D=Object.assign(D,JSON.parse(localStorage.getItem('bolso')||'{}'))}catch(e){}
if(D.tipo!=='in')D.tipo='out';
const save=()=>{try{localStorage.setItem('bolso',JSON.stringify(D));$('#aviso').hidden=true}catch(e){$('#aviso').hidden=false}};
const p2=n=>String(n).padStart(2,'0');
const hoje=()=>{const d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{v=String(v).trim().replace(/[R$\s]/g,'');if(v.includes(','))v=v.replace(/\./g,'').replace(',','.');return /^-?\d+(\.\d+)?$/.test(v)?parseFloat(v):NaN};
const sum=(L,t)=>L.filter(x=>x.type===t).reduce((a,x)=>a+x.val,0);
const tipo=()=>document.querySelector('input[name=tipo]:checked').value;

const catL=t=>[...CATS[t],...D.cats[t]];
function cats(){
  const t=tipo(),L=catL(t);let sel=D.last[t]||L[0];if(!L.includes(sel))sel=L[0];
  $('#cat').innerHTML=L.map(c=>`<label><input type="radio" name="cat" value="${esc(c)}"${c===sel?' checked':''}><span>${esc(c)}</span></label>`).join('')+'<button type="button" id="ncat" class="sec chipbtn">+ Nova</button>';
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
  const acu=D.tx.filter(t=>t.date.slice(0,7)<=m).reduce((a,t)=>a+(t.type==='in'?t.val:-t.val),0);
  $('#acu').textContent=`Saldo acumulado até aqui: ${brl(r2(acu))}`;
  const ms=[];for(let i=5;i>=0;i--){const [y,mm]=m.split('-').map(Number),d=new Date(y,mm-1-i,1);ms.push(d.getFullYear()+'-'+p2(d.getMonth()+1))}
  const dat=ms.map(k=>{const X=D.tx.filter(t=>t.date.startsWith(k));return[k,sum(X,'in'),sum(X,'out')]}),mx=Math.max(1,...dat.flatMap(d=>[d[1],d[2]]));
  $('#graf').innerHTML=dat.map(([k,a,b])=>`<div class="col"><div class="bars"><i class="e" style="height:${a/mx*100}%"></i><i class="s" style="height:${b/mx*100}%"></i></div><small>${k.slice(5)}/${k.slice(2,4)}</small></div>`).join('');
  $('#graf').setAttribute('aria-label','Entradas e saídas por mês: '+dat.map(([k,a,b])=>`${k.slice(5)}/${k.slice(0,4)} entrou ${brl(a)}, saiu ${brl(b)}`).join('; '));

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

  const q=norm($('#busca').value),ft=$('#ftipo').value,V=L.filter(t=>(!ft||t.type===ft)&&(!q||norm(t.desc+' '+t.cat).includes(q)));
  let dia='',lh='';
  V.forEach(t=>{
    if(t.date!==dia){dia=t.date;const tot=r2(V.filter(k=>k.date===dia).reduce((a,k)=>a+(k.type==='in'?k.val:-k.val),0));lh+=`<li class="dia"><span>${dia.slice(8)}/${dia.slice(5,7)}</span><span>${brl(tot)}</span></li>`}
    lh+=`<li><span>${esc(t.desc)}<small>${esc(t.cat)}${t.g?' · repete todo mês':''}</small></span><span class="v ${t.type==='in'?'pos':'neg'}">${t.type==='in'?'+':'−'} ${brl(t.val)}</span><span class="acts"><button data-ed="${t.id}" aria-label="Editar ${esc(t.desc)}">Editar</button><button data-id="${t.id}" aria-label="Apagar ${esc(t.desc)}">Apagar</button></span></li>`});
  $('#lista').innerHTML=lh||'<li class="vazio">'+(q||ft?'Nada encontrado.':'Nenhum lançamento neste mês. Registre o primeiro: digite o valor e toque em Adicionar.')+'</li>';
}

let editId=null;
const addM=(s,i)=>{const [y,m,d]=s.split('-').map(Number),u=new Date(y,m+i,0).getDate(),t=new Date(y,m-1+i,Math.min(d,u));return t.getFullYear()+'-'+p2(t.getMonth()+1)+'-'+p2(t.getDate())};
const r2=n=>Math.round(n*100)/100;
function sair(){editId=null;$('#sub').textContent='Adicionar';$('#canc').hidden=true;$('#repbox').hidden=false;$('#aplicbox').hidden=true}
$('#f').addEventListener('submit',e=>{
  e.preventDefault();
  const val=num($('#valor').value),date=$('#data').value,t=tipo(),c=document.querySelector('input[name=cat]:checked').value,desc=$('#desc').value.trim()||c;
  if(!(val>0)||!date){$('#valor').focus();return}
  if(editId){const x=D.tx.find(k=>k.id===editId);if(x){const gs=x.g&&$('#aplic').checked?D.tx.filter(k=>k.g===x.g&&k.date>=x.date&&k.id!==x.id):[];Object.assign(x,{desc,val:r2(val),type:t,cat:c,date});gs.forEach(k=>Object.assign(k,{desc,val:r2(val),type:t,cat:c}))}sair()}
  else{
    const n=Math.max(1,Math.min(60,parseInt($('#rep').value)||1)),par=$('#parc').checked&&n>1,b=r2(val/n),G=Date.now();
    for(let i=0;i<n;i++)D.tx.push({id:Date.now()+i,desc:par?`${desc} (${i+1}/${n})`:desc,val:par?(i==n-1?r2(val-b*(n-1)):b):r2(val),type:t,cat:c,date:addM(date,i),g:n>1&&!par?G:undefined});
  }
  D.last[t]=c;D.tipo=t;save();$('#mes').value=date.slice(0,7);
  $('#valor').value='';$('#desc').value='';$('#rep').value=1;$('#parc').checked=false;$('#valor').focus();render();
});
$('#canc').addEventListener('click',()=>{sair();$('#valor').value='';$('#desc').value=''});
function editar(id){
  const x=D.tx.find(k=>String(k.id)===id);if(!x)return;editId=x.id;
  document.querySelector(`input[name=tipo][value=${x.type}]`).checked=true;if(!catL(x.type).includes(x.cat))D.cats[x.type].push(x.cat);D.last[x.type]=x.cat;cats();
  $('#valor').value=String(x.val).replace('.',',');$('#data').value=x.date;$('#desc').value=x.desc;
  $('#sub').textContent='Salvar alteração';$('#canc').hidden=false;$('#repbox').hidden=true;$('#valor').focus();document.querySelector('details.mais').open=true;$('#aplicbox').hidden=!x.g;$('#aplic').checked=false;scrollTo({top:0,behavior:'smooth'});
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
  const H=(R.shift()||[]).map(norm),col=n=>H.findIndex(h=>n.some(k=>h.startsWith(k)));
  const [a,b,c,d,e]=[['data'],['tipo'],['categoria'],['descri','historico','lancamento','memo'],['valor','quantia','amount']].map(col);
  if(a<0||e<0)return msg('Não achei as colunas "Data" e "Valor" na primeira linha da planilha.');
  const key=t=>[t.date,t.type,norm(t.cat),norm(t.desc),t.val].join('|'),have={},used={};D.tx.forEach(t=>{const k=key(t);have[k]=(have[k]||0)+1});
  let ok=0,dup=0,bad=0;
  R.forEach((r,i)=>{
    if(!r.some(x=>String(x??'').trim()))return;
    const v=typeof r[e]==='number'?r[e]:num(r[e]??''),date=dt(r[a]??'');
    if(!isFinite(v)||v===0||!date){bad++;return}
    const tp=norm(r[b]),type=tp?(tp[0]==='e'||tp[0]==='r'?'in':'out'):(v<0?'out':'in');
    const c0=String(r[c]??'').trim(),cat=[...catL('out'),...catL('in')].find(k=>norm(k)===norm(c0))||c0.slice(0,30)||'Outros';
    if(!catL(type).some(k=>norm(k)===norm(cat)))D.cats[type].push(cat);const desc=String(r[d]??'').trim().replace(/^'(?=[=+\-@])/,'').slice(0,60)||cat;
    const t={id:Date.now()+i,desc,val:r2(Math.abs(v)),type,cat,date};
    const k=key(t);if((used[k]||0)<(have[k]||0)){used[k]=(used[k]||0)+1;dup++;return}D.tx.push(t);ok++;
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

const VS={ctl:'main-ctl',contas:'v-contas',div:'v-dividas'};
function aba(k){
  Object.entries(VS).forEach(([n,id])=>$('#'+id).hidden=n!==k);
  document.querySelectorAll('.abas button').forEach(b=>{const on=b.dataset.a===k;b.className=on?'on':'sec';b.setAttribute('aria-pressed',on)});
  if(k==='contas')rc();if(k==='div')rd();scrollTo(0,0);
}
document.querySelectorAll('.abas button').forEach(b=>b.addEventListener('click',()=>aba(b.dataset.a)));

const dias=v=>Math.round((new Date(v+'T00:00')-new Date(hoje()+'T00:00'))/864e5);
function badge(){const n=D.contas.filter(c=>!c.pago&&dias(c.venc)<=3).length;$('#tabc').textContent='Contas'+(n?` (${n})`:'')}
function rc(){
  const L=[...D.contas].sort((a,b)=>(a.pago-b.pago)||a.venc.localeCompare(b.venc)),ab=L.filter(c=>!c.pago),atr=ab.filter(c=>dias(c.venc)<0);
  $('#cres').textContent=ab.length?`Em aberto: ${brl(r2(ab.reduce((a,c)=>a+c.valor,0)))}${atr.length?` · ${atr.length} atrasada(s)`:''}`:'Nenhuma conta em aberto.';
  $('#clista').innerHTML=L.length?L.map(c=>{const d=dias(c.venc),st=c.pago?'Paga':d<0?`Atrasada há ${-d} dia(s)`:d===0?'Vence hoje':`Vence em ${d} dia(s)`;
    return `<li class="${c.pago?'paga':d<0?'atr':''}"><span>${esc(c.nome)}<small>${dmy(c.venc)} · ${st}${c.rec?' · todo mês':''}</small></span><span class="v">${brl(c.valor)}</span><span class="acts"><button data-pg="${c.id}">${c.pago?'Desfazer':'Pagar'}</button><button data-cx="${c.id}" aria-label="Apagar ${esc(c.nome)}">Apagar</button></span></li>`}).join(''):'<li class="vazio">Cadastre suas contas com vencimento para não esquecer nenhuma.</li>';
  badge();
}
$('#fc').addEventListener('submit',e=>{
  e.preventDefault();const v=num($('#cv').value),d=$('#cd').value,n=$('#cn').value.trim();if(!n||!(v>0)||!d)return;
  D.contas.push({id:Date.now(),nome:n.slice(0,40),valor:r2(v),venc:d,pago:false,rec:$('#cr').checked});save();e.target.reset();$('#cd').value=hoje();rc();
});
$('#clista').addEventListener('click',e=>{
  const p=e.target.closest('[data-pg]'),x=e.target.closest('[data-cx]');
  if(x){D.contas=D.contas.filter(c=>String(c.id)!==x.dataset.cx);save();rc();return}
  if(!p)return;const c=D.contas.find(k=>String(k.id)===p.dataset.pg);if(!c)return;
  if(!c.pago){
    const tid=Date.now();D.tx.push({id:tid,desc:c.nome,val:c.valor,type:'out',cat:'Contas',date:hoje()});c.pago=true;c.tx=tid;
    if(c.rec){c.next=tid+1;D.contas.push({id:c.next,nome:c.nome,valor:c.valor,venc:addM(c.venc,1),pago:false,rec:true})}
  }else{D.tx=D.tx.filter(t=>t.id!==c.tx);D.contas=D.contas.filter(k=>!(k.id===c.next&&!k.pago));c.pago=false;delete c.tx;delete c.next}
  save();rc();render();
});

function sim(met,total){
  const L=D.dividas.map(d=>({n:d.nome,s:d.saldo,i:d.juros/100,m:d.min})),mn=L.reduce((a,d)=>a+d.m,0);
  if(total<mn)return{erro:`O valor mensal precisa cobrir ao menos as parcelas mínimas (${brl(r2(mn))}).`};
  let meses=0,jur=0;const ord=[];
  while(L.some(d=>d.s>0.005)&&meses<600){
    meses++;L.forEach(d=>{if(d.s>0){const j=d.s*d.i;d.s+=j;jur+=j}});
    let sobra=total;L.forEach(d=>{if(d.s>0){const p=Math.min(d.m,d.s);d.s-=p;sobra-=p}});
    for(const d of L.filter(d=>d.s>0.005).sort(met==='av'?(a,b)=>b.i-a.i:(a,b)=>a.s-b.s)){if(sobra<=0)break;const p=Math.min(sobra,d.s);d.s-=p;sobra-=p}
    L.forEach(d=>{if(d.s<=0.005&&!d.q){d.q=1;ord.push(`${d.n} (mês ${meses})`)}});
  }
  return meses>=600?{erro:'Com esse valor a dívida não quita: os juros crescem mais do que você paga. Tente aumentar o valor mensal ou renegociar.'}:{meses,jur,ord};
}
function rp(){
  const el=$('#plano'),tot=num($('#pg').value);
  if(!D.dividas.length){el.textContent='Cadastre suas dívidas para simular.';return}
  if(!(tot>0)){el.textContent='Informe quanto você consegue pagar por mês.';return}
  const met=document.querySelector('input[name=met]:checked').value,a=sim(met,tot),b=sim(met==='av'?'bn':'av',tot);
  if(a.erro){el.textContent=a.erro;return}
  const t=m=>(Math.floor(m/12)?Math.floor(m/12)+' ano(s) e ':'')+(m%12)+' mês(es)';
  el.innerHTML=`<p>Você quita tudo em <b>${t(a.meses)}</b>, pagando <b>${brl(r2(a.jur))}</b> de juros.</p><p class="mu">Ordem de quitação: ${esc(a.ord.join(' → '))}</p>`+(b.erro?'':`<p class="mu">Pelo outro método: ${t(b.meses)} e ${brl(r2(b.jur))} de juros.</p>`);
}
function rd(){
  const ds=D.dividas,tot=ds.reduce((a,d)=>a+d.saldo,0),jm=ds.reduce((a,d)=>a+d.saldo*d.juros/100,0),mn=ds.reduce((a,d)=>a+d.min,0);
  const rend=sum(D.tx.filter(t=>t.date.startsWith(hoje().slice(0,7))),'in');
  $('#dres').innerHTML=ds.length?`Total devedor: <b>${brl(r2(tot))}</b><br>Só de juros, elas custam cerca de <b>${brl(r2(jm))}</b> por mês.<br>Parcelas mínimas: <b>${brl(r2(mn))}</b>${rend>0&&mn>0?` (${Math.round(mn/rend*100)}% da renda lançada neste mês${mn/rend>.3?', acima da regra prática de 30%':''})`:''}.`:'Nenhuma dívida cadastrada.';
  $('#dlista').innerHTML=ds.map(d=>`<li><span>${esc(d.nome)}<small>${String(d.juros).replace('.',',')}% ao mês · mínimo ${brl(d.min)}</small></span><span class="v neg">${brl(d.saldo)}</span><span class="acts"><button data-dx="${d.id}" aria-label="Apagar ${esc(d.nome)}">Apagar</button></span></li>`).join('');
  rp();
}
$('#fd').addEventListener('submit',e=>{
  e.preventDefault();const s=num($('#ds').value),j=num($('#dj').value),m=num($('#dm').value),n=$('#dn').value.trim();
  if(!n||!(s>0)||!(j>=0)||!(m>=0))return;
  D.dividas.push({id:Date.now(),nome:n.slice(0,40),saldo:r2(s),juros:j,min:r2(m)});save();e.target.reset();rd();
});
$('#dlista').addEventListener('click',e=>{const x=e.target.closest('[data-dx]');if(!x)return;D.dividas=D.dividas.filter(d=>String(d.id)!==x.dataset.dx);save();rd()});
$('#pg').addEventListener('input',rp);
document.querySelectorAll('input[name=met]').forEach(r=>r.addEventListener('change',rp));
$('#fj').addEventListener('submit',e=>{
  e.preventDefault();const pv=num($('#jv').value),n=parseInt($('#jn').value),p=num($('#jp').value),o=$('#jres');
  if(!(pv>0)||!(n>0)||!(p>0)){o.textContent='Preencha os três campos.';return}
  const tot=p*n;if(tot<=pv+0.005){o.textContent='Esse parcelamento não tem juros.';return}
  let lo=0,hi=1;for(let i=0;i<80;i++){const r=(lo+hi)/2;(p*(1-Math.pow(1+r,-n))/r>pv)?lo=r:hi=r}
  const r=(lo+hi)/2;
  o.innerHTML=`Juros de <b>${(r*100).toFixed(2).replace('.',',')}% ao mês</b> (cerca de ${(((1+r)**12-1)*100).toFixed(0)}% ao ano). Você paga ${brl(r2(tot))}, ou seja, ${brl(r2(tot-pv))} a mais que à vista.`;
});

$('#busca').addEventListener('input',render);
$('#ftipo').addEventListener('change',render);
$('#hojeb').addEventListener('click',()=>{$('#mes').value=hoje().slice(0,7);syncData();render()});
$('#cat').addEventListener('click',e=>{
  if(e.target.id!=='ncat')return;
  const n=(prompt('Nome da nova categoria:')||'').trim().slice(0,30);if(!n)return;
  const t=tipo();if(!catL(t).some(c=>norm(c)===norm(n)))D.cats[t].push(n);
  D.last[t]=catL(t).find(c=>norm(c)===norm(n));save();cats();
});
const pv=()=>{document.body.classList.toggle('priv',!!D.priv);$('#priv').setAttribute('aria-pressed',!!D.priv);$('#priv').textContent=D.priv?'Mostrar valores':'Ocultar valores'};
$('#priv').addEventListener('click',()=>{D.priv=!D.priv;save();pv()});
pv();

document.querySelector(`input[name=tipo][value=${D.tipo}]`).checked=true;
$('#mes').value=hoje().slice(0,7);$('#data').value=hoje();
if(D.lim>0)$('#lim').value=String(D.lim).replace('.',',');
$('#cd').value=hoje();badge();cats();render();save();
