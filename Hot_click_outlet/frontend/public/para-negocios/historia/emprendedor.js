/* Historia del plan Emprendedor: feria + tienda en línea (32 s, 16 pasos) */
(function () {
  var S = window.HCStory; if (!S) return;
  var IC = S.IC;
  S.defs.emprendedor = {
    id: 'emp', voice: 'emprendedor', voiceMarks: [0, 4.3, 7.34, 10.48, 12, 14.06, 16.96, 21.86, 24.5, 29.04, 32, 34.52, 37.9, 40.52, 42.46, 45.06],
    tag: { es: 'Plan Emprendedor · feria y tienda en línea', en: 'Entrepreneur plan · market and online store', pt: 'Plano Empreendedor · feira e loja online' },
    label: { es: 'Historia animada: una vela vendida en la feria y pedida en línea, antes y con HotClick', en: 'Animated story: a candle sold at the market and ordered online, before and with HotClick', pt: 'História animada: uma vela vendida na feira e pedida online, antes e com a HotClick' },
    voiceWords: [[["Sábado",0.0],["en",0.48],["la",0.62],["feria.",0.7],["Te",1.22],["queda",1.58],["una",1.82],["vela",2.02],["y",2.46],["tu",2.64],["tienda",2.82],["en",3.16],["línea",3.28],["dice",3.48],["que",3.76],["hay",3.92],["una.",4.08]],[["Un",4.42],["cliente",4.76],["se",5.24],["la",5.3],["lleva",5.4],["y",5.76],["nadie",6.14],["lo",6.56],["anota.",6.82]],[["En",7.46],["su",7.78],["casa,",7.92],["una",8.32],["clienta",8.6],["ve",9.06],["esa",9.12],["vela",9.36],["en",9.64],["tu",9.7],["tienda",9.78],["en",10.06],["línea.",10.18]],[["Te",10.6],["escribe",10.82],["para",11.2],["pedirla.",11.4]],[["Le",12.12],["decís",12.34],["que",12.66],["sí,",12.84],["que",13.16],["se",13.38],["la",13.5],["guardás.",13.58]],[["Te",14.18],["manda",14.42],["el",14.74],["pago",14.82],["y",15.14],["la",15.4],["vela",16.02],["ya",16.32],["no",16.44],["está.",16.56]],[["Tienes",17.08],["que",17.56],["devolverle",17.66],["la",18.14],["plata.",18.3],["Se",19.34],["enoja",19.82],["y",20.3],["te",20.68],["deja",20.78],["una",21.08],["estrella.",21.24]],[["Perdiste",21.98],["la",22.46],["venta",22.66],["y",23.2],["la",23.56],["confianza.",23.7]],[["Ahora,",24.62],["el",25.2],["mismo",25.42],["sábado",25.76],["con",26.2],["HotClick.",26.42],["Tu",27.1],["puesto",27.36],["y",27.64],["tu",27.84],["tienda",27.9],["están",28.24],["conectados.",28.52]],[["Cobras",29.16],["la",29.78],["vela",29.9],["y",30.26],["la",30.42],["venta",30.56],["viaja",30.9],["sola",31.2],["a",31.5],["tu",31.64],["tienda.",31.76]],[["La",32.12],["tienda",32.48],["la",32.86],["marca",32.98],["agotada",33.16],["al",33.66],["instante.",34.02]],[["La",34.64],["clienta",34.98],["la",35.38],["busca,",35.44],["ve",35.88],["que",36.1],["está",36.22],["agotada",36.4],["y",36.88],["toca",37.06],["«Avísame».",37.3]],[["Te",38.02],["llega",38.42],["el",38.68],["aviso",38.8],["y",39.18],["repones",39.34],["5",39.76],["velas.",40.04]],[["HotClick",40.64],["le",41.3],["avisa",41.46],["que",41.8],["la",41.88],["vela",42.02],["volvió.",42.26]],[["Ella",42.58],["paga",43.06],["en",43.38],["línea",43.48],["y",43.66],["la",43.96],["plata",44.06],["te",44.36],["llega",44.58],["a",44.9],["vos.",45.0]],[["Venta",45.18],["hecha",46.34],["y",46.76],["5",47.0],["estrellas.",47.32],["Todos",48.02],["contentos.",48.38]]],
    beats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24.5, 26.5, 28, 30], len: 32, start: 'fe',
    hud: { l: ['stall', 'cand'], r: ['phone', 'cand'], table: [[0, 1, 1, 'off'], [2.9, 0, 1, 'bad'], [16, 1, 1, 'ok'], [19, 0, 0, 'ok'], [26, 5, 5, 'ok'], [29, 4, 4, 'ok']] },
    mood: [[0, ''], [11.2, 'cold'], [14, 'gloom'], [16, ''], [18.7, 'warm'], [20, ''], [30, 'warm']],
    confetti: [[18.9, 'small'], [30.4, 'big']],
    cardA: IC.note + IC.stall + IC.neq + IC.phone, cardB: IC.stall + IC.link + IC.phone,
    shots: { fe: [950, 290, 1], fec: [1010, 270, 1.3], sel: [985, 235, 1.5], ca: [1850, 290, 1.1], caf: [1860, 270, 1.4], ph: [1510, 260, 1.15], ta: [380, 290, 1.1], fS: [960, 260, .82], cS: [1880, 270, .82], pS: [1510, 270, .9], tS: [390, 270, .82], fS2: [950, 250, .95], cS2: [1880, 255, .95] },
    actors: [
      { n: 'seller', o: { sh: '#D02A23', hair: '#4A2E1C', bun: 1, apron: 1, phone: 1 }, x: 930, y: 400, e: 'happy' },
      { n: 'buyer', o: { sh: '#1747A8', hair: '#1D1E25', skin: '#D9A47A' }, x: 1180, y: 520, s: 1.05 },
      { n: 'client', o: { sh: '#F06A8A', hair: '#B8802F', skin: '#B27B52', phone: 1, pony: 1 }, x: 1850, y: 470 }
    ],
    cap: {
      es: { a1: 'Sábado en la feria. Queda 1 vela, y tu tienda en línea también dice 1.', a2: 'Un cliente se lleva la vela. Venta hecha… y nadie la anota.', a3: 'En su casa, una clienta ve la vela en tu tienda en línea. ¡La quiere!', a4: 'Te escribe para pedirla. Su mensaje vuela hasta tu celular.', a5: 'Le respondés que sí y te la guardás. Ella espera tranquila.', a6: 'Te manda el pago… buscás la vela y ya no está.', a7: 'Tenés que rechazar el pedido y devolver la plata. La clienta se enoja y te deja 1 estrella.', a8: 'Un mal día: perdiste la venta y la confianza.', b1: 'Mismo sábado. Con HotClick, el puesto y la tienda en línea están conectados.', b2: 'Cobrás la vela con HotClick y la venta viaja sola a tu tienda.', b3: 'Tu tienda en línea la marca agotada al instante.', b4: 'La clienta pide la vela: HotClick le responde que está agotada y ella toca «Avisame».', b5: 'En tu taller te llega el aviso y reponés 5 velas.', b6: 'HotClick le avisa a la clienta que la vela volvió.', b7: 'Ella paga en línea, el pago se aprueba y la plata llega a vos.', b8: 'Venta hecha y 5 estrellas. Todos contentos.' },
      en: { a1: 'Saturday at the market. 1 candle left, and your online store also says 1.', a2: 'A customer takes the candle. Sale made… and nobody writes it down.', a3: 'At home, a customer sees the candle in your online store. She wants it!', a4: 'She writes to ask for it. Her message flies to your phone.', a5: 'You say yes and save it for her. She waits calmly.', a6: 'She sends the payment… you look for the candle and it\'s gone.', a7: 'You must reject the order and refund the money. She gets angry and leaves 1 star.', a8: 'A bad day: you lost the sale and the trust.', b1: 'Same Saturday. With HotClick, the stall and the online store are connected.', b2: 'You charge with HotClick and the sale travels to your store on its own.', b3: 'Your online store marks it sold out instantly.', b4: 'She asks for the candle: HotClick replies it\'s sold out and she taps "Notify me".', b5: 'In your workshop you get the alert and restock 5 candles.', b6: 'HotClick tells her the candle is back.', b7: 'She pays online, the payment is approved and the money reaches you.', b8: 'Sale made and 5 stars. Everyone\'s happy.' },
      pt: { a1: 'Sábado na feira. Resta 1 vela, e sua loja online também diz 1.', a2: 'Um cliente leva a vela. Venda feita… e ninguém anota.', a3: 'Em casa, uma cliente vê a vela na sua loja online. Ela quer!', a4: 'Ela escreve pedindo. A mensagem voa até o seu celular.', a5: 'Você responde que sim e guarda. Ela espera tranquila.', a6: 'Ela manda o pagamento… você procura a vela e ela sumiu.', a7: 'Você precisa recusar o pedido e devolver o dinheiro. Ela fica brava e deixa 1 estrela.', a8: 'Um dia ruim: você perdeu a venda e a confiança.', b1: 'Mesmo sábado. Com a HotClick, a barraca e a loja online estão conectadas.', b2: 'Você cobra com a HotClick e a venda viaja sozinha para a loja.', b3: 'Sua loja online marca como esgotada na hora.', b4: 'Ela pede a vela: a HotClick responde que está esgotada e ela toca em "Me avise".', b5: 'No seu ateliê chega o aviso e você repõe 5 velas.', b6: 'A HotClick avisa que a vela voltou.', b7: 'Ela paga online, o pagamento é aprovado e o dinheiro chega até você.', b8: 'Venda feita e 5 estrelas. Todo mundo feliz.' }
    },
    world: function (H) {
      var W = '', i, id = H.id;
      W += '<g>'; for (i = 0; i < 26; i++) { var tx = i * 140 - 300, th = 60 + (i * 37) % 70; W += '<rect x="' + tx + '" y="' + (440 - th - 80) + '" width="110" height="' + (th + 80) + '" rx="6" style="fill:var(--far2,#202734)"/>'; if (i % 2) W += '<path d="M' + (tx + 10) + ' ' + (440 - th - 80) + 'l45-34 45 34z" style="fill:var(--far2,#202734)"/>'; } W += '</g>';
      W += '<rect x="-600" y="440" width="4000" height="500" style="fill:var(--gnd,#232831)"/>';
      /* taller */
      W += '<rect x="-60" y="70" width="700" height="370" style="fill:var(--wall,#1B2029)"/><rect x="-60" y="400" width="700" height="40" style="fill:var(--wall2,#232A35)"/>';
      W += '<rect x="40" y="120" width="160" height="120" rx="10" style="fill:var(--win,#2A3445)"/><path d="M120 120v120M40 180h160" stroke="rgba(0,0,0,.25)" stroke-width="5"/>';
      W += '<rect x="290" y="140" width="290" height="12" rx="4" fill="#8A5E38"/><rect x="290" y="216" width="290" height="12" rx="4" fill="#8A5E38"/>';
      for (i = 0; i < 6; i++) W += '<rect x="' + (300 + i * 46) + '" y="100" width="38" height="40" rx="4" fill="#C2955E"/><rect x="' + (316 + i * 46) + '" y="100" width="6" height="40" fill="#F3DDB6"/>';
      for (i = 0; i < 8; i++) W += '<rect x="' + (302 + i * 34) + '" y="182" width="20" height="34" rx="4" fill="' + (i % 2 ? '#F4F6F9' : '#F2CE6B') + '"/>';
      W += '<path d="M380 40V86" stroke="#7C8492" stroke-width="3"/><path d="M356 86h48l-10-22h-28z" fill="#E2B340"/><circle class="hs-lamp" cx="380" cy="110" r="90" fill="' + H.glow + '" opacity=".8"/>';
      W += '<rect x="140" y="330" width="440" height="26" rx="6" fill="#A67C49"/><rect x="160" y="356" width="16" height="84" fill="#8A5E38"/><rect x="544" y="356" width="16" height="84" fill="#8A5E38"/>';
      W += '<rect x="180" y="300" width="70" height="30" rx="6" fill="#7C8492"/><circle class="hs-steam" cx="200" cy="292" r="9" fill="#C3C9D4"/><circle class="hs-steam" cx="226" cy="292" r="8" fill="#C3C9D4"/>';
      for (i = 0; i < 4; i++) W += '<rect x="' + (280 + i * 30) + '" y="300" width="20" height="30" rx="4" fill="#F4F6F9"/>';
      W += '<g id="' + id('rbox') + '" opacity="0"><rect x="420" y="282" width="120" height="48" rx="6" fill="#C2955E"/><rect x="470" y="282" width="20" height="48" fill="#F3DDB6"/></g>';
      for (i = 0; i < 5; i++) W += '<g class="rcand" opacity="0"><rect x="' + (424 + i * 22) + '" y="246" width="16" height="36" rx="4" fill="#F4F6F9"/><rect x="' + (424 + i * 22) + '" y="261" width="16" height="6" fill="#D02A23"/></g>';
      /* feria */
      W += '<path d="M660 90Q900 150 1140 96T1400 100" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>';
      for (i = 0; i < 12; i++) { var lx = 680 + i * 62, ly = 100 + Math.sin(i / 11 * Math.PI) * 30; W += '<circle class="hs-bulb" cx="' + lx + '" cy="' + ly.toFixed(0) + '" r="7" fill="' + (i % 3 ? '#F2CE6B' : '#F0524A') + '"/>'; }
      W += '<rect x="730" y="146" width="12" height="296" rx="4" fill="#5A3A24"/><rect x="1098" y="146" width="12" height="296" rx="4" fill="#5A3A24"/>';
      W += H.actor('seller');
      W += '<g class="hs-awn">'; for (i = 0; i < 6; i++) { var ax = 718 + i * 66; W += '<path d="M' + ax + ' 110h66v42a33 14 0 0 1-66 0z" fill="' + (i % 2 ? '#F4F6F9' : '#D02A23') + '"/>'; } W += '<rect x="712" y="96" width="420" height="18" rx="7" fill="#A81F1A"/></g>';
      W += '<rect x="740" y="330" width="370" height="112" rx="6" fill="#C2955E"/><rect x="728" y="320" width="394" height="14" rx="6" fill="#DDB680"/><rect x="740" y="352" width="370" height="26" fill="#D02A23"/>';
      W += '<rect x="768" y="282" width="32" height="38" rx="7" fill="#62CE96"/><rect x="765" y="275" width="38" height="10" rx="3" fill="#2F9062"/><rect x="814" y="298" width="40" height="22" rx="4" fill="#F2CBA4"/><rect x="860" y="298" width="40" height="22" rx="4" fill="#E8B88A"/>';
      W += '<g id="' + id('note') + '"><path d="M946 300l50-6 4 24-50 6z" fill="#FFF8D9"/><path d="M954 306l34-4M955 313l26-3" stroke="#9AA1AE" stroke-width="2"/></g>';
      W += '<g id="' + id('pos') + '" opacity="0"><rect x="948" y="284" width="48" height="36" rx="7" fill="#14171C"/><rect x="954" y="290" width="36" height="18" rx="3" fill="#D02A23"/><circle id="' + id('posg') + '" cx="972" cy="299" r="24" fill="#F0524A" opacity="0"/></g>';
      W += '<g id="' + id('cand') + '"><circle cx="1050" cy="250" r="40" fill="' + H.glow + '"/><rect x="1036" y="270" width="28" height="50" rx="5" fill="#F4F6F9"/><rect x="1036" y="291" width="28" height="9" fill="#D02A23"/><path class="hs-flame" d="M1050 246c-8 10-8 17 0 21 8-4 8-11 0-21z" fill="#F2CE6B"/></g>';
      W += '<g id="' + id('spot') + '" opacity="0"><ellipse cx="1050" cy="318" rx="22" ry="5" fill="none" stroke="#F0524A" stroke-width="3" stroke-dasharray="5 4"/></g>';
      W += H.actor('buyer');
      for (i = 0; i < 4; i++) W += '<g class="coinF" opacity="0"><circle cx="' + (1030 + i * 24) + '" cy="' + (240 - i * 6) + '" r="15" fill="#E2B340" stroke="#B98E25" stroke-width="3"/><text x="' + (1030 + i * 24) + '" y="' + (246 - i * 6) + '" text-anchor="middle" style="font:800 16px Sora,sans-serif;fill:#14171C">₡</text></g>';
      W += '<path id="' + id('chain') + '" d="M1110 340C1240 330 1330 300 1430 300" fill="none" stroke="#34B577" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12" opacity="0"/>';
      W += '<circle id="' + id('pulse') + '" cx="0" cy="0" r="11" fill="#34B577" opacity="0"/>';
      W += '<g id="' + id('rainc') + '" opacity="0"><path d="M882 160a18 18 0 0 1 12-24 24 24 0 0 1 44-6 18 18 0 0 1 30 12 16 16 0 0 1-6 30h-62a18 18 0 0 1-18-12z" fill="#7C8492"/><path class="hs-drop" d="M906 178v10M926 178v10M946 178v10" stroke="#7AA3F2" stroke-width="4" stroke-linecap="round"/></g>';
      /* tienda en línea */
      W += '<circle cx="1510" cy="260" r="200" fill="' + H.glow + '" opacity=".45"/>';
      W += '<g><rect x="1420" y="96" width="180" height="330" rx="30" style="fill:var(--ph,#0B0D11)"/><rect x="1432" y="110" width="156" height="302" rx="22" fill="#F4F6F9"/>';
      W += '<path d="M1432 132a22 22 0 0 1 22-22h112a22 22 0 0 1 22 22v18h-156z" fill="#D02A23"/><rect x="1446" y="166" width="128" height="140" rx="14" fill="#FFF1D6"/>';
      W += '<rect x="1499" y="214" width="22" height="42" rx="4" fill="#fff" stroke="#D5DAE2"/><rect x="1499" y="230" width="22" height="7" fill="#D02A23"/><path class="hs-flame" d="M1510 194c-6 8-6 13 0 16 6-3 6-8 0-16z" fill="#E2B340"/>';
      W += '<rect x="1454" y="322" width="112" height="10" rx="5" fill="#D5DAE2"/><rect x="1454" y="340" width="76" height="10" rx="5" fill="#E9EDF3"/>';
      [['cnt1', '#fff', '#14171C', '1'], ['cnt0', '#D02A23', '#fff', '0'], ['cnt5', '#34B577', '#fff', '5'], ['cnt4', '#34B577', '#fff', '4']].forEach(function (c, j) { W += '<g id="' + id(c[0]) + '"' + (j ? ' opacity="0"' : '') + '><rect x="1532" y="174" width="34" height="28" rx="14" fill="' + c[1] + '" stroke="#C3C9D4"/><text x="1549" y="195" text-anchor="middle" style="font:700 17px IBM Plex Mono,monospace;fill:' + c[2] + '">' + c[3] + '</text></g>'; });
      W += '<g id="' + id('tban') + '" opacity="0"><rect x="1446" y="166" width="128" height="140" rx="14" fill="rgba(20,23,28,.55)"/><circle cx="1510" cy="236" r="22" fill="none" stroke="#fff" stroke-width="5"/><path d="M1495 221l30 30" stroke="#fff" stroke-width="5"/></g>';
      W += '<g id="' + id('tbell') + '" opacity="0"><rect x="1454" y="362" width="112" height="34" rx="17" fill="#8B6CF0"/><path d="M1502 386v-7a8 8 0 0 1 16 0v7l3 3h-22zM1507 392a3 3 0 0 0 6 0" stroke="#fff" stroke-width="2.6" fill="none"/></g>';
      W += '<g id="' + id('tok') + '" opacity="0"><rect x="1442" y="120" width="136" height="36" rx="12" fill="#34B577"/><path d="M1454 138l6 6 12-12" stroke="#fff" stroke-width="3.4" fill="none"/><path d="M1482 134h80M1482 144h52" stroke="#fff" stroke-width="3" opacity=".8"/></g></g>';
      /* casa */
      W += '<rect x="1660" y="70" width="700" height="370" style="fill:var(--wall,#1B2029)"/><rect x="1660" y="400" width="700" height="40" style="fill:var(--wall2,#232A35)"/>';
      W += '<rect x="1730" y="140" width="170" height="130" rx="10" style="fill:var(--win,#2A3445)"/><path d="M1815 140v130M1730 205h170" stroke="rgba(0,0,0,.25)" stroke-width="5"/><path d="M1720 136h190" stroke="#A81F1A" stroke-width="10" stroke-linecap="round"/>';
      W += '<rect x="1960" y="150" width="90" height="70" rx="6" fill="#62CE96" opacity=".8"/><rect x="1960" y="150" width="90" height="70" rx="6" fill="none" stroke="#8A5E38" stroke-width="6"/>';
      W += '<path d="M2120 440V256" stroke="#5A3A24" stroke-width="6"/><path d="M2092 256h56l-14-42h-28z" fill="#E2B340"/><circle class="hs-lamp" cx="2120" cy="250" r="110" fill="' + H.glow + '"/>';
      W += '<rect x="1700" y="350" width="300" height="70" rx="24" fill="#3F6FD0"/><rect x="1688" y="398" width="324" height="52" rx="18" fill="#1747A8"/>';
      W += '<rect x="2180" y="380" width="40" height="60" rx="6" fill="#C2955E"/><circle cx="2200" cy="360" r="28" fill="#41B07A"/><circle cx="2186" cy="340" r="18" fill="#62CE96"/>';
      W += H.actor('client');
      function stars(n, c, gid) { var s = '<g id="' + id(gid) + '" opacity="0"><rect x="1676" y="130" width="148" height="40" rx="20" fill="#fff" stroke="rgba(0,0,0,.12)"/>'; for (var j = 0; j < 5; j++) s += '<path transform="translate(' + (1698 + j * 26) + ' 151) scale(1.55)" d="M0-5.6l1.6 3.4 3.8.5-2.8 2.6.7 3.7L0 2.8l-3.3 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="' + (j < n ? c : '#D5DAE2') + '"/>'; return s + '</g>'; }
      W += stars(1, '#F0524A', 'st1') + stars(5, '#E2B340', 'st5');
      W += H.cloud('thS', 1010, 112) + H.cloud('thS2', 1010, 112) + H.cloud('thC', 1930, 182) + H.cloud('thC2', 1930, 182) + H.cloud('thT', 440, 132);
      return W;
    },
    script: function (a) {
      var tl = a.tl, A = a.A, el = a.el, scr = a.scr;
      function base(t, b) {
        a.reset(t);
        tl.set(el('cand'), { opacity: 1, y: 0, x: 0, scale: 1 }, t); tl.set(el('note'), { opacity: b ? 0 : 1 }, t); tl.set(el('pos'), { opacity: b ? 1 : 0 }, t); tl.set(el('cnt1'), { opacity: 1 }, t);
        tl.set(['cnt0', 'cnt5', 'cnt4', 'tban', 'tbell', 'tok', 'st1', 'st5', 'rbox', 'rainc', 'spot', 'chain', 'pulse'].map(el).concat(a.all('.rcand'), a.all('.coinF')), { opacity: 0 }, t);
      }
      /* ANTES */
      base(0, false);
      a.think('thS', 'stock1', .5, 1.4);
      a.cam('fec', 2); a.pose('buyer', 'reach', 2.4); a.expr('buyer', 'happy', 2.4);
      tl.to(el('cand'), { x: 120, y: 60, scale: .7, opacity: 0, duration: .9, ease: 'power2.in' }, 2.7);
      tl.to(a.all('.coinF'), { opacity: 1, y: -30, duration: .5, stagger: .12, ease: 'power2.out' }, 2.9); tl.to(a.all('.coinF'), { opacity: 0, y: -60, duration: .4, stagger: .1 }, 3.6);
      a.expr('seller', 'joy', 2.9); a.expr('buyer', 'love', 3.2); a.think('thS', 'coin', 3.0, 1.0);
      a.cam('ca', 4); tl.to(A.buyer.g, { x: 1320, opacity: 0, duration: 1 }, 4.2);
      a.pose('client', 'phone', 4.3); a.expr('client', 'happy', 4.4); a.think('thC', 'want', 4.6, 1.4);
      a.split('fS', 'cS', 6, 'feria', 'casa'); a.pose('seller', 'phone', 6.4); a.expr('seller', 'neutral', 6.4);
      a.fly('q', scr('cS', 'R', 1935, 285), scr('fS', 'L', 1015, 215), 6.6, 1.0);
      a.ring(A.seller.pglow, 7.6); a.expr('seller', 'happy', 7.7);
      a.fly('ok', scr('fS', 'L', 1015, 215), scr('cS', 'R', 1935, 285), 8.1, .9); a.think('thS', 'yes', 8.1, 1.8);
      a.expr('client', 'joy', 9.0); a.think('thC', 'wait', 9.1, .9);
      a.fly('pay', scr('cS', 'R', 1935, 285), scr('fS', 'L', 1015, 215), 10.0, .8, { hold: .6 });
      a.unsplit(10.8); a.cam('sel', 10.8, .8);
      a.pose('seller', 'point', 11.0, .3); a.show('spot', 11.1); a.arrow(scr('sel', 'C', 1050, 250), 11.1, .9);
      a.expr('seller', 'shock', 11.2); a.pose('seller', 'head', 11.45, .25); a.shake(11.25); a.think('thS2', 'where', 11.3, .7);
      a.show('spot', 12, 0); a.split('fS', 'cS', 12, 'feria', 'casa'); a.pose('seller', 'phone', 12.1); a.expr('seller', 'worry', 12.1);
      a.fly('no', scr('fS', 'L', 1015, 215), scr('cS', 'R', 1935, 285), 12.2, .9);
      a.fly('pay', scr('fS', 'L', 1015, 240), scr('cS', 'R', 1935, 300), 12.5, .9, { nostamp: 1, arc: 60 });
      a.expr('client', 'angry', 13.1); a.pose('client', 'slump', 13.1); a.think('thC2', 'angry', 13.2, .8);
      tl.fromTo(el('st1'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4, ease: 'hs-pop', immediateRender: false }, 13.4);
      a.camSplit('fS2', 'cS2', 14);
      tl.fromTo(el('rainc'), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .5, immediateRender: false }, 14.3);
      a.expr('seller', 'sad', 14.2); a.pose('seller', 'slump', 14.2); a.think('thS', 'sad', 14.5, 1.4);
      /* CON HOTCLICK */
      var B = 16;
      base(B, true); a.cam('fe', B, .01);
      tl.set(el('chain'), { opacity: 1, drawSVG: '0%' }, B + .3); tl.to(el('chain'), { drawSVG: '100%', duration: 1, ease: 'power2.out' }, B + .3);
      a.think('thS', 'linked', B + .6, 1.3);
      a.cam('fec', B + 2); a.pose('buyer', 'reach', B + 2.3); a.expr('buyer', 'happy', B + 2.3);
      a.ring(el('posg'), B + 2.6); tl.to(el('cand'), { x: 120, y: 60, scale: .7, opacity: 0, duration: .9, ease: 'power2.in' }, B + 2.6); a.flash(B + 2.7);
      tl.to(a.all('.coinF'), { opacity: 1, y: -30, duration: .5, stagger: .12, ease: 'power2.out' }, B + 2.8); tl.to(a.all('.coinF'), { opacity: 0, y: -60, duration: .4, stagger: .1 }, B + 3.5);
      a.expr('seller', 'joy', B + 2.8); a.pose('seller', 'cheer', B + 2.8); a.expr('buyer', 'love', B + 3.0);
      tl.set(el('pulse'), { opacity: 1 }, B + 3.0);
      tl.to(el('pulse'), { motionPath: { path: el('chain'), align: el('chain'), alignOrigin: [.5, .5] }, duration: .9, ease: 'power1.inOut', immediateRender: false }, B + 3.0);
      tl.to(el('pulse'), { opacity: 0, duration: .2 }, B + 3.9); a.think('thS2', 'synced', B + 3.1, .85);
      a.cam('ph', B + 4); tl.to(A.buyer.g, { x: 1320, opacity: 0, duration: 1 }, B + 4);
      tl.to(el('cnt1'), { opacity: 0, duration: .15 }, B + 4.6); a.pop('cnt0', B + 4.6); a.arrow(scr('ph', 'C', 1549, 160), B + 4.5, 1.4); a.pop('tban', B + 5.0);
      a.split('pS', 'cS', B + 6, 'tienda', 'casa'); a.pose('client', 'phone', B + 6.2); a.expr('client', 'happy', B + 6.2);
      a.fly('q', scr('cS', 'R', 1935, 285), scr('pS', 'L', 1510, 230), B + 6.4, .8);
      a.fly('ban', scr('pS', 'L', 1510, 230), scr('cS', 'R', 1935, 285), B + 7.3, .7, { hold: .6 }); a.pop('tbell', B + 7.3);
      a.fly('bell', scr('cS', 'R', 1935, 285), scr('pS', 'L', 1510, 379), B + 8.0, .6, { hold: .4 }); a.think('thC', 'bellk', B + 7.6, .9);
      a.unsplit(B + 8.5); a.cam('ta', B + 8.5, .9); tl.to(el('tbell'), { opacity: 0, duration: .2 }, B + 8.5);
      tl.set(A.seller.g, { x: 360, y: 420 }, B + 8.5); tl.set([A.seller.armL, A.seller.armR], { rotation: function (i) { return i ? -6 : 6; } }, B + 8.5); a.expr('seller', 'neutral', B + 8.5);
      a.fly('warn', { x: 980, y: 130 }, scr('ta', 'C', 410, 210), B + 8.8, .8, { arc: 60 }); a.expr('seller', 'worry', B + 9.5);
      a.pop('rbox', B + 9.8); tl.fromTo(a.all('.rcand'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .35, stagger: .1, ease: 'back.out(2)', immediateRender: false }, B + 10.0);
      a.arrow(scr('ta', 'C', 480, 236), B + 9.9, 1.0);
      tl.to(el('cnt0'), { opacity: 0, duration: .15 }, B + 10); a.pop('cnt5', B + 10); tl.to(el('tban'), { opacity: 0, duration: .2 }, B + 10);
      a.expr('seller', 'joy', B + 10.3); a.think('thT', 'restock', B + 9.3, 1.6);
      a.cam('caf', B + 10.5, .9); a.fly('bell', { x: -20, y: 160 }, scr('caf', 'C', 1935, 285), B + 10.9, .8);
      a.ring(A.client.pglow, B + 11.7, 2); a.expr('client', 'love', B + 11.8); a.pose('client', 'phone', B + 11.0);
      a.split('pS', 'cS', B + 12, 'tienda', 'casa');
      a.fly('pay', scr('cS', 'R', 1935, 285), scr('pS', 'L', 1510, 230), B + 12.2, .8, { nostamp: 1 }); a.pop('tok', B + 13.0);
      a.fly('ok', scr('pS', 'L', 1510, 230), scr('cS', 'R', 1935, 285), B + 13.1, .7);
      tl.to(el('cnt5'), { opacity: 0, duration: .15 }, B + 13); a.pop('cnt4', B + 13);
      a.fly('pay', scr('pS', 'L', 1510, 300), { x: -30, y: 300 }, B + 13.4, .55, { nostamp: 1, arc: 40 }); a.expr('client', 'joy', B + 13.8);
      a.split('tS', 'cS2', B + 14, 'taller', 'casa'); a.pop('st5', B + 14.3);
      a.pose('seller', 'cheer', B + 14.4); a.expr('seller', 'joy', B + 14.4); a.jump('seller', B + 14.6, 3);
      a.pose('client', 'cheer', B + 14.4); a.expr('client', 'love', B + 14.4); a.jump('client', B + 14.7, 3);
      a.think('thT', 'money', B + 14.5, 1.4); a.think('thC', 'love', B + 14.6, 1.3);
    }
  };
})();
