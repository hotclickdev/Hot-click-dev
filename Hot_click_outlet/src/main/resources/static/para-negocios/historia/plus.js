/* Historia del plan Negocio Plus: tres locales, reportes, clientes frecuentes y Hot IA (32 s, 16 pasos) */
(function () {
  var S = window.HCStory; if (!S) return;
  var IC = S.IC, PIC = S.PIC;
  S.defs.plus = {
    id: 'plus', voice: 'plus', voiceMarks: [0, 4.84, 7.66, 11.92, 16.28, 20.1, 25, 29, 33.1, 36.98, 40.8, 44.68, 47.44, 51.3, 54.24, 57.38],
    tag: { es: 'Plan Negocio Plus · varios locales', en: 'Negocio Plus plan · several shops', pt: 'Plano Negocio Plus · várias lojas' },
    label: { es: 'Historia animada: una dueña con tres locales, antes y con HotClick', en: 'Animated story: an owner with three shops, before and with HotClick', pt: 'História animada: uma dona com três lojas, antes e com a HotClick' },
    voiceWords: [[["Una",0.0],["dueña",0.2],["con",0.68],["tres",0.84],["locales.",1.2],["Desde",1.96],["su",2.5],["oficina,",2.68],["no",3.24],["sabe",3.52],["cómo",3.8],["va",4.0],["cada",4.2],["uno.",4.4]],[["Va",4.96],["al",5.36],["local",5.54],["1",5.74],["a",6.0],["pedir",6.22],["el",6.44],["reporte",6.64],["en",7.08],["papel.",7.08]],[["Después,",7.78],["al",8.64],["local",8.86],["2.",9.08],["Más",9.7],["papeles",10.16],["y",10.76],["nada",11.02],["claro.",11.38]],[["El",12.04],["local",12.32],["3",12.52],["pregunta",12.8],["si",13.18],["puede",13.4],["pedir",13.56],["más",13.86],["producto.",14.04],["Ella",14.72],["no",15.12],["sabe",15.26],["qué",15.52],["responder.",15.7]],[["Llega",16.4],["una",16.82],["clienta",16.96],["frecuente",17.4],["al",17.88],["local",17.98],["3.",18.16],["Nadie",18.78],["la",19.34],["reconoce.",19.42]],[["Pide",20.22],["su",20.6],["descuento",20.76],["de",21.16],["siempre",21.34],["y",21.64],["se",22.12],["lo",22.24],["niegan.",22.36],["Se",22.88],["va",23.2],["molesta.",23.3],["Una",23.96],["estrella.",24.44]],[["De",25.12],["noche,",25.52],["la",26.0],["dueña",26.26],["junta",26.56],["papeles",26.96],["y",27.42],["los",27.7],["números",27.88],["no",28.18],["le",28.52],["cuadran.",28.64]],[["Tres",29.12],["locales,",29.7],["cero",30.34],["visibilidad",30.84],["y",31.36],["una",31.88],["clienta",32.14],["perdida.",32.62]],[["Con.",33.22],["HotClick,",33.58],["los",34.22],["tres",34.4],["locales",34.68],["están",35.16],["conectados",35.32],["al",35.9],["celular",36.04],["de",36.34],["la",36.56],["dueña.",36.64]],[["Cada",37.1],["local",37.42],["manda",37.78],["su",38.2],["reporte",38.28],["solo.",38.74],["Ella",39.16],["ve",39.5],["todo",39.64],["sin",39.94],["moverse.",40.26]],[["Le",40.92],["pregunta",41.16],["a",41.46],["Hot IA",41.7],["y",42.14],["le",42.58],["dice",42.76],["qué",43.06],["local",43.3],["necesita",43.58],["producto.",43.96]],[["Aprueba",44.8],["la",45.32],["reposición",45.42],["del",45.88],["local",46.08],["3",46.3],["desde",46.56],["el",46.88],["celular.",47.06]],[["Llega",47.56],["la",48.0],["clienta",48.1],["frecuente",48.5],["y",49.04],["el",49.18],["CRM",49.42],["la",50.0],["reconoce",50.16],["al",50.64],["instante.",50.74]],[["Recibe",51.42],["su",51.98],["descuento,",52.1],["paga",52.8],["y",53.26],["se",53.52],["va",53.64],["feliz.",53.8]],[["La",54.36],["venta",54.6],["llega",54.96],["al",55.14],["reporte",55.26],["de",55.7],["la",55.78],["dueña.",55.86],["Cinco",56.22],["estrellas.",56.9]],[["Varios",57.5],["locales,",57.9],["una",58.6],["sola",58.98],["vista",59.24],["y",59.58],["clientes",59.98],["que",60.52],["vuelven.",60.62]]],
    beats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24.5, 26.5, 28, 30], len: 32, start: 'of',
    envs: ['rep', 'q', 'ok', 'no', 'pay', 'warn'],
    hud: { l: ['shops'], r: ['eye'], table: [[0, 3, 0, 'bad'], [3, 3, 1, 'bad'], [5, 3, 2, 'bad'], [16, 3, 0, 'off'], [19.2, 3, 3, 'ok']] },
    mood: [[0, ''], [6.5, 'cold'], [14, 'gloom'], [16, ''], [19.5, 'warm'], [20.5, ''], [28.5, 'warm'], [29.5, ''], [30, 'warm']],
    confetti: [[29.0, 'small', .5], [30.4, 'big']],
    cardA: IC.note + IC.shops + IC.neq + IC.eye, cardB: IC.shops + IC.link + IC.phone,
    shots: { of: [1990, 300, 1.05], sA: [240, 300, 1.05], sB: [800, 300, 1.05], sC: [1360, 300, 1.05], all: [1130, 300, .41], oS: [1990, 280, .85], cS: [1360, 280, .85], bS: [820, 280, .85], vC: [1420, 300, 1.2] },
    actors: [
      { n: 'owner', o: { sh: '#2E2F37', hair: '#7A2E1C', skin: '#F2CBA4', bun: 1, glasses: 1, phone: 1 }, x: 1990, y: 430 },
      { n: 'empA', o: { sh: '#1747A8', hair: '#1D1E25', skin: '#D9A47A', apron: 1 }, x: 170, y: 400 },
      { n: 'empB', o: { sh: '#41B07A', hair: '#B8802F', skin: '#F2CBA4', apron: 1, pony: 1 }, x: 730, y: 400 },
      { n: 'empC', o: { sh: '#D02A23', hair: '#4A2E1C', skin: '#B27B52', apron: 1, phone: 1 }, x: 1290, y: 400 },
      { n: 'vip', o: { sh: '#8B6CF0', hair: '#E9BE4F', skin: '#F2CBA4', pony: 1 }, x: 1700, y: 520, s: 1.05 }
    ],
    think: {
      shopsq: function () { return PIC.shop(-22, 2) + PIC.shop(0, 2) + PIC.q(26, 0); },
      paper: function () { return PIC.paper(-18, 0) + PIC.q(18, 0); },
      tired: function () { return PIC.paper(-26, 2) + PIC.paper(-8, -2) + PIC.paper(10, 2) + PIC.q(30, -6); },
      stockq: function () { return PIC.box(-18, 2) + PIC.q(18, 0); },
      noknow: function () { return PIC.chart(-18, 0) + PIC.xx(18, 0); },
      who: function () { return PIC.person(-18, 0, '#8B6CF0') + PIC.q(18, 0); },
      vipwant: function () { return PIC.star(-18, 0, '#E2B340') + PIC.heart(18, 2); },
      angry: function () { return PIC.person(-18, 0, '#D02A23') + PIC.xx(18, 0); },
      sad: function () { return PIC.star(-18, 0, '#F0524A') + PIC.num(16, 0, '1', '#F0524A'); },
      linked: function () { return PIC.shop(-28, 2) + PIC.eq(0, 0) + PIC.phone(28, 0); },
      reports: function () { return PIC.chart(-18, 0) + PIC.chk(18, 0); },
      ia: function () { return PIC.ia(-18, 0) + PIC.box(18, 2); },
      restock: function () { return PIC.box(-18, 2) + PIC.chk(18, 0); },
      vip: function () { return PIC.person(-18, 0, '#8B6CF0') + PIC.star(18, 0, '#E2B340'); },
      love: function () { return PIC.star(-18, 0, '#E2B340') + PIC.heart(18, 2); },
      money: function () { return PIC.coin(-18, 0) + PIC.chart(18, 0); }
    },
    cap: {
      es: { a1: 'Una dueña con tres locales. Desde su oficina no sabe cómo va cada uno.', a2: 'Va al local 1 a pedir el reporte en papel.', a3: 'Después al local 2. Más papeles y nada claro.', a4: 'El local 3 pregunta si puede pedir más producto. Ella no sabe qué responder.', a5: 'Llega una clienta frecuente al local 3. Nadie la reconoce.', a6: 'Pide su descuento de siempre y se lo rechazan. Se va molesta: 1 estrella.', a7: 'De noche, la dueña junta papeles y los números no le cuadran.', a8: 'Tres locales, cero visibilidad y una clienta perdida.', b1: 'Con HotClick, los tres locales están conectados al celular de la dueña.', b2: 'Cada local manda su reporte solo. Ella ve todo sin moverse.', b3: 'Le pregunta a Hot IA y le dice qué local necesita producto.', b4: 'Aprueba la reposición del local 3 desde el celular.', b5: 'Llega la clienta frecuente: el CRM la reconoce al instante.', b6: 'Recibe su descuento, paga y se va feliz.', b7: 'La venta llega al reporte de la dueña. 5 estrellas.', b8: 'Varios locales, una sola vista y clientes que vuelven.' },
      en: { a1: 'An owner with three shops. From her office she can\'t tell how each one is doing.', a2: 'She goes to shop 1 to get the paper report.', a3: 'Then to shop 2. More paper, nothing clear.', a4: 'Shop 3 asks if it can order more stock. She doesn\'t know what to say.', a5: 'A regular customer walks into shop 3. Nobody recognizes her.', a6: 'She asks for her usual discount and gets rejected. She leaves upset: 1 star.', a7: 'At night, the owner gathers papers and the numbers don\'t add up.', a8: 'Three shops, zero visibility and a lost customer.', b1: 'With HotClick, the three shops are connected to the owner\'s phone.', b2: 'Each shop sends its report on its own. She sees everything without moving.', b3: 'She asks Hot IA, which tells her which shop needs stock.', b4: 'She approves shop 3\'s restock from her phone.', b5: 'The regular customer arrives: the CRM recognizes her instantly.', b6: 'She gets her discount, pays and leaves happy.', b7: 'The sale reaches the owner\'s report. 5 stars.', b8: 'Several shops, one view and customers who come back.' },
      pt: { a1: 'Uma dona com três lojas. Do escritório ela não sabe como vai cada uma.', a2: 'Vai à loja 1 buscar o relatório em papel.', a3: 'Depois à loja 2. Mais papéis e nada claro.', a4: 'A loja 3 pergunta se pode pedir mais produto. Ela não sabe o que responder.', a5: 'Chega uma cliente frequente à loja 3. Ninguém a reconhece.', a6: 'Ela pede o desconto de sempre e é recusada. Vai embora chateada: 1 estrela.', a7: 'À noite, a dona junta papéis e os números não fecham.', a8: 'Três lojas, nenhuma visibilidade e uma cliente perdida.', b1: 'Com a HotClick, as três lojas estão conectadas ao celular da dona.', b2: 'Cada loja manda seu relatório sozinha. Ela vê tudo sem sair do lugar.', b3: 'Ela pergunta ao Hot IA, que diz qual loja precisa de produto.', b4: 'Aprova a reposição da loja 3 pelo celular.', b5: 'A cliente frequente chega: o CRM a reconhece na hora.', b6: 'Ela recebe o desconto, paga e sai feliz.', b7: 'A venda chega ao relatório da dona. 5 estrelas.', b8: 'Várias lojas, uma só visão e clientes que voltam.' }
    },
    world: function (H) {
      var W = '', i, id = H.id;
      W += '<g>'; for (i = 0; i < 26; i++) { var tx = i * 140 - 300, th = 60 + (i * 37) % 70; W += '<rect x="' + tx + '" y="' + (440 - th - 80) + '" width="110" height="' + (th + 80) + '" rx="6" style="fill:var(--far2,#202734)"/>'; } W += '</g>';
      W += '<rect x="-600" y="440" width="4000" height="500" style="fill:var(--gnd,#232831)"/>';
      function shop(x, c, n, emp) {
        var s = '<rect x="' + x + '" y="120" width="460" height="320" style="fill:var(--wall,#1B2029)"/>';
        for (var j = 0; j < 7; j++) s += '<path d="M' + (x - 10 + j * 68.5) + ' 120h68.5v40a34 13 0 0 1-68.5 0z" fill="' + (j % 2 ? '#F4F6F9' : c) + '"/>';
        s += '<rect x="' + (x - 14) + '" y="106" width="488" height="18" rx="7" fill="' + c + '"/>';
        s += '<rect x="' + (x + 30) + '" y="200" width="290" height="170" rx="8" style="fill:var(--win,#2A3445)"/>';
        s += '<rect x="' + (x + 40) + '" y="210" width="270" height="12" rx="3" fill="#8A5E38"/>'; for (var k = 0; k < 5; k++) s += '<rect x="' + (x + 50 + k * 52) + '" y="186" width="34" height="24" rx="3" fill="' + ['#62CE96', '#F2CBA4', '#7AA3F2', '#E8B88A', '#F06A8A'][k] + '"/>';
        s += H.actor(emp);
        s += '<rect x="' + (x + 50) + '" y="330" width="240" height="110" rx="6" fill="#C2955E"/><rect x="' + (x + 42) + '" y="322" width="256" height="12" rx="5" fill="#DDB680"/>';
        s += '<rect x="' + (x + 345) + '" y="240" width="80" height="200" rx="6" fill="#5A3A24"/><circle cx="' + (x + 412) + '" cy="340" r="4" fill="#E2B340"/>';
        s += '<circle cx="' + (x + 385) + '" cy="196" r="22" fill="' + c + '"/><text x="' + (x + 385) + '" y="205" text-anchor="middle" style="font:800 24px Sora,sans-serif;fill:#fff">' + n + '</text>';
        s += '<g id="' + id('lk' + n) + '" opacity="0">' + PIC.chk(x + 300, 300) + '</g>';
        return s;
      }
      W += shop(0, '#D02A23', '1', 'empA') + shop(560, '#1747A8', '2', 'empB') + shop(1120, '#D02A23', '3', 'empC');
      W += '<g id="' + id('tabC') + '" opacity="0"><rect x="1300" y="292" width="54" height="34" rx="5" fill="#14171C"/><rect x="1305" y="297" width="44" height="22" rx="3" fill="#F4F6F9"/>' + '<circle cx="1316" cy="306" r="5" fill="#8B6CF0"/><path transform="translate(1336 308) scale(1)" d="M0-5.6l1.6 3.4 3.8.5-2.8 2.6.7 3.7L0 2.8l-3.3 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="#E2B340"/></g>';
      /* oficina */
      W += '<rect x="1700" y="70" width="620" height="370" style="fill:var(--wall2,#232A35)"/>';
      W += '<rect x="1760" y="130" width="150" height="110" rx="10" style="fill:var(--win,#2A3445)"/><path d="M1835 130v110M1760 185h150" stroke="rgba(0,0,0,.25)" stroke-width="5"/>';
      W += '<rect x="2120" y="110" width="140" height="90" rx="6" fill="#F4F6F9"/><path d="M2134 186l30-30 26 18 34-40 22 20" stroke="#F0524A" stroke-width="5" fill="none" stroke-linejoin="round"/>';
      W += H.actor('owner');
      W += '<rect x="1840" y="340" width="320" height="22" rx="6" fill="#8A5E38"/><rect x="1860" y="362" width="16" height="78" fill="#6E4828"/><rect x="2124" y="362" width="16" height="78" fill="#6E4828"/>';
      W += '<g id="' + id('pile') + '">'; for (i = 0; i < 6; i++) W += '<rect x="' + (2060 + (i % 2) * 6) + '" y="' + (330 - i * 7) + '" width="60" height="9" rx="1" fill="' + (i % 2 ? '#FFF8D9' : '#F4F6F9') + '" stroke="#C3C9D4"/>'; W += '</g>';
      W += '<g id="' + id('dash') + '" opacity="0"><rect x="1870" y="270" width="120" height="70" rx="8" fill="#14171C"/><rect x="1878" y="278" width="104" height="54" rx="4" fill="#F4F6F9"/><rect x="1888" y="312" width="12" height="14" fill="#7AA3F2"/><rect x="1906" y="300" width="12" height="26" fill="#4F7FE0"/><rect x="1924" y="292" width="12" height="34" fill="#F0524A"/><rect x="1942" y="304" width="12" height="22" fill="#34B577"/><rect x="1960" y="296" width="12" height="30" fill="#E2B340"/></g>';
      W += '<path id="' + id('net') + '" d="M210 116C600 20 1500 20 2020 210" fill="none" stroke="#34B577" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round" opacity="0"/>';
      W += H.actor('vip');
      function stars(n, c, gid) { var s = '<g id="' + id(gid) + '" opacity="0"><rect x="1386" y="150" width="148" height="40" rx="20" fill="#fff" stroke="rgba(0,0,0,.12)"/>'; for (var j = 0; j < 5; j++) s += '<path transform="translate(' + (1408 + j * 26) + ' 171) scale(1.55)" d="M0-5.6l1.6 3.4 3.8.5-2.8 2.6.7 3.7L0 2.8l-3.3 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="' + (j < n ? c : '#D5DAE2') + '"/>'; return s + '</g>'; }
      W += stars(1, '#F0524A', 'st1') + stars(5, '#E2B340', 'st5');
      W += '<g id="' + id('rainc') + '" opacity="0"><path d="M1912 150a18 18 0 0 1 12-24 24 24 0 0 1 44-6 18 18 0 0 1 30 12 16 16 0 0 1-6 30h-62a18 18 0 0 1-18-12z" fill="#7C8492"/><path class="hs-drop" d="M1936 168v10M1956 168v10M1976 168v10" stroke="#7AA3F2" stroke-width="4" stroke-linecap="round"/></g>';
      W += H.cloud('thO', 2070, 142) + H.cloud('thO2', 2070, 142) + H.cloud('thOA', 410, 232) + H.cloud('thOB', 970, 232) + H.cloud('thA', 250, 112) + H.cloud('thB', 810, 112) + H.cloud('thC', 1370, 112) + H.cloud('thV', 1540, 222);
      return W;
    },
    script: function (a) {
      var tl = a.tl, A = a.A, el = a.el, scr = a.scr;
      function base(t, b) {
        a.reset(t);
        tl.set(el('pile'), { opacity: b ? 0 : 1 }, t); tl.set(el('dash'), { opacity: b ? 1 : 0 }, t);
        tl.set(['lk1', 'lk2', 'lk3', 'tabC', 'net', 'st1', 'st5', 'rainc'].map(el), { opacity: 0 }, t); tl.set(A.vip.g, { opacity: 0 }, t);
      }
      /* ANTES */
      base(0, false);
      a.expr('owner', 'worry', .3); a.think('thO', 'shopsq', .5, 1.4);
      a.cam('sA', 2, .9); tl.set(A.owner.g, { x: 330, y: 520, scale: 1.05 }, 2.4); a.expr('owner', 'neutral', 2.4);
      a.pose('empA', 'reach', 2.7); a.fly('rep', scr('sA', 'C', 230, 280), scr('sA', 'C', 360, 300), 2.8, .6, { nostamp: 1, arc: 40 });
      a.think('thOA', 'paper', 3.3, .7); a.expr('owner', 'worry', 3.3);
      a.cam('sB', 4, .9); tl.set(A.owner.g, { x: 890, y: 520 }, 4.4); a.pose('empB', 'reach', 4.6);
      a.fly('rep', scr('sB', 'C', 790, 280), scr('sB', 'C', 920, 300), 4.7, .6, { nostamp: 1, arc: 40 });
      a.think('thOB', 'tired', 5.2, .8); a.expr('owner', 'worry', 5.2); a.pose('owner', 'head', 5.4);
      a.split('bS', 'cS', 6, 'local', 'local'); a.pose('empC', 'phone', 6.1); a.think('thC', 'stockq', 6.2, .9);
      a.fly('q', scr('cS', 'R', 1350, 215), scr('bS', 'L', 950, 330), 6.4, .9);
      a.pose('owner', 'phone', 7.2); a.expr('owner', 'shock', 7.3); a.think('thOB', 'noknow', 7.4, .6);
      a.unsplit(8); a.cam('vC', 8, .9); tl.to(A.vip.g, { opacity: 1, duration: .3 }, 8.2); a.walk('vip', 1460, 8.2, 1.1); a.expr('vip', 'happy', 8.4);
      a.think('thV', 'vipwant', 8.6, 1.3); a.think('thC', 'who', 9.0, 1.0); a.expr('empC', 'worry', 9.0); a.pose('empC', 'idle', 8.2);
      a.fly('pay', scr('vC', 'C', 1460, 300), scr('vC', 'C', 1320, 250), 10.0, .6, { nostamp: 1, arc: 40 });
      a.fly('no', scr('vC', 'C', 1320, 250), scr('vC', 'C', 1460, 300), 10.6, .6, { hold: .5 });
      a.expr('vip', 'angry', 11.1); a.pose('vip', 'slump', 11.1); a.think('thV', 'angry', 11.2, .8);
      tl.fromTo(el('st1'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4, ease: 'hs-pop', immediateRender: false }, 11.4);
      a.cam('of', 12, .9); tl.set(A.owner.g, { x: 1990, y: 430, scale: 1 }, 12.3); tl.to(A.vip.g, { x: 1800, opacity: 0, duration: 1 }, 12.2);
      a.pose('owner', 'head', 12.5); a.expr('owner', 'sad', 12.5); a.think('thO', 'noknow', 12.6, 1.3);
      a.cam('all', 14, 1.1); tl.fromTo(el('rainc'), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .5, immediateRender: false }, 14.3);
      a.pose('owner', 'slump', 14.2); a.think('thO', 'sad', 14.5, 1.4);
      /* CON HOTCLICK */
      var B = 16;
      base(B, true); a.cam('of', B, .01); a.pose('owner', 'phone', B + .3); a.expr('owner', 'happy', B + .3);
      a.think('thO', 'linked', B + .6, 1.3);
      a.cam('all', B + 2, 1); tl.set(el('net'), { opacity: 1, drawSVG: '0%' }, B + 2.2); tl.to(el('net'), { drawSVG: '100%', duration: 1, ease: 'power2.out' }, B + 2.2);
      a.pop('lk1', B + 2.6); a.pop('lk2', B + 2.8); a.pop('lk3', B + 3.0);
      a.fly('rep', scr('all', 'C', 230, 260), scr('all', 'C', 2020, 300), B + 2.6, 1.0, { nostamp: 1 });
      a.fly('rep', scr('all', 'C', 790, 260), scr('all', 'C', 2020, 300), B + 2.8, .9, { nostamp: 1 });
      a.fly('rep', scr('all', 'C', 1350, 260), scr('all', 'C', 2020, 300), B + 3.0, .8);
      a.cam('of', B + 4, .9); a.expr('owner', 'joy', B + 4.2); a.think('thO', 'reports', B + 4.2, .9);
      a.think('thO2', 'ia', B + 5.1, .85); a.pose('owner', 'point', B + 5.1);
      a.split('oS', 'cS', B + 6, 'oficina', 'local'); a.pose('owner', 'phone', B + 6.1);
      a.fly('ok', scr('oS', 'L', 2050, 260), scr('cS', 'R', 1340, 230), B + 6.4, .9);
      a.expr('empC', 'joy', B + 7.3); a.think('thC', 'restock', B + 7.4, 1.0); a.pose('empC', 'cheer', B + 7.4);
      a.unsplit(B + 8.5); a.cam('vC', B + 8.5, .9); a.pose('empC', 'idle', B + 8.5);
      tl.to(A.vip.g, { opacity: 1, duration: .3 }, B + 8.6); a.walk('vip', 1460, B + 8.6, 1.1); a.expr('vip', 'happy', B + 8.8); a.pop('tabC', B + 9.6);
      a.think('thC', 'vip', B + 9.7, 1.0); a.pose('empC', 'wave', B + 9.8); a.wave('empC', B + 10.1, 2); a.expr('empC', 'joy', B + 9.8);
      a.expr('vip', 'love', B + 10.6); a.think('thV', 'love', B + 10.7, 1.0);
      a.fly('pay', scr('vC', 'C', 1460, 300), scr('vC', 'C', 1320, 250), B + 11.0, .6, { nostamp: 1, arc: 40 });
      a.fly('ok', scr('vC', 'C', 1320, 250), scr('vC', 'C', 1460, 300), B + 11.6, .6, { hold: .5 });
      a.pose('empC', 'idle', B + 11.6);
      a.split('cS', 'oS', B + 12, 'local', 'oficina');
      a.fly('rep', scr('cS', 'L', 1330, 280), scr('oS', 'R', 2020, 300), B + 12.3, .9);
      tl.fromTo(el('st5'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4, ease: 'hs-pop', immediateRender: false }, B + 12.6);
      a.expr('owner', 'joy', B + 13.2); a.pose('owner', 'cheer', B + 13.2); a.think('thO', 'money', B + 13.3, 1.2);
      a.unsplit(B + 14); a.cam('all', B + 14, 1.1);
      ['empA', 'empB', 'empC', 'owner', 'vip'].forEach(function (n, j) { a.pose(n, 'cheer', B + 14.3 + j * .08); a.expr(n, 'joy', B + 14.3); a.jump(n, B + 14.5 + j * .1, 3); });
    }
  };
})();
