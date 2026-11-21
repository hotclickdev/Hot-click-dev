/* =====================================================================
   HotClick · Motor de historias «Antes / Con HotClick»
   Requiere GSAP 3.13 (+ MotionPath, MorphSVG, DrawSVG, CustomEase). Confeti opcional (canvas-confetti).
   Uso:  HCStory.mount(elementoHost, HCStory.defs.emprendedor)
   Cada historia es un objeto «def» con: mundo (SVG), actores, planos de cámara, guion y textos.
   ===================================================================== */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  /* Carpeta de motor.js: las voces están en <carpeta>/audio/<def.voice>.mp3 */
  var BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^\/]*$/, '');
  var CSS = '' +
    '.hs-snd{margin-left:auto;position:relative;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 18px 0 14px;border-radius:999px;border:1px solid var(--red,#D02A23);background:var(--red,#D02A23);color:#fff;cursor:pointer;font:600 12px/1 var(--mono,"IBM Plex Mono",monospace);letter-spacing:.08em;text-transform:uppercase;box-shadow:0 0 0 0 rgba(208,42,35,.55);animation:hs-snd-pulse 2.2s ease-out infinite}' +
    '@keyframes hs-snd-pulse{0%{box-shadow:0 0 0 0 rgba(208,42,35,.55)}70%{box-shadow:0 0 0 12px rgba(208,42,35,0)}100%{box-shadow:0 0 0 0 rgba(208,42,35,0)}}' +
    '@media (prefers-reduced-motion: reduce){.hs-snd{animation:none}}' +
    '.hs-snd svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.hs-snd .i-on{display:none}.hs-snd.on .i-on{display:block}.hs-snd.on .i-off{display:none}' +
    '.hs-snd.on{background:transparent;border-color:var(--line-strong,rgba(255,255,255,.28));color:inherit;animation:none}' +
    '.hs-snd.miss{opacity:.45}.hs-snd[hidden]{display:none}.hs-snd:not([hidden])+.hs-capbtn{margin-left:0}' +
    '.hs-snd-tip{position:absolute;top:calc(100% + 8px);right:0;z-index:5;white-space:nowrap;padding:6px 10px;border-radius:8px;background:var(--card-2,#232831);color:var(--fg,#F4F6F9);font:500 10px/1 var(--mono,"IBM Plex Mono",monospace);letter-spacing:.06em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity .2s}' +
    '.hs-snd.tip .hs-snd-tip{opacity:1}' +
    '.hs{--hs-warn:var(--warn,#E2B340);--hs-ok:var(--ok,#4CC38A);color:var(--fg,#F4F6F9);font-family:var(--body,"Public Sans",system-ui,sans-serif)}' +
    '.hs-top{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;min-height:34px}' +
    '.hs-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font:500 11px/1 var(--mono,"IBM Plex Mono",monospace);letter-spacing:.1em;text-transform:uppercase}' +
    '.hs-chip svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.hs-ca{background:color-mix(in srgb,var(--hs-warn) 18%,transparent);color:var(--hs-warn)}.hs-cb{background:color-mix(in srgb,var(--hs-ok) 18%,transparent);color:var(--hs-ok)}' +
    '.hs[data-s="a"] .hs-cb,.hs[data-s="b"] .hs-ca{display:none}' +
    '.hs-tag{color:var(--soft,#7C8492);font:500 10px/1.3 var(--mono,"IBM Plex Mono",monospace);letter-spacing:.1em;text-transform:uppercase}' +
    '.hs-capbtn{margin-left:auto;height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--line-strong,rgba(255,255,255,.28));background:transparent;color:inherit;cursor:pointer;font:500 10px/1 var(--mono,"IBM Plex Mono",monospace);letter-spacing:.08em;text-transform:uppercase}' +
    '.hs-capbtn[aria-pressed="false"]{opacity:.55}' +
    '.hs-view{position:relative;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:var(--panel,#14171C);isolation:isolate}' +
    '.hs-view>svg{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '.hs-cap{min-height:2.9em;margin-top:12px}.hs-cap p{margin:0;font:400 clamp(15px,1.8vw,20px)/1.35 var(--display,"Sora",sans-serif);letter-spacing:-.01em;animation:hs-capin .5s cubic-bezier(.22,1,.36,1)}' +
    '.hs.nocap .hs-cap{visibility:hidden}' +
    '@keyframes hs-capin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
    '.hs-ctl{display:flex;align-items:center;gap:8px;margin-top:8px}' +
    '.hs-ctl>button{width:38px;height:38px;border-radius:50%;border:1px solid var(--line-strong,rgba(255,255,255,.28));background:transparent;color:inherit;cursor:pointer;display:grid;place-items:center;flex:none;padding:0}' +
    '.hs-ctl svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '.hs-ctl .i-pause{display:none}.hs.playing .hs-ctl .i-play{display:none}.hs.playing .hs-ctl .i-pause{display:block}' +
    '.hs-prog{flex:1;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.hs-seg{min-width:0;display:flex;flex-direction:column;gap:4px}' +
    '.hs-lbl{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;border:0;background:none;padding:0;cursor:pointer;color:var(--soft,#7C8492);font:600 10px/1 var(--mono,"IBM Plex Mono",monospace);letter-spacing:.12em;text-transform:uppercase;transition:color .3s}' +
    '.hs-lbl svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
    '.hs[data-s="a"] .hs-seg.a .hs-lbl{color:var(--hs-warn)}.hs[data-s="b"] .hs-seg.b .hs-lbl{color:var(--hs-ok)}' +
    '.hs-dots{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:3px}' +
    '.hs-dots button{position:relative;height:16px;border:0;background:none;cursor:pointer;padding:0}' +
    '.hs-dots button::before,.hs-dots button::after{content:"";position:absolute;left:0;right:0;top:5px;height:6px;border-radius:99px}' +
    '.hs-dots button::before{background:var(--card-2,#2A303A)}.hs-dots button:hover::before{background:var(--line-strong,rgba(255,255,255,.28))}' +
    '.hs-dots button::after{background:var(--hs-warn);transform-origin:0 50%;transform:scaleX(0)}' +
    '.hs-dots button.b::after{background:var(--hs-ok)}.hs-dots button.done::after{transform:none;opacity:.5}.hs-dots button.cur::after{transform:scaleX(var(--p,0));opacity:1}' +
    '.hs-t{min-width:5.4em;text-align:right;color:var(--soft,#7C8492);font:500 11px/1 var(--mono,"IBM Plex Mono",monospace)}' +
    '@media (max-width:640px){.hs-t{display:none}.hs-ctl>button{width:32px;height:32px}.hs-prog{gap:8px}.hs-lbl{font-size:9px;letter-spacing:.08em}}' +
    '.hs-cap p .w{opacity:.3;transition:opacity .18s ease}.hs-cap p .w.on{opacity:1}' +
    '.hs-leg{margin-top:12px}.hs-leg summary{display:inline-flex;align-items:center;gap:8px;cursor:pointer;list-style:none;color:var(--soft,#7C8492);font:500 10px/1 var(--mono,"IBM Plex Mono",monospace);letter-spacing:.1em;text-transform:uppercase}' +
    '.hs-leg summary::-webkit-details-marker{display:none}.hs-leg summary::before{content:"+";display:grid;place-items:center;width:18px;height:18px;border-radius:50%;border:1px solid var(--line-strong,rgba(255,255,255,.28));font-size:12px}.hs-leg[open] summary::before{content:"\\2212"}' +
    '.hs-legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.hs-legend span{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:999px;padding:4px 10px 4px 4px;font-size:12px;color:var(--muted,#9AA1AE)}.hs-legend svg{width:34px;height:24px}' +
    '.hs-fx{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}' +
    '.hs-mood{position:absolute;inset:0;transition:background-color 1.2s ease,box-shadow 1.2s ease}' +
    '.hs-view[data-m="cold"] .hs-mood{background:rgba(40,52,80,.22);box-shadow:inset 0 0 120px rgba(0,0,0,.55)}' +
    '.hs-view[data-m="gloom"] .hs-mood{background:rgba(30,38,60,.4);box-shadow:inset 0 0 160px rgba(0,0,0,.7)}' +
    '.hs-view[data-m="warm"] .hs-mood{background:rgba(255,190,90,.08);box-shadow:inset 0 0 140px rgba(255,170,60,.2)}' +
    '.hs-rain i{position:absolute;top:-12%;left:var(--x);width:2px;height:28px;border-radius:2px;background:rgba(122,163,242,.55);opacity:0}' +
    '.hs-view[data-m="gloom"] .hs-rain i{animation:hs-rain .9s linear var(--d) infinite}' +
    '@keyframes hs-rain{0%{opacity:0;transform:translateY(0)}10%{opacity:1}100%{opacity:.6;transform:translateY(120vh)}}' +
    '.hs-fx canvas{position:absolute;inset:0;width:100%;height:100%}' +
    '.hs-hud{position:absolute;left:10px;top:10px;display:flex;align-items:center;gap:6px;padding:7px 9px;border-radius:16px;background:rgba(11,13,17,.86);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:3}' +
    '.hs-hud .sd{display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:10px;background:rgba(255,255,255,.08);transition:background-color .4s}' +
    '.hs-hud svg{width:21px;height:21px;flex:none}' +
    '.hs-hud b{font:700 19px/1 var(--display,"Sora",sans-serif);min-width:1.1em;text-align:center;display:inline-block}' +
    '.hs-hud b.ch{animation:hs-hudpop .6s cubic-bezier(.22,1,.36,1)}' +
    '@keyframes hs-hudpop{0%{transform:scale(.4)}60%{transform:scale(1.35)}100%{transform:none}}' +
    '.hs-hud .lk{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;transition:background-color .4s}.hs-hud .lk svg{width:19px;height:19px}' +
    '.hs-hud .l-ok,.hs-hud .l-bad,.hs-hud .l-off{display:none}' +
    '.hs-hud[data-l="ok"] .lk{background:#34B577}.hs-hud[data-l="ok"] .l-ok{display:block}' +
    '.hs-hud[data-l="bad"] .lk{background:#F0524A;animation:hs-bad 1s ease-in-out infinite}.hs-hud[data-l="bad"] .l-bad{display:block}' +
    '.hs-hud[data-l="off"] .lk{background:rgba(255,255,255,.14)}.hs-hud[data-l="off"] .l-off{display:block}' +
    '.hs-hud[data-l="bad"] .sd.p{background:rgba(240,82,74,.35)}.hs-hud[data-l="ok"] .sd{background:rgba(52,181,119,.28)}' +
    '@keyframes hs-bad{50%{box-shadow:0 0 0 8px rgba(240,82,74,.25)}}' +
    '@media (max-width:640px){.hs-hud{left:6px;top:6px;padding:4px 5px;gap:3px;border-radius:12px}.hs-hud svg{width:14px;height:14px}.hs-hud b{font-size:13px}.hs-hud .lk{width:22px;height:22px}.hs-hud .lk svg{width:13px;height:13px}.hs-hud .sd{padding:2px 4px;gap:3px}}' +
    '.hs-card{position:absolute;inset:0;display:grid;place-items:center;opacity:0;pointer-events:none;z-index:4;transition:opacity .45s ease,transform .45s ease;transform:scale(.94)}' +
    '.hs-card.on{opacity:1;transform:none}' +
    '.hs-card>div{display:flex;align-items:center;gap:16px;padding:20px 26px;border-radius:24px;background:rgba(11,13,17,.88);box-shadow:0 20px 50px rgba(0,0,0,.45)}' +
    '.hs-card svg{width:clamp(36px,7vw,76px);height:clamp(36px,7vw,76px)}' +
    '.hs-card .wm{font:800 clamp(22px,3.6vw,40px)/1 var(--display,"Sora",sans-serif);letter-spacing:-.02em}.hs-card .wm .h{color:#F0524A}.hs-card .wm .c{color:#7AA3F2}' +
    '.hs-err{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;color:var(--muted,#9AA1AE)}';

  var UI = {
    es: { a: 'Problema · sin HotClick', b: 'Solución · con HotClick', pa: 'Problema', pb: 'Solución', leg: 'Qué significa cada sobre', cap: 'Frases', snd: 'Escuchar la historia con voz', sndT: 'Tocá para escuchar', sndOn: 'Con voz', sndMiss: 'Voz en preparación', pp: 'Reproducir o pausar', prev: 'Paso anterior', next: 'Paso siguiente', err: 'No se pudo cargar la animación. Revisá tu conexión y recargá la página.', lg: { q: 'Pedido', ok: 'Aprobado', no: 'Rechazado', pay: 'Pago', bell: 'Aviso', ban: 'Agotado', rep: 'Reporte', warn: 'Alerta de stock' } },
    en: { a: 'Problem · without HotClick', b: 'Solution · with HotClick', pa: 'Problem', pb: 'Solution', leg: 'What each envelope means', cap: 'Captions', pp: 'Play or pause', prev: 'Previous step', next: 'Next step', err: 'The animation could not load. Check your connection and reload.', lg: { q: 'Request', ok: 'Approved', no: 'Rejected', pay: 'Payment', bell: 'Alert', ban: 'Sold out', rep: 'Report', warn: 'Stock alert' } },
    pt: { a: 'Problema · sem HotClick', b: 'Solução · com HotClick', pa: 'Problema', pb: 'Solução', leg: 'O que significa cada envelope', cap: 'Legendas', pp: 'Reproduzir ou pausar', prev: 'Passo anterior', next: 'Próximo passo', err: 'Não foi possível carregar a animação. Verifique a conexão e recarregue.', lg: { q: 'Pedido', ok: 'Aprovado', no: 'Recusado', pay: 'Pagamento', bell: 'Aviso', ban: 'Esgotado', rep: 'Relatório', warn: 'Alerta de estoque' } }
  };
  function lang() { var l = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase(); return UI[l] ? l : 'es'; }

  /* ---------- Pictogramas ---------- */
  var PIC = {
    cand: function (x, y) { return '<rect x="' + (x - 7) + '" y="' + (y - 8) + '" width="14" height="22" rx="3" fill="#F4F6F9" stroke="#9AA1AE" stroke-width="2"/><rect x="' + (x - 7) + '" y="' + y + '" width="14" height="5" fill="#D02A23"/><path d="M' + x + ' ' + (y - 23) + 'c-5 6-5 10 0 12 5-2 5-6 0-12z" fill="#E2B340"/>'; },
    cap: function (x, y) { return '<path d="M' + (x - 14) + ' ' + (y + 6) + 'a14 13 0 0 1 28 0z" fill="#1747A8"/><path d="M' + (x - 2) + ' ' + (y + 6) + 'h20a4 4 0 0 1-4 4h-16z" fill="#1747A8"/><circle cx="' + x + '" cy="' + (y - 7) + '" r="2.4" fill="#F0524A"/>'; },
    num: function (x, y, t, c) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="' + c + '"/><text x="' + x + '" y="' + (y + 5.5) + '" text-anchor="middle" style="font:800 ' + (t.length > 2 ? 10 : t.length > 1 ? 12 : 16) + 'px Sora,sans-serif;fill:#fff">' + t + '</text>'; },
    heart: function (x, y) { return '<path transform="translate(' + x + ' ' + y + ')" d="M0 12C-16-1-15-14-6-14-2-14 0-11 0-8c0-3 2-6 6-6 9 0 10 13-6 26z" fill="#F06A8A"/>'; },
    chk: function (x, y, c) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="' + (c || '#34B577') + '"/><path d="M' + (x - 6) + ' ' + y + 'l4 4 8-9" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; },
    xx: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#F0524A"/><path d="M' + (x - 5) + ' ' + (y - 5) + 'l10 10M' + (x + 5) + ' ' + (y - 5) + 'l-10 10" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>'; },
    q: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#E2B340"/><text x="' + x + '" y="' + (y + 6) + '" text-anchor="middle" style="font:800 18px Sora,sans-serif;fill:#14171C">?</text>'; },
    phone: function (x, y) { return '<rect x="' + (x - 10) + '" y="' + (y - 17) + '" width="20" height="34" rx="4" fill="#14171C"/><rect x="' + (x - 7) + '" y="' + (y - 12) + '" width="14" height="22" rx="2" fill="#7AA3F2"/><rect x="' + (x - 7) + '" y="' + (y - 12) + '" width="14" height="5" fill="#D02A23"/>'; },
    stall: function (x, y) { return '<path d="M' + (x - 16) + ' ' + (y - 14) + 'h32v8h-32z" fill="#D02A23"/><path d="M' + (x - 8) + ' ' + (y - 14) + 'h8v8h-8z" fill="#fff"/><path d="M' + (x - 14) + ' ' + (y - 6) + 'v20M' + (x + 14) + ' ' + (y - 6) + 'v20" stroke="#5A3A24" stroke-width="2.4"/><rect x="' + (x - 15) + '" y="' + (y + 3) + '" width="30" height="10" rx="2" fill="#C2955E"/>'; },
    shop: function (x, y) { return '<path d="M' + (x - 15) + ' ' + (y - 4) + 'l3-10h24l3 10z" fill="#D02A23"/><rect x="' + (x - 13) + '" y="' + (y - 4) + '" width="26" height="18" fill="#F4F6F9"/><rect x="' + (x - 4) + '" y="' + (y + 3) + '" width="8" height="11" fill="#7AA3F2"/>'; },
    till: function (x, y) { return '<rect x="' + (x - 14) + '" y="' + (y + 2) + '" width="28" height="12" rx="3" fill="#D02A23"/><rect x="' + (x - 10) + '" y="' + (y - 12) + '" width="20" height="13" rx="2" fill="#14171C"/><rect x="' + (x - 7) + '" y="' + (y - 9) + '" width="14" height="7" fill="#7AA3F2"/>'; },
    truck: function (x, y) { return '<rect x="' + (x - 18) + '" y="' + (y - 10) + '" width="22" height="16" rx="2" fill="#F4F6F9" stroke="#9AA1AE" stroke-width="1.5"/><path d="M' + (x + 4) + ' ' + (y - 4) + 'h8l5 6v4h-13z" fill="#D02A23"/><circle cx="' + (x - 10) + '" cy="' + (y + 8) + '" r="3.5" fill="#14171C"/><circle cx="' + (x + 10) + '" cy="' + (y + 8) + '" r="3.5" fill="#14171C"/>'; },
    bell: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#8B6CF0"/><path d="M' + (x - 6) + ' ' + (y + 4) + 'v-5a6 6 0 0 1 12 0v5l2 2h-16zM' + (x - 2) + ' ' + (y + 8) + 'a2 2 0 0 0 4 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linejoin="round"/>'; },
    box: function (x, y) { return '<rect x="' + (x - 14) + '" y="' + (y - 10) + '" width="28" height="22" rx="3" fill="#C2955E"/><rect x="' + (x - 3) + '" y="' + (y - 10) + '" width="6" height="22" fill="#F3DDB6"/>'; },
    coin: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#E2B340" stroke="#B98E25" stroke-width="2"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" style="font:800 15px Sora,sans-serif;fill:#14171C">₡</text>'; },
    star: function (x, y, c) { return '<path transform="translate(' + x + ' ' + y + ') scale(2.4)" d="M0-5.6l1.6 3.4 3.8.5-2.8 2.6.7 3.7L0 2.8l-3.3 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="' + c + '"/>'; },
    eq: function (x, y) { return '<path d="M' + (x - 7) + ' ' + (y - 3) + 'h14M' + (x - 7) + ' ' + (y + 4) + 'h14" stroke="#34B577" stroke-width="3.4" stroke-linecap="round"/>'; },
    neq: function (x, y) { return '<path d="M' + (x - 7) + ' ' + (y - 3) + 'h14M' + (x - 7) + ' ' + (y + 4) + 'h14M' + (x + 3) + ' ' + (y - 9) + 'l-6 18" stroke="#F0524A" stroke-width="3.2" stroke-linecap="round"/>'; },
    strike: function (x, y) { return '<path d="M' + (x - 12) + ' ' + (y + 14) + 'L' + (x + 12) + ' ' + (y - 18) + '" stroke="#F0524A" stroke-width="4" stroke-linecap="round"/>'; },
    clock: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#fff" stroke="#4F7FE0" stroke-width="3"/><path d="M' + x + ' ' + (y - 8) + 'V' + y + 'l6 4" stroke="#14171C" stroke-width="2.6" fill="none" stroke-linecap="round"/>'; },
    smile: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#E2B340"/><circle cx="' + (x - 5) + '" cy="' + (y - 3) + '" r="1.8" fill="#14171C"/><circle cx="' + (x + 5) + '" cy="' + (y - 3) + '" r="1.8" fill="#14171C"/><path d="M' + (x - 6) + ' ' + (y + 3) + 'q6 6 12 0" stroke="#14171C" stroke-width="2.2" fill="none" stroke-linecap="round"/>'; },
    ban: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#7C8492"/><circle cx="' + x + '" cy="' + y + '" r="7" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M' + (x - 5) + ' ' + (y - 5) + 'l10 10" stroke="#fff" stroke-width="2.6"/>'; },
    chart: function (x, y) { return '<rect x="' + (x - 14) + '" y="' + (y - 12) + '" width="28" height="24" rx="4" fill="#fff" stroke="#C3C9D4" stroke-width="1.5"/><rect x="' + (x - 9) + '" y="' + (y + 1) + '" width="5" height="7" fill="#7AA3F2"/><rect x="' + (x - 2) + '" y="' + (y - 4) + '" width="5" height="12" fill="#4F7FE0"/><rect x="' + (x + 5) + '" y="' + (y - 8) + '" width="5" height="16" fill="#F0524A"/>'; },
    ia: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#4F7FE0"/><path d="M' + x + ' ' + (y - 8) + 'l2 5.5 5.5 2-5.5 2L' + x + ' ' + (y + 8) + 'l-2-5.5-5.5-2 5.5-2z" fill="#fff"/>'; },
    paper: function (x, y) { return '<rect x="' + (x - 10) + '" y="' + (y - 13) + '" width="20" height="26" rx="2" fill="#FFF8D9" stroke="#C3C9D4" stroke-width="1.5"/><path d="M' + (x - 6) + ' ' + (y - 6) + 'h12M' + (x - 6) + ' ' + y + 'h12M' + (x - 6) + ' ' + (y + 6) + 'h7" stroke="#9AA1AE" stroke-width="2"/>'; },
    person: function (x, y, c) { return '<circle cx="' + x + '" cy="' + (y - 7) + '" r="6" fill="#F2CBA4"/><path d="M' + (x - 10) + ' ' + (y + 12) + 'a10 10 0 0 1 20 0z" fill="' + (c || '#1747A8') + '"/>'; },
    run: function (x, y) { return '<path d="M' + (x - 14) + ' ' + y + 'h10M' + (x - 16) + ' ' + (y + 6) + 'h8" stroke="#9AA1AE" stroke-width="2.4" stroke-linecap="round"/>' + PIC.person(x + 6, y, '#D02A23'); }
  };
  var THINK = {
    stock1: function () { return PIC.cand(-20, 4) + PIC.num(18, 0, '1', '#14171C'); },
    coin: function () { return PIC.coin(-18, 0) + PIC.smile(18, 0); },
    want: function () { return PIC.cand(-20, 4) + PIC.heart(18, 2); },
    yes: function () { return PIC.cand(-20, 4) + PIC.chk(18, 0); },
    wait: function () { return PIC.clock(-18, 0) + PIC.cand(20, 4); },
    where: function () { return PIC.cand(-20, 4) + PIC.strike(-20, 4) + PIC.q(18, 0); },
    angry: function () { return PIC.cand(-20, 4) + PIC.xx(18, 0); },
    sad: function () { return PIC.star(-18, 0, '#F0524A') + PIC.num(16, 0, '1', '#F0524A'); },
    linked: function () { return PIC.stall(-30, 2) + PIC.eq(0, 0) + PIC.phone(30, 0); },
    synced: function () { return PIC.phone(-20, 0) + PIC.chk(18, 0); },
    bellk: function () { return PIC.bell(-18, 0) + PIC.chk(18, 0); },
    restock: function () { return PIC.box(-18, 2) + PIC.num(18, 0, '+5', '#34B577'); },
    love: function () { return PIC.cand(-20, 4) + PIC.heart(18, 2); },
    money: function () { return PIC.coin(-18, 0) + PIC.star(18, 0, '#E2B340'); }
  };
  var ENV = {
    q: ['#4F7FE0', '<text x="14" y="-8" text-anchor="middle" style="font:800 15px Sora,sans-serif;fill:#4F7FE0">?</text>'],
    ok: ['#34B577', '<path d="M9-14l4 4 7-8" stroke="#34B577" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
    no: ['#F0524A', '<path d="M10-18l8 8M18-18l-8 8" stroke="#F0524A" stroke-width="3" stroke-linecap="round"/>'],
    pay: ['#E2B340', '<text x="14" y="-9" text-anchor="middle" style="font:800 13px Sora,sans-serif;fill:#B98E25">₡</text>'],
    bell: ['#8B6CF0', '<path d="M10-11v-3a4 4 0 0 1 8 0v3l1.5 1.5h-11zM12.6-8a1.4 1.4 0 0 0 2.8 0" stroke="#8B6CF0" stroke-width="2" fill="none" stroke-linejoin="round"/>'],
    ban: ['#7C8492', '<circle cx="14" cy="-14" r="5" fill="none" stroke="#7C8492" stroke-width="2"/><path d="M10.5-17.5l7 7" stroke="#7C8492" stroke-width="2"/>'],
    warn: ['#E2B340', '<path d="M14-21l6 11h-12z" fill="#E2B340"/><path d="M14-17.5v3.2" stroke="#14171C" stroke-width="1.6" stroke-linecap="round"/>'],
    rep: ['#4F7FE0', '<rect x="9" y="-19" width="3" height="7" fill="#7AA3F2"/><rect x="13" y="-21" width="3" height="9" fill="#4F7FE0"/><rect x="17" y="-17" width="3" height="5" fill="#F0524A"/>'],
    star: ['#F0524A', '<path transform="translate(14 -14) scale(1.2)" d="M0-5.6l1.6 3.4 3.8.5-2.8 2.6.7 3.7L0 2.8l-3.3 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="#F0524A"/>']
  };
  function envSVG(k) { var e = ENV[k]; return '<rect x="-22" y="-15" width="44" height="30" rx="5" fill="' + e[0] + '"/><path d="M-22-12L0 4 22-12" stroke="#fff" stroke-opacity=".75" stroke-width="2.5" fill="none" stroke-linejoin="round"/><circle cx="14" cy="-14" r="10" fill="#fff" stroke="' + e[0] + '" stroke-width="2"/>' + e[1]; }
  var STAMP = {
    ok: PIC.chk(0, 0), no: PIC.xx(0, 0), q: PIC.q(0, 0), bell: PIC.bell(0, 0), pay: PIC.coin(0, 0), ban: PIC.ban(0, 0), rep: PIC.chart(0, 0),
    star: '<circle r="14" fill="#fff"/>' + PIC.star(0, 1, '#F0524A'),
    warn: '<path d="M0-15L15 12H-15z" fill="#E2B340"/><path d="M0-6v8M0 6.5v.5" stroke="#14171C" stroke-width="3" stroke-linecap="round"/>'
  };
  function cloudSVG(c) { return '<circle cx="-62" cy="58" r="5" fill="#fff"/><circle cx="-48" cy="44" r="8" fill="#fff"/><circle cx="-34" cy="4" r="22" fill="#fff"/><circle cx="-8" cy="-14" r="26" fill="#fff"/><circle cx="22" cy="-12" r="24" fill="#fff"/><circle cx="40" cy="8" r="20" fill="#fff"/><circle cx="2" cy="14" r="24" fill="#fff"/><rect x="-46" y="0" width="92" height="28" rx="14" fill="#fff"/>' + c; }

  /* ---------- Rig de personajes ---------- */
  var RIG = {
    mouth: { smile: 'M-9-182Q0-173 9-182Q0-177-9-182Z', joy: 'M-11-184Q0-184 11-184Q10-169 0-169Q-10-169-11-184Z', shock: 'M-5-177Q-5-185 0-185Q5-185 5-177Q5-169 0-169Q-5-169-5-177Z', frown: 'M-9-175Q0-184 9-175Q0-179-9-175Z', worry: 'M-9-178Q-4.5-182 0-178Q4.5-174 9-178Q4.5-176 0-176.5Q-4.5-179.5-9-178Z', love: 'M-10-181Q0-169 10-181Q0-174-10-181Z' },
    brows: { neutral: 'M-15-205L-5-206M5-206L15-205', up: 'M-16-211L-6-214M6-214L16-211', angry: 'M-16-209L-5-202M5-202L16-209', sad: 'M-15-202L-5-207M5-207L15-202' },
    expr: {
      neutral: { m: 'smile', b: 'neutral', ey: 1, es: 1 }, happy: { m: 'smile', b: 'neutral', ey: 1, es: 1, ck: 1 },
      joy: { m: 'joy', b: 'up', ey: .25, es: 1, ck: 1 }, shock: { m: 'shock', b: 'up', ey: 1, es: 1.7, sw: 1 },
      worry: { m: 'worry', b: 'sad', ey: .9, es: 1, sw: 1 }, angry: { m: 'frown', b: 'angry', ey: .8, es: 1, tint: 1, st: 1 },
      sad: { m: 'frown', b: 'sad', ey: .55, es: 1, tr: 1 }, love: { m: 'love', b: 'up', ey: 0, es: 1, ck: 1, hearts: 1 }, calm: { m: 'smile', b: 'neutral', ey: .6, es: 1, ck: 1 }
    },
    pose: { idle: { l: 6, r: -6, ty: 0 }, wave: { l: 6, r: -150, ty: 0 }, cheer: { l: 158, r: -158, ty: 0 }, head: { l: 140, r: -140, ty: 0 }, phone: { l: 6, r: -125, ty: 0 }, point: { l: 6, r: -95, ty: 0 }, slump: { l: 14, r: -14, ty: 6 }, reach: { l: 6, r: -60, ty: 0 }, carry: { l: -60, r: 60, ty: 0 } }
  };
  function actorSVG(id, o) {
    var sk = o.skin || '#F2CBA4', sh = o.sh, hr = o.hair || '#4A2E1C';
    var g = '<g id="' + id + '"><g class="body"><ellipse cx="0" cy="0" rx="36" ry="8" fill="rgba(0,0,0,.2)"/>';
    g += '<rect x="-16" y="-74" width="13" height="74" rx="6.5" fill="#3A4A72"/><rect x="3" y="-74" width="13" height="74" rx="6.5" fill="#4C5E88"/>';
    g += '<g class="torso"><rect x="-28" y="-160" width="56" height="94" rx="24" fill="' + sh + '"/>' + (o.apron ? '<path d="M-18-130h36v58a6 6 0 0 1-6 6h-24a6 6 0 0 1-6-6z" fill="#F4F6F9" opacity=".92"/><rect x="-6" y="-118" width="12" height="9" rx="2" fill="#D02A23"/>' : '') + (o.tie ? '<path d="M-4-152h8l-2 30 -2 4-2-4z" fill="#D02A23"/>' : '') + '</g>';
    g += '<g class="armL"><rect x="-40" y="-152" width="14" height="66" rx="7" fill="' + sh + '"/><circle cx="-33" cy="-86" r="8.5" fill="' + sk + '"/></g>';
    g += '<g class="armR"><rect x="26" y="-152" width="14" height="66" rx="7" fill="' + sh + '"/><circle cx="33" cy="-86" r="8.5" fill="' + sk + '"/><g class="hphone"' + (o.phone ? '' : ' opacity="0"') + '><rect x="24" y="-110" width="18" height="30" rx="4" fill="#14171C"/><rect x="26.5" y="-106" width="13" height="21" rx="2" fill="#7AA3F2"/><rect x="26.5" y="-106" width="13" height="5" fill="#D02A23"/><circle class="pglow" cx="33" cy="-95" r="16" fill="#8B6CF0" opacity="0"/></g></g>';
    g += '<g class="head"><rect x="-7" y="-172" width="14" height="16" fill="' + sk + '"/><circle cx="0" cy="-194" r="27" fill="' + sk + '"/><circle class="tint" cx="0" cy="-194" r="27" fill="#F0524A" opacity="0"/>';
    g += '<g class="hair"><path d="M-28-198a28 28 0 0 1 56 0c-8-10-18-14-28-14s-20 4-28 14z" fill="' + hr + '"/>' + (o.bun ? '<circle cx="0" cy="-227" r="11" fill="' + hr + '"/>' : '') + (o.pony ? '<path d="M24-206c14 4 18 22 10 36-2-12-6-20-14-26z" fill="' + hr + '"/>' : '') + (o.cap ? '<path d="M-29-204a29 22 0 0 1 58 0z" fill="' + o.cap + '"/><path d="M8-206h30a5 5 0 0 1-5 5h-25z" fill="' + o.cap + '"/>' : '') + (o.glasses ? '<circle cx="-9" cy="-194" r="7" fill="none" stroke="#14171C" stroke-width="2"/><circle cx="9" cy="-194" r="7" fill="none" stroke="#14171C" stroke-width="2"/><path d="M-2-194h4" stroke="#14171C" stroke-width="2"/>' : '') + '</g>';
    g += '<g class="eyes"><ellipse class="eye" cx="-9" cy="-194" rx="3.2" ry="3.6" fill="#1D1E25"/><ellipse class="eye" cx="9" cy="-194" rx="3.2" ry="3.6" fill="#1D1E25"/></g>';
    g += '<g class="hearts" opacity="0"><path d="M-9-190c-5-5-9 0-5 4l5 5 5-5c4-4 0-9-5-4z" fill="#F06A8A"/><path d="M9-190c-5-5-9 0-5 4l5 5 5-5c4-4 0-9-5-4z" fill="#F06A8A"/></g>';
    g += '<path class="brows" d="' + RIG.brows.neutral + '" stroke="#1D1E25" stroke-width="2.8" stroke-linecap="round" fill="none"/><path class="mouth" d="' + RIG.mouth.smile + '" fill="#7A2E1C"/>';
    g += '<g class="cheeks" opacity="0"><circle cx="-17" cy="-183" r="5" fill="#F0524A" opacity=".35"/><circle cx="17" cy="-183" r="5" fill="#F0524A" opacity=".35"/></g>';
    g += '<g class="sweat" opacity="0"><path d="M27-214c-5 7-5 11 0 13 5-2 5-6 0-13z" fill="#7AA3F2"/></g>';
    g += '<g class="tears" opacity="0"><path class="hs-tear" d="M-12-188c-4 6-4 9 0 11 4-2 4-5 0-11z" fill="#7AA3F2"/><path class="hs-tear" d="M12-188c-4 6-4 9 0 11 4-2 4-5 0-11z" fill="#7AA3F2"/></g>';
    g += '<g class="steam" opacity="0"><circle class="hs-pf" cx="-32" cy="-224" r="7" fill="#C3C9D4"/><circle class="hs-pf" cx="32" cy="-224" r="7" fill="#C3C9D4"/></g>';
    return g + '</g></g></g>';
  }

  /* Íconos del marcador y tarjetas */
  var IC = {
    stall: '<svg viewBox="0 0 24 24"><path d="M3 9h18l-2-5H5z" fill="#F0524A"/><path d="M8 4h3v5H8zM14 4h3v5h-3z" fill="#fff"/><path d="M5 9v11M19 9v11" stroke="#C2955E" stroke-width="2"/><rect x="4" y="13" width="16" height="4" rx="1" fill="#C2955E"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3" fill="#7AA3F2"/><rect x="6" y="2" width="12" height="5" rx="2" fill="#F0524A"/><rect x="10" y="18" width="4" height="1.6" rx=".8" fill="#fff"/></svg>',
    cand: '<svg viewBox="0 0 24 24"><rect x="8" y="9" width="8" height="13" rx="2" fill="#F4F6F9"/><rect x="8" y="13" width="8" height="3" fill="#F0524A"/><path d="M12 2c-3 3-3 5 0 6 3-1 3-3 0-6z" fill="#E2B340"/></svg>',
    cap: '<svg viewBox="0 0 24 24"><path d="M3 15a9 8 0 0 1 18 0z" fill="#7AA3F2"/><path d="M11 15h11a2.5 2.5 0 0 1-2.5 2.5H11z" fill="#7AA3F2"/><circle cx="12" cy="7" r="1.6" fill="#F0524A"/></svg>',
    till1: '<svg viewBox="0 0 24 24"><rect x="3" y="13" width="18" height="8" rx="2" fill="#F0524A"/><rect x="6" y="4" width="12" height="9" rx="1.5" fill="#fff"/><text x="12" y="11.5" text-anchor="middle" style="font:800 7px Sora,sans-serif;fill:#14171C">1</text></svg>',
    till2: '<svg viewBox="0 0 24 24"><rect x="3" y="13" width="18" height="8" rx="2" fill="#F0524A"/><rect x="6" y="4" width="12" height="9" rx="1.5" fill="#fff"/><text x="12" y="11.5" text-anchor="middle" style="font:800 7px Sora,sans-serif;fill:#14171C">2</text></svg>',
    shops: '<svg viewBox="0 0 24 24"><path d="M2 10l2-5h7l2 5zM12 10l2-5h7l2 5" fill="#F0524A"/><rect x="3" y="10" width="8" height="10" fill="#fff"/><rect x="13" y="10" width="8" height="10" fill="#fff"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="#fff"/><circle cx="12" cy="12" r="3.6" fill="#1747A8"/></svg>',
    lk: '<svg class="l-ok" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg><svg class="l-bad" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"><path d="M5 9h14M5 15h14M15 4L9 20"/></svg><svg class="l-off" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="3 3"><path d="M5 9h14M5 15h14"/></svg>',
    note: '<svg viewBox="0 0 64 64"><rect x="10" y="6" width="40" height="52" rx="4" fill="#FFF8D9"/><path d="M18 18h24M18 28h24M18 38h14" stroke="#9AA1AE" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="48" r="13" fill="#E2B340"/><text x="48" y="54.5" text-anchor="middle" style="font:800 19px Sora,sans-serif;fill:#14171C">?</text></svg>',
    neq: '<svg viewBox="0 0 24 24" fill="none" stroke="#F0524A" stroke-width="2.8" stroke-linecap="round"><path d="M5 9h14M5 15h14M15 4L9 20"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="#34B577" stroke-width="2.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'
  };
  var PILLIC = {
    feria: '<path d="M-9-7h18l-2-5h-14zM-7-7v12M7-7v12M-9 5h18" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    casa: '<path d="M-8 0l8-7 8 7M-6-1.5V8h12V-1.5" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    tienda: '<rect x="-5" y="-9" width="10" height="18" rx="2" fill="none" stroke="#fff" stroke-width="2"/><path d="M-2 6h4" stroke="#fff" stroke-width="2"/>',
    taller: '<path d="M-9 8h18M-7 8V-2h14V8M-4-2v-4h8v4" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    local: '<path d="M-9-2l2-6h14l2 6zM-8-2v10h16V-2M-2 8V3h4v5" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    bodega: '<path d="M-9-2L0-9 9-2v10H-9zM-5 8V2h10v6" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    camion: '<path d="M-10-5h11v10h-11zM1-1h5l3 4v2H1z" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="-6" cy="7" r="2" fill="#fff"/><circle cx="5" cy="7" r="2" fill="#fff"/>',
    oficina: '<rect x="-8" y="-7" width="16" height="11" rx="1.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M-4 8h8M0 4v4" stroke="#fff" stroke-width="2"/>'
  };

  var uid = 0;
  window.HCStory = {
    defs: {}, PIC: PIC, THINK: THINK, IC: IC, RIG: RIG,
    mount: function (host, def) {
      if (!document.getElementById('hs-css')) { var st = document.createElement('style'); st.id = 'hs-css'; st.textContent = CSS; document.head.appendChild(st); }
      var L = lang(), T = UI[L], P = 'hs' + (++uid) + '-';
      var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      host.innerHTML = '<div class="hs" data-s="a"><div class="hs-top"><span class="hs-chip hs-ca"><svg viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17v.5"/></svg><span class="tA"></span></span><span class="hs-chip hs-cb"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="tB"></span></span><span class="hs-tag"></span>' + (def.voice ? '<button type="button" class="hs-snd" aria-pressed="false" hidden><svg class="i-off" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg><svg class="i-on" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.3a8 8 0 0 1 0 11.4"/></svg><span class="t"></span><span class="hs-snd-tip"></span></button>' : '') + '<button type="button" class="hs-capbtn" aria-pressed="true"></button></div>' +
        '<div class="hs-view" role="img"></div><div class="hs-cap" aria-live="off"><p></p></div>' +
        '<div class="hs-ctl"><button type="button" class="pp"><svg class="i-play" viewBox="0 0 24 24"><path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/></svg><svg class="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg></button><button type="button" class="prev"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><div class="hs-prog"><div class="hs-seg a"><button type="button" class="hs-lbl" data-j="0"><svg viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17v.5"/></svg><span class="tPa"></span></button><div class="hs-dots"></div></div><div class="hs-seg b"><button type="button" class="hs-lbl" data-j="8"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="tPb"></span></button><div class="hs-dots"></div></div></div><button type="button" class="next"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button><span class="hs-t">0:00</span></div>' +
        (def.legend === false ? '' : '<details class="hs-leg"><summary class="tLeg"></summary><div class="hs-legend"></div></details>') + '</div>';
      var hs = host.querySelector('.hs'), view = host.querySelector('.hs-view'), capP = host.querySelector('.hs-cap p'), capBtn = host.querySelector('.hs-capbtn');
      function texts() {
        L = lang(); T = UI[L];
        hs.querySelector('.tA').textContent = T.a; hs.querySelector('.tPa').textContent = T.pa || T.a; hs.querySelector('.tPb').textContent = T.pb || T.b; var tl0 = hs.querySelector('.tLeg'); if (tl0) tl0.textContent = T.leg || ''; hs.querySelector('.tB').textContent = T.b; hs.querySelector('.hs-tag').textContent = (def.tag && (def.tag[L] || def.tag.es)) || '';
        var sb = hs.querySelector('.hs-snd');
        if (sb) { var esp = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase() === 'es'; sb.hidden = !esp; sb.setAttribute('aria-label', UI.es.snd); sb.querySelector('.t').textContent = sb.classList.contains('on') ? UI.es.sndOn : UI.es.sndT; if (!esp && V && V.on) vOff(); }
        capBtn.textContent = T.cap;hs.querySelector('.pp').setAttribute('aria-label', T.pp); hs.querySelector('.prev').setAttribute('aria-label', T.prev); hs.querySelector('.next').setAttribute('aria-label', T.next);
        view.setAttribute('aria-label', (def.label && (def.label[L] || def.label.es)) || '');
        var lg = hs.querySelector('.hs-legend'); if (lg) lg.innerHTML = (def.envs || ['q', 'ok', 'no', 'pay', 'bell', 'ban']).map(function (k) { return '<span><svg viewBox="-26 -28 52 46">' + envSVG(k) + '</svg>' + T.lg[k] + '</span>'; }).join('');
        lastK = '';
      }
      capBtn.addEventListener('click', function () { var on = capBtn.getAttribute('aria-pressed') !== 'true'; capBtn.setAttribute('aria-pressed', String(on)); hs.classList.toggle('nocap', !on); });
      if (!window.gsap || !window.MotionPathPlugin || !window.MorphSVGPlugin || !window.DrawSVGPlugin) { texts(); view.innerHTML = '<div class="hs-err">' + T.err + '</div>'; return null; }
      gsap.registerPlugin(MotionPathPlugin, MorphSVGPlugin, DrawSVGPlugin, CustomEase);
      if (!CustomEase.get('hs-pop')) { CustomEase.create('hs-pop', 'M0,0 C0.2,0 0.3,1.35 0.55,1.12 0.7,0.98 0.82,1 1,1'); CustomEase.create('hs-throw', 'M0,0 C0.3,0 0.45,0.15 0.6,0.5 0.75,0.85 0.85,1 1,1'); }

      /* Mundo */
      var H = {
        id: function (n) { return P + n; },
        glow: 'url(#' + P + 'glow)',
        cloud: function (n, x, y) { return '<g transform="translate(' + x + ' ' + y + ')"><g id="' + P + n + '" opacity="0"></g></g>'; },
        actor: function (n) { return '<g data-actor="' + n + '"></g>'; },
        PIC: PIC
      };
      var W = '<g id="' + P + 'world">' + def.world(H) + '</g>';
      view.innerHTML = '<svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice"><defs>' +
        '<linearGradient id="' + P + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1,#10141C)"/><stop offset="1" style="stop-color:var(--sky2,#232B3A)"/></linearGradient>' +
        '<radialGradient id="' + P + 'glow"><stop offset="0" stop-color="#F2CE6B" stop-opacity=".45"/><stop offset="1" stop-color="#F2CE6B" stop-opacity="0"/></radialGradient>' +
        '<clipPath id="' + P + 'clipL"><rect class="cL" x="0" y="0" width="960" height="540"/></clipPath><clipPath id="' + P + 'clipR"><rect class="cR" x="960" y="0" width="0" height="540"/></clipPath></defs>' +
        '<g class="shk"><g clip-path="url(#' + P + 'clipL)"><rect width="960" height="540" fill="url(#' + P + 'sky)"/><g class="camL">' + W + '</g></g>' +
        '<g class="paneR" clip-path="url(#' + P + 'clipR)" visibility="hidden"><rect width="960" height="540" fill="url(#' + P + 'sky)"/><g class="camR"><use href="#' + P + 'world"/></g></g>' +
        '<g class="divider" opacity="0"><rect x="477" y="0" width="6" height="540" fill="#F4F6F9"/><rect x="479" y="0" width="2" height="540" fill="#14171C" opacity=".4"/></g>' +
        '<g class="pills" opacity="0"><g class="pillL" transform="translate(240 506)"></g><g class="pillR" transform="translate(720 506)"></g></g>' +
        '<g class="fly"></g><rect class="flash" width="960" height="540" fill="#fff" opacity="0"/></g></svg>';
      var $ = function (s) { return view.querySelector(s); }, $$ = function (s) { return [].slice.call(view.querySelectorAll(s)); };
      var byId = function (n) { return document.getElementById(P + n); };
      /* actores */
      var A = {};
      (def.actors || []).forEach(function (a) {
        var ph = view.querySelector('[data-actor="' + a.n + '"]'); if (!ph) return;
        ph.outerHTML = actorSVG(P + a.n, a.o);
        var g = byId(a.n);
        A[a.n] = { g: g, body: g.querySelector('.body'), torso: g.querySelector('.torso'), armL: g.querySelector('.armL'), armR: g.querySelector('.armR'), head: g.querySelector('.head'), eyes: [].slice.call(g.querySelectorAll('.eye')), mouth: g.querySelector('.mouth'), brows: g.querySelector('.brows'), cheeks: g.querySelector('.cheeks'), sweat: g.querySelector('.sweat'), tears: g.querySelector('.tears'), steam: g.querySelector('.steam'), tint: g.querySelector('.tint'), hearts: g.querySelector('.hearts'), phone: g.querySelector('.hphone'), pglow: g.querySelector('.pglow'), hair: g.querySelector('.hair'), def: a };
        gsap.set([A[a.n].armL, A[a.n].armR], { transformOrigin: '50% 6%' });
        gsap.set(A[a.n].eyes, { transformOrigin: '50% 50%' });
        gsap.set(A[a.n].head, { transformOrigin: '50% 90%' });
      });
      /* capa HTML */
      var fx = document.createElement('div'); fx.className = 'hs-fx'; fx.setAttribute('aria-hidden', 'true');
      var rain = '<div class="hs-rain">'; for (var i = 0; i < 36; i++) rain += '<i style="--x:' + ((i * 53) % 100) + '%;--d:-' + ((i % 9) * .1).toFixed(1) + 's"></i>'; rain += '</div>';
      var hud = def.hud || {};
      fx.innerHTML = '<div class="hs-mood"></div>' + rain + '<canvas></canvas>' +
        '<div class="hs-hud" data-l="off"><span class="sd s">' + (hud.l || []).map(function (k) { return IC[k]; }).join('') + '<b></b></span><span class="lk">' + IC.lk + '</span><span class="sd p">' + (hud.r || []).map(function (k) { return IC[k]; }).join('') + '<b></b></span></div>' +
        '<div class="hs-card cA"><div>' + (def.cardA || '') + '</div></div><div class="hs-card cB"><div>' + (def.cardB || '') + '<span class="wm"><span class="h">Hot</span><span class="c">Click</span></span></div></div>';
      view.appendChild(fx);
      var shoot = window.confetti ? confetti.create(fx.querySelector('canvas'), { resize: true, useWorker: false }) : null;

      /* Cámara */
      var SHOT = def.shots;
      function camVals(n, side) { var s = SHOT[n], c = side === 'L' ? 240 : side === 'R' ? 720 : 480; return { x: c - s[2] * s[0], y: 270 - s[2] * s[1], scale: s[2] }; }
      function scr(n, side, wx, wy) { var s = SHOT[n], c = side === 'L' ? 240 : side === 'R' ? 720 : 480; return { x: c + s[2] * (wx - s[0]), y: 270 + s[2] * (wy - s[1]) }; }
      var camL = $('.camL'), camR = $('.camR'), cL = $('.cL'), cR = $('.cR'), divider = $('.divider'), pills = $('.pills'), paneR = $('.paneR'), pillL = $('.pillL'), pillR = $('.pillR'), flyL = $('.fly'), shk = $('.shk'), flash = $('.flash');
      gsap.set([camL, camR], { svgOrigin: '0 0' });
      var tl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'power2.inOut' } });
      function pill(k) { return '<rect x="-22" y="-16" width="44" height="32" rx="16" fill="rgba(11,13,17,.82)"/><g>' + (PILLIC[k] || '') + '</g>'; }
      var api = {
        tl: tl, A: A, P: P, el: byId, all: $$, scr: scr, PIC: PIC,
        cam: function (n, t, d) { tl.to(camL, Object.assign(camVals(n), { duration: d == null ? 1.2 : d, ease: 'power3.inOut' }), t); },
        camSplit: function (l, r, t, d) { tl.to(camL, Object.assign(camVals(l, 'L'), { duration: d || 1, ease: 'power3.inOut' }), t); tl.to(camR, Object.assign(camVals(r, 'R'), { duration: d || 1, ease: 'power3.inOut' }), t); },
        split: function (l, r, t, icL, icR) {
          tl.to(camL, Object.assign(camVals(l, 'L'), { duration: .9, ease: 'power3.inOut' }), t);
          tl.set(camR, camVals(r, 'R'), t); tl.set(paneR, { attr: { visibility: 'visible' } }, t);
          tl.to(cL, { attr: { width: 480 }, duration: .7, ease: 'power3.inOut' }, t);
          tl.to(cR, { attr: { x: 480, width: 480 }, duration: .7, ease: 'power3.inOut' }, t);
          tl.to(divider, { opacity: 1, duration: .3 }, t + .3);
          tl.call(function () { pillL.innerHTML = pill(icL); pillR.innerHTML = pill(icR); }, null, t);
          tl.to(pills, { opacity: 1, duration: .3 }, t + .4);
        },
        unsplit: function (t) {
          tl.to(cL, { attr: { width: 960 }, duration: .7, ease: 'power3.inOut' }, t);
          tl.to(cR, { attr: { x: 960, width: 0 }, duration: .7, ease: 'power3.inOut' }, t);
          tl.to([divider, pills], { opacity: 0, duration: .25 }, t); tl.set(paneR, { attr: { visibility: 'hidden' } }, t + .72);
        },
        expr: function (id, name, t) {
          var a = A[id], e = RIG.expr[name];
          tl.to(a.mouth, { morphSVG: RIG.mouth[e.m], duration: .35, ease: 'power2.out' }, t);
          tl.to(a.brows, { morphSVG: RIG.brows[e.b], duration: .35, ease: 'power2.out' }, t);
          tl.to(a.eyes, { scaleY: e.ey === 0 ? .05 : e.ey, scale: e.es, opacity: e.ey === 0 ? 0 : 1, duration: .25 }, t);
          tl.to(a.cheeks, { opacity: e.ck ? 1 : 0, duration: .3 }, t); tl.to(a.sweat, { opacity: e.sw ? 1 : 0, duration: .3 }, t);
          tl.to(a.tears, { opacity: e.tr ? 1 : 0, duration: .3 }, t); tl.to(a.steam, { opacity: e.st ? 1 : 0, duration: .3 }, t);
          tl.to(a.tint, { opacity: e.tint ? .28 : 0, duration: .3 }, t); tl.to(a.hearts, { opacity: e.hearts ? 1 : 0, duration: .3 }, t);
          tl.fromTo(a.head, { rotation: 0 }, { rotation: name === 'shock' ? -6 : name === 'joy' || name === 'love' ? 4 : name === 'sad' ? 8 : 0, duration: .35, ease: 'back.out(3)', immediateRender: false }, t);
        },
        pose: function (id, name, t, d) {
          var a = A[id], p = RIG.pose[name];
          tl.to(a.armL, { rotation: p.l, duration: d || .45, ease: 'back.out(1.6)' }, t); tl.to(a.armR, { rotation: p.r, duration: d || .45, ease: 'back.out(1.6)' }, t);
          tl.to(a.torso, { y: p.ty, duration: .4 }, t); tl.to(a.head, { y: p.ty * 1.4, duration: .4 }, t);
        },
        wave: function (id, t, n) { tl.to(A[id].armR, { rotation: '+=28', duration: .22, repeat: (n || 3) * 2 - 1, yoyo: true, ease: 'sine.inOut' }, t); },
        jump: function (id, t, n) { tl.to(A[id].body, { y: -16, duration: .22, repeat: (n || 3) * 2 - 1, yoyo: true, ease: 'power2.out' }, t); },
        walk: function (id, x, t, d) { tl.to(A[id].g, { x: x, duration: d || 1, ease: 'power1.inOut' }, t); tl.to(A[id].body, { y: -4, duration: .18, repeat: Math.max(1, Math.round((d || 1) / .18) - 1), yoyo: true, ease: 'sine.inOut' }, t); },
        think: function (cid, kind, t, d) {
          var c = byId(cid), html = cloudSVG(typeof kind === 'function' ? kind() : (def.think && def.think[kind] ? def.think[kind]() : THINK[kind]()));
          gsap.set(c, { transformOrigin: '0% 100%' });
          tl.call(function () { c.innerHTML = html; }, null, t - .01);
          tl.fromTo(c, { opacity: 0, scale: .2 }, { opacity: 1, scale: 1, duration: .5, ease: 'hs-pop', immediateRender: false }, t);
          tl.to(c, { opacity: 0, scale: .85, duration: .3, ease: 'power1.in' }, t + d - .3);
        },
        pop: function (el, t, hide) { el = typeof el === 'string' ? byId(el) : el; if (hide) { tl.to(el, { opacity: 0, scale: .6, transformOrigin: '50% 50%', duration: .3 }, t); return; } tl.fromTo(el, { opacity: 0, scale: .3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .45, ease: 'hs-pop', immediateRender: false }, t); },
        show: function (el, t, v) { tl.set(typeof el === 'string' ? byId(el) : el, { opacity: v == null ? 1 : v }, t); },
        flash: function (t) { tl.fromTo(flash, { opacity: .35 }, { opacity: 0, duration: .5, immediateRender: false }, t); },
        shake: function (t) { tl.fromTo(shk, { x: 0 }, { x: 7, duration: .05, repeat: 7, yoyo: true, ease: 'none', immediateRender: false }, t); tl.set(shk, { x: 0 }, t + .45); },
        ring: function (el, t, n) { tl.fromTo(el, { opacity: .9, scale: .5, transformOrigin: '50% 50%' }, { opacity: 0, scale: 2.2, duration: .6, repeat: (n || 1) - 1, immediateRender: false }, t); },
        fly: function (kind, a, b, t, d, opt) {
          opt = opt || {};
          var col = ENV[kind][0], mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - (opt.arc == null ? 90 + Math.abs(a.x - b.x) * .12 : opt.arc);
          var d0 = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
          var g = document.createElementNS(NS, 'g');
          g.innerHTML = '<path d="' + d0 + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" class="trail" opacity="0"/><g class="env" opacity="0">' + envSVG(kind) + '</g><circle class="ring" cx="' + b.x + '" cy="' + b.y + '" r="22" fill="none" stroke="' + col + '" stroke-width="4" opacity="0"/><g class="stamp" opacity="0" transform="translate(' + b.x + ' ' + (b.y - 4) + ')"><g class="si">' + STAMP[kind] + '</g></g>';
          flyL.appendChild(g);
          var trail = g.querySelector('.trail'), env = g.querySelector('.env'), ring = g.querySelector('.ring'), si = g.querySelector('.si'), stp = g.querySelector('.stamp');
          gsap.set(env, { x: a.x, y: a.y, transformOrigin: '50% 50%' });
          tl.set(trail, { opacity: .9, drawSVG: '0%' }, t); tl.to(trail, { drawSVG: '100%', duration: d, ease: 'hs-throw' }, t);
          tl.fromTo(env, { opacity: 0, scaleX: .4, scaleY: 1.4 }, { opacity: 1, scaleX: 1.25, scaleY: .75, duration: .15, immediateRender: false }, t);
          tl.to(env, { scaleX: 1, scaleY: 1, duration: .25, ease: 'back.out(3)' }, t + .15);
          tl.to(env, { motionPath: { path: [{ x: a.x, y: a.y }, { x: mx, y: my + 30 }, { x: b.x, y: b.y }], curviness: 1.25 }, rotation: a.x < b.x ? 8 : -8, duration: d, ease: 'hs-throw' }, t);
          tl.to(env, { rotation: 0, scaleX: 1.35, scaleY: .7, duration: .12 }, t + d); tl.to(env, { opacity: 0, scale: .2, duration: .25 }, t + d + .1);
          tl.fromTo(ring, { opacity: .9, scale: .4, transformOrigin: '50% 50%' }, { opacity: 0, scale: 2.4, duration: .7, ease: 'power2.out', immediateRender: false }, t + d);
          if (!opt.nostamp) {
            tl.set(si, { scale: 2.4, rotation: -25, transformOrigin: '50% 50%' }, t + d + .05); tl.to(stp, { opacity: 1, duration: .1 }, t + d + .05);
            tl.to(si, { scale: 1.25, rotation: 0, duration: .35, ease: 'back.out(2.5)' }, t + d + .05); tl.to(stp, { opacity: 0, duration: .3 }, t + d + (opt.hold || .9));
          }
          tl.to(trail, { opacity: 0, duration: .4 }, t + d + .1);
        },
        arrow: function (p, t, d) {
          var g = document.createElementNS(NS, 'g'); g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
          g.innerHTML = '<g class="ar" opacity="0"><path d="M-8-34h16v20h11L0 8-19-14h11z" fill="#F0524A" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g>';
          flyL.appendChild(g); var ar = g.querySelector('.ar');
          tl.fromTo(ar, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .3, ease: 'back.out(2)', immediateRender: false }, t);
          tl.to(ar, { y: -10, duration: .3, repeat: Math.max(1, Math.floor((d - .6) / .3)), yoyo: true, ease: 'sine.inOut' }, t + .3);
          tl.to(ar, { opacity: 0, duration: .2 }, t + d - .2);
        },
        reset: function (t) {
          (def.actors || []).forEach(function (a) {
            var x = A[a.n]; if (!x) return;
            tl.set(x.g, { x: a.x, y: a.y, scale: a.s || 1, opacity: 1 }, t);
            tl.set([x.armL, x.armR], { rotation: function (i) { return i ? -6 : 6; } }, t); tl.set([x.torso, x.head, x.body], { y: 0 }, t);
            tl.set(x.phone, { opacity: a.o.phone ? 1 : 0 }, t);
            api.expr(a.n, a.e || 'neutral', t);
          });
          tl.set(paneR, { attr: { visibility: 'hidden' } }, t); tl.set(cL, { attr: { width: 960 } }, t); tl.set(cR, { attr: { x: 960, width: 0 } }, t); tl.set([divider, pills], { opacity: 0 }, t);
        }
      };
      tl.set(camL, camVals(def.start || Object.keys(SHOT)[0]), 0);
      def.script(api);
      tl.to({}, { duration: .01 }, def.len || 32);
      var BT = def.beats, KEYS = BT.map(function (t, j) { return (j < 8 ? 'a' : 'b') + (j % 8 + 1); });
      KEYS.forEach(function (k, j) { tl.addLabel(k, BT[j]); });

      /* Ambiente */
      var amb = [];
      if (!REDUCE) {
        Object.keys(A).forEach(function (id, j) {
          amb.push(gsap.to(A[id].eyes, { scaleY: .1, duration: .08, repeat: -1, yoyo: true, repeatDelay: 2.6 + j * .7, ease: 'none' }));
          amb.push(gsap.to(A[id].hair, { rotation: 1.5, transformOrigin: '50% 100%', duration: 1.4 + j * .2, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
        });
        var q = function (c) { return $$(c); };
        if (q('.hs-flame').length) amb.push(gsap.to(q('.hs-flame'), { scaleY: 1.15, transformOrigin: '50% 100%', duration: .35, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
        if (q('.hs-bulb').length) amb.push(gsap.to(q('.hs-bulb'), { opacity: .4, duration: .9, repeat: -1, yoyo: true, stagger: { each: .15, repeat: -1, yoyo: true } }));
        if (q('.hs-awn').length) amb.push(gsap.to(q('.hs-awn'), { skewX: 1.2, transformOrigin: '50% 0%', duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
        if (q('.hs-steam').length) amb.push(gsap.to(q('.hs-steam'), { y: -14, opacity: 0, duration: 1.4, repeat: -1, stagger: .6, ease: 'power1.out' }));
        if (q('.hs-pf').length) amb.push(gsap.to(q('.hs-pf'), { y: -10, scale: 1.4, opacity: .2, transformOrigin: '50% 50%', duration: .9, repeat: -1, stagger: .45 }));
        if (q('.hs-tear').length) amb.push(gsap.to(q('.hs-tear'), { y: 18, opacity: 0, duration: 1.1, repeat: -1, stagger: .5, ease: 'power1.in' }));
        if (q('.hs-drop').length) amb.push(gsap.to(q('.hs-drop'), { y: 10, opacity: .2, duration: .6, repeat: -1, ease: 'power1.in' }));
        if (q('.hs-lamp').length) amb.push(gsap.to(q('.hs-lamp'), { opacity: .55, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
        if (q('.hs-wheel').length) amb.push(gsap.to(q('.hs-wheel'), { rotation: 360, transformOrigin: '50% 50%', duration: .8, repeat: -1, ease: 'none' }));
      }

      /* Interfaz */
      var hudEl = fx.querySelector('.hs-hud'), hb = [].slice.call(hudEl.querySelectorAll('b')), cardA = fx.querySelector('.cA'), cardB = fx.querySelector('.cB');
      var dotsEls = hs.querySelectorAll('.hs-dots'), tm = hs.querySelector('.hs-t'), LEN = def.len || 32, half = BT[8];
      KEYS.forEach(function (k, j) { var b = document.createElement('button'); b.type = 'button'; b.className = j >= 8 ? 'b' : '';  b.setAttribute('aria-label', (j < 8 ? (T.pa || 'A') : (T.pb || 'B')) + ' ' + (j % 8 + 1)); b.addEventListener('click', function () { go(j); }); dotsEls[j < 8 ? 0 : 1].appendChild(b); });
      var dots = [].slice.call(dotsEls[0].children).concat([].slice.call(dotsEls[1].children));
      [].forEach.call(hs.querySelectorAll('.hs-lbl'), function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-j')); }); });
      function at(table, t) { var r = table[0]; for (var j = 0; j < table.length; j++) if (t >= table[j][0]) r = table[j]; return r; }
      var lastK = '', lastT = -1;
      texts();
      function ui() {
        var t = tl.time(), j = 0; for (var q = 0; q < BT.length; q++) if (t >= BT[q] - .001) j = q;
        var k = KEYS[j], end = j < BT.length - 1 ? BT[j + 1] : LEN;
        if (k !== lastK) {
          lastK = k; hs.setAttribute('data-s', k[0]);
          capSet(j, k); capP.style.animation = 'none'; void capP.offsetWidth; capP.style.animation = '';
          dots.forEach(function (d, n) { d.classList.toggle('done', n < j); d.classList.toggle('cur', n === j); });
        }
        dots[j].style.setProperty('--p', Math.min(1, (t - BT[j]) / (end - BT[j])).toFixed(3));
        if (hud.table) { var h = at(hud.table, t); hudEl.setAttribute('data-l', h[3]); hb.forEach(function (el, n) { var v = String(h[n + 1]); if (el.textContent !== v) { el.textContent = v; if (lastT >= 0) { el.classList.remove('ch'); void el.offsetWidth; el.classList.add('ch'); } } }); }
        view.setAttribute('data-m', at(def.mood || [[0, '']], t)[1]);
        cardA.classList.toggle('on', t > .05 && t < 1.6); cardB.classList.toggle('on', t > half + .05 && t < half + 1.6);
        if (shoot && lastT >= 0 && t > lastT && t - lastT < .5) (def.confetti || []).forEach(function (c) { if (lastT < c[0] && t >= c[0]) { if (c[1] === 'big') { shoot({ particleCount: 120, spread: 100, origin: { x: .3, y: .5 } }); shoot({ particleCount: 120, spread: 100, origin: { x: .7, y: .5 } }); } else shoot({ particleCount: 60, spread: 70, origin: { x: c[2] || .55, y: .45 }, colors: ['#F0524A', '#E2B340', '#4CC38A', '#7AA3F2', '#F06A8A'] }); } });
        lastT = t;
        if (V && V.on && V.a && V.a.duration) { capWords(V.a.currentTime); tm.textContent = fmt(V.a.currentTime) + ' / ' + fmt(V.a.duration); }
        else tm.textContent = fmt(t) + ' / ' + fmt(LEN);
      }
      function fmt(x) { x = Math.floor(x); return Math.floor(x / 60) + ':' + ('0' + x % 60).slice(-2); }
      /* Subtítulos: en español, si hay voz grabada, el texto es exactamente el del MP3 (def.voiceWords: [palabra, segundo] por paso) */
      var capWs = [];
      function capSet(j, k) {
        var VW = def.voiceWords, es = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase() === 'es';
        capWs = [];
        if (VW && VW[j] && es) {
          if (V && V.on) { capP.innerHTML = ''; VW[j].forEach(function (w, n) { var sp = document.createElement('span'); sp.className = 'w'; sp.textContent = w[0]; capWs.push([sp, w[1]]); capP.appendChild(sp); if (n < VW[j].length - 1) capP.appendChild(document.createTextNode(' ')); }); }
          else capP.textContent = VW[j].map(function (w) { return w[0]; }).join(' ');
        } else { var c = def.cap[L] || def.cap.es; capP.textContent = c[k] || ''; }
      }
      function capWords(s) { for (var n = 0; n < capWs.length; n++) { var on = s >= capWs[n][1] - .05; if (capWs[n][0].classList.contains('on') !== on) capWs[n][0].classList.toggle('on', on); } }
      gsap.ticker.add(ui);
      /* Voz en off (opcional): un MP3 por historia. La animación sigue a la voz:
         def.voiceMarks = segundo del audio donde empieza cada uno de los 16 pasos (sin marcas: reparto proporcional). */
      var V = { on: false, a: null, marks: null, btn: hs.querySelector('.hs-snd') };
      function vMark(j) { return V.marks ? V.marks[j] : BT[j] * V.a.duration / LEN; }
      function vWarp(s) {
        var n = BT.length, j = 0; for (var q = 0; q < n; q++) if (s >= vMark(q)) j = q;
        var a0 = vMark(j), a1 = j < n - 1 ? vMark(j + 1) : V.a.duration, t0 = BT[j], t1 = j < n - 1 ? BT[j + 1] : LEN;
        return Math.min(LEN - .01, t0 + (a1 > a0 ? (s - a0) / (a1 - a0) : 0) * (t1 - t0));
      }
      function vTick() { if (V.on && V.a && V.a.duration) { tl.time(vWarp(V.a.currentTime), false); } }
      function vTip(txt) { if (!V.btn) return; V.btn.querySelector('.hs-snd-tip').textContent = txt; V.btn.classList.add('tip'); clearTimeout(V.tt); V.tt = setTimeout(function () { V.btn.classList.remove('tip'); }, 2200); }
      function vOff() { if (!V.on) return; V.on = false; lastK = ''; V.btn.querySelector('.t').textContent = UI.es.sndT; if (V.a) V.a.pause(); V.btn.classList.remove('on'); V.btn.setAttribute('aria-pressed', 'false'); gsap.ticker.remove(vTick); sync(); }
      function vOn() {
        document.dispatchEvent(new CustomEvent('hs-voice', { detail: hs }));
        if (!V.a) {
          V.a = new Audio(BASE + 'audio/' + def.voice + '.mp3'); V.a.preload = 'auto'; V.marks = def.voiceMarks || null;
          V.a.addEventListener('ended', function () { vOff(); go(BT.length - 1); want = false; sync(); });
          V.a.addEventListener('error', function () { vOff(); V.a = null; V.btn.classList.add('miss'); vTip(T.sndMiss || 'Voz en preparación'); setTimeout(function () { V.btn.classList.remove('miss'); }, 2200); });
        }
        V.on = true; lastK = ''; V.btn.querySelector('.t').textContent = UI.es.sndOn; V.btn.classList.add('on'); V.btn.setAttribute('aria-pressed', 'true');
        var start = function () { if (!V.on) return; V.a.currentTime = vMark(0) + 0; want = true; sync(); };
        gsap.ticker.add(vTick);
        if (V.a.readyState >= 1) start(); else V.a.addEventListener('loadedmetadata', start, { once: true });
      }
      if (V.btn) {
        V.btn.addEventListener('click', function () { if (V.on) vOff(); else vOn(); });
        document.addEventListener('hs-voice', function (e) { if (e.detail !== hs) vOff(); });
      }
      function go(j) { if (V.on && V.a && V.a.duration) { V.a.currentTime = vMark(j) + .01; tl.time(BT[j] + .02, false); } else tl.seek(BT[j] + .02, false); lastT = -1; ui(); }
      function cur() { var t = tl.time(), j = 0; for (var q = 0; q < BT.length; q++) if (t >= BT[q] - .001) j = q; return j; }
      hs.querySelector('.prev').addEventListener('click', function () { var j = cur(); go(tl.time() - BT[j] > .8 ? j : (j + BT.length - 1) % BT.length); });
      hs.querySelector('.next').addEventListener('click', function () { go((cur() + 1) % BT.length); });
      var want = !REDUCE, vis = false;
      function sync() {
        var on = want && vis;
        if (V.on && V.a) { tl.pause(); if (on) { var p = V.a.play(); if (p && p.catch) p.catch(function () {}); } else V.a.pause(); }
        else if (on) tl.play(); else tl.pause();
        amb.forEach(function (a) { on ? a.play() : a.pause(); });
        hs.classList.toggle('playing', on);
      }
      hs.querySelector('.pp').addEventListener('click', function () { want = !want; sync(); });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; sync(); }, { threshold: .3 }).observe(view); else { vis = true; sync(); }
      document.addEventListener('hc-lang', function () { setTimeout(texts, 0); });
      if (window.MutationObserver) new MutationObserver(function () { texts(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      if (REDUCE) go(BT.length - 1); else { tl.seek(.02); ui(); }
      return { tl: tl, go: go, beats: BT, api: api, play: function () { want = true; sync(); }, pause: function () { want = false; sync(); } };
    }
  };
})();
