import './style.css';
import { frames, offers, steps, WHATSAPP } from './data.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s) => document.querySelector(s);
const num = (i) => String(i + 1).padStart(2, '0') + 'A';
const small = (id) => `/img/${id}-720.webp`;
const big = (id) => `/img/${id}.webp`;

/* ---------- Faixa de filme do topo ---------- */

const HERO = 0; // quadro onde a faixa para (fiorde)
const strip = $('#strip');
// Repete o rolo para a faixa ter chão dos dois lados.
const reel = [...frames.slice(-3), ...frames, ...frames.slice(0, 3)];
strip.innerHTML = reel
  .map(
    (f, i) => `
    <div class="strip__frame${i === HERO + 3 ? ' is-hero' : ''}">
      <img src="${i === HERO + 3 ? big(f.id) : small(f.id)}" alt="" width="1344" height="896" ${
        i === HERO + 3 ? 'fetchpriority="high"' : 'loading="lazy"'
      } decoding="async" />
      <span class="strip__num mono">${num((i - 3 + frames.length) % frames.length)}</span>
    </div>`,
  )
  .join('');

const frameEls = [...strip.querySelectorAll('.strip__frame')];
const firstEl = frameEls[3];
const lastEl = frameEls[3 + frames.length - 1];
const hero = $('.hero');
let startX = 0;
let dist = 0;
let progress = 0;
const SPEED = 1.7; // quantos pixels o filme anda para cada pixel rolado

// O topo fica preso na tela enquanto o filme passa. Cada pixel rolado
// avança o filme; quando acaba o último quadro, a página volta a rolar.
function layout() {
  const center = (el) => el.offsetLeft + el.offsetWidth / 2;
  startX = innerWidth / 2 - center(firstEl);
  dist = reduced ? 0 : center(lastEl) - center(firstEl);
  hero.style.height = `calc(100svh + ${Math.round(dist / SPEED)}px)`;
  render();
}

function render() {
  const x = startX - progress * dist;
  strip.style.setProperty('--x', `${x}px`);
  // o quadro no centro acende; os vizinhos ficam no escuro do negativo
  const mid = innerWidth / 2;
  for (const el of frameEls) {
    const c = x + el.offsetLeft + el.offsetWidth / 2;
    const lit = Math.max(0, 1 - Math.abs(c - mid) / el.offsetWidth);
    el.style.setProperty('--lit', lit.toFixed(3));
  }
}

let pending = false;
function onScroll() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    progress = dist ? Math.min(1, Math.max(0, (scrollY * SPEED) / dist)) : 0;
    document.documentElement.classList.add('is-scrolling');
    render();
  });
}

layout();
addEventListener('resize', layout);
addEventListener('scroll', onScroll, { passive: true });
document.fonts?.ready.then(layout);

// Momento de abertura: o rolo entra pela direita e para no primeiro quadro.
const start = () => requestAnimationFrame(() => document.documentElement.classList.add('is-ready'));
if (reduced) start();
else Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(start);

// A barra do topo troca de cor quando sai do negativo e entra no papel.
const top = $('.top');
new IntersectionObserver(([e]) => top.classList.toggle('is-light', !e.isIntersecting), {
  rootMargin: `-${top.offsetHeight}px 0px 0px 0px`,
}).observe($('.hero__text'));

/* ---------- Folha de contato ---------- */

const sheet = $('#sheet');
sheet.innerHTML = frames
  .map(
    (f, i) => `
    <li class="frame${f.pick ? ' frame--pick' : ''}">
      <button class="frame__btn" data-i="${i}" aria-label="Abrir ${f.place}">
        <span class="film__edge film__edge--top" aria-hidden="true"><span>TC 400</span><span>${i + 1}</span></span>
        <img src="${small(f.id)}" alt="${f.place}" width="720" height="480" loading="lazy" decoding="async" />
        <span class="film__edge film__edge--bottom" aria-hidden="true"><span>${num(i)}</span>${f.pick ? '<span class="film__pick">✕ imprimir</span>' : ''}</span>
      </button>
      <span class="frame__meta"><span class="mono">${num(i)}</span> ${f.place}${f.pick ? ' <em>escolhida</em>' : ''}</span>
    </li>`,
  )
  .join('');

/* ---------- Lupa (só com mouse) ---------- */

const lens = $('#lens');
if (fine) {
  const ZOOM = 2.6;
  sheet.addEventListener('pointermove', (e) => {
    const btn = e.target.closest('.frame__btn');
    if (!btn) return hideLens();
    const img = btn.querySelector('img');
    const r = img.getBoundingClientRect();
    const f = frames[+btn.dataset.i];
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    lens.style.backgroundImage = `url(${big(f.id)})`;
    lens.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
    lens.style.backgroundPosition = `${-(px * r.width * ZOOM - 90)}px ${-(py * r.height * ZOOM - 90)}px`;
    lens.style.transform = `translate3d(${e.clientX - 90}px, ${e.clientY - 90}px, 0)`;
    lens.classList.add('is-on');
  });
  sheet.addEventListener('pointerleave', hideLens);
  addEventListener('scroll', hideLens, { passive: true });
}
function hideLens() {
  lens.classList.remove('is-on');
}

/* ---------- Visualizador ---------- */

const viewer = $('#viewer');
const vImg = $('#viewer-img');
let current = 0;
let opener = null;

function show(i) {
  current = (i + frames.length) % frames.length;
  const f = frames[current];
  vImg.src = big(f.id);
  vImg.alt = f.place;
  $('#viewer-num').textContent = `${num(current)} de ${String(frames.length).padStart(2, '0')}`;
  $('#viewer-place').textContent = f.place;
  $('#viewer-credit').textContent = `Foto: ${f.author} / Unsplash`;
  // pré-carrega a vizinha
  new Image().src = big(frames[(current + 1) % frames.length].id);
}

sheet.addEventListener('click', (e) => {
  const btn = e.target.closest('.frame__btn');
  if (!btn) return;
  opener = btn;
  hideLens();
  show(+btn.dataset.i);
  viewer.showModal();
  if (!reduced) vImg.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
});

function step(d) {
  show(current + d);
  if (!reduced) vImg.animate([{ opacity: 0, transform: `translateX(${d * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#close').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => opener?.focus());
viewer.addEventListener('click', (e) => {
  if (e.target === viewer) viewer.close();
});
viewer.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});
// arrastar no celular
let sx = null;
viewer.addEventListener('pointerdown', (e) => (sx = e.clientX));
viewer.addEventListener('pointerup', (e) => {
  if (sx === null) return;
  const dx = e.clientX - sx;
  sx = null;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
});

/* ---------- Trabalhos, etapas e créditos ---------- */

$('#offers').innerHTML = offers
  .map(
    (o) => `
    <article class="offer">
      <img src="${small(o.img)}" alt="" width="720" height="480" loading="lazy" decoding="async" />
      <div class="offer__text">
        <h3 class="h3">${o.title}</h3>
        <p>${o.text}</p>
        <p class="offer__note">${o.note}</p>
      </div>
    </article>`,
  )
  .join('');

$('#steps').innerHTML = steps
  .map(
    (s, i) => `
    <li class="step">
      <span class="step__num mono" aria-hidden="true">${i + 1}</span>
      <h3 class="h3">${s.title}</h3>
      <p>${s.text}</p>
    </li>`,
  )
  .join('');

$('#credits').textContent = [...new Set(frames.map((f) => f.author))].join(', ');

/* ---------- Formulário que vira mensagem ---------- */

const form = $('#form');
const preview = $('#preview');
function message() {
  const d = Object.fromEntries(new FormData(form));
  let m = `Oi, Tomé! Meu nome é ${d.nome.trim() || '…'}. Estou pensando em ${d.tipo}`;
  if (d.lugar.trim()) m += ` em ${d.lugar.trim()}`;
  if (d.quando.trim()) m += `, por volta de ${d.quando.trim()}`;
  m += '.';
  if (d.obs.trim()) m += ` ${d.obs.trim()}`;
  return m;
}
const update = () => {
  preview.textContent = message();
  $('#form-error').textContent = '';
};
form.addEventListener('input', update);
update();
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.nome.value.trim()) {
    $('#form-error').textContent = 'Escreva seu nome para eu saber com quem estou falando.';
    form.nome.focus();
    return;
  }
  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message())}`;
  window.open(url, '_blank', 'noopener');
});
