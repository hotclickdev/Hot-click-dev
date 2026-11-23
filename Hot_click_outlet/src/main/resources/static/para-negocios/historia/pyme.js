/* Historia del plan PyME: dos cajas, un inventario y el proveedor (32 s, 16 pasos) */
(function () {
  var S = window.HCStory; if (!S) return;
  var IC = S.IC, PIC = S.PIC;
  S.defs.pyme = {
    id: 'pyme', voice: 'pyme', voiceMarks: [0, 5.14, 9.14, 13.2, 16.58, 19.64, 22.44, 26.12, 28.84, 32.16, 35.9, 39.32, 43.1, 46.68, 49.28, 52.92],
    tag: { es: 'Plan PyME · dos cajas y un proveedor', en: 'PyME plan · two registers and a supplier', pt: 'Plano PyME · dois caixas e um fornecedor' },
    label: { es: 'Historia animada: dos cajas venden las mismas gorras, antes y con HotClick', en: 'Animated story: two registers sell the same caps, before and with HotClick', pt: 'História animada: dois caixas vendem os mesmos bonés, antes e com a HotClick' },
    voiceWords: [[["Una",0.0],["tienda",0.2],["con",0.62],["dos",0.8],["cajas.",1.06],["Quedan",1.8],["tres",2.36],["gorras,",2.56],["y",3.12],["cada",3.4],["cajera",3.62],["anota",4.06],["en",4.54],["su",4.64],["libreta.",4.72]],[["La",5.26],["caja",5.6],["1",5.88],["vende",6.08],["dos",6.5],["gorras.",6.78],["La",7.4],["caja",7.66],["2",8.0],["no",8.2],["se",8.42],["entera.",8.62]],[["Una",9.26],["clienta",9.72],["pide",10.2],["dos",10.44],["gorras",10.68],["en",11.12],["la",11.26],["caja",11.32],["2.",11.6],["¡Claro!",11.96],["¡Hay",12.5],["tres!",12.74]],[["Va",13.32],["al",13.72],["estante",13.88],["y",14.44],["solo",14.96],["queda",15.74],["una.",16.06]],[["Le",16.7],["piden",17.02],["más",17.32],["al",17.5],["proveedor,",17.68],["pero",18.26],["hoy",18.52],["no",18.8],["puede",18.94],["entregar.",19.14]],[["La",19.76],["clienta",20.06],["se",20.46],["va",20.52],["enojada",20.64],["y",21.24],["deja",21.5],["una",21.72],["estrella.",21.92]],[["Las",22.56],["cajeras",22.84],["discuten.",23.18],["Cada",23.88],["una",24.16],["tenía",24.48],["un",24.68],["número",24.9],["distinto.",25.1]],[["Venta",26.24],["perdida,",26.8],["y",27.42],["nadie",27.64],["sabe",27.98],["cuánto",28.32],["hay.",28.82]],[["Con.",28.96],["HotClick,",29.4],["las",30.0],["dos",30.2],["cajas",30.44],["venden",30.82],["del",31.16],["mismo",31.3],["inventario.",31.58]],[["La",32.28],["caja",32.5],["1",32.8],["vende",32.96],["dos",33.4],["gorras",33.6],["y",34.08],["las",34.26],["dos",34.44],["cajas",34.66],["ven",35.14],["que",35.26],["queda",35.42],["una.",35.62]],[["La",36.02],["caja",36.28],["2",36.56],["ofrece",36.7],["la",37.24],["que",37.36],["queda,",37.48],["sin",37.88],["promesas",38.14],["falsas.",38.7]],[["Inventario",39.44],["en",39.96],["cero.",40.08],["HotClick",40.52],["avisa",41.02],["y",41.54],["le",41.7],["manda",41.82],["el",42.18],["pedido",42.22],["al",42.56],["proveedor.",42.62]],[["El",43.22],["proveedor",43.48],["aprueba",43.96],["y",44.46],["el",44.6],["camión",44.74],["sale",45.1],["con",45.32],["24",45.52],["gorras.",45.9]],[["Llega",46.8],["el",47.28],["pedido",47.34],["y",47.78],["el",47.9],["inventario",48.0],["se",48.5],["repone",48.64],["solo.",49.04]],[["La",49.4],["clienta",49.66],["vuelve,",50.08],["compra",50.5],["dos",50.82],["gorras",51.1],["y",51.58],["deja",51.74],["cinco",52.0],["estrellas.",52.34]],[["Dos",53.04],["cajas,",53.38],["un",53.98],["solo",54.18],["inventario",54.46],["y",55.1],["todo",55.38],["en",55.96],["orden.",56.22]]],
    beats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24.5, 26.5, 28, 30], len: 32, start: 'lo',
    envs: ['q', 'ok', 'no', 'pay', 'warn', 'ban'],
    hud: { l: ['till1', 'cap'], r: ['till2', 'cap'], table: [[0, 3, 3, 'off'], [2.9, 1, 3, 'bad'], [16, 3, 3, 'ok'], [18.9, 1, 1, 'ok'], [21.2, 0, 0, 'ok'], [27.2, 24, 24, 'ok'], [29, 22, 22, 'ok']] },
    mood: [[0, ''], [7, 'cold'], [14, 'gloom'], [16, ''], [18.7, 'warm'], [20, ''], [27, 'warm'], [28, ''], [30, 'warm']],
    confetti: [[27.3, 'small', .6], [30.4, 'big']],
    cardA: IC.note + IC.till1 + IC.neq + IC.till2, cardB: IC.till1 + IC.link + IC.till2,
    shots: { lo: [1010, 280, .82], c1: [830, 265, 1.2], c2: [1210, 265, 1.2], sh: [1060, 230, 1.4], pv: [0, 280, 1.05], pS: [10, 280, .85], lS: [1200, 280, .85], all: [560, 290, .45], lS2: [1010, 270, .7] },
    actors: [
      { n: 'cash1', o: { sh: '#1747A8', hair: '#1D1E25', skin: '#D9A47A', apron: 1 }, x: 810, y: 400 },
      { n: 'cash2', o: { sh: '#D02A23', hair: '#B8802F', skin: '#F2CBA4', apron: 1, bun: 1, phone: 1 }, x: 1230, y: 400 },
      { n: 'cust1', o: { sh: '#41B07A', hair: '#4A2E1C', skin: '#B27B52' }, x: 800, y: 520, s: 1.05 },
      { n: 'cust2', o: { sh: '#F06A8A', hair: '#2E2F37', skin: '#8E5E3C', pony: 1 }, x: 1250, y: 520, s: 1.05 },
      { n: 'sup', o: { sh: '#3F6FD0', hair: '#1D1E25', skin: '#D9A47A', cap: '#14171C', phone: 1 }, x: 300, y: 420 }
    ],
    think: {
      cap3: function () { return PIC.cap(-20, 2) + PIC.num(18, 0, '3', '#14171C'); },
      cap1: function () { return PIC.cap(-20, 2) + PIC.num(18, 0, '1', '#14171C'); },
      want2: function () { return PIC.cap(-20, 2) + PIC.num(18, 0, '2', '#4F7FE0'); },
      capok: function () { return PIC.cap(-20, 2) + PIC.chk(18, 0); },
      capx: function () { return PIC.cap(-20, 2) + PIC.strike(-20, 2) + PIC.q(18, 0); },
      angry: function () { return PIC.cap(-20, 2) + PIC.xx(18, 0); },
      diff: function () { return PIC.num(-24, 0, '1', '#1747A8') + PIC.neq(0, 0) + PIC.num(24, 0, '3', '#D02A23'); },
      late: function () { return PIC.truck(-16, 2) + PIC.clock(22, 0); },
      sad: function () { return PIC.star(-18, 0, '#F0524A') + PIC.num(16, 0, '1', '#F0524A'); },
      linked: function () { return PIC.till(-28, 2) + PIC.eq(0, 0) + PIC.till(28, 2); },
      synced: function () { return PIC.till(-18, 2) + PIC.chk(18, 0); },
      fair: function () { return PIC.cap(-20, 2) + PIC.num(18, 0, '1', '#34B577'); },
      auto: function () { return PIC.box(-18, 2) + PIC.chk(18, 0); },
      truckok: function () { return PIC.truck(-16, 2) + PIC.chk(22, 0); },
      boxes: function () { return PIC.box(-18, 2) + PIC.num(18, 0, '+24', '#34B577'); },
      happy: function () { return PIC.cap(-20, 2) + PIC.heart(18, 2); },
      money: function () { return PIC.coin(-18, 0) + PIC.star(18, 0, '#E2B340'); }
    },
    cap: {
      es: { a1: 'Una tienda con dos cajas. Quedan 3 gorras y cada cajera anota en su libreta.', a2: 'La caja 1 vende 2 gorras. La caja 2 no se entera: sigue creyendo que hay 3.', a3: 'Una clienta pide 2 gorras en la caja 2. «¡Claro, hay 3!»', a4: 'Va al estante… y solo queda 1 gorra.', a5: 'Pide más al proveedor de urgencia: hoy no puede entregar.', a6: 'La clienta se va enojada y deja 1 estrella.', a7: 'Las cajeras discuten: cada una tenía un número distinto.', a8: 'Venta perdida, cliente molesta y nadie sabe cuánto hay.', b1: 'Con HotClick, las dos cajas venden del mismo inventario.', b2: 'La caja 1 vende 2 gorras y las dos cajas ven que queda 1.', b3: 'La caja 2 ofrece la gorra que queda. Sin promesas falsas.', b4: 'Inventario en 0: HotClick avisa y manda el pedido al proveedor.', b5: 'El proveedor aprueba y el camión sale con 24 gorras.', b6: 'Llega el pedido y el inventario se repone solo: 24.', b7: 'La clienta vuelve, compra 2 gorras y deja 5 estrellas.', b8: 'Dos cajas, un solo inventario y todo en orden.' },
      en: { a1: 'A shop with two registers. 3 caps left, and each cashier keeps her own notebook.', a2: 'Register 1 sells 2 caps. Register 2 doesn\'t know: it still thinks there are 3.', a3: 'A customer asks register 2 for 2 caps. "Sure, we have 3!"', a4: 'She goes to the shelf… only 1 cap left.', a5: 'She asks the supplier for an urgent restock: no delivery today.', a6: 'The customer leaves angry and gives 1 star.', a7: 'The cashiers argue: each had a different number.', a8: 'Lost sale, upset customer and nobody knows the real stock.', b1: 'With HotClick, both registers sell from the same inventory.', b2: 'Register 1 sells 2 caps and both registers see 1 left.', b3: 'Register 2 offers the last cap. No false promises.', b4: 'Stock at 0: HotClick alerts and sends the order to the supplier.', b5: 'The supplier approves and the truck leaves with 24 caps.', b6: 'The order arrives and the inventory restocks on its own: 24.', b7: 'The customer comes back, buys 2 caps and leaves 5 stars.', b8: 'Two registers, one inventory, everything in order.' },
      pt: { a1: 'Uma loja com dois caixas. Restam 3 bonés e cada caixa anota no seu caderno.', a2: 'O caixa 1 vende 2 bonés. O caixa 2 não fica sabendo: continua achando que há 3.', a3: 'Uma cliente pede 2 bonés no caixa 2. "Claro, temos 3!"', a4: 'Ela vai à prateleira… e só resta 1 boné.', a5: 'Pede reposição urgente ao fornecedor: hoje não dá para entregar.', a6: 'A cliente vai embora brava e deixa 1 estrela.', a7: 'As caixas discutem: cada uma tinha um número diferente.', a8: 'Venda perdida, cliente chateada e ninguém sabe o estoque real.', b1: 'Com a HotClick, os dois caixas vendem do mesmo estoque.', b2: 'O caixa 1 vende 2 bonés e os dois caixas veem que resta 1.', b3: 'O caixa 2 oferece o último boné. Sem promessas falsas.', b4: 'Estoque em 0: a HotClick avisa e envia o pedido ao fornecedor.', b5: 'O fornecedor aprova e o caminhão sai com 24 bonés.', b6: 'O pedido chega e o estoque se repõe sozinho: 24.', b7: 'A cliente volta, compra 2 bonés e deixa 5 estrelas.', b8: 'Dois caixas, um estoque e tudo em ordem.' }
    },
    world: function (H) {
      var W = '', i, id = H.id;
      function capG(x, y, c) { return '<path d="M' + (x - 16) + ' ' + (y + 6) + 'a16 15 0 0 1 32 0z" fill="' + (c || '#1747A8') + '"/><path d="M' + (x - 2) + ' ' + (y + 6) + 'h22a5 5 0 0 1-5 5h-17z" fill="' + (c || '#1747A8') + '"/><circle cx="' + x + '" cy="' + (y - 8) + '" r="2.6" fill="#F0524A"/>'; }
      W += '<g>'; for (i = 0; i < 26; i++) { var tx = i * 140 - 400, th = 60 + (i * 37) % 70; W += '<rect x="' + tx + '" y="' + (440 - th - 80) + '" width="110" height="' + (th + 80) + '" rx="6" style="fill:var(--far2,#202734)"/>'; } W += '</g>';
      W += '<rect x="-800" y="440" width="4000" height="500" style="fill:var(--gnd,#232831)"/>';
      /* proveedor */
      W += '<g transform="translate(-320 0)">';
      W += '<rect x="-40" y="60" width="620" height="380" style="fill:var(--wall2,#232A35)"/><path d="M-40 60l310-40 310 40" fill="none" stroke="#7C8492" stroke-width="6"/>';
      for (var r = 0; r < 3; r++) { W += '<rect x="20" y="' + (130 + r * 90) + '" width="200" height="10" fill="#8A5E38"/>'; for (i = 0; i < 4; i++) W += '<rect x="' + (28 + i * 48) + '" y="' + (92 + r * 90) + '" width="42" height="38" rx="3" fill="#C2955E"/><rect x="' + (45 + i * 48) + '" y="' + (92 + r * 90) + '" width="8" height="38" fill="#F3DDB6"/>'; }
      W += H.actor('sup');
      W += '<g id="' + id('truck') + '"><rect x="420" y="330" width="120" height="80" rx="8" fill="#F4F6F9" stroke="#C3C9D4" stroke-width="2"/><rect x="430" y="350" width="100" height="16" fill="#D02A23"/><path d="M540 360h36l24 28v22h-60z" fill="#D02A23"/><rect x="552" y="368" width="24" height="18" rx="2" fill="#7AA3F2"/>';
      W += '<g class="hs-wheel" transform-origin="460 414"><circle cx="460" cy="414" r="16" fill="#14171C"/><path d="M450 414h20M460 404v20" stroke="#7C8492" stroke-width="3"/></g><g class="hs-wheel" transform-origin="570 414"><circle cx="570" cy="414" r="16" fill="#14171C"/><path d="M560 414h20M570 404v20" stroke="#7C8492" stroke-width="3"/></g>';
      W += '<g id="' + id('load') + '" opacity="0"><rect x="436" y="300" width="40" height="30" rx="3" fill="#C2955E"/><rect x="480" y="300" width="40" height="30" rx="3" fill="#C2955E"/><rect x="458" y="272" width="40" height="28" rx="3" fill="#C2955E"/></g></g></g>';
      /* tienda (local) */
      W += '<rect x="680" y="70" width="780" height="370" style="fill:var(--wall,#1B2029)"/><rect x="680" y="400" width="780" height="40" style="fill:var(--wall2,#232A35)"/>';
      W += '<rect x="700" y="96" width="740" height="16" rx="6" fill="#A81F1A"/>';
      W += '<rect x="900" y="150" width="240" height="10" rx="3" fill="#8A5E38"/><rect x="900" y="250" width="240" height="10" rx="3" fill="#8A5E38"/>';
      for (i = 0; i < 4; i++) W += '<rect x="' + (912 + i * 56) + '" y="118" width="44" height="32" rx="4" fill="' + ['#62CE96', '#F2CBA4', '#7AA3F2', '#E8B88A'][i] + '"/>';
      for (i = 0; i < 3; i++) W += '<g id="' + id('cap' + i) + '">' + capG(960 + i * 60, 236, '#1747A8') + '</g>';
      W += '<g id="' + id('spot') + '" opacity="0"><ellipse cx="990" cy="246" rx="44" ry="6" fill="none" stroke="#F0524A" stroke-width="3" stroke-dasharray="5 4"/></g>';
      W += '<g id="' + id('newcaps') + '" opacity="0">'; for (i = 0; i < 4; i++) W += capG(930 + i * 52, 236, '#1747A8'); W += '<rect x="912" y="268" width="216" height="30" rx="4" fill="#C2955E"/><text x="1020" y="290" text-anchor="middle" style="font:800 18px Sora,sans-serif;fill:#14171C">+24</text></g>';
      W += '<g id="' + id('wscreen') + '" opacity="0"><rect x="960" y="74" width="120" height="66" rx="10" fill="#14171C" stroke="#34B577" stroke-width="3"/>';
      [['n3', '3'], ['n1', '1'], ['n0', '0'], ['n24', '24'], ['n22', '22']].forEach(function (n, j) { W += '<g id="' + id(n[0]) + '"' + (j ? ' opacity="0"' : '') + '>' + capG(992, 108, '#7AA3F2') + '<text x="1046" y="118" text-anchor="middle" style="font:800 26px Sora,sans-serif;fill:' + (n[1] === '0' ? '#F0524A' : '#fff') + '">' + n[1] + '</text></g>'; });
      W += '</g>';
      W += '<path id="' + id('ch1') + '" d="M815 300C840 200 900 130 962 110" fill="none" stroke="#34B577" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round" opacity="0"/><path id="' + id('ch2') + '" d="M1235 300C1210 200 1150 130 1078 110" fill="none" stroke="#34B577" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round" opacity="0"/>';
      W += '<circle id="' + id('p1') + '" r="9" fill="#34B577" opacity="0"/><circle id="' + id('p2') + '" r="9" fill="#34B577" opacity="0"/>';
      W += H.actor('cash1') + H.actor('cash2');
      function counter(x, n) { return '<rect x="' + x + '" y="330" width="150" height="112" rx="6" fill="#C2955E"/><rect x="' + (x - 8) + '" y="320" width="166" height="14" rx="6" fill="#DDB680"/><rect x="' + x + '" y="352" width="150" height="22" fill="#D02A23"/><rect x="' + (x + 50) + '" y="286" width="56" height="34" rx="6" fill="#14171C"/><rect x="' + (x + 56) + '" y="291" width="44" height="18" rx="3" fill="#7AA3F2"/><text x="' + (x + 78) + '" y="305" text-anchor="middle" style="font:800 13px Sora,sans-serif;fill:#14171C">' + n + '</text>'; }
      W += counter(740, '1') + counter(1160, '2');
      W += '<g id="' + id('nb1') + '"><path d="M752 302l44-5 3 20-44 5z" fill="#FFF8D9"/><path d="M759 307l30-3M760 313l22-2" stroke="#9AA1AE" stroke-width="2"/></g><g id="' + id('nb2') + '"><path d="M1172 302l44-5 3 20-44 5z" fill="#FFF8D9"/><path d="M1179 307l30-3M1180 313l22-2" stroke="#9AA1AE" stroke-width="2"/></g>';
      W += '<g id="' + id('ok1') + '" opacity="0">' + PIC.chk(860, 280) + '</g><g id="' + id('ok2') + '" opacity="0">' + PIC.chk(1280, 280) + '</g>';
      for (i = 0; i < 3; i++) W += '<g class="coin1" opacity="0">' + PIC.coin(830 + i * 26, 250 - i * 6) + '</g><g class="coin2" opacity="0">' + PIC.coin(1250 + i * 26, 250 - i * 6) + '</g>';
      W += H.actor('cust1') + H.actor('cust2');
      function stars(n, c, gid) { var s = '<g id="' + id(gid) + '" opacity="0"><rect x="1176" y="150" width="148" height="40" rx="20" fill="#fff" stroke="rgba(0,0,0,.12)"/>'; for (var j = 0; j < 5; j++) s += '<path transform="translate(' + (1198 + j * 26) + ' 171) scale(1.55)" d="M0-5.6l1.6 3.4 3.8.5-2.8 2.6.7 3.7L0 2.8l-3.3 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="' + (j < n ? c : '#D5DAE2') + '"/>'; return s + '</g>'; }
      W += stars(1, '#F0524A', 'st1') + stars(5, '#E2B340', 'st5');
      W += '<g id="' + id('rainc') + '" opacity="0"><path d="M962 150a18 18 0 0 1 12-24 24 24 0 0 1 44-6 18 18 0 0 1 30 12 16 16 0 0 1-6 30h-62a18 18 0 0 1-18-12z" fill="#7C8492"/><path class="hs-drop" d="M986 168v10M1006 168v10M1026 168v10" stroke="#7AA3F2" stroke-width="4" stroke-linecap="round"/></g>';
      W += H.cloud('th1', 890, 112) + H.cloud('th2', 1310, 112) + H.cloud('th2b', 1310, 112) + H.cloud('thC', 1335, 222) + H.cloud('thP', 60, 130);
      return W;
    },
    script: function (a) {
      var tl = a.tl, A = a.A, el = a.el, scr = a.scr;
      function base(t, b) {
        a.reset(t);
        tl.set(['cap0', 'cap1', 'cap2'].map(el), { opacity: 1, x: 0, y: 0, scale: 1 }, t);
        tl.set([el('nb1'), el('nb2')], { opacity: b ? 0 : 1 }, t); tl.set(el('wscreen'), { opacity: b ? 1 : 0 }, t);
        tl.set(el('n3'), { opacity: 1 }, t); tl.set(el('truck'), { x: 0 }, t);
        tl.set(['n1', 'n0', 'n24', 'n22', 'spot', 'newcaps', 'ok1', 'ok2', 'st1', 'st5', 'rainc', 'load', 'ch1', 'ch2', 'p1', 'p2'].map(el).concat(a.all('.coin1'), a.all('.coin2')), { opacity: 0 }, t);
      }
      function coins(cls, t) { tl.to(a.all(cls), { opacity: 1, y: -30, duration: .5, stagger: .12, ease: 'power2.out' }, t); tl.to(a.all(cls), { opacity: 0, y: -60, duration: .4, stagger: .1 }, t + .7); }
      function swap(from, to, t) { tl.to(el(from), { opacity: 0, duration: .15 }, t); a.pop(to, t); }
      /* ANTES */
      base(0, false);
      a.think('th1', 'cap3', .4, 1.5); a.think('th2', 'cap3', .6, 1.3);
      a.cam('c1', 2); a.pose('cust1', 'reach', 2.3); a.expr('cust1', 'happy', 2.3);
      tl.to([el('cap0'), el('cap1')], { x: -160, y: 120, scale: .6, opacity: 0, duration: .8, stagger: .15, ease: 'power2.in' }, 2.5);
      coins('.coin1', 2.9); a.expr('cash1', 'joy', 2.9); a.expr('cust1', 'love', 3.1); a.think('th1', 'cap1', 3.0, 1.0);
      a.cam('c2', 4); tl.to(A.cust1.g, { x: 640, opacity: 0, duration: 1 }, 4.1);
      a.pose('cust2', 'point', 4.3); a.expr('cust2', 'happy', 4.3); a.think('thC', 'want2', 4.4, 1.5);
      a.expr('cash2', 'joy', 4.9); a.think('th2', 'capok', 5.0, 1.0);
      a.cam('sh', 6, .9); a.pose('cash2', 'point', 6.2); a.show('spot', 6.6); a.arrow(scr('sh', 'C', 1080, 200), 6.6, 1.3);
      a.expr('cash2', 'shock', 7.0); a.pose('cash2', 'head', 7.2, .25); a.shake(7.0); a.think('th2b', 'capx', 7.1, .9);
      a.show('spot', 8, 0); a.split('pS', 'lS', 8, 'bodega', 'local'); a.pose('cash2', 'phone', 8.1); a.expr('cash2', 'worry', 8.1);
      a.fly('q', scr('lS', 'R', 1315, 215), scr('pS', 'L', 65, 235), 8.3, .9);
      a.pose('sup', 'phone', 8.6); a.expr('sup', 'worry', 9.1); a.think('thP', 'late', 9.2, .8);
      a.fly('no', scr('pS', 'L', 65, 235), scr('lS', 'R', 1315, 215), 9.4, .8, { hold: .5 });
      a.unsplit(10); a.cam('c2', 10, .9);
      a.expr('cust2', 'angry', 10.4); a.pose('cust2', 'slump', 10.4); a.think('thC', 'angry', 10.6, 1.2);
      tl.fromTo(el('st1'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4, ease: 'hs-pop', immediateRender: false }, 11.2);
      a.cam('lo', 12, 1); tl.to(A.cust2.g, { x: 1480, opacity: 0, duration: 1 }, 12);
      a.expr('cash1', 'angry', 12.4); a.expr('cash2', 'angry', 12.4); a.pose('cash1', 'point', 12.4); a.pose('cash2', 'idle', 12.4);
      a.think('th1', 'diff', 12.6, 1.3); a.think('th2', 'diff', 12.8, 1.1);
      a.cam('lS2', 14, 1); tl.fromTo(el('rainc'), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .5, immediateRender: false }, 14.2);
      a.expr('cash1', 'sad', 14.2); a.expr('cash2', 'sad', 14.2); a.pose('cash1', 'slump', 14.2); a.pose('cash2', 'slump', 14.2);
      a.think('th2', 'sad', 14.5, 1.4);
      /* CON HOTCLICK */
      var B = 16;
      base(B, true); a.cam('lo', B, .01);
      tl.set([el('ch1'), el('ch2')], { opacity: 1, drawSVG: '0%' }, B + .3); tl.to([el('ch1'), el('ch2')], { drawSVG: '100%', duration: 1, ease: 'power2.out' }, B + .3);
      a.pop('ok1', B + 1.2); a.pop('ok2', B + 1.3); a.think('th1', 'linked', B + .6, 1.3);
      a.cam('c1', B + 2); a.pose('cust1', 'reach', B + 2.3); a.expr('cust1', 'happy', B + 2.3);
      tl.to([el('cap0'), el('cap1')], { x: -160, y: 120, scale: .6, opacity: 0, duration: .8, stagger: .15, ease: 'power2.in' }, B + 2.5);
      coins('.coin1', B + 2.8); a.flash(B + 2.7); a.expr('cash1', 'joy', B + 2.8); a.expr('cust1', 'love', B + 3.0);
      tl.set([el('p1')], { opacity: 1 }, B + 2.9); tl.to(el('p1'), { motionPath: { path: el('ch1'), align: el('ch1'), alignOrigin: [.5, .5] }, duration: .8, ease: 'power1.inOut', immediateRender: false }, B + 2.9); tl.to(el('p1'), { opacity: 0, duration: .2 }, B + 3.7);
      swap('n3', 'n1', B + 2.9); a.think('th1', 'synced', B + 3.1, .85);
      a.cam('c2', B + 4); tl.to(A.cust1.g, { x: 640, opacity: 0, duration: 1 }, B + 4.1);
      a.pose('cust2', 'point', B + 4.2); a.expr('cust2', 'happy', B + 4.2); a.think('thC', 'want2', B + 4.3, .9);
      a.think('th2', 'fair', B + 4.6, 1.2); a.expr('cash2', 'happy', B + 4.6);
      tl.to(el('cap2'), { x: 220, y: 120, scale: .6, opacity: 0, duration: .8, ease: 'power2.in' }, B + 5.0);
      coins('.coin2', B + 5.2); swap('n1', 'n0', B + 5.2); a.expr('cust2', 'calm', B + 5.3); a.pose('cust2', 'idle', B + 5.3);
      tl.to(A.cust2.g, { x: 1480, opacity: 0, duration: 1 }, B + 5.9); a.split('pS', 'lS2', B + 6, 'bodega', 'local'); a.arrow(scr('lS2', 'R', 1046, 80), B + 6.2, 1.0);
      a.fly('warn', scr('lS2', 'R', 1020, 108), scr('pS', 'L', 65, 235), B + 6.6, .9);
      a.pose('sup', 'phone', B + 7.0); a.expr('sup', 'happy', B + 7.4); a.think('thP', 'auto', B + 7.5, 1);
      a.fly('ok', scr('pS', 'L', 65, 235), scr('lS2', 'R', 1020, 108), B + 7.7, .7, { hold: .6 });
      a.unsplit(B + 8.5); a.cam('pv', B + 8.5, .9); a.pose('sup', 'carry', B + 8.7); a.expr('sup', 'joy', B + 9.0);
      a.pop('load', B + 9.2); a.think('thP', 'truckok', B + 9.4, 1.0);
      a.cam('all', B + 10.5, 1.2);
      tl.to(el('truck'), { x: 650, duration: 1.4, ease: 'power2.inOut' }, B + 10.6);
      a.cam('sh', B + 11.4, .6); a.pop('newcaps', B + 11.2); swap('n0', 'n24', B + 11.2);
      a.pose('cash1', 'cheer', B + 11.3); a.pose('cash2', 'cheer', B + 11.3); a.expr('cash1', 'joy', B + 11.3); a.expr('cash2', 'joy', B + 11.3);
      a.cam('c2', B + 12, .9); tl.fromTo(A.cust2.g, { x: 1480, opacity: 0 }, { x: 1250, opacity: 1, duration: .8, immediateRender: false }, B + 12.1);
      a.pose('cash1', 'idle', B + 12); a.pose('cash2', 'idle', B + 12);
      a.expr('cust2', 'love', B + 12.6); a.think('thC', 'happy', B + 12.6, 1.3); coins('.coin2', B + 12.9); swap('n24', 'n22', B + 13.0);
      tl.fromTo(el('st5'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4, ease: 'hs-pop', immediateRender: false }, B + 13.3);
      a.cam('lo', B + 14, 1);
      a.pose('cash1', 'cheer', B + 14.3); a.pose('cash2', 'cheer', B + 14.3); a.expr('cash1', 'joy', B + 14.3); a.expr('cash2', 'joy', B + 14.3);
      a.jump('cash1', B + 14.5, 3); a.jump('cash2', B + 14.6, 3); a.pose('cust2', 'cheer', B + 14.4);
      a.think('th1', 'money', B + 14.6, 1.3);
    }
  };
})();
