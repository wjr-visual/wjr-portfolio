const channels = [
  ['concept-ip','角色设计','CHARACTER DESIGN','#c6aeec'],
  ['info-dang-gui','信息图谱','INFORMATION DESIGN','#ced5ab'],
  ['web-monzy-land','网页设计','WEB DESIGN','#ffce8e'],
  ['poster-wolf-spirit','海报设计','POSTER DESIGN','#f59a8c'],
  ['other-book-cover','书籍装帧','BOOK DESIGN','#b3cfcf']
].map(([file,label,english,color]) => ({work:window.WJR_WORKS.find(w=>w.file===file),label,english,color}));
const deck=document.querySelector('.deck'), stack=deck.querySelector('.stack'), tracks=document.querySelector('.tracks');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let active=0, start=null, tracking=null, moved=false, lastDrag=-Infinity;
const cards=[], buttons=[];
const category=document.getElementById('category'), summary=document.getElementById('summary');
const details=document.getElementById('details'), count=document.getElementById('count');
const prev=document.getElementById('prev'), next=document.getElementById('next');
function detail(work){var q=/\.doubao\.link$/i.test(location.hostname)?'work?work=':'work.html?work=';return q+encodeURIComponent(work.file)}
channels.forEach(({work,label},i)=>{
  const card=document.createElement('a');
  card.className='paper';card.href=detail(work);card.draggable=false;
  const img=new Image();img.src=work.src;img.alt=work.desc;img.draggable=false;
  const title=document.createElement('small');title.textContent=work.title;
  card.append(img,title);stack.append(card);cards.push(card);
  const b=document.createElement('button');b.textContent=label;b.onclick=()=>select(i);tracks.append(b);buttons.push(b);
  card.onclick=e=>{if(performance.now()-lastDrag<350){e.preventDefault();return}if(i!==active){e.preventDefault();select(i)}};
});
function arrange(fraction=0){
  cards.forEach((card,i)=>{
    const pos=((i-active+7)%5)-2+fraction, abs=Math.abs(pos);
    const x=Math.sign(pos)*(1-Math.exp(-abs))*90;
    card.style.transform='translate(-50%,-50%) translate('+x+'%,'+(abs*6)+'%) rotate('+(pos*9-3)+'deg) rotateY('+(-pos*13)+'deg) scale('+(1-Math.min(abs,2.5)*.115)+')';
    card.style.zIndex=String(100-Math.round(abs*30));card.style.opacity=abs>1.75?'.72':'1';
  });
}
function select(i,animate=true){
  active=(i+5)%5;const {work,label,english,color}=channels[active];
  category.textContent=label;document.getElementById('english').textContent=english;
  summary.textContent=work.desc;details.href=detail(work);count.textContent=String(active+1).padStart(2,'0')+' / 05';
  document.body.style.setProperty('--paper',color);
  buttons.forEach((b,n)=>b.setAttribute('aria-pressed',String(n===active)));
  cards.forEach((c,n)=>{c.tabIndex=n===active?0:-1});
  arrange();if(animate&&!reduced.matches)document.querySelector('.copy').animate([{opacity:.35,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:300});
}
prev.onclick=()=>select(active-1);next.onclick=()=>select(active+1);
document.addEventListener('keydown',e=>{if(e.altKey||e.metaKey||e.ctrlKey)return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(active+(e.key==='ArrowRight'?1:-1))}});
deck.onpointerdown=e=>{if(!e.isPrimary||e.button!==0)return;start=e.clientX;tracking=e.pointerId;moved=false};
deck.onpointermove=e=>{
 if(e.pointerId!==tracking||start===null)return;
 const dx=e.clientX-start;
 if(!moved&&Math.abs(dx)>7){deck.setPointerCapture(e.pointerId);deck.classList.add('drag');moved=true}
 if(moved)arrange(Math.max(-1,Math.min(1,dx/(deck.clientWidth*.32))));
};
function release(e,cancel=false){
 if(e.pointerId!==tracking)return;
 const dx=e.clientX-start;start=null;tracking=null;deck.classList.remove('drag');
 if(moved){lastDrag=performance.now();if(!cancel&&Math.abs(dx)>Math.min(55,deck.clientWidth*.12))select(active-Math.sign(dx));else arrange()}
 moved=false;
}
window.addEventListener('pointerup',e=>release(e));deck.onpointercancel=e=>release(e,true);
select(0,false);

