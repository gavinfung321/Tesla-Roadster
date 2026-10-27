const track=document.querySelector("#track"),slides=[...document.querySelectorAll(".slide")],dots=[...document.querySelectorAll(".dots button")];
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;let active=0;
function setSlide(i){active=Math.max(0,Math.min(slides.length-1,i));track.scrollTo({left:slides[active].offsetLeft-track.offsetLeft-(track.clientWidth-slides[active].clientWidth)/2,behavior:reduced?'instant':'smooth'});markSlide()}
function markSlide(){dots.forEach((d,i)=>{if(i===active)d.setAttribute('aria-current','true');else d.removeAttribute('aria-current')});document.querySelector('#previous').disabled=active===0;document.querySelector('#next').disabled=active===slides.length-1;slides.forEach((s,i)=>s.setAttribute('aria-label',`${i+1} of 5: ${s.querySelector('h2').textContent}`))}
document.querySelector('#previous').onclick=()=>setSlide(active-1);document.querySelector('#next').onclick=()=>setSlide(active+1);dots.forEach((d,i)=>d.onclick=()=>setSlide(i));track.addEventListener('scroll',()=>{const center=track.scrollLeft+track.clientWidth/2;active=slides.reduce((best,s,i)=>Math.abs(s.offsetLeft-track.offsetLeft+s.clientWidth/2-center)<Math.abs(slides[best].offsetLeft-track.offsetLeft+slides[best].clientWidth/2-center)?i:best,0);markSlide()},{passive:true});track.tabIndex=0;track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();setSlide(active+1)}if(e.key==='ArrowLeft'){e.preventDefault();setSlide(active-1)}});
const menu=document.querySelector('#menu'),nav=document.querySelector('.nav nav');menu.onclick=()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'':'Menu';menu.setAttribute('aria-label',open?'Close menu':'Open menu')};nav.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='Menu';menu.setAttribute('aria-label','Open menu')});markSlide();

// Explicit window navigation avoids native anchors scrolling the sticky studio container.
history.scrollRestoration='manual';
function navigateSection(hash,updateHistory=false){
 const target=document.getElementById(hash.slice(1));if(!target)return;
 const journey=document.querySelector('.journey');
 const stops={'#home':0,'#pilot':1.3,'#physics':3.3,'#landing':5.6};
 const top=hash in stops?journey.offsetTop+stops[hash]*innerHeight:target.getBoundingClientRect().top+scrollY-28;
 if(updateHistory&&location.hash!==hash)history.pushState(null,'',hash);
 window.scrollTo({top:Math.max(0,top),left:0,behavior:'instant'});
 window.dispatchEvent(new Event('journey:navigate'));
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#"]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const hash=link.getAttribute('href');if(!document.getElementById(hash.slice(1)))return;
 event.preventDefault();navigateSection(hash,true);
});
addEventListener('hashchange',()=>navigateSection(location.hash||'#home'));
addEventListener('popstate',()=>navigateSection(location.hash||'#home'));
addEventListener('load',()=>navigateSection(location.hash||'#home'),{once:true});

// Reservation is a self-contained demo: no network submission or payment data.
const reserveDialog=document.querySelector('#reserveDialog');
let reserveTrigger,previousOverflow='',selectedVariant='Performance',reservePhoto=0;
const reservePhotos=[['final.webp','Roadster front three-quarter view'],['profile.webp','Roadster side profile'],['hero.webp','Roadster rear view'],['gallery-4.avif','Roadster interior']];
const photoDots=document.querySelector('#reserveDots');
reservePhotos.forEach((photo,i)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`View photo ${i+1}: ${photo[1]}`);button.onclick=()=>showReservePhoto(i);photoDots.append(button)});
function showReservePhoto(i){reservePhoto=(i+reservePhotos.length)%reservePhotos.length;const photo=reservePhotos[reservePhoto],image=document.querySelector('#reserveImage');image.src=`assets/${photo[0]}`;image.alt=photo[1];[...photoDots.children].forEach((b,index)=>{if(index===reservePhoto)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')})}
showReservePhoto(0);
document.querySelector('#reservePrev').onclick=()=>showReservePhoto(reservePhoto-1);
document.querySelector('#reserveNext').onclick=()=>showReservePhoto(reservePhoto+1);
document.querySelectorAll('[data-reserve]').forEach(button=>button.onclick=()=>{reserveTrigger=button;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.querySelector('#reserveConfirmation').hidden=true;reserveDialog.showModal()});
document.querySelector('.reservation-close').onclick=()=>reserveDialog.close();
reserveDialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;reserveTrigger?.focus({preventScroll:true})});
document.querySelectorAll('[data-variant]').forEach(button=>button.onclick=()=>{selectedVariant=button.dataset.variant;document.querySelectorAll('[data-variant]').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});document.querySelector('#reserveBalance').textContent=selectedVariant==='Thrust'?'$245,000':'$45,000';document.querySelector('#thrustNotice').hidden=selectedVariant!=='Thrust';document.querySelector('#reserveConfirmation').hidden=true});
document.querySelector('#demoReserve').onclick=()=>{const confirmation=document.querySelector('#reserveConfirmation');confirmation.hidden=false;confirmation.textContent=`Demo complete: ${selectedVariant} selected. No payment was taken and no actual reservation was created.`;confirmation.scrollIntoView({block:'nearest',behavior:'smooth'})};
