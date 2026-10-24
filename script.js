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
  const t=tipo(),sel=D.last[t]||CATS[t][0];
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

  $('#lista').innerHTML=L.length?L.map(t=>`<li><span class="d">${t.date.slice(8)}/${t.date.slice(5,7)}</span><span>${esc(t.desc)}<small>${esc(t.cat)}</small></span><span class="v ${t.type==='in'?'pos':'neg'}">${t.type==='in'?'+':'−'} ${brl(t.val)}</span><button data-id="${t.id}" aria-label="Apagar ${esc(t.desc)}">Apagar</button></li>`).join(''):'<li class="vazio">Nenhum lançamento neste mês. Registre o primeiro: digite o valor e toque em Adicionar.</li>';
}

$('#f').addEventListener('submit',e=>{
  e.preventDefault();
  const val=num($('#valor').value),date=$('#data').value,t=tipo(),c=document.querySelector('input[name=cat]:checked').value;
  if(!(val>0)||!date){$('#valor').focus();return}
  D.tx.push({id:Date.now(),desc:$('#desc').value.trim()||c,val:Math.round(val*100)/100,type:t,cat:c,date});
  D.last[t]=c;D.tipo=t;save();
  $('#mes').value=date.slice(0,7);
  $('#valor').value='';$('#desc').value='';$('#valor').focus();
  render();
});
document.querySelectorAll('input[name=tipo]').forEach(r=>r.addEventListener('change',()=>{D.tipo=tipo();save();cats()}));
$('#mes').addEventListener('change',()=>{if(!$('#mes').value)$('#mes').value=hoje().slice(0,7);syncData();render()});
$('#ant').addEventListener('click',()=>shift(-1));
$('#prox').addEventListener('click',()=>shift(1));
$('#setlim').addEventListener('click',()=>{const n=num($('#lim').value);D.lim=n>0?n:0;if(!(n>0))$('#lim').value='';save();render()});

let undo=null,tt;
$('#lista').addEventListener('click',e=>{
  const b=e.target.closest('button[data-id]');if(!b)return;
  undo=D.tx.find(t=>String(t.id)===b.dataset.id);
  D.tx=D.tx.filter(t=>String(t.id)!==b.dataset.id);save();render();
  $('#toast').hidden=false;clearTimeout(tt);tt=setTimeout(()=>$('#toast').hidden=true,6000);
});
$('#undo').addEventListener('click',()=>{if(undo){D.tx.push(undo);undo=null;save();render()}$('#toast').hidden=true});

$('#csv').addEventListener('click',()=>{
  const m=$('#mes').value;
  const safe=s=>{s=String(s);if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
  const rows=D.tx.filter(t=>t.date.startsWith(m)).sort((a,b)=>a.date.localeCompare(b.date))
    .map(t=>[t.date,t.type==='in'?'Entrada':'Saída',safe(t.cat),safe(t.desc),String(t.val).replace('.',',')].join(';'));
  const blob=new Blob(['\ufeffData;Tipo;Categoria;Descrição;Valor\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`bolso-${m}.csv`;a.click();URL.revokeObjectURL(a.href);
});

document.querySelector(`input[name=tipo][value=${D.tipo}]`).checked=true;
$('#mes').value=hoje().slice(0,7);$('#data').value=hoje();
if(D.lim>0)$('#lim').value=String(D.lim).replace('.',',');
cats();render();
