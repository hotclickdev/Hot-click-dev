/* Landing /para-negocios: scripts de la página (fuera del HTML por la CSP). */
/* Arte isométrico: se dibuja con cajas; funciona también sin animación */
!function(){
  var C=.866;
  function Sc(){this.it=[];this.x0=1e9;this.x1=-1e9;this.y0=1e9;this.y1=-1e9;}
  var F=Sc.prototype;
  F.xy=function(a,b,c){var X=(a-b)*C,Y=(a+b)*.5-(c||0);if(X<this.x0)this.x0=X;if(X>this.x1)this.x1=X;if(Y<this.y0)this.y0=Y;if(Y>this.y1)this.y1=Y;return [X,Y];};
  F.p=function(a,b,c){var q=this.xy(a,b,c);return q[0].toFixed(1)+','+q[1].toFixed(1);};
  /* caja: posición x,y,z · tamaño w,d,h · color k · clase · orden de pintado */
  F.b=function(x,y,z,w,d,h,k,cls,ord){
    var s=this,a=s.p(x,y+d,z+h),m=s.p(x+w,y+d,z+h),e=s.p(x+w,y,z+h),
        t=[s.p(x,y,z+h),e,m,a].join(' '),
        l=[a,m,s.p(x+w,y+d,z),s.p(x,y+d,z)].join(' '),
        r=[e,m,s.p(x+w,y+d,z),s.p(x+w,y,z)].join(' '),
        key=ord==null?x+y+(w+d)/2+z*.02:ord;
    s.it.push({k:key,s:'<g class="bx '+k+(cls?' '+cls:'')+'"><polygon class="l" points="'+l+'"/><polygon class="r" points="'+r+'"/><polygon class="t" points="'+t+'"/><polyline class="hi" points="'+a+' '+m+' '+e+'"/></g>'});
    return key;
  };
  /* detalle pintado sobre la cara izquierda (plano y=Y), la derecha (plano x=X) o la de arriba (plano z=Z) */
  F.dl=function(x1,x2,z1,z2,Y,cl,key){this.it.push({k:key+.001,s:'<polygon class="dc '+cl+'" points="'+[this.p(x1,Y,z2),this.p(x2,Y,z2),this.p(x2,Y,z1),this.p(x1,Y,z1)].join(' ')+'"/>'});};
  F.dr=function(y1,y2,z1,z2,X,cl,key){this.it.push({k:key+.001,s:'<polygon class="dc '+cl+'" points="'+[this.p(X,y1,z2),this.p(X,y2,z2),this.p(X,y2,z1),this.p(X,y1,z1)].join(' ')+'"/>'});};
  F.flat=function(x,y,z,w,d,cl,key){this.it.push({k:key,s:'<polygon class="'+cl+'" points="'+[this.p(x,y,z),this.p(x+w,y,z),this.p(x+w,y+d,z),this.p(x,y+d,z)].join(' ')+'"/>'});};
  F.dt=function(x1,x2,y1,y2,Z,cl,key){this.flat(x1,y1,Z,x2-x1,y2-y1,'dc '+cl,key+.001);};
  /* persona: figura redondeada con sombra, zapatos, brazos, cara y peinado; cada una sale distinta */
  F.person=function(x,y,z,k,cls,ord,wrap){
    var s=this,n=s.pn=(s.pn||0)+1,q=s.xy(x+2.4,y+2,z),
        SH={bl:['#4A7BDC','#2A56B8'],rd:['#E0382F','#B0241E'],wh:['#EEF1F5','#BCC3CF'],gn:['#4CBF86','#2F9062'],tn:['#D0A26A','#A67C49']}[k]||['#4A7BDC','#2A56B8'],
        sk=['#F2CBA4','#D9A47A','#B27B52','#8E5E3C'][n%4],hr=['#4A2E1C','#1D1E25','#B8802F','#7A2E1C','#2E2F37'][n%5],st=n%4,wave=n%3===0,o='';
    s.x0=Math.min(s.x0,q[0]-8);s.x1=Math.max(s.x1,q[0]+8);s.y0=Math.min(s.y0,q[1]-25);s.y1=Math.max(s.y1,q[1]+3);
    if(st===1) o+='<rect x="-3.7" y="-21.7" width="7.4" height="8.8" rx="3.5" fill="'+hr+'"/>';
    o+='<rect class="o" x="-2.5" y="-7.4" width="2.2" height="6.6" rx=".9" fill="#4C5E88"/><rect class="o" x=".3" y="-7.4" width="2.2" height="6.6" rx=".9" fill="#3A4A72"/>';
    o+='<rect class="o" x="-3.2" y="-1.6" width="3" height="1.6" rx=".8" fill="#F4F6F9"/><rect class="o" x="-.2" y="-1.6" width="3" height="1.6" rx=".8" fill="#D5DAE2"/>';
    o+=wave?'<line x1="3.2" y1="-13" x2="6.2" y2="-17.6" stroke="'+SH[1]+'" stroke-width="2"/><circle cx="6.5" cy="-18.3" r="1.1" fill="'+sk+'"/>'
           :'<line x1="3.3" y1="-13" x2="4.4" y2="-8.6" stroke="'+SH[1]+'" stroke-width="2"/><circle cx="4.5" cy="-7.8" r="1.05" fill="'+sk+'"/>';
    o+='<rect class="o" x="-3.3" y="-14.6" width="6.6" height="8.2" rx="2.3" fill="'+SH[0]+'"/><path d="M.9-14.6H1a2.3 2.3 0 0 1 2.3 2.3v3.6A2.3 2.3 0 0 1 1-6.4H.9z" fill="'+SH[1]+'"/>';
    o+='<line x1="-3.3" y1="-13" x2="-4.4" y2="-8.6" stroke="'+SH[0]+'" stroke-width="2"/><circle cx="-4.5" cy="-7.8" r="1.05" fill="'+sk+'"/>';
    o+='<rect x="-.9" y="-15.7" width="1.8" height="1.7" fill="'+sk+'"/><circle class="o" cx="0" cy="-18.3" r="3.3" fill="'+sk+'"/>';
    o+='<path d="M-3.45-18.4a3.45 3.45 0 0 1 6.9 0c-.9-1-1.9-1.5-3-1.5-1.6 0-3 .5-3.9 1.5z" fill="'+hr+'"/>';
    if(st===2) o+='<circle cx="0" cy="-22.2" r="1.5" fill="'+hr+'"/>';
    if(st===3) o+='<circle cx="-2.6" cy="-20.3" r="1.4" fill="'+hr+'"/><circle cx="-.9" cy="-21.5" r="1.4" fill="'+hr+'"/><circle cx="1" cy="-21.5" r="1.4" fill="'+hr+'"/><circle cx="2.6" cy="-20.3" r="1.4" fill="'+hr+'"/>';
    o+='<circle cx="-1.7" cy="-17.9" r=".46" fill="#1D1E25"/><circle cx=".5" cy="-17.9" r=".46" fill="#1D1E25"/>';
    if(!s.lo) o+='<circle cx="-2.3" cy="-16.8" r=".6" fill="#E8756B" opacity=".45"/><circle cx="1.3" cy="-16.8" r=".6" fill="#E8756B" opacity=".45"/><path d="M-1.5-16.6q.9.8 1.8 0" fill="none" stroke="#7A2E1C" stroke-width=".36"/>';
    s.it.push({k:ord,s:'<g transform="translate('+q[0].toFixed(1)+' '+q[1].toFixed(1)+')">'+(wrap?'<g '+wrap+'>':'')+'<ellipse class="sc-sh" cx="0" cy="0" rx="5.2" ry="2.5"/><g class="hm'+(cls?' '+cls:'')+'">'+o+'</g>'+(wrap?'</g>':'')+'</g>'});
  };
  F.raw=function(s,key){this.it.push({k:key,s:s});};
  F.tx=function(a,b,c,str,cls,up){var q=this.xy(a,b,c);this.x0=Math.min(this.x0,q[0]-62);this.x1=Math.max(this.x1,q[0]+62);this.y1=Math.max(this.y1,q[1]+6);this.y0=Math.min(this.y0,q[1]-(up||10));this.raw('<text class="'+cls+'" x="'+q[0].toFixed(1)+'" y="'+q[1].toFixed(1)+'" text-anchor="middle">'+str+'</text>',9999);};
  F.out=function(style){
    this.it.sort(function(a,b){return a.k-b.k;});
    var pad=10,vb=[Math.floor(this.x0-pad),Math.floor(this.y0-pad),Math.ceil(this.x1-this.x0+2*pad),Math.ceil(this.y1-this.y0+2*pad)].join(' ');
    return '<svg viewBox="'+vb+'" xmlns="http://www.w3.org/2000/svg"'+(style?' style="'+style+'"':'')+'>'+this.it.map(function(i,n,a){return '<g class="pc" style="--o:'+(a.length>1?n/(a.length-1):0).toFixed(2)+'">'+i.s+'</g>';}).join('')+'</svg>';
  };
  function toldo(s,x,y,z,n,w,d,ord,cls){for(var i=0;i<n;i++)s.b(x+i*w,y,z,w,d,2.5,i%2?'wh':'rd',(cls||'a-flap')+(i%2?' a-f1':''),ord+i*.1);}
  /* Globos e íconos flotantes (historias y escenas vivas) */
  function badge(s,x,y,z,kind,cls,sty,txt,key){
    var q=s.xy(x,y,z),g='';
    s.x0=Math.min(s.x0,q[0]-18);s.x1=Math.max(s.x1,q[0]+18);s.y0=Math.min(s.y0,q[1]-16);s.y1=Math.max(s.y1,q[1]+14);
    switch(kind){
      case 'x': g='<circle r="8.5" class="b-rd"/><path d="M-3.2-3.2l6.4 6.4M3.2-3.2l-6.4 6.4" class="b-lw"/>';break;
      case 'ok': g='<circle r="8.5" class="b-gn"/><path d="M-3.8.2l2.6 2.6 5-5.4" class="b-lw"/>';break;
      case 'q': g='<circle r="8.5" class="b-am"/><text class="b-t" y="4.3">?</text>';break;
      case 'warn': g='<path d="M0-9.5L9.5 7H-9.5z" class="b-am" stroke="#E2B340" stroke-width="2" stroke-linejoin="round"/><text class="b-t" y="5.4">!</text>';break;
      case 'ban': g='<circle r="8.5" class="b-gy"/><circle r="4.3" class="b-lw"/><path d="M-3-3l6 6" class="b-lw"/>';break;
      case 'star': g='<circle r="8.5" class="b-am"/><path d="M0-5l1.5 3 3.3.4-2.4 2.3.6 3.3L0 2.4l-3 1.6.6-3.3-2.4-2.3 3.3-.4z" class="b-fw"/>';break;
      case 'coin': g='<circle r="6" class="b-gn"/><text class="b-t s" y="2.9">₡</text>';break;
      case 'chat': g='<path d="M-13-9h26a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H-6l-5 5v-5h-2a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" class="b-wh"/><path d="M-8-3h16M-8 1.5h9" class="b-lg"/>';break;
      case 'chatok': g='<path d="M-13-9h26a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-2v5l-5-5h-19a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" class="b-gn"/><path d="M-5-2.4l2.6 2.6 5-5" class="b-lw"/>';break;
      case 'ia': g='<path d="M-15-9h30a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H-5l-5 5v-5h-5a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" class="b-bl"/><path d="M-8-5l1.3 3 3 1.3-3 1.3L-8 3.6l-1.3-3-3-1.3 3-1.3zM2-3h9M2 1.5h6" class="b-lw" stroke-width="1.6"/>';break;
      case 'num': g='<rect x="-14" y="-10" width="28" height="20" rx="7" class="b-wh"/><text class="b-n" y="4.2">'+txt+'</text>';break;
      case 'numr': g='<rect x="-14" y="-10" width="28" height="20" rx="7" class="b-rd"/><text class="b-nw" y="4.2">'+txt+'</text>';break;
      case 'numg': g='<rect x="-16" y="-10" width="32" height="20" rx="7" class="b-gn"/><text class="b-nw" y="4.2">'+txt+'</text>';break;
      case 'paper': g='<rect x="-4.5" y="-6" width="9" height="12" rx="1.2" class="b-wh"/><path d="M-2.5-2.5h5M-2.5 1h5M-2.5 3.5h3" class="b-lg" stroke-width="1.1"/>';break;
      case 'ring': g='<circle r="8.5" class="b-rd"/><path d="M-4-3.6c0 4.4 3.2 7.6 7.6 7.6l1.2-2.2-2.4-1.5-1.1 1.1c-1.5-.7-2.7-1.9-3.4-3.4l1.1-1.1-1.5-2.4z" class="b-fw"/>';break;
      case 'dot': g='<circle r="3.6" class="b-rd"/>';break;
      case 'dotb': g='<circle r="3.6" class="b-bl"/>';break;
      case 'bars': g='<rect x="-12" y="-14" width="30" height="22" rx="4" class="b-wh"/><rect class="k-grow t5 lb" x="-8" y="-4" width="5" height="8" fill="#7AA3F2"/><rect class="k-grow t5 lb" x="0" y="-8" width="5" height="12" fill="#4F7FE0" style="--d:2.9s"/><rect class="k-grow lb" x="8" y="-11" width="5" height="15" fill="#F0524A" style="--d:3.1s"/>';break;
    }
    s.raw('<g transform="translate('+q[0].toFixed(1)+' '+q[1].toFixed(1)+')"><g class="bi '+(cls||'')+'"'+(sty?' style="'+sty+'"':'')+'>'+g+'</g></g>',key==null?9500:key);
  }
  /* desplazamiento en pantalla entre dos puntos del mundo, para --dx/--dy */
  function mv(s,a,b){var A=s.xy(a[0],a[1],a[2]),B=s.xy(b[0],b[1],b[2]);return '--dx:'+(B[0]-A[0]).toFixed(1)+'px;--dy:'+(B[1]-A[1]).toFixed(1)+'px';}
  /* caja de cartón con cinta */
  function carton(s,x,y,z,w,d,h,ord,cls){
    var k=s.b(x,y,z,w,d,h,'tn',cls,ord),c='dc-tp'+(cls?' '+cls:'');
    s.dt(x+w*.41,x+w*.59,y,y+d,z+h,c,k); s.dl(x+w*.41,x+w*.59,z+h*.5,z+h,y+d,c,k);
    return k;
  }
  /* producto con etiqueta */
  function prod(s,x,y,z,w,d,h,k,cls,ord,lab){
    var q=s.b(x,y,z,w,d,h,k,cls,ord);
    s.dl(x+w*.2,x+w*.8,z+h*.3,z+h*.68,y+d,lab+(cls?' '+cls:''),q);
    return q;
  }

  function caja(s,gx,gy){
    var k;
    s.flat(gx-40,gy-40,0,80,80,'sc-fl',-1000);
    s.person(gx+8,gy-27,0,'bl','bob bob1',-5);
    k=s.b(gx-30,gy-16,0,60,32,16,'dk',0,0); s.dl(gx-30,gx+30,10.5,12.5,gy+16,'dc-rd',k);
    k=s.b(gx-20,gy-10,16,20,15,7,'rd',0,1);
    s.dl(gx-18,gx-2,17.3,19,gy+5,'dc-dk',k); s.dt(gx-18,gx-10,gy-4,gy+3,23,'dc-wh',k); s.dt(gx-8,gx-2,gy-4,gy+3,23,'dc-dk',k);
    s.b(gx-17.5,gy+4,16.9,15,3,2,'dk','a-drw',1.02);
    s.b(gx-7.5,gy-1,23,4,.8,7,'wh','a-rcpt',1.9);
    var cq=s.xy(gx-10,gy,36); s.raw('<circle class="coin2 a-coin" cx="'+cq[0].toFixed(1)+'" cy="'+cq[1].toFixed(1)+'" r="3.6"/>',9000);
    k=s.b(gx-17,gy-10,23,14,2.5,11,'dk',0,2);
    s.dl(gx-15.6,gx-4.4,24.4,32.6,gy-7.5,'dc-sc a-glow',k); s.dl(gx-14,gx-8,29.6,31,gy-7.5,'dc-wh',k+.001); s.dl(gx-14,gx-10,27,28.2,gy-7.5,'dc-wh',k+.001);
    k=s.b(gx+5,gy+4,16,5,8,3,'wh',0,1.5); s.dt(gx+6,gx+9,gy+5,gy+8,19,'dc-sc',k);
    carton(s,gx+15,gy-9,16,9,9,7,1.6);
    s.person(gx+2,gy+24,0,'wh','bob',5);
    s.b(gx+7.2,gy+25.2,2.6,3.2,3.2,4.6,'rd','bob',5.05);
  }
  function estante(s){
    var i,k,x;
    s.flat(-46,-34,0,92,72,'sc-fl',-1000);
    k=s.b(-36,-24,0,72,48,4,'dk',0,3);
    for(i=0;i<4;i++) s.dl(-27+i*17,-20+i*17,1,3,24,'dc-wh',k);
    s.b(-36,-24,4,72,4,76,'dk',0,3.5);
    s.b(-36,-20,4,2,44,76,'dk',0,3.6);
    for(i=0;i<4;i++) carton(s,-30+i*17,7,4,13,13,12,4+i*.1);
    k=s.b(-34,-20,28,70,40,3,'dk',0,10);
    for(i=0;i<5;i++) s.dl(-30+i*13.6,-25+i*13.6,28.6,30.4,20,'dc-wh',k);
    for(i=0;i<5;i++) prod(s,-32+i*13.6,9,31,9.6,10,11,'wh','c'+i,11+i*.1,'dc-rd');
    k=s.b(-34,-20,52,70,40,3,'dk',0,20);
    for(i=0;i<3;i++) s.dl(-24+i*20,-18+i*20,52.6,54.4,20,'dc-wh',k);
    for(i=0;i<3;i++) prod(s,-28+i*20,9,55,14,10,10,i===1?'bl':'rd',i===2?'a-lift':0,21+i*.1,'dc-wh'+(i===2?' a-lift':''));
    if(!s.lo) badge(s,40,-24,92,'warn','a-warnb');
  }
  function celular(s,gx,gy){
    var k,i,x,z,T=[[-16,48,'dc-tn',0],[2,48,'dc-sc',0],[-16,29,'dc-gn',0],[2,29,'dc-rd',1]];
    s.flat(gx-38,gy-30,0,76,70,'sc-fl',-1000);
    s.b(gx-28,gy-10,0,56,20,8,'dk',0,0);
    k=s.b(gx-22,gy-4,8,44,7,72,'bl',0,1);
    s.dl(gx-19,gx+19,12,76,gy+3,'dc-dk',k);
    s.dl(gx-5,gx+5,73,74.4,gy+3,'dc-lt',k+.001);
    s.dl(gx-16,gx+16,66,70.5,gy+3,'dc-rd',k+.001); s.dl(gx-14,gx-4,67.6,69,gy+3,'dc-wh',k+.002);
    for(i=0;i<4;i++){
      x=gx+T[i][0]; z=T[i][1];
      if(T[i][3]) s.dl(x-1,x+15,z-1,z+16,gy+3,'dc-rd',k+.001);
      s.dl(x,x+14,z,z+15,gy+3,'dc-wh',k+.002);
      s.dl(x+3,x+11,z+5.5,z+13,gy+3,T[i][2]+' a-tile a-t'+i,k+.003); s.dl(x+2,x+9,z+1.6,z+3.4,gy+3,'dc-lt',k+.003);
    }
    s.dl(gx-13,gx+13,16,24,gy+3,'dc-sc a-glow',k+.001); s.dl(gx-6,gx+6,19.2,20.8,gy+3,'dc-wh',k+.002);
    s.person(gx+8,gy+22,0,'wh','bob bob2',5);
    if(!s.nonotif) badge(s,gx+16,gy+3,92,'chatok','a-notif');
  }

  var S={
    /* Qué incluye: una pieza por tarjeta */
    s1:function(){var s=new Sc();caja(s,0,0);return s.out();},
    s2:function(){var s=new Sc();estante(s);return s.out();},
    s3:function(){var s=new Sc();celular(s,0,0);return s.out();},
    /* Cobrás en la caja: mostrador con cajera, estante de inventario y celular con la tienda en línea */
    flujo:function(){
      var s=new Sc(); s.lo=1;
      caja(s,-124,124); estante(s); celular(s,124,-124);
      var A=s.xy(-80,80,6),B=s.xy(-46,46,6),A2=s.xy(84,-84,6),B2=s.xy(50,-50,6);
      s.raw('<path class="sc-ln" d="M'+A[0].toFixed(1)+' '+A[1].toFixed(1)+'H'+B[0].toFixed(1)+'M'+A2[0].toFixed(1)+' '+A2[1].toFixed(1)+'H'+B2[0].toFixed(1)+'"/>',-500);
      s.raw('<circle class="pl a" cx="'+A[0].toFixed(1)+'" cy="'+A[1].toFixed(1)+'" r="5" style="--dx:'+(B[0]-A[0]).toFixed(0)+'px"/><circle class="pl b" cx="'+A2[0].toFixed(1)+'" cy="'+A2[1].toFixed(1)+'" r="5" style="--dx:'+(A2[0]-B2[0]).toFixed(0)+'px"/>',9000);
      s.tx(0,0,126,'24','sc-n n24',26); s.tx(0,0,126,'23','sc-n n23',26); s.tx(0,0,126,'22','sc-n n22',26);
      s.tx(-104,144,-30,'Caja','sc-lb'); s.tx(20,20,-34,'Inventario','sc-lb'); s.tx(144,-104,-30,'Tienda en línea','sc-lb');
      return s.out();
    },
    /* Entregas: un objeto por fase (carrito, mesa de empaque, camión, casa) y el paquete que viaja */
    ruta:function(){
      var s=new Sc(),T=[-120,-40,40,120],k,j; s.lo=1;
      T.forEach(function(t,i){
        var x=t,y=-t,o=i*100,kp;
        kp=s.b(x-24,y-24,0,48,48,4,'dk',0,o);
        if(i===0){
          s.person(x-21,y-2,4,'gn','bob',o+.5);
          s.b(x-12,y-6,9,2,2,12,'dk',0,o+1); s.b(x-12,y+4,9,2,2,12,'dk',0,o+1.05); s.b(x-13,y-6,21,2.6,12,2.4,'rd',0,o+1.1);
          s.b(x-12,y-6,7,21,12,2,'dk',0,o+2);
          k=s.b(x-9,y-6,9,18,12,9,'wh',0,o+3);
          for(j=1;j<4;j++){ s.dl(x-9+j*4.5-.35,x-9+j*4.5+.35,9.8,17.2,y+6,'dc-lt',k); if(j<3) s.dr(y-6+j*4-.35,y-6+j*4+.35,9.8,17.2,x+9,'dc-lt',k); }
          s.dl(x-9,x+9,13.2,13.9,y+6,'dc-lt',k);
          s.b(x-5,y-3,18,6,6,4,'bl',0,o+4); carton(s,x+2,y-2,18,5,5,6,o+4.1);
          s.b(x-10,y+4,4,3,2,3,'hr2',0,o+5); s.b(x+5,y+4,4,3,2,3,'hr2',0,o+5.1); s.b(x+6,y-6,4,3,2,3,'hr2',0,o+1.9);
        }else if(i===1){
          s.person(x-2,y-20,4,'rd','bob',o+1);
          s.b(x-14,y-9,4,2,2,8,'dk',0,o+2); s.b(x+12,y-9,4,2,2,8,'dk',0,o+2.01); s.b(x-14,y+7,4,2,2,8,'dk',0,o+2.02); s.b(x+12,y+7,4,2,2,8,'dk',0,o+2.03);
          s.b(x-15,y-10,12,30,20,2,'wh',0,o+2.5);
          k=carton(s,x-8,y-6,14,13,11,8,o+3); s.dl(x-6.5,x-3.5,15.5,19.5,y+5,'dc-wh',k);
          s.b(x+8,y-2,14,4.5,4.5,2.5,'rd',0,o+3.1);
          carton(s,x+10,y+12,4,9,9,7,o+4); carton(s,x-1,y+13,4,8,8,6,o+3.9);
        }else if(i===2){
          s.b(x-18,y-8,6,36,16,2,'dk',0,o+1.5);
          k=s.b(x-18,y-8,8,24,16,15,'wh','a-vib',o+2); s.dl(x-16,x+4,13.5,17,y+8,'dc-rd a-vib',k); s.dl(x-16,x-6,10.5,12,y+8,'dc-lt a-vib',k);
          k=s.b(x+6,y-8,8,11,16,11,'rd','a-vib',o+3);
          s.dr(y-6,y+6,13,17.6,x+17,'dc-sc a-vib',k); s.dl(x+8.5,x+14.5,13,17.6,y+8,'dc-sc a-vib',k);
          s.dr(y-6.5,y-3.5,9.2,11,x+17,'dc-wh a-vib',k); s.dr(y+3.5,y+6.5,9.2,11,x+17,'dc-wh a-vib',k);
          k=s.b(x-13,y+7,3.6,6,2,5.4,'hr2',0,o+4); s.dl(x-11.2,x-8.8,5.2,7.4,y+9,'dc-lt',k);
          k=s.b(x+8,y+7,3.6,6,2,5.4,'hr2',0,o+4.1); s.dl(x+9.8,x+12.2,5.2,7.4,y+9,'dc-lt',k);
          s.person(x-6,y+15,4,'bl','bob bob1',o+5);
        }else{
          s.dt(x-6,x+5,y+12.5,y+17.5,4,'dc-tn',kp);
          k=s.b(x-16,y-14,4,30,26,18,'wh',0,o+1);
          s.dl(x-4,x+3,4,16,y+12,'dc-rd',k); s.dl(x+1.2,x+2.2,9.4,10.6,y+12,'dc-wh',k+.001);
          s.dl(x+6,x+12,10,17,y+12,'dc-sc',k); s.dl(x+8.7,x+9.3,10,17,y+12,'dc-wh',k+.001);
          s.dl(x-13,x-7,10,17,y+12,'dc-sc',k); s.dl(x-10.3,x-9.7,10,17,y+12,'dc-wh',k+.001);
          s.dr(y-8,y,10,17,x+14,'dc-sc',k);
          s.b(x-18,y-16,22,34,30,4,'rd',0,o+2); s.b(x-13,y-11,26,24,20,4,'rd',0,o+2.1);
          s.b(x+3,y-8,30,5,5,7,'wh',0,o+2.2);
          s.person(x-13,y+16,4,'bl','bob bob2',o+3);
        }
      });
      var A=s.xy(-96,144,4),B=s.xy(144,-96,4);
      s.raw('<path class="sc-ln" d="M'+A[0].toFixed(1)+' '+A[1].toFixed(1)+'H'+B[0].toFixed(1)+'"/>',-1);
      carton(s,-108,133,4,9,9,8,1000,'pkg');
      return s.out('--step:138.6px');
    },
    /* ¿Cuál es tu negocio?: puesto de feria, local con toldo, local con bodega */
    feria:function(){
      var s=new Sc(),k; s.lo=1;
      s.b(-32,-28,0,64,58,3,'dk',0,-100);
      s.b(-23,-13,3,2,2,34,'dk',0,1); s.b(21,-13,3,2,2,34,'dk',0,1.1);
      s.person(-3,-22,3,'rd','bob',2);
      k=s.b(-20,-8,3,40,18,12,'dk',0,3); s.dl(-20,20,5,7,10,'dc-rd',k);
      s.b(-21,-9,15,42,20,1.5,'wh',0,4);
      carton(s,-16,-4,16.5,8,8,6,5); prod(s,-5,-4,16.5,7,7,8,'rd',0,5.1,'dc-wh'); prod(s,6,-4,16.5,7,7,6,'bl',0,5.2,'dc-wh'); s.b(15,-3,16.5,4,4,4,'gn',0,5.3);
      s.b(-23,11,3,2,2,34,'dk',0,6); s.b(21,11,3,2,2,34,'dk',0,6.1);
      carton(s,22,14,3,8,8,7,6.5);
      s.person(4,19,3,'bl','bob bob1',7,'class="a-walk"'); s.person(-13,21,3,'wh','bob bob2',7.5);
      toldo(s,-24,-14,37,4,12,28,500);
      badge(s,8,0,40,'coin','a-pop2');
      return s.out();
    },
    local:function(){
      var s=new Sc(),k; s.lo=1;
      s.b(-34,-30,0,68,64,3,'dk',0,-100);
      k=s.b(-26,-24,3,52,38,36,'dk',0,1);
      s.dl(-22,-8,9,22,14,'dc-sc a-glow',k); s.dl(8,22,9,22,14,'dc-sc a-glow a-t1',k); s.dl(-5,5,3,22,14,'dc-dk',k);
      s.dl(-15.4,-14.6,9,22,14,'dc-dk',k+.001); s.dl(14.6,15.4,9,22,14,'dc-dk',k+.001); s.dl(-4,4,12,21,14,'dc-sc',k+.001);
      s.dr(-18,-4,14,26,26,'dc-sc',k);
      k=s.b(-18,14,31,36,2,6,'wh',0,2); s.dl(-13,13,32.6,35.4,16,'dc-rd',k);
      toldo(s,-26,14,24,4,13,9,3);
      s.b(-31,20,3,5,5,5,'tn',0,4); s.b(-31.5,19.5,8,6,6,7,'gn',0,4.1);
      s.person(12,25,3,'wh','bob',5,'class="a-walk"'); s.person(-12,26,3,'rd','bob bob2',5.1,'class="a-walk a-w1"');
      return s.out();
    },
    bodega:function(){
      var s=new Sc(),k,j; s.lo=1;
      s.b(-52,-40,0,104,86,3,'dk',0,-100);
      k=s.b(-2,-36,3,48,40,28,'dk',0,1); s.dl(8,38,3,24,4,'dc-dk',k);
      for(j=0;j<3;j++) s.dl(8,38,9+j*5,9.7+j*5,4,'dc-jn',k+.001);
      s.b(-2,-36,31,48,40,3,'bl',0,2);
      k=s.b(-48,-8,3,36,28,30,'dk',0,3); s.dl(-44,-34,9,20,20,'dc-sc',k); s.dl(-28,-20,3,20,20,'dc-dk',k); s.dl(-27,-21,10,19,20,'dc-sc',k+.001);
      toldo(s,-48,20,22,3,12,8,4);
      carton(s,10,10,3,10,10,8,5); carton(s,21,10,3,10,10,8,5.1); carton(s,15,10,11,10,10,8,5.2,'a-drop'); s.b(33,10,3,10,10,8,'wh',0,5.3);
      s.person(-30,28,3,'rd','bob',6,'class="a-walk a-w2"'); s.person(24,27,3,'wh','bob bob2',6.1); s.person(41,25,3,'bl','bob bob1',6.2);
      return s.out();
    },
    /* Negocio Plus: local con tres cajas, estanterías, bodega y clientes */
    plus:function(){
      var s=new Sc(),i,r,c,k,cx,cols=['dc-rd','dc-wh','dc-sc','dc-tn'],sh=['wh','rd','tn']; s.lo=1;
      s.b(-80,-58,0,164,118,3,'dk',0,-100);
      for(i=0;i<3;i++){
        k=s.b(-74+i*46,-52,3,40,10,34,'dk',0,1+i*.1);
        for(r=0;r<3;r++){
          s.dl(-72+i*46,-36+i*46,4.6+r*10,5.6+r*10,-42,'dc-jn',k);
          for(c=0;c<4;c++) s.dl(-71+i*46+c*9,-64+i*46+c*9,6+r*10,13+r*10,-42,cols[(r+c+i)%4],k+.001);
        }
      }
      s.person(44,-22,3,'wh','bob bob1',2.9);
      carton(s,54,-30,3,12,12,9,3); carton(s,54,-17,3,12,12,9,3.1); carton(s,54,-24,12,12,12,9,3.2); s.b(68,-28,3,12,12,9,'wh',0,3.3);
      for(i=0;i<3;i++){
        cx=-62+i*40;
        s.person(cx+9,-4,3,'bl',0,10+i);
        k=s.b(cx,6,3,26,12,10,'dk',0,10.3+i); s.dl(cx,cx+26,9.4,10.8,18,'dc-rd',k);
        k=s.b(cx+7,8,13,11,8,6,'rd',0,10.5+i); s.dl(cx+8.5,cx+16.5,14.2,15.6,16,'dc-dk',k);
        s.person(cx+9,27,3,sh[i],'bob bob'+i,10.7+i,'class="a-walk a-w'+i+'"');
        var q=s.xy(cx+12,12,26);
        s.raw('<circle class="coin" cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="4" style="--i:'+i+'"/>',9000);
      }
      s.person(-12,41,3,'bl','bob bob2',12.9); s.person(64,40,3,'rd','bob',13.5);
      return s.out();
    },
    /* HISTORIA Emprendedor: feria + WhatsApp. la = antes, lb = con HotClick */
    stE:function(){
      var s=new Sc(),k; s.lo=1; s.nonotif=1;
      s.b(-32,-28,0,64,58,3,'dk',0,-100);
      s.b(-23,-13,3,2,2,34,'dk',0,1); s.b(21,-13,3,2,2,34,'dk',0,1.1);
      s.person(-3,-22,3,'rd','bob',2);
      k=s.b(-20,-8,3,40,18,12,'dk',0,3); s.dl(-20,20,5,7,10,'dc-rd',k);
      s.b(-21,-9,15,42,20,1.5,'wh',0,4);
      carton(s,-16,-4,16.5,8,8,6,5); prod(s,-5,-4,16.5,7,7,8,'rd',0,5.1,'dc-wh'); s.b(15,-3,16.5,4,4,4,'gn',0,5.3);
      prod(s,5,-3,16.5,6,6,10,'wh','k-gone t2',5.2,'dc-rd k-gone t2');
      s.b(-23,11,3,2,2,34,'dk',0,6); s.b(21,11,3,2,2,34,'dk',0,6.1);
      s.person(4,19,3,'bl','bob bob1',7); s.person(-13,21,3,'wh','bob bob2',7.5);
      toldo(s,-24,-14,37,4,12,28,500);
      celular(s,100,-80);
      badge(s,8,2,34,'coin','k-coin','--d:1s');
      badge(s,118,-77,70,'num','la','','1');
      badge(s,118,-77,70,'num','lb k-out','--e:1.3s','1');
      badge(s,118,-77,70,'numr','lb k-win last','--d:1.35s;--e:99s','0');
      badge(s,80,-77,58,'ban','lb k-pop','--d:1.7s');
      badge(s,70,-82,96,'chat','k-pop','--d:2.1s');
      badge(s,26,-24,60,'chatok','la k-pop','--d:2.8s');
      badge(s,108,-58,34,'x','la k-pop','--d:3.5s');
      badge(s,-3,-22,34,'q','la k-pop','--d:4s');
      badge(s,100,-77,104,'ok','lb k-pop','--d:2.8s');
      badge(s,-3,-22,34,'ok','lb k-pop','--d:3.4s');
      return s.out();
    },
    /* HISTORIA PyME: dos cajas, libreta vs. un solo inventario */
    stP:function(){
      var s=new Sc(),k,i,cols=['dc-rd','dc-wh','dc-sc','dc-tn'];
      s.lo=1;
      s.flat(-74,-74,0,148,140,'sc-fl',-1000);
      /* estante al fondo */
      k=s.b(-72,-70,0,10,62,46,'dk',0,-50);
      for(i=0;i<3;i++) for(var c=0;c<5;c++) s.dr(-66+c*11,-58+c*11,6+i*13,14+i*13,-62,cols[(i+c)%4],k);
      /* cajas: mostrador, registradora, cajera y cliente */
      function mostrador(cx,cy){
        var O=cx+cy;
        s.person(cx+9,cy-9,0,'bl','bob',O-2);
        k=s.b(cx,cy,0,28,12,11,'dk',0,O+20); s.dl(cx,cx+28,7,8.6,cy+12,'dc-rd',k);
        k=s.b(cx+8,cy+2,11,11,8,6,'rd',0,O+20.5); s.dl(cx+9.5,cx+17.5,12.4,13.8,cy+10,'dc-dk',k);
        s.person(cx+10,cy+22,0,'wh','bob bob1',O+40);
      }
      mostrador(-52,8); mostrador(8,-52);
      /* centro: libreta (antes) o pantalla de inventario (después) */
      k=s.b(-14,-14,0,24,18,13,'tn','la',-8);
      s.b(-11,-11,13,16,11,1.2,'wh','la',-7.9);
      s.dt(-9,3,-9,-8.2,14.2,'dc-lt la',-7.9); s.dt(-9,1,-6.5,-5.7,14.2,'dc-lt la',-7.9); s.dt(-9,4,-4,-3.2,14.2,'dc-lt la',-7.9);
      s.b(-4,-4,0,3,3,34,'dk','lb',-8);
      k=s.b(-16,-6,30,30,4,20,'dk','lb',-7.5); s.dl(-14,12,32,48,-2,'dc-sc lb',k);
      /* camión del proveedor */
      (function(x,y){
        var c='k-drive t6';
        s.b(x-18,y-8,0,36,16,3,'dk',c,x+y+10);
        k=s.b(x-18,y-8,3,24,16,15,'wh',c,x+y+11); s.dl(x-16,x+4,8.5,12,y+8,'dc-rd '+c,k);
        k=s.b(x+6,y-8,3,11,16,11,'rd',c,x+y+12); s.dr(y-6,y+6,8,12.6,x+17,'dc-sc '+c,k); s.dl(x+8.5,x+14.5,8,12.6,y+8,'dc-sc '+c,k);
      })(40,36);
      /* antes */
      badge(s,-40,10,30,'coin','k-coin','--d:.3s'); badge(s,20,-50,30,'coin','k-coin','--d:.9s');
      badge(s,-40,10,24,'paper','la k-fly','--d:.5s;--dx:-30px;--dy:-34px');
      badge(s,20,-50,24,'paper','la k-fly','--d:1.1s;--dx:26px;--dy:-38px');
      badge(s,-41,-1,34,'num','la k-pop','--d:1.7s','12?');
      badge(s,19,-61,34,'num','la k-pop','--d:2.1s','9?');
      badge(s,-2,-2,40,'q','la k-pop','--d:2.6s');
      carton(s,14,40,0,9,9,8,60,'la k-pop t7'); carton(s,16,30,0,9,9,8,52,'la k-pop t7');
      badge(s,18,36,24,'q','la k-pop','--d:4.4s');
      /* después */
      var P=[-2,-4,72];
      badge(s,-40,10,22,'dot','lb k-move','--d:.4s;'+mv(s,[-40,10,22],P));
      badge(s,20,-50,22,'dotb','lb k-move','--d:1s;'+mv(s,[20,-50,22],P));
      badge(s,-2,-4,72,'num','lb k-out','--e:1.4s','12');
      badge(s,-2,-4,72,'num','lb k-win','--d:1.45s;--e:2s','11');
      badge(s,-2,-4,72,'num','lb k-win','--d:2.05s;--e:4s','10');
      badge(s,12,-14,72,'warn','lb k-pop','--d:2.4s');
      badge(s,-2,-4,72,'numg','lb k-win last','--d:4.05s;--e:99s','34');
      badge(s,40,36,30,'numg','lb k-pop','--d:3.6s','+24');
      badge(s,-16,8,74,'ok','lb k-pop','--d:4.5s');
      return s.out();
    },
    /* HISTORIA Negocio Plus: varios locales */
    stN:function(){
      var s=new Sc(),X=[-88,-38,12],i,k;
      s.lo=1;
      s.flat(-96,-62,0,140,118,'sc-fl',-1000);
      X.forEach(function(x,j){
        var y=-56,o=x+y;
        k=s.b(x,y,0,30,24,24,'dk',0,o);
        s.dl(x+4,x+13,6,16,y+24,'dc-sc a-glow',k); s.dl(x+17,x+26,0,16,y+24,'dc-dk',k); s.dr(y+5,y+18,8,17,x+30,'dc-sc',k);
        s.b(x-1,y-1,24,32,26,3,j===1?'bl':'rd',0,o+.3);
        toldo(s,x,y+24,18,3,10,7,o+.5,'tl');
      });
      /* antes: la dueña corre de local en local */
      var H=[-6,28,0],S=X.map(function(x){return [x+15,-24,0];});
      var st='';S.forEach(function(p,j){var A=s.xy(H[0]+2.4,H[1]+2,0),B=s.xy(p[0]+2.4,p[1]+2,0);st+='--x'+(j+1)+':'+(B[0]-A[0]).toFixed(1)+'px;--y'+(j+1)+':'+(B[1]-A[1]).toFixed(1)+'px;';});
      s.person(H[0],H[1],0,'rd','bob',200,'class="la k-run" style="'+st+'"');
      badge(s,-6,28,30,'ring','la k-ring','--d:.1s');
      badge(s,X[0]+15,-44,42,'q','la k-pop','--d:1s'); badge(s,X[1]+15,-44,42,'q','la k-pop','--d:2.3s'); badge(s,X[2]+15,-44,42,'q','la k-pop','--d:3.6s');
      /* después: todo llega al celular de la dueña */
      s.person(-6,28,0,'rd','bob',200,'class="lb"');
      k=s.b(-2,30,10,5,1.4,8,'bl','lb',201);
      S.forEach(function(p,j){badge(s,p[0],p[1],20,j===1?'dotb':'dot','lb k-move','--d:'+(.3+j*.5)+'s;'+mv(s,[p[0],p[1],20],[-4,30,20]));});
      badge(s,20,36,34,'bars','lb k-pop','--d:1.8s');
      s.person(30,6,0,'gn','bob bob1',150,'class="lb k-walk" style="--d:2.3s;'+mv(s,[32.4,8,0],[X[2]+17,-20,0])+'"');
      badge(s,X[2]+15,-44,42,'star','lb k-pop','--d:3.6s');
      badge(s,-24,22,40,'ia','lb k-pop','--d:4s');
      badge(s,-6,28,62,'ok','lb k-pop','--d:4.6s');
      return s.out();
    },
    /* Cómo es la demo: calendario, videollamada y elección de plan */
    demo1:function(){
      var s=new Sc(),k,r,c;
      s.flat(-32,-18,0,70,46,'sc-fl',-1000);
      s.b(-24,-8,0,48,16,4,'dk',0,0);
      k=s.b(-20,-3,4,40,6,32,'wh',0,1);
      for(r=0;r<3;r++)for(c=0;c<5;c++) s.dl(-17+c*7.2,-11.6+c*7.2,7+r*8.5,13+r*8.5,3,(r===1&&c===3)?'dc-rd a-blink':'dc-lt',k);
      k=s.b(-20,-3,36,40,6,7,'rd',0,2); s.dl(-10,10,38.6,40.4,3,'dc-wh',k);
      s.b(-12,-1,43,3,2,4,'dk',0,3); s.b(9,-1,43,3,2,4,'dk',0,3.1);
      s.person(24,12,0,'bl','bob',4);
      return s.out();
    },
    demo2:function(){
      var s=new Sc(),k;
      s.flat(-32,-22,0,64,62,'sc-fl',-1000);
      k=s.b(-24,-13,3,48,3,32,'dk',0,.5);
      s.dl(-21,21,6,32,-10,'dc-sc',k);
      s.dl(-19,-1,9,29,-10,'dc-dk',k+.001); s.dl(1,19,9,29,-10,'dc-dk',k+.001);
      s.dl(-15,-5,10,16,-10,'dc-rd a-talk',k+.002); s.dl(-13,-7,17,23,-10,'dc-sk',k+.002); s.dl(-13,-7,23,24.6,-10,'dc-hr',k+.002);
      s.dl(5,15,10,16,-10,'dc-wh a-talk a-k1',k+.002); s.dl(7,13,17,23,-10,'dc-sk',k+.002); s.dl(7,13,23,24.6,-10,'dc-hr',k+.002);
      k=s.b(-24,-10,0,48,26,3,'dk',0,1);
      s.dt(-20,20,-6,6,3,'dc-jn',k); s.dt(-7,7,9,14,3,'dc-jn',k);
      s.person(-2,22,0,'rd','bob',3);
      return s.out();
    },
    demo3:function(){
      var s=new Sc();
      s.flat(-36,-16,0,72,46,'sc-fl',-1000);
      s.b(-28,-8,0,56,16,3,'dk',0,0);
      s.b(-24,-3,3,13,6,20,'wh','a-grow',1); s.b(-7,-3,3,13,6,30,'rd','a-grow a-g1',1.1); s.b(10,-3,3,13,6,40,'bl','a-grow a-g2',1.2);
      s.raw('<polyline class="sc-ck" points="'+[s.p(-4,3,19),s.p(-1,3,14),s.p(4,3,25)].join(' ')+'"/>',1.15);
      badge(s,16,0,58,'ok','a-pop2');
      s.person(2,14,0,'wh','bob',2);
      return s.out();
    }
  };
  [].forEach.call(document.querySelectorAll('[data-scene]'),function(el){var f=S[el.getAttribute('data-scene')];if(f)el.innerHTML=f();});
  /* Sin movimiento: cada historia se muestra quieta, primero el antes y después la solución */
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){
    [].forEach.call(document.querySelectorAll('.story'),function(st){
      st.classList.add('still'); st.setAttribute('data-s','a');
      var c=st.cloneNode(true); c.setAttribute('data-s','b'); st.parentNode.insertBefore(c,st.nextSibling);
    });
  }
}();;
/* Tema e idioma */
!function(){
  var root=document.documentElement;
  var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

  /* Tema claro / oscuro */
  var btn=document.getElementById('mode');
  function theme(t){root.setAttribute('data-theme',t);btn.setAttribute('aria-pressed',String(t==='light'));}
  theme(store.get('hc-theme')||(root.getAttribute('data-theme')==='light'?'light':'dark'));
  btn.addEventListener('click',function(){var t=root.getAttribute('data-theme')==='light'?'dark':'light';theme(t);store.set('hc-theme',t);});

  /* Rubro: cambia los productos de la caja de ejemplo del hero */
  (function(){
    var R={ropa:['Camiseta algodón M','Gorra bordada','Jeans azul talla 32'],tec:['Cable USB-C 1 m','Protector de pantalla','Audífonos inalámbricos'],ferre:['Martillo 16 oz','Caja de tornillos','Cinta métrica 5 m'],arte:['Jabón artesanal de avena','Vela de soya 200 g','Pulsera tejida']};
    var names=[].slice.call(document.querySelectorAll('.hero-vis .sale-row > span:first-child')),inv=document.querySelector('.hero-vis .invline span:nth-child(2)'),chips=[].slice.call(document.querySelectorAll('.rubro .chip'));
    names.forEach(function(e){e.setAttribute('data-noi18n','');}); if(inv) inv.setAttribute('data-noi18n','');
    function set(r){var p=R[r];if(!p)return;names.forEach(function(e,i){if(p[i])e.firstChild.nodeValue=p[i];var sm=e.querySelector('small');if(sm)sm.textContent=i?'x1':'x2';});if(inv)inv.textContent=p[0];chips.forEach(function(c){var on=c.getAttribute('data-rubro')===r;c.classList.toggle('on',on);c.setAttribute('aria-pressed',String(on));});}
    chips.forEach(function(c){c.addEventListener('click',function(){set(c.getAttribute('data-rubro'));});});
  })();

  /* Idioma: el español es el texto de la página; las traducciones van por posición en ES */
  var ES=["Qué incluye","Entregas","Tu negocio","Cómo es la demo","Preguntas","Agendá una demo","Sistema de ventas para negocios de Costa Rica","Vendé en tu local.","Vendé en línea.","Con un solo inventario.","Caja (POS), inventario, cobros y tienda en línea para negocios de Costa Rica. Te lo mostramos en 30 minutos.","Ver qué incluye","30 minutos · Google Meet · vos elegís día y hora","¿Qué vendés?","Café","Ropa","Ferretería","Artesanía","Caja","Turno abierto · 10:42","Café Tarrazú 340 g","Bombones surtidos","Camiseta algodón M","Total, IVA incluido","Tarjeta","Efectivo","Pago aprobado","Inventario al día","Datos de ejemplo","Todo en un mismo panel","Punto de venta (POS)","Inventario","Reportes de ventas","Tienda en línea","No reemplazamos tu","tienda","ni tus","redes",". Somos un","canal más","para vender.","Tu negocio, un canal más.","Inventario y bodegas","Cobros con SINPE Móvil y tarjeta","Tu tienda en línea","Lo ves funcionando antes de decidir.","Mensualidad en Emprendedor, con comisión por venta","Minutos dura la demo","Planes según tu tamaño","Días de soporte por semana","Qué incluye.","Vender","Vendés","en el mostrador.","Abrís turno, cobrás con lector de código de barras y cerrás caja al final del día.","Punto de venta (POS) · Cierre de caja · Reportes de ventas","Controlar","Sabés","qué te queda.","Existencias por bodega y avisos de stock bajo. En PyME y Negocio Plus, Hot IA responde con tus datos.","Inventario · Bodegas · Hot IA","Crecer","Cobrás y vendés","también en línea.","Tu cliente paga con SINPE Móvil o tarjeta, y tu tienda en línea usa el mismo inventario del local.","SINPE Móvil · Tarjeta · Tienda en línea","Cobrás en la caja,","el inventario baja solo.","Te ayudamos a coordinar","la entrega de tus productos.","Tu cliente elige cómo recibir su pedido y vos lo movés por etapas desde el Sistema.","Retiro o envío","Tu cliente elige retiro en tu local, envío o encomienda, y ve el costo antes de pagar.","Avisos en cada etapa","Cada vez que movés el pedido, tu cliente recibe un correo con el estado.","Seguimiento con un enlace","Tu cliente sigue su pedido sin crear cuenta. Si va por Correos, anotás la guía y le llega.","Recolección en la GAM","Por ahora en la GAM, podés pedirnos que pasemos por el paquete.","30 minutos · sin compromiso","Pedido 1042","Envío normal · GAM","Pagado","SINPE Móvil verificado","En preparación","2 productos","Enviado","Guía anotada","Entregado","Pedido completo","Jueves","Correo al cliente","Aviso enviado","Negocios como el tuyo.","Tiendas de ropa","Pulperías","Cafeterías","Librerías","Ferreterías","Tiendas de mascotas","Regalos y detalles","Belleza y cosmética","Artesanías","Negocios desde casa","Ventas en ferias","Zapaterías","Bazares","Tiendas de tecnología","Productos naturales","Jugueterías","Decoración","Repostería","Tiendas deportivas","Emprendimientos","¿Cuál es tu negocio?","Mirá cuál se parece más al tuyo. En la demo lo vemos juntos.","Vendo desde la casa o en ferias","Plan Emprendedor · ₡0 al mes","Pymes en crecimiento","Tengo local y equipo","Plan PyME · ₡12.900 al mes","Operación completa","Varias cajas y mucho producto","Plan Negocio Plus · ₡28.900 al mes","Ordená lo que vendés","desde el primer día.","Vendés desde la casa, en ferias o por mensajes, y llevás las cuentas en un cuaderno o en el chat.","Cobrá sin enredos","Cobrás con SINPE Móvil, tarjeta o efectivo desde la misma caja.","Sabé qué te queda","Cada venta descuenta el inventario y te enterás antes de quedarte sin producto.","Tus productos quedan publicados y te compran también cuando no estás atendiendo.","Tus números claros","Reportes de ventas para saber qué se mueve, sin sumar a mano.","₡0 al mes · 9 % por venta","Hasta 50 productos · 2 usuarios · 1 bodega · 1 caja","Feria del sábado","Jabón artesanal de avena","Vela de soya 200 g","Dos cajas,","un solo inventario.","Tenés local, un par de empleados y proveedores fijos, y ya no alcanza con una libreta ni un chat.","Más manos, mismo orden","Hasta 5 usuarios, 2 bodegas y 2 cajas trabajando sobre un mismo inventario.","Compras sin papelitos","Registrás lo que le comprás a tus proveedores y tu inventario se actualiza.","Gift cards propias","Tus clientes pueden regalar saldo para gastar en tu negocio.","Hot IA a tu lado","Hot IA responde con los datos de tu negocio e incluye 80 créditos.","₡12.900 al mes · 7,5 % por venta","Hasta 500 productos · 5 usuarios · 2 bodegas · 2 cajas","2 bodegas","Producto","Local","Bodega","Stock bajo","Compra a proveedor","+24 unidades","Sin topes.","Conocé a tus clientes.","Tenés equipo, varias cajas, mucho producto y clientes que vuelven. Necesitás un Sistema que no te frene.","Sin límites","Productos, bodegas, cajas y usuarios sin tope, aunque el negocio siga creciendo.","Clientes a la mano","El CRM junta los datos de tus clientes en un solo lugar.","Hot IA sin límite","Consultá a Hot IA cuantas veces quieras, con los datos de tu negocio.","Todo lo de PyME","Compras a proveedores, gift cards y reportes, igual que en PyME.","₡28.900 al mes · 6 % por venta","Productos, bodegas, cajas y usuarios sin límite","Clientes","Última compra: ayer","Última compra: hace 6 días","Última compra: hace 2 semanas","¿Quién compró más este mes?","María Rojas, con ₡184.000 en 5 compras.","Los tres planes, juntos.","Emprendedor","Mensualidad","Comisión por venta","Productos","Sin límite","Usuarios","Bodegas","Cajas (POS)","Sí","Compras a proveedores","CRM de clientes","80 créditos","Precios en colones · La comisión se cobra solo cuando hay una venta","Cómo es la demo.","Hoy","Reservás un espacio","Elegís día y hora. Te llega la invitación con el enlace de Google Meet.","30 minutos","Lo ves en vivo","Hacemos una venta, movemos inventario y cobramos, con productos como los tuyos.","Después","Decidís con calma","Te decimos qué plan te calza. Si querés seguir, te ayudamos a abrir la cuenta.","Preguntas frecuentes.","¿La demostración tiene costo?","No cuesta nada. Son 30 minutos, sin compromiso. Agendá abajo.","¿Tengo que dejar de vender por mis redes o mi local?","No. HotClick es un canal más para tu negocio. Seguís vendiendo donde ya vendés.","¿Cómo recibo la plata de mis ventas?","Te liquidamos tus ventas cada quincena o cada mes, según lo que elijas.","¿Qué necesito para usarlo?","Un celular o una computadora con internet. Funciona desde el navegador.","Tengo muchos productos. ¿Hay que digitarlos uno por uno?","No. Podés cargar tu catálogo desde un PDF o un enlace. También tenemos un servicio que va a tu local y digitaliza el inventario.","¿Con quién voy a hablar?","Con una persona del equipo de HotClick en Costa Rica, de lunes a sábado.","Elegí un día.","Te mostramos el Sistema con tu negocio.","Demo del Sistema","Duración","Lugar","Zona horaria","Tu nombre","Correo","Nombre del negocio","Plan que te interesa","Atrás","Confirmar","Reunión agendada","Te enviamos la invitación de calendario con el enlace de Google Meet al correo que nos dejaste.","Prototipo visual: esta reserva todavía no se guarda ni se envía.","Elegir otro espacio","¿Preferís escribirnos?","· Lunes a sábado, 8:00 a 19:00","Escribir por WhatsApp","Tu negocio, un canal más · © 2026","Pausar animaciones","Reanudar animaciones","Demo de 30 minutos por Google Meet","HotClick para negocios, inicio","Secciones","Idioma","Modo claro u oscuro","Ejemplo de la caja del Sistema HotClick","Una venta en la caja o en la tienda en línea descuenta el mismo inventario","Ejemplo de las etapas de un pedido","Ejemplo de una venta en la caja","Ejemplo de inventario en dos bodegas","Ejemplo de clientes y consulta a Hot IA","Mes anterior","Mes siguiente","Redes","Escribinos por WhatsApp y coordinamos tu demo de 30 minutos por Google Meet.","Abrir el calendario en una pestaña nueva","¿Es para mí?","Caja, inventario y tienda en línea para negocios de Costa Rica","Cobrás en tu local con la caja (POS), tus productos quedan publicados en tu tienda en línea y cada venta descuenta el mismo inventario. Te lo mostramos en 30 minutos.","Tecnología","Caja abierta · 10:42","Tu local o tu feria","Cobrás con la caja de HotClick.","Tus redes y WhatsApp","Seguís atendiendo ahí y compartís el enlace de tu tienda.","Te compran aunque no estés atendiendo.","Un solo inventario","Cada venta, venga de donde venga, descuenta del mismo stock.","Cobros","SINPE Móvil, tarjeta o efectivo.","Reportes","Qué se vendió, dónde y cuánto.","Avisos","Te avisamos antes de que se acabe un producto.","No tenés que cambiar cómo vendés hoy. HotClick suma tu tienda en línea y junta todas tus ventas en un mismo lugar.","De mensualidad en el plan Emprendedor*","L a S","Soporte de lunes a sábado, 8:00 a 19:00","*En Emprendedor pagás solo una comisión cuando vendés: 9 % por venta.","Abrís la caja al empezar el día, cobrás escaneando el código de barras o buscando el producto, y al cerrar ves cuánto vendiste.","Lector de código de barras","Ves cuántas unidades tenés en cada bodega y te avisamos cuando un producto está por acabarse.","Avisos de stock bajo","Tu cliente paga con SINPE Móvil o tarjeta. Tus productos quedan publicados en tu tienda en línea, que usa el mismo inventario del local.","En palabras simples","Palabras que vas a ver.","Para que nada te suene raro en la demo ni en los planes.","Caja (POS)","Donde cobrás en tu local. Cada caja es un punto de cobro.","Cada lugar donde guardás producto: el local, la casa o una bodega aparte.","Turno","Abrir la caja al empezar y cerrarla al final, con el resumen del día.","Un asistente al que le preguntás por tu negocio. 1 crédito = 1 pregunta.","El historial de tus clientes: qué compraron, cuándo y cuánto.","Vendés en el local","La caja descuenta 1 unidad: quedan 23.","Te compran en línea","La tienda descuenta otra: quedan 22.","Te avisamos","Cuando quedan pocas, ves el aviso de stock bajo.","Preguntale","cómo va tu negocio.","Hot IA es un asistente que lee las ventas, el inventario y los clientes de tu negocio, y te responde en palabras simples.","1 crédito = 1 pregunta","Cada pregunta que le hacés gasta un crédito.","Cuántas trae cada plan","PyME incluye 80 preguntas al mes. Negocio Plus, sin límite.","No viene en Emprendedor","Hot IA está en los planes PyME y Negocio Plus.","Te lo mostramos en vivo","Plan PyME","Créditos del mes","77 de 80","Vos","¿Qué producto se vendió más esta semana?","Camiseta algodón M: 18 unidades, ₡124.200.","¿Qué se me está por acabar?","Gorra bordada: quedan 3 en el local y 24 en bodega.","¿Cuánto vendí ayer por SINPE Móvil?","₡86.500 en 11 ventas.","Ejemplo de cobro","Vendés ₡20.000","pagás ₡1.800 (9 %)","Vendés ₡5.000","pagás ₡450 (9 %)","Un mes sin ventas","pagás ₡0","Hasta 5 usuarios, 2 bodegas y 2 cajas (puntos de cobro) trabajando sobre un mismo inventario.","Responde con los datos de tu negocio. Incluye 80 créditos al mes: 1 crédito = 1 pregunta.","pagás ₡1.500 (7,5 %)","Mensualidad fija","₡12.900 al mes","₡28.900 al mes","Gorra bordada","Jeans azul talla 32","Tenés equipo, varias cajas, mucho producto y clientes que vuelven. Necesitás un sistema que no te frene.","El CRM es el historial de tus clientes: qué compraron, cuándo y cuánto, en un solo lugar.","Vos elegís quién","entrega tus pedidos.","Cuando abrís tu cuenta te preguntamos cómo querés entregar, y movés cada pedido por etapas desde HotClick.","Lo entregás vos","Tu cliente retira en tu local, o vos lo enviás con tu mensajero, por encomienda o por Correos de Costa Rica.","Lo entregamos nosotros","Pasamos por el paquete a tu negocio. Por ahora solo en la GAM (Gran Área Metropolitana).","Costo claro","Tu cliente ve el costo de envío antes de pagar. Encomienda: paquete enviado por bus o transportista.","Recomendado","No","CRM (historial de clientes)","Hot IA (1 crédito = 1 pregunta)","80 al mes","Precios en colones · La comisión se cobra solo cuando hay una venta · La mensualidad se paga cada mes","¿HotClick es para tu negocio?","Tres preguntas, menos de un minuto. Te decimos qué plan te calza y si podemos trabajar con lo que vendés.","Pregunta 1 de 3","Pregunta 2 de 3","Pregunta 3 de 3","Ropa, zapatos y accesorios","Hogar y decoración","Tecnología y electrónica","Belleza y cuidado personal (sin fines médicos)","Artesanías y regalos","Ferretería y herramientas","Librería y papelería","Accesorios para mascotas","Comida o bebidas","Medicamentos, suplementos o productos de salud","Alcohol, tabaco, vapeadores u otros productos regulados","Otra cosa","¿Dónde vendés hoy?","Desde la casa, en ferias o por redes","En un local","En varios locales o con bodega aparte","¿Cuántas personas venden o cobran?","1 o 2 personas","De 3 a 5 personas","Más de 5 personas","Podemos trabajar con tu negocio","Te calza el plan Emprendedor","₡0 al mes y 9 % por venta. Ideal si vendés desde la casa o en ferias, con 1 o 2 personas.","Te calza el plan PyME","₡12.900 al mes y 7,5 % por venta. Para un local con equipo: 5 usuarios, 2 cajas y 2 bodegas, compras a proveedores y Hot IA.","Te calza el plan Negocio Plus","₡28.900 al mes y 6 % por venta. Sin tope de productos, cajas, bodegas ni usuarios, con CRM y Hot IA sin límite.","Como elegiste «Otra cosa», en la demo confirmamos que podamos procesar lo que vendés.","Agendar una demo","Ir a pagar y abrir mi cuenta","Volver a empezar","Por ahora no podemos","Todavía no procesamos ventas de esta categoría.","Los cobros con tarjeta y SINPE Móvil de HotClick pasan por una pasarela de pago que no acepta algunos productos, como comida, salud o productos regulados. Si tenés dudas sobre tu caso, escribinos.","Respondé las tres para ver tu resultado","¿Hay productos que no aceptan?","Sí. Por ahora no procesamos ventas de comida y bebidas, productos de salud o suplementos, ni productos regulados como alcohol o tabaco. Si no estás seguro, hacé el test de arriba o escribinos.","¿Quién entrega los pedidos?","Vos elegís. Podés entregar vos (retiro en tu local, tu mensajero, encomienda o Correos de Costa Rica) o pedirnos que pasemos por el paquete, por ahora en la GAM.","¿Qué es un crédito de Hot IA?","Cada pregunta que le hacés a Hot IA gasta un crédito. PyME incluye 80 al mes y Negocio Plus no tiene límite.","Te mostramos HotClick con tu negocio.","Ejemplo de la caja de HotClick","Tu local, tus redes y tu tienda en línea venden sobre un solo inventario","Ejemplo de preguntas a Hot IA","Vendés en la feria y por WhatsApp, y llevás la cuenta de memoria. Con HotClick, cada venta se anota sola y tu tienda en línea sabe qué te queda.","Qué trae el plan","Antes","Con HotClick","Feria y WhatsApp","Vendiste en la feria la última vela, pero por WhatsApp ya la habías prometido.","La venta de la feria baja el inventario y tu tienda en línea ya la muestra agotada.","Con dos cajas y una libreta, nadie sabe cuántas unidades quedan de verdad. Con HotClick, las dos cajas venden del mismo inventario y la compra al proveedor lo repone.","Dos cajas, un local","Dos cajas y una libreta: cada cajera cree que quedan unidades distintas.","Las dos cajas descuentan del mismo inventario, te avisa cuando queda poco y la compra al proveedor lo repone.","Con varios locales, saber cómo va cada uno te obliga a llamar o ir en persona. Con HotClick lo ves todo en un mismo panel, sin topes, y reconocés a los clientes que vuelven.","Varios locales","Para saber cómo va cada local tenés que ir de uno en uno o pasar el día al teléfono.","Cada local te manda sus ventas al panel, reconocés a la clienta que vuelve y Hot IA te resume el día.","Una venta en la feria y un pedido por WhatsApp del mismo producto","Dos cajas que venden el mismo producto y un proveedor que trae más","Una dueña con tres locales que ve todo desde su celular","Plan Emprendedor","Plan Negocio Plus","Problema","Solución","Vendés en la feria y por WhatsApp, y llevás la cuenta de memoria.","Con HotClick, cada venta se anota sola y tu tienda en línea sabe qué te queda.","Con dos cajas y una libreta, nadie sabe cuántas unidades quedan de verdad.","Con HotClick, las dos cajas venden del mismo inventario y la compra al proveedor lo repone.","Con varios locales, saber cómo va cada uno te obliga a llamar o ir en persona.","Con HotClick lo ves todo en un mismo panel, sin topes, y reconocés a los clientes que vuelven.","al mes","por venta","50 productos","2 usuarios","1 bodega","1 caja","500 productos","5 usuarios","2 cajas","Productos sin límite","Usuarios sin límite","Bodegas sin límite","Cajas sin límite","El problema","La solución","Lo que pagás","Ver en la historia","Anotás las ventas de memoria","Prometés algo que ya vendiste","Devolvés plata y perdés la confianza","Cada venta descuenta el inventario","Tu tienda en línea se actualiza al instante","Te avisa antes de quedarte sin producto","Cada caja anota en su libreta","Ofrecés producto que ya no hay","Te enterás tarde de que se acabó","Las dos cajas comparten el inventario","Avisa cuando un producto se acaba","Registrás la compra y el inventario se repone","Reportes en papel de cada local","No sabés qué local necesita producto","Nadie reconoce a tus clientes frecuentes","Todos tus locales en un mismo panel","Hot IA te dice dónde falta producto","El CRM reconoce a cada cliente","pagás ₡1.200 (6 %)"], T={"en":["What's included","Deliveries","Your business","How the demo works","Questions","Book a demo","Sales system for businesses in Costa Rica","Sell in your shop.","Sell online.","With one inventory.","Register (POS), inventory, payments and online store for businesses in Costa Rica. We show it to you in 30 minutes.","See what's included","30 minutes · Google Meet · you pick the day and time","What do you sell?","Coffee","Clothing","Hardware","Crafts","Register","Shift open · 10:42","","","","Total, VAT included","Card","Cash","Payment approved","Inventory up to date","Sample data","Everything in one panel","Point of sale (POS)","Inventory","Sales reports","Online store","We don't replace your","shop","or your","social media",". We're one","more channel","to sell through.","Your business, one more channel.","Inventory and warehouses","Payments with SINPE Móvil and card","Your online store","You see it working before you decide.","Monthly fee on Emprendedor, with a commission per sale","Minutes the demo lasts","Plans to fit your size","Days of support per week","What's included.","Sell","Sell","at the counter.","Open a shift, charge with a barcode scanner and close the register at the end of the day.","Point of sale (POS) · Register closing · Sales reports","Control","Know","what you have left.","Stock by warehouse and low-stock alerts. On PyME and Negocio Plus, Hot IA answers using your data.","Inventory · Warehouses · Hot IA","Grow","Get paid and sell","online too.","Your customer pays with SINPE Móvil or card, and your online store uses the same inventory as your shop.","SINPE Móvil · Card · Online store","You charge at the register,","the inventory goes down by itself.","We help you coordinate","the delivery of your products.","Your customer chooses how to receive the order and you move it through stages from the System.","Pickup or delivery","Your customer chooses pickup at your shop, delivery or parcel service, and sees the cost before paying.","Updates at every stage","Each time you move the order, your customer gets an email with the status.","Tracking with a link","Your customer tracks the order without creating an account. If it ships with Correos de Costa Rica, you enter the tracking number and they receive it.","Pickup service in the GAM","For now in the Greater Metropolitan Area, you can ask us to pick up the package.","30 minutes · no commitment","Order 1042","Standard delivery · GAM","Paid","SINPE Móvil verified","Being prepared","2 products","Shipped","Tracking number entered","Delivered","Order complete","Thursday","Email to customer","Notice sent","Businesses like yours.","Clothing stores","Corner shops","Coffee shops","Bookstores","Hardware stores","Pet stores","Gifts","Beauty and cosmetics","Handicrafts","Home businesses","Market stalls","Shoe stores","Variety stores","Tech stores","Natural products","Toy stores","Home decor","Bakeries","Sports stores","Small ventures","Which one is your business?","See which one looks most like yours. We'll go through it together in the demo.","I sell from home or at markets","Emprendedor plan · ₡0 per month","Growing small businesses","I have a shop and a team","PyME plan · ₡12,900 per month","Full operation","Several registers and lots of products","Negocio Plus plan · ₡28,900 per month","Organize what you sell","from day one.","You sell from home, at markets or by chat, and keep your accounts in a notebook or in the chat.","Get paid without hassle","Charge with SINPE Móvil, card or cash from the same register.","Know what you have left","Every sale updates the inventory, so you find out before you run out.","Your products stay published and people buy even when you're not there.","Clear numbers","Sales reports to see what's moving, without adding things up by hand.","₡0 per month · 9% per sale","Up to 50 products · 2 users · 1 warehouse · 1 register","Saturday market","","","Two registers,","one inventory.","You have a shop, a couple of employees and regular suppliers, and a notebook or a chat is no longer enough.","More hands, same order","Up to 5 users, 2 warehouses and 2 registers working on the same inventory.","Purchases without paper slips","You record what you buy from suppliers and your inventory updates.","Your own gift cards","Your customers can gift credit to spend at your business.","Hot IA by your side","Hot IA answers using your business data and includes 80 credits.","₡12,900 per month · 7.5% per sale","Up to 500 products · 5 users · 2 warehouses · 2 registers","2 warehouses","Product","Shop","Warehouse","Low stock","Supplier purchase","+24 units","No caps.","Know your customers.","You have a team, several registers, lots of products and returning customers. You need a System that doesn't hold you back.","No limits","Unlimited products, warehouses, registers and users, even as the business keeps growing.","Customers at hand","The CRM brings your customer data together in one place.","Unlimited Hot IA","Ask Hot IA as many times as you want, using your business data.","Everything in PyME","Supplier purchases, gift cards and reports, same as in PyME.","₡28,900 per month · 6% per sale","Unlimited products, warehouses, registers and users","Customers","Last purchase: yesterday","Last purchase: 6 days ago","Last purchase: 2 weeks ago","Who bought the most this month?","María Rojas, with ₡184,000 in 5 purchases.","The three plans, side by side.","","Monthly fee","Commission per sale","Products","Unlimited","Users","Warehouses","Registers (POS)","Yes","Supplier purchases","Customer CRM","80 credits","Prices in colones · The commission is charged only when there is a sale","How the demo works.","Today","You book a slot","Pick a day and time. You receive the invitation with the Google Meet link.","30 minutes","You see it live","We make a sale, move inventory and take a payment, with products like yours.","Afterwards","You decide calmly","We tell you which plan fits. If you want to continue, we help you open the account.","Frequently asked questions.","Does the demo cost anything?","It's free. It takes 30 minutes, with no commitment. Book below.","Do I have to stop selling through my social media or my shop?","No. HotClick is one more channel for your business. You keep selling where you already sell.","How do I receive the money from my sales?","We pay out your sales every two weeks or every month, whichever you choose.","What do I need to use it?","A phone or a computer with internet. It runs in the browser.","I have a lot of products. Do I have to type them in one by one?","No. You can upload your catalog from a PDF or a link. We also have a service that visits your shop and digitizes the inventory.","Who will I talk to?","With a person from the HotClick team in Costa Rica, Monday to Saturday.","Pick a day.","We'll show you the System with your business.","System demo","Duration","Where","Time zone","Your name","Email","Business name","Plan you're interested in","Back","Confirm","Meeting booked","We sent the calendar invitation with the Google Meet link to the email you gave us.","Visual prototype: this booking is not saved or sent yet.","Choose another slot","Prefer to write to us?","· Monday to Saturday, 8:00 a.m. to 7:00 p.m.","Message us on WhatsApp","Your business, one more channel · © 2026","Pause animations","Resume animations","30-minute demo on Google Meet","HotClick for businesses, home","Sections","Language","Light or dark mode","Example of the HotClick System register","A sale at the register or in the online store reduces the same inventory","Example of the stages of an order","Example of a sale at the register","Example of inventory in two warehouses","Example of customers and a Hot IA query","Previous month","Next month","Social media","Message us on WhatsApp and we'll arrange your 30-minute demo on Google Meet.","Open the calendar in a new tab","Is it for me?","Register, inventory and online store for businesses in Costa Rica","You charge in your shop with the register (POS), your products are published in your online store and every sale draws from the same inventory. We'll show you in 30 minutes.","Tech","Register open · 10:42","Your shop or market stall","You charge with the HotClick register.","Your social media and WhatsApp","Keep serving customers there and share your store link.","People buy even when you're not around.","One single inventory","Every sale, wherever it comes from, draws from the same stock.","Payments","SINPE Móvil, card or cash.","Reports","What sold, where and how much.","Alerts","We warn you before a product runs out.","You don't have to change how you sell today. HotClick adds your online store and brings all your sales into one place.","Monthly fee on the Entrepreneur plan*","Mon–Sat","Support Monday to Saturday, 8:00 to 19:00","*On Entrepreneur you only pay a commission when you sell: 9% per sale.","Open the register when the day starts, charge by scanning the barcode or searching the product, and see how much you sold when you close.","Barcode scanner","See how many units you have in each storage location, and we alert you when a product is running low.","Low-stock alerts","Your customer pays with SINPE Móvil or card. Your products are published in your online store, which uses the same inventory as your shop.","In plain words","Words you'll see.","So nothing sounds strange in the demo or the plans.","Register (POS)","Where you charge in your shop. Each register is one checkout point.","Storage location: each place where you keep products — the shop, your home or a separate warehouse.","Shift","Opening the register at the start and closing it at the end, with the day's summary.","An assistant you ask about your business. 1 credit = 1 question.","Your customers' history: what they bought, when and how much.","You sell in the shop","The register takes off 1 unit: 23 left.","Someone buys online","The store takes off another: 22 left.","We alert you","When few are left, you see the low-stock alert.","Ask it","how your business is doing.","Hot IA is an assistant that reads your business's sales, inventory and customers, and answers you in plain words.","1 credit = 1 question","Each question you ask uses one credit.","How many each plan includes","PyME includes 80 questions a month. Negocio Plus, unlimited.","Not included in Entrepreneur","Hot IA comes with the PyME and Negocio Plus plans.","We'll show you live","PyME plan","Credits this month","77 of 80","You","Which product sold most this week?","Cotton T-shirt M: 18 units, ₡124,200.","What am I about to run out of?","Embroidered cap: 3 left in the shop and 24 in storage.","How much did I sell yesterday via SINPE Móvil?","₡86,500 in 11 sales.","Fee example","You sell ₡20,000","you pay ₡1,800 (9%)","You sell ₡5,000","you pay ₡450 (9%)","A month with no sales","you pay ₡0","Up to 5 users, 2 storage locations and 2 registers (checkout points) working on one inventory.","Answers with your business data. Includes 80 credits a month: 1 credit = 1 question.","you pay ₡1,500 (7.5%)","Fixed monthly fee","₡12,900 a month","₡28,900 a month","Embroidered cap","Blue jeans size 32","You have a team, several registers, lots of products and returning customers. You need a system that doesn't hold you back.","The CRM is your customers' history: what they bought, when and how much, in one place.","You choose who","delivers your orders.","When you open your account we ask how you want to deliver, and you move each order through its stages in HotClick.","You deliver it","Your customer picks up at your shop, or you send it with your courier, by parcel service or through Correos de Costa Rica.","We deliver it","We pick up the package at your business. For now only in the GAM (Greater Metropolitan Area).","Clear cost","Your customer sees the shipping cost before paying. Parcel service: a package sent by bus or carrier.","Recommended","No","CRM (customer history)","Hot IA (1 credit = 1 question)","80 a month","Prices in colones · The commission is charged only when there's a sale · The monthly fee is paid every month","Is HotClick right for your business?","Three questions, less than a minute. We'll tell you which plan fits and whether we can work with what you sell.","Question 1 of 3","Question 2 of 3","Question 3 of 3","Clothing, shoes and accessories","Home and decor","Tech and electronics","Beauty and personal care (non-medical)","Crafts and gifts","Hardware and tools","Books and stationery","Pet accessories","Food or drinks","Medicines, supplements or health products","Alcohol, tobacco, vapes or other regulated products","Something else","Where do you sell today?","From home, at markets or on social media","In a shop","In several shops or with a separate warehouse","How many people sell or take payments?","1 or 2 people","3 to 5 people","More than 5 people","We can work with your business","The Entrepreneur plan fits you","₡0 a month and 9% per sale. Ideal if you sell from home or at markets, with 1 or 2 people.","The PyME plan fits you","₡12,900 a month and 7.5% per sale. For a shop with a team: 5 users, 2 registers and 2 storage locations, supplier purchases and Hot IA.","The Negocio Plus plan fits you","₡28,900 a month and 6% per sale. No cap on products, registers, storage locations or users, with CRM and unlimited Hot IA.","Since you chose \"Something else\", we'll confirm in the demo that we can process what you sell.","Book a demo","Pay and open my account","Start over","We can't for now","We don't process sales in this category yet.","HotClick's card and SINPE Móvil payments go through a payment gateway that doesn't accept some products, such as food, health or regulated products. If you have questions about your case, message us.","Answer all three to see your result","Are there products you don't accept?","Yes. For now we don't process sales of food and drinks, health products or supplements, or regulated products like alcohol or tobacco. If you're not sure, take the quiz above or message us.","Who delivers the orders?","You choose. You can deliver yourself (pickup at your shop, your courier, parcel service or Correos de Costa Rica) or ask us to pick up the package, for now in the GAM.","What is a Hot IA credit?","Each question you ask Hot IA uses one credit. PyME includes 80 a month and Negocio Plus is unlimited.","We'll show you HotClick with your business.","Example of the HotClick register","Your shop, your social media and your online store sell from one single inventory","Example questions to Hot IA","You sell at the market and on WhatsApp, and keep track in your head. With HotClick, every sale is recorded on its own and your online store knows what you have left.","What the plan includes","Before","With HotClick","Market and WhatsApp","You sold the last candle at the market, but you had already promised it on WhatsApp.","The market sale lowers the inventory and your online store already shows it sold out.","With two registers and a notebook, nobody knows how many units are really left. With HotClick, both registers sell from the same inventory and supplier purchases restock it.","Two registers, one shop","Two registers and a notebook: each cashier thinks a different number is left.","Both registers draw from the same inventory, you get an alert when stock runs low, and the supplier purchase restocks it.","With several shops, knowing how each one is doing means calling or going in person. With HotClick you see everything in one panel, with no caps, and you recognize returning customers.","Several shops","To know how each shop is doing you have to visit them one by one or spend the day on the phone.","Each shop sends its sales to your panel, you recognize the returning customer and Hot IA sums up your day.","A market sale and a WhatsApp order for the same product","Two registers selling the same product and a supplier bringing more","An owner with three shops who sees everything from her phone","Entrepreneur plan","Negocio Plus plan","Problem","Solution","You sell at the market and on WhatsApp, and keep count from memory.","With HotClick, every sale is recorded on its own and your online store knows what you have left.","With two registers and a notebook, nobody really knows how many units are left.","With HotClick, both registers sell from the same inventory and the supplier order restocks it.","With several shops, knowing how each one is doing means calling or going in person.","With HotClick you see everything in one dashboard, with no caps, and recognize returning customers.","per month","per sale","50 products","2 users","1 warehouse","1 register","500 products","5 users","2 registers","Unlimited products","Unlimited users","Unlimited warehouses","Unlimited registers","The problem","The solution","What you pay","See it in the story","You track sales from memory","You promise something you already sold","You refund money and lose trust","Every sale updates the inventory","Your online store updates instantly","It warns you before you run out","Each register writes in its own notebook","You offer products you no longer have","You find out too late that it ran out","Both registers share the inventory","It alerts you when a product runs out","Record the purchase and the inventory is restocked","Paper reports from every shop","You don't know which shop needs stock","Nobody recognizes your regular customers","All your shops in one dashboard","Hot IA tells you where stock is missing","The CRM recognizes every customer","you pay ₡1,200 (6%)"],"pt":["O que inclui","Entregas","Seu negócio","Como é a demo","Perguntas","Agende uma demo","Sistema de vendas para negócios da Costa Rica","Venda na sua loja.","Venda online.","Com um só estoque.","Caixa (POS), estoque, cobranças e loja online para negócios da Costa Rica. Mostramos para você em 30 minutos.","Ver o que inclui","30 minutos · Google Meet · você escolhe dia e hora","O que você vende?","Café","Roupa","Ferragens","Artesanato","Caixa","Turno aberto · 10:42","","","","Total, imposto incluído","Cartão","Dinheiro","Pagamento aprovado","Estoque em dia","Dados de exemplo","Tudo em um só painel","Ponto de venda (POS)","Estoque","Relatórios de vendas","Loja online","Não substituímos sua","loja","nem suas","redes",". Somos um","canal a mais","para vender.","Seu negócio, um canal a mais.","Estoque e depósitos","Cobranças com SINPE Móvil e cartão","Sua loja online","Você vê funcionando antes de decidir.","Mensalidade no Emprendedor, com comissão por venda","Minutos dura a demo","Planos conforme seu tamanho","Dias de suporte por semana","O que inclui.","Vender","Você vende","no balcão.","Abre o turno, cobra com leitor de código de barras e fecha o caixa no fim do dia.","Ponto de venda (POS) · Fechamento de caixa · Relatórios de vendas","Controlar","Você sabe","o que sobrou.","Estoque por depósito e avisos de estoque baixo. No PyME e no Negocio Plus, a Hot IA responde com seus dados.","Estoque · Depósitos · Hot IA","Crescer","Você cobra e vende","também online.","Seu cliente paga com SINPE Móvil ou cartão, e sua loja online usa o mesmo estoque da loja física.","SINPE Móvil · Cartão · Loja online","Você cobra no caixa,","o estoque baixa sozinho.","Ajudamos você a coordenar","a entrega dos seus produtos.","Seu cliente escolhe como receber o pedido e você o move por etapas no Sistema.","Retirada ou envio","Seu cliente escolhe retirada na sua loja, envio ou encomenda, e vê o custo antes de pagar.","Avisos em cada etapa","Cada vez que você move o pedido, seu cliente recebe um e-mail com o status.","Acompanhamento com um link","Seu cliente acompanha o pedido sem criar conta. Se for pelos Correos de Costa Rica, você anota o código de rastreio e ele recebe.","Coleta na GAM","Por enquanto na Grande Área Metropolitana, você pode pedir que passemos para buscar o pacote.","30 minutos · sem compromisso","Pedido 1042","Envio normal · GAM","Pago","SINPE Móvil verificado","Em preparação","2 produtos","Enviado","Código de rastreio anotado","Entregue","Pedido completo","Quinta-feira","E-mail ao cliente","Aviso enviado","Negócios como o seu.","Lojas de roupa","Mercearias","Cafeterias","Livrarias","Lojas de ferragens","Pet shops","Presentes","Beleza e cosméticos","Artesanato","Negócios em casa","Vendas em feiras","Lojas de calçados","Bazares","Lojas de tecnologia","Produtos naturais","Lojas de brinquedos","Decoração","Confeitarias","Lojas de esportes","Pequenos empreendimentos","Qual é o seu negócio?","Veja qual se parece mais com o seu. Na demo vemos juntos.","Vendo de casa ou em feiras","Plano Emprendedor · ₡0 por mês","Pequenas empresas em crescimento","Tenho loja e equipe","Plano PyME · ₡12.900 por mês","Operação completa","Vários caixas e muito produto","Plano Negocio Plus · ₡28.900 por mês","Organize o que você vende","desde o primeiro dia.","Você vende de casa, em feiras ou por mensagens, e controla as contas em um caderno ou no chat.","Cobre sem complicação","Você cobra com SINPE Móvil, cartão ou dinheiro no mesmo caixa.","Saiba o que sobrou","Cada venda desconta do estoque e você fica sabendo antes de ficar sem produto.","Seus produtos ficam publicados e compram de você mesmo quando não está atendendo.","Seus números claros","Relatórios de vendas para saber o que gira, sem somar à mão.","₡0 por mês · 9 % por venda","Até 50 produtos · 2 usuários · 1 depósito · 1 caixa","Feira de sábado","","","Dois caixas,","um só estoque.","Você tem loja, alguns funcionários e fornecedores fixos, e um caderno ou um chat já não bastam.","Mais mãos, a mesma ordem","Até 5 usuários, 2 depósitos e 2 caixas trabalhando no mesmo estoque.","Compras sem papeizinhos","Você registra o que compra dos fornecedores e seu estoque se atualiza.","Gift cards próprios","Seus clientes podem presentear saldo para gastar no seu negócio.","Hot IA ao seu lado","A Hot IA responde com os dados do seu negócio e inclui 80 créditos.","₡12.900 por mês · 7,5 % por venda","Até 500 produtos · 5 usuários · 2 depósitos · 2 caixas","2 depósitos","Produto","Loja","Depósito","Estoque baixo","Compra de fornecedor","+24 unidades","Sem limites.","Conheça seus clientes.","Você tem equipe, vários caixas, muito produto e clientes que voltam. Precisa de um Sistema que não te freie.","Sem limites","Produtos, depósitos, caixas e usuários sem limite, mesmo que o negócio continue crescendo.","Clientes à mão","O CRM reúne os dados dos seus clientes em um só lugar.","Hot IA sem limite","Consulte a Hot IA quantas vezes quiser, com os dados do seu negócio.","Tudo do PyME","Compras de fornecedores, gift cards e relatórios, como no PyME.","₡28.900 por mês · 6 % por venda","Produtos, depósitos, caixas e usuários sem limite","Clientes","Última compra: ontem","Última compra: há 6 dias","Última compra: há 2 semanas","Quem comprou mais este mês?","María Rojas, com ₡184.000 em 5 compras.","Os três planos, juntos.","","Mensalidade","Comissão por venda","Produtos","Sem limite","Usuários","Depósitos","Caixas (POS)","Sim","Compras de fornecedores","CRM de clientes","80 créditos","Preços em colones · A comissão só é cobrada quando há uma venda","Como é a demo.","Hoje","Você reserva um horário","Escolha dia e hora. Você recebe o convite com o link do Google Meet.","30 minutos","Você vê ao vivo","Fazemos uma venda, movemos estoque e cobramos, com produtos como os seus.","Depois","Você decide com calma","Dizemos qual plano serve para você. Se quiser continuar, ajudamos a abrir a conta.","Perguntas frequentes.","A demonstração tem custo?","Não custa nada. São 30 minutos, sem compromisso. Agende abaixo.","Preciso parar de vender pelas minhas redes ou pela minha loja?","Não. O HotClick é um canal a mais para o seu negócio. Você continua vendendo onde já vende.","Como recebo o dinheiro das minhas vendas?","Repassamos suas vendas a cada quinzena ou a cada mês, como você escolher.","O que preciso para usar?","Um celular ou um computador com internet. Funciona no navegador.","Tenho muitos produtos. Preciso digitar um por um?","Não. Você pode carregar seu catálogo a partir de um PDF ou de um link. Também temos um serviço que vai à sua loja e digitaliza o estoque.","Com quem vou falar?","Com uma pessoa da equipe do HotClick na Costa Rica, de segunda a sábado.","Escolha um dia.","Mostramos o Sistema com o seu negócio.","Demo do Sistema","Duração","Local","Fuso horário","Seu nome","E-mail","Nome do negócio","Plano que te interessa","Voltar","Confirmar","Reunião agendada","Enviamos o convite de calendário com o link do Google Meet para o e-mail que você nos deixou.","Protótipo visual: esta reserva ainda não é salva nem enviada.","Escolher outro horário","Prefere nos escrever?","· Segunda a sábado, das 8:00 às 19:00","Escrever pelo WhatsApp","Seu negócio, um canal a mais · © 2026","Pausar animações","Retomar animações","Demo de 30 minutos pelo Google Meet","HotClick para negócios, início","Seções","Idioma","Modo claro ou escuro","Exemplo do caixa do Sistema HotClick","Uma venda no caixa ou na loja online desconta do mesmo estoque","Exemplo das etapas de um pedido","Exemplo de uma venda no caixa","Exemplo de estoque em dois depósitos","Exemplo de clientes e consulta à Hot IA","Mês anterior","Próximo mês","Redes","Escreva para nós pelo WhatsApp e combinamos sua demo de 30 minutos pelo Google Meet.","Abrir o calendário em uma nova aba","É para mim?","Caixa, estoque e loja online para negócios da Costa Rica","Você cobra na sua loja com o caixa (PDV), seus produtos ficam publicados na sua loja online e cada venda baixa o mesmo estoque. Mostramos em 30 minutos.","Tecnologia","Caixa aberto · 10:42","Sua loja ou feira","Você cobra com o caixa da HotClick.","Suas redes e WhatsApp","Continue atendendo ali e compartilhe o link da sua loja.","Compram de você mesmo quando você não está atendendo.","Um único estoque","Cada venda, venha de onde vier, baixa do mesmo estoque.","Cobranças","SINPE Móvil, cartão ou dinheiro.","Relatórios","O que vendeu, onde e quanto.","Avisos","Avisamos antes que um produto acabe.","Você não precisa mudar como vende hoje. A HotClick soma sua loja online e junta todas as suas vendas num só lugar.","De mensalidade no plano Empreendedor*","Seg–Sáb","Suporte de segunda a sábado, 8:00 às 19:00","*No Empreendedor você paga só uma comissão quando vende: 9% por venda.","Você abre o caixa no começo do dia, cobra escaneando o código de barras ou buscando o produto, e ao fechar vê quanto vendeu.","Leitor de código de barras","Veja quantas unidades você tem em cada depósito, e avisamos quando um produto está acabando.","Avisos de estoque baixo","Seu cliente paga com SINPE Móvil ou cartão. Seus produtos ficam publicados na sua loja online, que usa o mesmo estoque da loja física.","Em palavras simples","Palavras que você vai ver.","Para que nada soe estranho na demo nem nos planos.","Caixa (PDV)","Onde você cobra na sua loja. Cada caixa é um ponto de cobrança.","Depósito: cada lugar onde você guarda produtos — a loja, sua casa ou um depósito separado.","Turno","Abrir o caixa no começo e fechá-lo no final, com o resumo do dia.","Um assistente a quem você pergunta sobre seu negócio. 1 crédito = 1 pergunta.","O histórico dos seus clientes: o que compraram, quando e quanto.","Você vende na loja","O caixa baixa 1 unidade: restam 23.","Compram online","A loja baixa outra: restam 22.","Avisamos você","Quando restam poucas, você vê o aviso de estoque baixo.","Pergunte","como vai seu negócio.","Hot IA é um assistente que lê as vendas, o estoque e os clientes do seu negócio e responde em palavras simples.","1 crédito = 1 pergunta","Cada pergunta que você faz gasta um crédito.","Quantas cada plano inclui","PyME inclui 80 perguntas por mês. Negocio Plus, sem limite.","Não vem no Empreendedor","Hot IA está nos planos PyME e Negocio Plus.","Mostramos ao vivo","Plano PyME","Créditos do mês","77 de 80","Você","Qual produto vendeu mais esta semana?","Camiseta de algodão M: 18 unidades, ₡124.200.","O que está para acabar?","Boné bordado: restam 3 na loja e 24 no depósito.","Quanto vendi ontem por SINPE Móvil?","₡86.500 em 11 vendas.","Exemplo de cobrança","Você vende ₡20.000","você paga ₡1.800 (9%)","Você vende ₡5.000","você paga ₡450 (9%)","Um mês sem vendas","você paga ₡0","Até 5 usuários, 2 depósitos e 2 caixas (pontos de cobrança) trabalhando sobre um mesmo estoque.","Responde com os dados do seu negócio. Inclui 80 créditos por mês: 1 crédito = 1 pergunta.","você paga ₡1.500 (7,5%)","Mensalidade fixa","₡12.900 por mês","₡28.900 por mês","Boné bordado","Jeans azul tamanho 32","Você tem equipe, vários caixas, muito produto e clientes que voltam. Precisa de um sistema que não te trave.","O CRM é o histórico dos seus clientes: o que compraram, quando e quanto, num só lugar.","Você escolhe quem","entrega seus pedidos.","Quando você abre sua conta perguntamos como quer entregar, e você move cada pedido por etapas na HotClick.","Você entrega","Seu cliente retira na sua loja, ou você envia com seu entregador, por encomenda ou pelos Correios da Costa Rica.","Nós entregamos","Buscamos o pacote no seu negócio. Por enquanto só na GAM (Grande Área Metropolitana).","Custo claro","Seu cliente vê o custo do frete antes de pagar. Encomenda: pacote enviado por ônibus ou transportadora.","Recomendado","Não","CRM (histórico de clientes)","Hot IA (1 crédito = 1 pergunta)","80 por mês","Preços em colones · A comissão só é cobrada quando há uma venda · A mensalidade é paga todo mês","A HotClick é para o seu negócio?","Três perguntas, menos de um minuto. Dizemos qual plano combina e se podemos trabalhar com o que você vende.","Pergunta 1 de 3","Pergunta 2 de 3","Pergunta 3 de 3","Roupas, sapatos e acessórios","Casa e decoração","Tecnologia e eletrônicos","Beleza e cuidados pessoais (sem fins médicos)","Artesanato e presentes","Ferragens e ferramentas","Livraria e papelaria","Acessórios para pets","Comida ou bebidas","Medicamentos, suplementos ou produtos de saúde","Álcool, tabaco, vapes ou outros produtos regulados","Outra coisa","Onde você vende hoje?","De casa, em feiras ou pelas redes","Em uma loja","Em várias lojas ou com depósito separado","Quantas pessoas vendem ou cobram?","1 ou 2 pessoas","De 3 a 5 pessoas","Mais de 5 pessoas","Podemos trabalhar com o seu negócio","O plano Empreendedor combina com você","₡0 por mês e 9% por venda. Ideal se você vende de casa ou em feiras, com 1 ou 2 pessoas.","O plano PyME combina com você","₡12.900 por mês e 7,5% por venda. Para uma loja com equipe: 5 usuários, 2 caixas e 2 depósitos, compras a fornecedores e Hot IA.","O plano Negocio Plus combina com você","₡28.900 por mês e 6% por venda. Sem limite de produtos, caixas, depósitos ou usuários, com CRM e Hot IA ilimitado.","Como você escolheu \"Outra coisa\", na demo confirmamos se podemos processar o que você vende.","Agendar uma demo","Pagar e abrir minha conta","Começar de novo","Por enquanto não podemos","Ainda não processamos vendas desta categoria.","As cobranças com cartão e SINPE Móvil da HotClick passam por um gateway de pagamento que não aceita alguns produtos, como comida, saúde ou produtos regulados. Se tiver dúvidas sobre o seu caso, fale com a gente.","Responda as três para ver seu resultado","Há produtos que vocês não aceitam?","Sim. Por enquanto não processamos vendas de comida e bebidas, produtos de saúde ou suplementos, nem produtos regulados como álcool ou tabaco. Se não tiver certeza, faça o teste acima ou fale com a gente.","Quem entrega os pedidos?","Você escolhe. Pode entregar você mesmo (retirada na loja, seu entregador, encomenda ou Correios da Costa Rica) ou pedir que busquemos o pacote, por enquanto na GAM.","O que é um crédito do Hot IA?","Cada pergunta que você faz ao Hot IA gasta um crédito. PyME inclui 80 por mês e Negocio Plus não tem limite.","Mostramos a HotClick com o seu negócio.","Exemplo do caixa da HotClick","Sua loja, suas redes e sua loja online vendem sobre um único estoque","Exemplo de perguntas ao Hot IA","Você vende na feira e pelo WhatsApp e controla tudo de cabeça. Com a HotClick, cada venda é registrada sozinha e sua loja online sabe o que resta.","O que o plano inclui","Antes","Com a HotClick","Feira e WhatsApp","Você vendeu a última vela na feira, mas já tinha prometido pelo WhatsApp.","A venda na feira baixa o estoque e sua loja online já mostra esgotado.","Com dois caixas e um caderno, ninguém sabe quantas unidades restam de verdade. Com a HotClick, os dois caixas vendem do mesmo estoque e a compra ao fornecedor o repõe.","Dois caixas, uma loja","Dois caixas e um caderno: cada caixa acha que resta uma quantidade diferente.","Os dois caixas baixam do mesmo estoque, você recebe um aviso quando está acabando e a compra ao fornecedor repõe.","Com várias lojas, saber como vai cada uma obriga a ligar ou ir pessoalmente. Com a HotClick você vê tudo num só painel, sem limites, e reconhece os clientes que voltam.","Várias lojas","Para saber como vai cada loja você precisa ir de uma em uma ou passar o dia ao telefone.","Cada loja manda suas vendas para o painel, você reconhece a cliente que volta e o Hot IA resume o seu dia.","Uma venda na feira e um pedido pelo WhatsApp do mesmo produto","Dois caixas vendendo o mesmo produto e um fornecedor trazendo mais","Uma dona com três lojas que vê tudo pelo celular","Plano Empreendedor","Plano Negocio Plus","Problema","Solução","Você vende na feira e pelo WhatsApp, e faz as contas de cabeça.","Com a HotClick, cada venda é registrada sozinha e sua loja online sabe o que sobrou.","Com dois caixas e um caderno, ninguém sabe quantas unidades restam de verdade.","Com a HotClick, os dois caixas vendem do mesmo estoque e a compra ao fornecedor o repõe.","Com várias lojas, saber como vai cada uma obriga você a ligar ou ir pessoalmente.","Com a HotClick você vê tudo em um só painel, sem limites, e reconhece os clientes que voltam.","por mês","por venda","50 produtos","2 usuários","1 depósito","1 caixa","500 produtos","5 usuários","2 caixas","Produtos sem limite","Usuários sem limite","Depósitos sem limite","Caixas sem limite","O problema","A solução","O que você paga","Ver na história","Você anota as vendas de cabeça","Você promete algo que já vendeu","Você devolve dinheiro e perde a confiança","Cada venda baixa o estoque","Sua loja online se atualiza na hora","Avisa antes de você ficar sem produto","Cada caixa anota no seu caderno","Você oferece produto que já acabou","Você descobre tarde que acabou","Os dois caixas compartilham o estoque","Avisa quando um produto acaba","Você registra a compra e o estoque se repõe","Relatórios em papel de cada loja","Você não sabe qual loja precisa de produto","Ninguém reconhece seus clientes frequentes","Todas as suas lojas em um só painel","A Hot IA diz onde falta produto","O CRM reconhece cada cliente","você paga ₡1.200 (6%)"],"fr":["Ce qui est inclus","Livraisons","Votre commerce","Comment se passe la démo","Questions","Réserver une démo","Système de vente pour les commerces du Costa Rica","Vendez en boutique.","Vendez en ligne.","Avec un seul stock.","Caisse (POS), stock, encaissements et boutique en ligne pour les commerces du Costa Rica. Nous vous le montrons en 30 minutes.","Voir ce qui est inclus","30 minutes · Google Meet · vous choisissez le jour et l'heure","Que vendez-vous ?","Café","Vêtements","Quincaillerie","Artisanat","Caisse","Service ouvert · 10:42","","","","Total, TVA incluse","Carte","Espèces","Paiement approuvé","Stock à jour","Données d'exemple","Tout dans un seul tableau de bord","Point de vente (POS)","Stock","Rapports de ventes","Boutique en ligne","Nous ne remplaçons ni votre","boutique","ni vos","réseaux",". Nous sommes un","canal de plus","pour vendre.","Votre commerce, un canal de plus.","Stock et entrepôts","Encaissements par SINPE Móvil et carte","Votre boutique en ligne","Vous le voyez fonctionner avant de décider.","Abonnement mensuel du plan Emprendedor, avec commission par vente","Minutes que dure la démo","Plans selon votre taille","Jours d'assistance par semaine","Ce qui est inclus.","Vendre","Vous vendez","au comptoir.","Vous ouvrez le service, encaissez avec un lecteur de codes-barres et fermez la caisse en fin de journée.","Point de vente (POS) · Clôture de caisse · Rapports de ventes","Contrôler","Vous savez","ce qu'il vous reste.","Stock par entrepôt et alertes de stock bas. Avec PyME et Negocio Plus, Hot IA répond avec vos données.","Stock · Entrepôts · Hot IA","Grandir","Vous encaissez et vendez","aussi en ligne.","Votre client paie par SINPE Móvil ou par carte, et votre boutique en ligne utilise le même stock que le magasin.","SINPE Móvil · Carte · Boutique en ligne","Vous encaissez à la caisse,","le stock baisse tout seul.","Nous vous aidons à coordonner","la livraison de vos produits.","Votre client choisit comment recevoir sa commande et vous la faites avancer par étapes depuis le Système.","Retrait ou livraison","Votre client choisit le retrait en boutique, la livraison ou le colis, et voit le coût avant de payer.","Des avis à chaque étape","Chaque fois que vous faites avancer la commande, votre client reçoit un e-mail avec le statut.","Suivi avec un lien","Votre client suit sa commande sans créer de compte. Si elle part par Correos de Costa Rica, vous saisissez le numéro de suivi et il le reçoit.","Collecte dans la GAM","Pour l'instant dans la Grande Aire Métropolitaine, vous pouvez nous demander de passer prendre le colis.","30 minutes · sans engagement","Commande 1042","Livraison standard · GAM","Payée","SINPE Móvil vérifié","En préparation","2 produits","Expédiée","Numéro de suivi saisi","Livrée","Commande terminée","Jeudi","E-mail au client","Avis envoyé","Des commerces comme le vôtre.","Boutiques de vêtements","Épiceries de quartier","Cafés","Librairies","Quincailleries","Animaleries","Cadeaux","Beauté et cosmétiques","Artisanat","Commerces à domicile","Ventes sur les marchés","Magasins de chaussures","Bazars","Boutiques de technologie","Produits naturels","Magasins de jouets","Décoration","Pâtisseries","Magasins de sport","Petites entreprises","Quel est votre commerce ?","Regardez lequel ressemble le plus au vôtre. Nous le verrons ensemble pendant la démo.","Je vends de chez moi ou sur les marchés","Plan Emprendedor · ₡0 par mois","PME en croissance","J'ai une boutique et une équipe","Plan PyME · ₡12.900 par mois","Activité complète","Plusieurs caisses et beaucoup de produits","Plan Negocio Plus · ₡28.900 par mois","Organisez ce que vous vendez","dès le premier jour.","Vous vendez de chez vous, sur les marchés ou par messages, et tenez vos comptes dans un cahier ou dans le chat.","Encaissez sans complications","Vous encaissez par SINPE Móvil, carte ou espèces depuis la même caisse.","Sachez ce qu'il vous reste","Chaque vente est déduite du stock et vous êtes prévenu avant la rupture.","Vos produits restent publiés et on vous achète même quand vous n'êtes pas là.","Des chiffres clairs","Des rapports de ventes pour savoir ce qui se vend, sans additionner à la main.","₡0 par mois · 9 % par vente","Jusqu'à 50 produits · 2 utilisateurs · 1 entrepôt · 1 caisse","Marché du samedi","","","Deux caisses,","un seul stock.","Vous avez une boutique, quelques employés et des fournisseurs réguliers, et un carnet ou un chat ne suffisent plus.","Plus de mains, le même ordre","Jusqu'à 5 utilisateurs, 2 entrepôts et 2 caisses qui travaillent sur le même stock.","Des achats sans bouts de papier","Vous enregistrez ce que vous achetez à vos fournisseurs et votre stock se met à jour.","Vos propres cartes-cadeaux","Vos clients peuvent offrir un crédit à dépenser dans votre commerce.","Hot IA à vos côtés","Hot IA répond avec les données de votre commerce et inclut 80 crédits.","₡12.900 par mois · 7,5 % par vente","Jusqu'à 500 produits · 5 utilisateurs · 2 entrepôts · 2 caisses","2 entrepôts","Produit","Boutique","Entrepôt","Stock bas","Achat fournisseur","+24 unités","Sans plafond.","Connaissez vos clients.","Vous avez une équipe, plusieurs caisses, beaucoup de produits et des clients fidèles. Il vous faut un Système qui ne vous freine pas.","Sans limites","Produits, entrepôts, caisses et utilisateurs sans plafond, même si le commerce continue de grandir.","Vos clients à portée de main","Le CRM rassemble les données de vos clients en un seul endroit.","Hot IA sans limite","Interrogez Hot IA autant de fois que vous voulez, avec les données de votre commerce.","Tout ce qu'offre PyME","Achats fournisseurs, cartes-cadeaux et rapports, comme dans PyME.","₡28.900 par mois · 6 % par vente","Produits, entrepôts, caisses et utilisateurs sans limite","Clients","Dernier achat : hier","Dernier achat : il y a 6 jours","Dernier achat : il y a 2 semaines","Qui a le plus acheté ce mois-ci ?","María Rojas, avec ₡184.000 en 5 achats.","Les trois plans, côte à côte.","","Abonnement mensuel","Commission par vente","Produits","Sans limite","Utilisateurs","Entrepôts","Caisses (POS)","Oui","Achats fournisseurs","CRM clients","80 crédits","Prix en colones · La commission n'est facturée que lorsqu'il y a une vente","Comment se passe la démo.","Aujourd'hui","Vous réservez un créneau","Choisissez le jour et l'heure. Vous recevez l'invitation avec le lien Google Meet.","30 minutes","Vous le voyez en direct","Nous faisons une vente, déplaçons du stock et encaissons, avec des produits comme les vôtres.","Ensuite","Vous décidez tranquillement","Nous vous disons quel plan vous convient. Si vous voulez continuer, nous vous aidons à ouvrir le compte.","Questions fréquentes.","La démonstration est-elle payante ?","Elle ne coûte rien. C'est 30 minutes, sans engagement. Réservez ci-dessous.","Dois-je arrêter de vendre sur mes réseaux ou dans ma boutique ?","Non. HotClick est un canal de plus pour votre commerce. Vous continuez à vendre là où vous vendez déjà.","Comment est-ce que je reçois l'argent de mes ventes ?","Nous vous versons vos ventes toutes les deux semaines ou chaque mois, selon votre choix.","De quoi ai-je besoin pour l'utiliser ?","Un téléphone ou un ordinateur avec internet. Il fonctionne dans le navigateur.","J'ai beaucoup de produits. Faut-il les saisir un par un ?","Non. Vous pouvez charger votre catalogue depuis un PDF ou un lien. Nous avons aussi un service qui se rend dans votre boutique et numérise le stock.","À qui vais-je parler ?","À une personne de l'équipe HotClick au Costa Rica, du lundi au samedi.","Choisissez un jour.","Nous vous montrons le Système avec votre commerce.","Démo du Système","Durée","Lieu","Fuseau horaire","Votre nom","E-mail","Nom du commerce","Plan qui vous intéresse","Retour","Confirmer","Réunion réservée","Nous avons envoyé l'invitation de calendrier avec le lien Google Meet à l'e-mail que vous nous avez laissé.","Prototype visuel : cette réservation n'est pas encore enregistrée ni envoyée.","Choisir un autre créneau","Vous préférez nous écrire ?","· Du lundi au samedi, de 8 h à 19 h","Écrire sur WhatsApp","Votre commerce, un canal de plus · © 2026","Mettre les animations en pause","Reprendre les animations","Démo de 30 minutes sur Google Meet","HotClick pour les commerces, accueil","Sections","Langue","Mode clair ou sombre","Exemple de la caisse du Système HotClick","Une vente à la caisse ou dans la boutique en ligne est déduite du même stock","Exemple des étapes d'une commande","Exemple d'une vente à la caisse","Exemple de stock dans deux entrepôts","Exemple de clients et de question à Hot IA","Mois précédent","Mois suivant","Réseaux","Écrivez-nous sur WhatsApp et nous organisons votre démo de 30 minutes sur Google Meet.","Ouvrir le calendrier dans un nouvel onglet","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","Problème","Solution","Vous vendez au marché et sur WhatsApp, et comptez de mémoire.","Avec HotClick, chaque vente s’enregistre toute seule et votre boutique en ligne sait ce qu’il vous reste.","Avec deux caisses et un carnet, personne ne sait vraiment combien il en reste.","Avec HotClick, les deux caisses vendent sur le même stock et la commande fournisseur le réapprovisionne.","Avec plusieurs boutiques, savoir comment va chacune oblige à appeler ou à s’y rendre.","Avec HotClick, vous voyez tout dans un seul tableau de bord, sans plafond, et reconnaissez les clients fidèles.","par mois","par vente","50 produits","2 utilisateurs","1 entrepôt","1 caisse","500 produits","5 utilisateurs","2 caisses","Produits illimités","Utilisateurs illimités","Entrepôts illimités","Caisses illimitées","Le problème","La solution","Ce que vous payez","Voir dans l’histoire","Vous notez les ventes de mémoire","Vous promettez ce que vous avez déjà vendu","Vous remboursez et perdez la confiance","Chaque vente met à jour le stock","Votre boutique en ligne se met à jour instantanément","Vous êtes prévenu avant la rupture","Chaque caisse note dans son carnet","Vous proposez un produit épuisé","Vous apprenez trop tard la rupture","Les deux caisses partagent le stock","Alerte quand un produit est épuisé","Enregistrez l’achat et le stock est réapprovisionné","Rapports papier de chaque boutique","Vous ne savez pas quelle boutique manque de produits","Personne ne reconnaît vos clients fidèles","Toutes vos boutiques dans un seul tableau de bord","Hot IA vous dit où il manque des produits","Le CRM reconnaît chaque client",""],"de":["Was enthalten ist","Lieferungen","Ihr Geschäft","So läuft die Demo","Fragen","Demo buchen","Verkaufssystem für Geschäfte in Costa Rica","Verkaufen Sie im Laden.","Verkaufen Sie online.","Mit nur einem Bestand.","Kasse (POS), Bestand, Zahlungen und Onlineshop für Geschäfte in Costa Rica. Wir zeigen es Ihnen in 30 Minuten.","Ansehen, was enthalten ist","30 Minuten · Google Meet · Sie wählen Tag und Uhrzeit","Was verkaufen Sie?","Kaffee","Kleidung","Eisenwaren","Kunsthandwerk","Kasse","Schicht offen · 10:42","","","","Gesamt, inkl. MwSt.","Karte","Bargeld","Zahlung bestätigt","Bestand aktuell","Beispieldaten","Alles in einer Übersicht","Kasse im Laden (POS)","Bestand","Verkaufsberichte","Onlineshop","Wir ersetzen weder Ihren","Laden","noch Ihre","sozialen Netzwerke",". Wir sind ein","weiterer Kanal","für Ihren Verkauf.","Ihr Geschäft, ein weiterer Kanal.","Bestand und Lager","Zahlungen mit SINPE Móvil und Karte","Ihr Onlineshop","Sie sehen es in Aktion, bevor Sie entscheiden.","Monatsgebühr im Plan Emprendedor, mit Provision pro Verkauf","Minuten dauert die Demo","Pläne passend zu Ihrer Größe","Tage Support pro Woche","Was enthalten ist.","Verkaufen","Sie verkaufen","an der Ladentheke.","Sie öffnen die Schicht, kassieren mit dem Barcodescanner und schließen die Kasse am Ende des Tages.","Kasse im Laden (POS) · Kassenabschluss · Verkaufsberichte","Kontrollieren","Sie wissen,","was noch da ist.","Bestand pro Lager und Warnungen bei niedrigem Bestand. In PyME und Negocio Plus antwortet Hot IA mit Ihren Daten.","Bestand · Lager · Hot IA","Wachsen","Sie kassieren und verkaufen","auch online.","Ihr Kunde zahlt mit SINPE Móvil oder Karte, und Ihr Onlineshop nutzt denselben Bestand wie der Laden.","SINPE Móvil · Karte · Onlineshop","Sie kassieren an der Kasse,","der Bestand sinkt von selbst.","Wir helfen Ihnen, die Lieferung","Ihrer Produkte zu koordinieren.","Ihr Kunde wählt, wie er die Bestellung erhält, und Sie führen sie im System Schritt für Schritt weiter.","Abholung oder Versand","Ihr Kunde wählt Abholung im Laden, Versand oder Paketdienst und sieht die Kosten vor dem Bezahlen.","Benachrichtigung bei jedem Schritt","Jedes Mal, wenn Sie die Bestellung weiterführen, erhält Ihr Kunde eine E-Mail mit dem Status.","Verfolgung per Link","Ihr Kunde verfolgt die Bestellung ohne Konto. Geht sie mit Correos de Costa Rica, tragen Sie die Sendungsnummer ein und er erhält sie.","Abholservice in der GAM","Vorerst im Großraum San José können Sie uns bitten, das Paket abzuholen.","30 Minuten · unverbindlich","Bestellung 1042","Standardversand · GAM","Bezahlt","SINPE Móvil bestätigt","In Vorbereitung","2 Produkte","Versendet","Sendungsnummer eingetragen","Zugestellt","Bestellung abgeschlossen","Donnerstag","E-Mail an den Kunden","Nachricht gesendet","Geschäfte wie Ihres.","Bekleidungsgeschäfte","Tante-Emma-Läden","Cafés","Buchhandlungen","Eisenwarenläden","Tierbedarf","Geschenke","Schönheit und Kosmetik","Kunsthandwerk","Geschäfte von zu Hause","Marktstände","Schuhgeschäfte","Gemischtwarenläden","Technikläden","Naturprodukte","Spielwarenläden","Dekoration","Konditoreien","Sportgeschäfte","Kleine Unternehmen","Welches ist Ihr Geschäft?","Sehen Sie, welches Ihrem am ähnlichsten ist. In der Demo gehen wir es gemeinsam durch.","Ich verkaufe von zu Hause oder auf Märkten","Plan Emprendedor · ₡0 pro Monat","Wachsende kleine Unternehmen","Ich habe einen Laden und ein Team","Plan PyME · ₡12.900 pro Monat","Kompletter Betrieb","Mehrere Kassen und viele Produkte","Plan Negocio Plus · ₡28.900 pro Monat","Ordnen Sie Ihren Verkauf","vom ersten Tag an.","Sie verkaufen von zu Hause, auf Märkten oder per Nachricht und führen Ihre Zahlen in einem Heft oder im Chat.","Kassieren ohne Umstände","Sie kassieren mit SINPE Móvil, Karte oder Bargeld an derselben Kasse.","Wissen, was noch da ist","Jeder Verkauf wird vom Bestand abgezogen, und Sie erfahren es, bevor die Ware ausgeht.","Ihre Produkte bleiben veröffentlicht, und Kunden kaufen auch, wenn Sie gerade nicht bedienen.","Klare Zahlen","Verkaufsberichte zeigen, was sich bewegt, ohne von Hand zu rechnen.","₡0 pro Monat · 9 % pro Verkauf","Bis zu 50 Produkte · 2 Benutzer · 1 Lager · 1 Kasse","Samstagsmarkt","","","Zwei Kassen,","ein einziger Bestand.","Sie haben einen Laden, ein paar Angestellte und feste Lieferanten, und ein Notizbuch oder ein Chat reichen nicht mehr.","Mehr Hände, dieselbe Ordnung","Bis zu 5 Benutzer, 2 Lager und 2 Kassen arbeiten mit demselben Bestand.","Einkäufe ohne Zettelwirtschaft","Sie erfassen, was Sie bei Lieferanten einkaufen, und Ihr Bestand wird aktualisiert.","Eigene Geschenkkarten","Ihre Kunden können Guthaben verschenken, das in Ihrem Geschäft eingelöst wird.","Hot IA an Ihrer Seite","Hot IA antwortet mit den Daten Ihres Geschäfts und enthält 80 Credits.","₡12.900 pro Monat · 7,5 % pro Verkauf","Bis zu 500 Produkte · 5 Benutzer · 2 Lager · 2 Kassen","2 Lager","Produkt","Laden","Lager","Niedriger Bestand","Einkauf beim Lieferanten","+24 Stück","Ohne Obergrenzen.","Lernen Sie Ihre Kunden kennen.","Sie haben ein Team, mehrere Kassen, viele Produkte und Stammkunden. Sie brauchen ein System, das Sie nicht bremst.","Ohne Grenzen","Produkte, Lager, Kassen und Benutzer ohne Obergrenze, auch wenn das Geschäft weiter wächst.","Kunden griffbereit","Das CRM bündelt die Daten Ihrer Kunden an einem Ort.","Hot IA ohne Limit","Fragen Sie Hot IA so oft Sie möchten, mit den Daten Ihres Geschäfts.","Alles aus PyME","Einkäufe bei Lieferanten, Geschenkkarten und Berichte, wie in PyME.","₡28.900 pro Monat · 6 % pro Verkauf","Produkte, Lager, Kassen und Benutzer ohne Limit","Kunden","Letzter Kauf: gestern","Letzter Kauf: vor 6 Tagen","Letzter Kauf: vor 2 Wochen","Wer hat diesen Monat am meisten gekauft?","María Rojas, mit ₡184.000 in 5 Käufen.","Die drei Pläne im Vergleich.","","Monatsgebühr","Provision pro Verkauf","Produkte","Ohne Limit","Benutzer","Lager","Kassen (POS)","Ja","Einkäufe bei Lieferanten","Kunden-CRM","80 Credits","Preise in Colones · Die Provision wird nur berechnet, wenn es einen Verkauf gibt","So läuft die Demo.","Heute","Sie buchen einen Termin","Wählen Sie Tag und Uhrzeit. Sie erhalten die Einladung mit dem Google-Meet-Link.","30 Minuten","Sie sehen es live","Wir machen einen Verkauf, bewegen Bestand und kassieren, mit Produkten wie Ihren.","Danach","Sie entscheiden in Ruhe","Wir sagen Ihnen, welcher Plan passt. Wenn Sie weitermachen möchten, helfen wir Ihnen, das Konto zu eröffnen.","Häufige Fragen.","Kostet die Demo etwas?","Sie kostet nichts. Es sind 30 Minuten, unverbindlich. Buchen Sie unten.","Muss ich aufhören, über meine Netzwerke oder meinen Laden zu verkaufen?","Nein. HotClick ist ein weiterer Kanal für Ihr Geschäft. Sie verkaufen weiter dort, wo Sie schon verkaufen.","Wie erhalte ich das Geld aus meinen Verkäufen?","Wir zahlen Ihre Verkäufe alle zwei Wochen oder jeden Monat aus, je nach Ihrer Wahl.","Was brauche ich, um es zu nutzen?","Ein Handy oder einen Computer mit Internet. Es läuft im Browser.","Ich habe viele Produkte. Muss ich sie einzeln eintippen?","Nein. Sie können Ihren Katalog aus einem PDF oder über einen Link laden. Wir haben auch einen Service, der in Ihren Laden kommt und den Bestand digital erfasst.","Mit wem werde ich sprechen?","Mit einer Person aus dem HotClick-Team in Costa Rica, Montag bis Samstag.","Wählen Sie einen Tag.","Wir zeigen Ihnen das System mit Ihrem Geschäft.","Demo des Systems","Dauer","Ort","Zeitzone","Ihr Name","E-Mail","Name des Geschäfts","Plan, der Sie interessiert","Zurück","Bestätigen","Termin gebucht","Wir haben die Kalendereinladung mit dem Google-Meet-Link an die angegebene E-Mail-Adresse gesendet.","Visueller Prototyp: Diese Buchung wird noch nicht gespeichert oder gesendet.","Anderen Termin wählen","Möchten Sie uns lieber schreiben?","· Montag bis Samstag, 8:00 bis 19:00 Uhr","Per WhatsApp schreiben","Ihr Geschäft, ein weiterer Kanal · © 2026","Animationen pausieren","Animationen fortsetzen","30-Minuten-Demo über Google Meet","HotClick für Geschäfte, Startseite","Bereiche","Sprache","Heller oder dunkler Modus","Beispiel der Kasse des HotClick-Systems","Ein Verkauf an der Kasse oder im Onlineshop wird vom selben Bestand abgezogen","Beispiel für die Schritte einer Bestellung","Beispiel eines Verkaufs an der Kasse","Beispiel für Bestand in zwei Lagern","Beispiel für Kunden und eine Anfrage an Hot IA","Vorheriger Monat","Nächster Monat","Soziale Netzwerke","Schreiben Sie uns per WhatsApp und wir vereinbaren Ihre 30-Minuten-Demo über Google Meet.","Kalender in neuem Tab öffnen","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","Problem","Lösung","Du verkaufst auf dem Markt und über WhatsApp und rechnest im Kopf.","Mit HotClick wird jeder Verkauf automatisch erfasst und dein Onlineshop weiß, was noch da ist.","Mit zwei Kassen und einem Notizbuch weiß niemand, wie viele Einheiten wirklich übrig sind.","Mit HotClick verkaufen beide Kassen aus demselben Bestand, und die Lieferantenbestellung füllt ihn auf.","Bei mehreren Filialen musst du anrufen oder hinfahren, um zu wissen, wie es läuft.","Mit HotClick siehst du alles in einem Dashboard, ohne Limits, und erkennst Stammkunden wieder.","pro Monat","pro Verkauf","50 Produkte","2 Benutzer","1 Lager","1 Kasse","500 Produkte","5 Benutzer","2 Kassen","Unbegrenzte Produkte","Unbegrenzte Benutzer","Unbegrenzte Lager","Unbegrenzte Kassen","Das Problem","Die Lösung","Was du zahlst","In der Geschichte ansehen","Du merkst dir Verkäufe im Kopf","Du versprichst etwas, das schon verkauft ist","Du zahlst Geld zurück und verlierst Vertrauen","Jeder Verkauf bucht den Bestand ab","Dein Onlineshop aktualisiert sich sofort","Du wirst gewarnt, bevor etwas ausgeht","Jede Kasse schreibt in ihr eigenes Heft","Du bietest Ware an, die es nicht mehr gibt","Du merkst zu spät, dass es aus ist","Beide Kassen teilen den Bestand","Meldet, wenn ein Produkt ausgeht","Einkauf erfassen, Bestand wird aufgefüllt","Papierberichte aus jeder Filiale","Du weißt nicht, welche Filiale Ware braucht","Niemand erkennt deine Stammkunden","Alle Filialen in einem Dashboard","Hot IA sagt dir, wo Ware fehlt","Das CRM erkennt jeden Kunden",""],"zh":["包含内容","配送","您的生意","演示流程","常见问题","预约演示","面向哥斯达黎加商家的销售系统","在店里卖。","在网上卖。","只用一套库存。","收银 (POS)、库存、收款和网店，专为哥斯达黎加商家打造。30 分钟为您演示。","查看包含内容","30 分钟 · Google Meet · 日期和时间由您选择","您卖什么？","咖啡","服装","五金","手工艺","收银台","班次已开 · 10:42","","","","合计（含增值税）","银行卡","现金","付款已确认","库存已更新","示例数据","全部功能在同一个面板","销售点 (POS)","库存","销售报表","网店","我们不会取代您的","店铺","也不会取代您的","社交账号","。我们是多一个","销售渠道","帮您多卖一些。","您的生意，多一个渠道。","库存和仓库","SINPE Móvil 和银行卡收款","您的网店","先看到它运行，再做决定。","Emprendedor 方案的月费，按每笔销售收取佣金","演示时长（分钟）","按规模选择的方案","每周客服天数","包含内容。","销售","您在","柜台销售。","开班、用条码扫描器收款，一天结束时结账。","销售点 (POS) · 收银结账 · 销售报表","管理","您清楚","还剩多少货。","按仓库查看库存并收到低库存提醒。在 PyME 和 Negocio Plus 方案中，Hot IA 会用您的数据回答。","库存 · 仓库 · Hot IA","增长","您收款和销售","也可以在网上。","顾客用 SINPE Móvil 或银行卡付款，您的网店与实体店共用同一套库存。","SINPE Móvil · 银行卡 · 网店","在收银台收款，","库存自动减少。","我们帮您协调","商品的配送。","顾客选择收货方式，您在系统里按阶段推进订单。","自取或配送","顾客可选择到店自取、配送或包裹托运，并在付款前看到费用。","每个阶段都有通知","每次您推进订单，顾客都会收到一封说明状态的邮件。","用链接跟踪","顾客无需注册即可跟踪订单。如果通过哥斯达黎加邮政寄送，您填入运单号，顾客就会收到。","大都会区上门取件","目前在大都会区（GAM），您可以让我们上门取包裹。","30 分钟 · 无需承诺","订单 1042","普通配送 · GAM","已付款","SINPE Móvil 已核实","备货中","2 件商品","已发货","运单号已填写","已送达","订单完成","星期四","发给顾客的邮件","通知已发送","和您一样的商家。","服装店","小卖部","咖啡店","书店","五金店","宠物店","礼品店","美容和化妆品","手工艺品","居家生意","集市摊位","鞋店","杂货店","数码店","天然产品","玩具店","家居装饰","烘焙店","体育用品店","小型创业","您的生意是哪一种？","看看哪一种最像您的生意。演示时我们一起看。","我在家里或集市上卖货","Emprendedor 方案 · 每月 ₡0","成长中的中小商家","我有店面和团队","PyME 方案 · 每月 ₡12.900","完整运营","多个收银台、商品很多","Negocio Plus 方案 · 每月 ₡28.900","把销售理顺","从第一天开始。","您在家里、集市或通过消息卖货，用本子或聊天记录记账。","收款不麻烦","在同一个收银台用 SINPE Móvil、银行卡或现金收款。","清楚还剩多少货","每笔销售都会扣减库存，缺货之前您就会知道。","您的商品保持上架，您不在的时候顾客也能下单。","数字一目了然","销售报表让您知道什么卖得动，不用手工加总。","每月 ₡0 · 每笔销售 9%","最多 50 件商品 · 2 个用户 · 1 个仓库 · 1 个收银台","周六集市","","","两个收银台，","一套库存。","您有店面、几名员工和固定供应商，本子和聊天记录已经不够用了。","人手更多，秩序不变","最多 5 个用户、2 个仓库和 2 个收银台共用同一套库存。","采购不再靠小纸条","您登记向供应商采购的货物，库存随之更新。","自己的礼品卡","顾客可以赠送余额，在您的店里消费。","Hot IA 在您身边","Hot IA 用您生意的数据回答，并包含 80 个额度。","每月 ₡12.900 · 每笔销售 7.5%","最多 500 件商品 · 5 个用户 · 2 个仓库 · 2 个收银台","2 个仓库","商品","店面","仓库","库存不足","向供应商采购","+24 件","没有上限。","了解您的顾客。","您有团队、多个收银台、大量商品和回头客。您需要一个不拖后腿的系统。","没有限制","商品、仓库、收银台和用户都没有上限，生意继续增长也不受影响。","顾客信息随手可查","CRM 把顾客的数据集中在一个地方。","Hot IA 不限次数","随时向 Hot IA 提问，用的是您生意的数据。","包含 PyME 的全部功能","供应商采购、礼品卡和报表，与 PyME 相同。","每月 ₡28.900 · 每笔销售 6%","商品、仓库、收银台和用户不限数量","顾客","上次购买：昨天","上次购买：6 天前","上次购买：2 周前","这个月谁买得最多？","María Rojas，5 次购买共 ₡184.000。","三个方案，放在一起看。","","月费","每笔销售佣金","商品","不限","用户","仓库","收银台 (POS)","有","供应商采购","顾客 CRM","80 个额度","价格以科朗计 · 只有成交时才收取佣金","演示流程。","今天","您预约一个时间","选择日期和时间。您会收到带有 Google Meet 链接的邀请。","30 分钟","现场观看","我们做一笔销售、调整库存并收款，用的是和您类似的商品。","之后","从容决定","我们告诉您哪个方案适合。如果您想继续，我们帮您开通账户。","常见问题。","演示收费吗？","不收费。只需 30 分钟，无需承诺。请在下方预约。","我需要停止在社交账号或店里销售吗？","不需要。HotClick 是您生意的又一个渠道。您照常在原来的地方销售。","我怎样收到销售款？","我们每两周或每月与您结算，由您选择。","使用它需要什么？","一部能上网的手机或电脑。在浏览器里就能用。","我的商品很多。要一件一件录入吗？","不用。您可以通过 PDF 或链接导入商品目录。我们还有上门服务，到您店里把库存数字化。","我会和谁沟通？","与哥斯达黎加 HotClick 团队的工作人员沟通，周一至周六。","选一个日子。","我们用您的生意为您演示系统。","系统演示","时长","地点","时区","您的姓名","电子邮箱","商家名称","您感兴趣的方案","返回","确认","会议已预约","我们已把带有 Google Meet 链接的日历邀请发送到您留下的邮箱。","视觉原型：此预约尚未保存或发送。","选择其他时间","想直接给我们留言？","· 周一至周六，8:00 至 19:00","通过 WhatsApp 联系","您的生意，多一个渠道 · © 2026","暂停动画","继续动画","通过 Google Meet 进行 30 分钟演示","HotClick 商家版，首页","栏目","语言","浅色或深色模式","HotClick 系统收银台示例","收银台或网店的每笔销售都会扣减同一套库存","订单各阶段示例","收银台销售示例","两个仓库的库存示例","顾客列表和 Hot IA 查询示例","上个月","下个月","社交账号","通过 WhatsApp 联系我们，我们为您安排 30 分钟的 Google Meet 演示。","在新标签页中打开日历","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","问题","解决方案","你在市集和 WhatsApp 上卖货，全靠脑子记账。","用 HotClick，每笔销售自动记录，网店也知道还剩多少。","两个收银台加一本本子，没人知道到底还剩多少件。","用 HotClick，两个收银台共用同一库存，向供应商采购即可补货。","有好几家店，想知道每家情况就得打电话或亲自跑一趟。","用 HotClick，一个面板看全部，没有上限，还能认出回头客。","每月","每笔销售","50 个商品","2 个用户","1 个仓库","1 个收银台","500 个商品","5 个用户","2 个收银台","商品不限","用户不限","仓库不限","收银台不限","问题","解决方案","你需要支付","在故事中查看","销售全靠脑子记","答应了已经卖掉的东西","退钱又失去信任","每笔销售自动扣库存","网店即时更新","缺货前提醒你","每个收银台各记各的","卖出已经没有的货","很晚才发现卖完了","两个收银台共用库存","商品卖完时提醒","记录采购，库存自动补上","每家店都是纸质报表","不知道哪家店缺货","没人认得你的老顾客","所有门店一个面板","Hot IA 告诉你哪里缺货","CRM 认得每位顾客",""]};
  var LOC={es:'es-CR',en:'en',pt:'pt-BR',fr:'fr',de:'de',zh:'zh-CN'};
  var idx={}; ES.forEach(function(s,i){idx[s]=i;});
  var norm=function(s){return s.replace(/\s+/g,' ').trim();};
  var nodes=[],attrs=[],typed=[];
  var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
  while((n=w.nextNode())){
    var p=n.parentElement; if(!p||p.closest('script,style,select,[data-noi18n]')) continue;
    var k=norm(n.nodeValue); if(!(k in idx)) continue;
    if(p.hasAttribute('data-type')){typed.push({el:p,i:idx[k]});continue;}
    var m=n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
    nodes.push({node:n,i:idx[k],pre:m[1]?' ':'',post:m[2]?' ':''});
  }
  [].forEach.call(document.querySelectorAll('[aria-label],[placeholder]'),function(e){
    ['aria-label','placeholder'].forEach(function(a){var v=e.getAttribute(a);if(v&&(v in idx))attrs.push({el:e,a:a,i:idx[v]});});
  });
  function tr(l,i){var t=T[l];return (l!=='es'&&t&&t[i]!=null&&t[i]!=='')?t[i]:ES[i];}
  function lang(l){
    if(!LOC[l]) l='es';
    nodes.forEach(function(x){x.node.nodeValue=x.pre+tr(l,x.i)+x.post;});
    attrs.forEach(function(x){x.el.setAttribute(x.a,tr(l,x.i));});
    typed.forEach(function(x){var s=tr(l,x.i);x.el.setAttribute('data-full',s);x.el.setAttribute('aria-label',s);x.el.textContent=s;});
    root.lang=LOC[l]; window.hcLang=LOC[l];
    try{document.dispatchEvent(new CustomEvent('hc-lang',{detail:LOC[l]}));}catch(e){}
  }
  var sel=document.getElementById('lang'),saved=store.get('hc-lang');
  if(!saved){var nav=(navigator.language||'es').slice(0,2).toLowerCase();saved=LOC[nav]?nav:'es';}
  if(!LOC[saved]) saved='es';
  sel.value=saved; window.hcLang=LOC[saved]; if(saved!=='es') lang(saved);
  sel.addEventListener('change',function(){store.set('hc-lang',sel.value);lang(sel.value);});
}();;
/* Movimiento al hacer scroll */
!function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root=document.documentElement; root.classList.add('js');
  var all=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  var clamp=function(v){return v<0?0:v>1?1:v};
  var jobs=[], measures=[];
  /* Cada tarea lee primero (read) y escribe después (write): así no se fuerza el recálculo de la página en cada paso. */
  function job(el,read,write){jobs.push({el:el,read:read,write:write,was:true,v:null,done:false});}

  /* Panel rojo del hero: crece un poco al empezar a bajar */
  all('.stage').forEach(function(el){
    var last=-1;
    job(el,function(){return clamp((window.pageYOffset||root.scrollTop||0)/320);},function(g){if(g!==last){last=g;el.style.setProperty('--g',g.toFixed(3));}});
  });

  /* Manifiesto: las palabras se encienden al avanzar */
  all('[data-reveal]').forEach(function(el){
    el.innerHTML=el.textContent.trim().split(/\s+/).map(function(w){return '<span>'+w+'</span>'}).join(' ');
    var ws=el.children,n=ws.length,S=6,last=-1;
    job(el,function(r,vh){return clamp((vh*.85-r.top)/(vh*.4+r.height));},function(p){
      if(Math.abs(p-last)<.002) return; last=p;
      for(var i=0;i<n;i++) ws[i].style.opacity=(.2+.8*clamp((p*(n+S)-i)/S)).toFixed(2);
    });
  });

  /* Lista: marca roja que barre la línea que pasa por el centro */
  var mkPitch=60;
  measures.push(function(){var m=document.querySelector('.mk');if(m)mkPitch=parseFloat(getComputedStyle(m).lineHeight)||m.offsetHeight||60;});
  all('.mk').forEach(function(el){
    var last=-1;
    job(el,function(r,vh){var dy=Math.abs(r.top+r.height/2-vh*.5)-r.height/2;return clamp(1-dy/(mkPitch*.55));},function(v){
      v=Math.round(v*20)/20; if(v!==last){last=v;el.style.setProperty('--h',v);}
    });
  });

  /* Tarjetas apiladas: la anterior se encoge y oscurece */
  var cards=all('.slab'),tops=[],stack=cards[0]&&cards[0].parentNode;
  measures.push(function(){
    if(!stack) return;
    stack.classList.remove('nostick');
    var tall=false;
    cards.forEach(function(c,i){tops[i]=parseFloat(getComputedStyle(c).top)||0;if(c.offsetHeight>innerHeight-tops[i]-24)tall=true;});
    stack.classList.toggle('nostick',tall);
  });
  cards.forEach(function(c,i){
    var nx=cards[i+1],last=-1; if(!nx) return;
    job(c,function(r){var b=nx.getBoundingClientRect();return clamp((r.bottom-b.top)/Math.max(1,r.height-16));},function(p){
      p=Math.round(p*200)/200; if(p!==last){last=p;c.style.setProperty('--p',p);}
    });
  });

  /* Línea de tiempo */
  all('[data-tl]').forEach(function(tl){
    var fill=tl.querySelector('.tl-line i'),steps=all('li',tl),dots=steps.map(function(li){return li.querySelector('.dot')});
    job(tl,function(r,vh){
      var m=vh*.55;
      return {f:clamp((m-r.top)/r.height),on:dots.map(function(d){var b=d.getBoundingClientRect();return b.top+b.height/2<=m;})};
    },function(v){
      fill.style.setProperty('--f',v.f.toFixed(3));
      steps.forEach(function(li,i){li.classList.toggle('on',v.on[i]);});
    });
  });

  /* Cifras que cuentan (una sola vez, y siempre terminan en su valor) */
  all('[data-count]').forEach(function(el){
    var to=+el.getAttribute('data-count'); el.textContent='0';
    var j={el:el,was:true,v:null,done:false,read:function(r,vh){return r.top<vh*.9&&r.bottom>0;},write:function(seen){
      if(!seen||j.done) return; j.done=true; var t0=0;
      requestAnimationFrame(function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1400);el.textContent=k<1?Math.round(to*(1-Math.pow(1-k,3))):to;if(k<1)requestAnimationFrame(f);});
      setTimeout(function(){el.textContent=to;},2200);
    }};
    jobs.push(j);
  });

  /* Entrada suave de bloques (por posición; no depende de observadores) */
  all('.title,.demo3 li,.demo-cta,.manifest h2,.seg-head p,.jump a,.seg-grid>div,.cmp-wrap,.fine,.faq details,.cal,.cal-embed,.booking h2,.cal-foot,.warp h2,.fcard,.fcore,.fcap,.gloss>div,.steps3 li,.qz fieldset').forEach(function(el){
    var i=0,p=el; while((p=p.previousElementSibling)) i++;
    if(el.matches('.jump a,.faq details,.demo3 li,.fcard,.gloss>div,.steps3 li')) el.style.setProperty('--o',Math.min(i,4));
    el.setAttribute('data-in','');
    var j={el:el,was:true,v:null,done:false,read:function(r,vh){return r.top<vh*.94;},write:function(seen){if(seen&&!j.done){j.done=true;el.classList.add('in');}}};
    jobs.push(j);
  });

  /* Escenas 3D: se arman pieza por pieza según el scroll y flotan un poco al cruzar la pantalla */
  all('.scene').forEach(function(el){
    var ls=-1,lp=1e9;
    job(el,function(r,vh){return {sp:clamp((vh*.96-r.top)/(vh*.55)),py:clamp((r.top+r.height/2)/vh)-.5};},function(v){
      var sp=Math.round(v.sp*50)/50,py=Math.round(v.py*-26);
      if(sp!==ls){ls=sp;el.style.setProperty('--sp',sp);el.classList.toggle('built',sp>=1);}
      if(py!==lp){lp=py;el.style.setProperty('--py',py+'px');}
    });
  });

  /* Escenas vivas: se animan solas solo mientras están en pantalla */
  all('.scene').forEach(function(el){
    var last=null;
    job(el,function(r,vh){return r.bottom>0&&r.top<vh;},function(v){if(v!==last){last=v;el.classList.toggle('live',v);}});
  });

  /* Historias «Antes / Con HotClick»: alternan cada 5,6 s mientras se ven */
  all('.story').forEach(function(st){
    var t=0,on=false,wipe=st.querySelector('.wipe');
    function flip(){
      if(root.classList.contains('paused')) return;
      st.setAttribute('data-s',st.getAttribute('data-s')==='a'?'b':'a');
      if(wipe){wipe.classList.remove('go');void wipe.offsetWidth;wipe.classList.add('go');}
    }
    job(st,function(r,vh){return r.top<vh*.85&&r.bottom>vh*.15;},function(v){
      if(v&&!on){on=true;st.setAttribute('data-s','a');st.classList.add('run');t=setInterval(flip,5600);}
      else if(!v&&on){on=false;clearInterval(t);st.classList.remove('run');}
    });
  });

  /* Pausar o reanudar todas las animaciones */
  (function(){
    var b=document.getElementById('pause'); if(!b) return;
    b.addEventListener('click',function(){
      var p=!root.classList.contains('paused'); root.classList.toggle('paused',p); b.setAttribute('aria-pressed',String(p));
      b.querySelector('.p-on').hidden=p; b.querySelector('.p-off').hidden=!p;
    });
  })();

  /* Pantallas de ejemplo: la venta, el inventario y la consulta se reproducen solas al verse */
  all('[data-play]').forEach(function(m){
    var sts=all('.st',m),tal=all('[data-tally]',m),typ=all('[data-type]',m),ans=all('.ia .a',m),timers=[],loop=0,on=false;
    sts.forEach(function(e,i){e.style.setProperty('--s',i);});
    m.style.setProperty('--steps',sts.length);
    typ.forEach(function(e){e.setAttribute('data-full',e.textContent);e.setAttribute('aria-label',e.textContent);});
    function idx(e){var p=e.closest('.st');return p?sts.indexOf(p):0;}
    function later(fn,ms){timers.push(setTimeout(fn,ms));}
    function money(n){return '₡'+String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
    function play(){
      timers.forEach(clearTimeout); timers=[];
      m.classList.remove('play'); void m.offsetWidth; m.classList.add('play');
      tal.forEach(function(e){
        var to=+e.getAttribute('data-tally'); e.textContent=money(0);
        later(function(){var t0=0;requestAnimationFrame(function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/900);e.textContent=money(to*(1-Math.pow(1-k,3)));if(k<1&&on)requestAnimationFrame(f);else e.textContent=money(to);});},idx(e)*420+150);
      });
      ans.forEach(function(a){a.classList.remove('show');});
      typ.forEach(function(e){
        var full=e.getAttribute('data-full'),start=idx(e)*420+500; e.textContent='';
        for(var i=1;i<=full.length;i++)(function(i){later(function(){e.textContent=full.slice(0,i);},start+i*38);})(i);
        later(function(){ans.forEach(function(a){a.classList.add('show');});},start+full.length*38+350);
      });
    }
    function rest(){timers.forEach(clearTimeout);timers=[];tal.forEach(function(e){e.textContent=money(+e.getAttribute('data-tally'));});typ.forEach(function(e){e.textContent=e.getAttribute('data-full');});}
    job(m,function(r,vh){return r.top<vh*.82&&r.bottom>vh*.18&&(!m.classList.contains('scene')||m.classList.contains('built'))&&!root.classList.contains('paused');},function(v){
      if(v&&!on){on=true;play();loop=setInterval(play,9500);}
      else if(!v&&on){on=false;clearInterval(loop);rest();}
    });
  });

  /* Barra fija para agendar */
  (function(){
    var dock=document.getElementById('dock'),hero=document.getElementById('inicio'),ag=document.getElementById('agenda'),last=null;
    if(!dock||!hero||!ag) return;
    job(root,function(r,vh){return hero.getBoundingClientRect().bottom<vh*.3&&ag.getBoundingClientRect().top>vh*.8;},function(v){if(v!==last){last=v;dock.classList.toggle('on',v);}});
  })();

  /* Carriles: rayas rojas y azules que cruzan como la estela del logo */
  all('[data-warp]').forEach(function(cv){
    var ctx=cv.getContext('2d'); if(!ctx) return;
    var W=0,H=0,N=innerWidth<768?12:18,raf=0,last=0,ls=[],seen=false;
    function seed(s,any){s.len=40+Math.random()*220;s.x=any?Math.random()*(W+300)-300:-s.len-Math.random()*200;s.y=Math.random()*H;s.v=1.2+Math.random()*4.2;s.w=1.5+Math.random()*3;s.blue=Math.random()<.34;}
    function size(){var d=Math.min(devicePixelRatio||1,1.5),r=cv.getBoundingClientRect();if(!r.width)return;W=r.width;H=r.height;cv.width=Math.round(W*d);cv.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);ctx.lineCap='butt';}
    function draw(dt){
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<N;i++){
        var s=ls[i]; s.x+=s.v*dt; if(s.x>W+40){seed(s,false);continue;}
        var mid=Math.abs(s.y-H/2)/(H/2),a=(.25+.75*clamp((mid-.18)*2.2))*clamp(s.v/5+.25);
        ctx.strokeStyle=(s.blue?'rgba(122,163,242,':'rgba(240,82,74,')+(a*.55).toFixed(2)+')';
        ctx.lineWidth=s.w;
        ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.len,s.y-s.len*.06);ctx.stroke();
      }
    }
    function loop(t){var dt=last?Math.min(3,(t-last)/16.67):1;last=t;if(!root.classList.contains('paused'))draw(dt);raf=seen?requestAnimationFrame(loop):0;}
    size(); for(var i=0;i<N;i++){var s={};seed(s,true);ls.push(s);}
    measures.push(size);
    job(cv,function(r,vh){return r.bottom>0&&r.top<vh;},function(v){
      if(v===seen) return; seen=v;
      if(seen&&!raf){last=0;raf=requestAnimationFrame(loop);}
    });
  });

  var queued=false;
  function run(){
    queued=false;
    var vh=innerHeight,i,j,r,vis;
    for(i=0;i<jobs.length;i++){
      j=jobs[i]; if(j.done){j.skip=true;continue;}
      r=j.el.getBoundingClientRect(); vis=r.bottom>-vh&&r.top<2*vh;
      j.skip=!vis&&!j.was; j.was=vis;
      if(!j.skip) j.v=j.read(r,vh);
    }
    for(i=0;i<jobs.length;i++){j=jobs[i]; if(!j.skip) j.write(j.v);}
  }
  function ask(){if(!queued){queued=true;requestAnimationFrame(run);}}
  function measure(){for(var i=0;i<measures.length;i++)measures[i]();jobs.forEach(function(j){j.was=true;});ask();}
  addEventListener('scroll',ask,{passive:true});
  document.addEventListener('scroll',ask,{passive:true,capture:true});
  var rz=0; addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(measure,120);});
  addEventListener('load',measure);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(measure);
  measure(); run();
}();;
/* CALENDARIO DE RESERVAS
   Opción A — Google Calendar con Google Meet (recomendada):
     pegá en GCAL_URL el enlace de tu página de reservas de Google Calendar
     (Google Calendar > Crear > Horario de citas > Compartir).
   Opción B — Cal.com: pegá en CAL_LINK el evento, sin "https://cal.com/". Ejemplo: "hotclick/demo" */
var GCAL_URL = "";
var CAL_LINK = "";

/* MINI QUIZ: filtra negocios antes de agendar o pagar.
   PAY_URL: página para abrir la cuenta y pagar el plan. POR CONFIRMAR.
   QUIZ_BLOQUEADOS: valores de la pregunta 1 que no se aceptan. PROVISIONAL: confirmar contra las políticas de ONVO. */
var PAY_URL = "https://hotclick.lat/registro-empresa";
var QUIZ_BLOQUEADOS = ["comida", "salud", "regulado"];

(function(){
  var f = document.getElementById("qz"); if (!f) return;
  var ok = document.getElementById("qz-ok"), no = document.getElementById("qz-no"), hint = f.querySelector(".qz-hint");
  var q2 = f.querySelector('[data-q="2"]'), q3 = f.querySelector('[data-q="3"]');
  [].forEach.call(f.querySelectorAll(".qz-pay"), function (a) { a.href = PAY_URL; });
  function val(n) { var e = f.querySelector('input[name="' + n + '"]:checked'); return e ? e.value : ""; }
  function show(el) { el.hidden = false; if (el.scrollIntoView && !el.dataset.seen) { el.dataset.seen = "1"; el.scrollIntoView({ behavior: "smooth", block: "nearest" }); } }
  function update() {
    var a = val("q1"), b = val("q2"), c = val("q3"), blocked = a && QUIZ_BLOQUEADOS.indexOf(a) >= 0;
    ok.hidden = true; no.hidden = true;
    q2.classList.toggle("qz-off", !!blocked); q3.classList.toggle("qz-off", !!blocked);
    if (blocked) { hint.hidden = true; show(no); return; }
    if (!(a && b && c)) { hint.hidden = false; return; }
    hint.hidden = true;
    var plan = (b === "varios" || c === "muchos") ? "plus" : (b === "local" || c === "medio") ? "pyme" : "emp";
    [].forEach.call(ok.querySelectorAll(".qz-plan"), function (p) { p.hidden = p.getAttribute("data-plan") !== plan; });
    ok.querySelector(".qz-otro").hidden = a !== "otro";
    show(ok);
  }
  f.addEventListener("change", update);
  f.addEventListener("submit", function (e) { e.preventDefault(); });
  [].forEach.call(f.querySelectorAll(".qz-reset"), function (r) {
    r.addEventListener("click", function () {
      f.reset(); ok.dataset.seen = ""; no.dataset.seen = ""; update();
      var fs = f.querySelector('[data-q="1"]'); if (fs.scrollIntoView) fs.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();

(function(){
  var box = document.getElementById("cal-embed"), wait = document.getElementById("cal-wait");
  if (GCAL_URL) {
    var src = /[?&]gv=/.test(GCAL_URL) ? GCAL_URL : GCAL_URL + (GCAL_URL.indexOf("?") < 0 ? "?" : "&") + "gv=true";
    var load = function () {
      if (box.getAttribute("data-on")) return;
      box.setAttribute("data-on", "1"); if (wait) wait.remove(); box.classList.add("g");
      var fr = document.createElement("iframe"); fr.src = src; fr.title = "Agenda de demos de HotClick"; box.appendChild(fr);
      var a = document.getElementById("cal-open"); if (a) { a.href = GCAL_URL; a.hidden = false; }
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { o.disconnect(); load(); } }, { rootMargin: "600px 0px" }).observe(box);
    else load();
    return;
  }
  if (!CAL_LINK) return;
  (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
  if (wait) wait.remove();
  Cal("init", "demo", { origin: "https://cal.com" });
  Cal.ns.demo("inline", { elementOrSelector: "#cal-embed", config: { layout: "month_view", theme: "dark" }, calLink: CAL_LINK });
  Cal.ns.demo("ui", { theme: "dark", hideEventTypeDetails: false, layout: "month_view",
    cssVarsPerTheme: { light: { "cal-brand": "#1747A8" }, dark: { "cal-brand": "#7AA3F2" } } });
})();;
/* Historias animadas por plan (motor GSAP en historia/) */
(function(){if(!window.HCStory)return;window.HCI={};[].forEach.call(document.querySelectorAll(".hs-host"),function(h){var d=HCStory.defs[h.getAttribute("data-story")];if(d)HCI[h.getAttribute("data-story")]=HCStory.mount(h,d);});})();;
/* Actos sincronizados con la historia de cada plan */
!function(){
  var lists=[].slice.call(document.querySelectorAll('.acts[data-story]')); if(!lists.length) return;
  lists.forEach(function(ol){
    var acts=[].slice.call(ol.querySelectorAll('.act')), key=ol.getAttribute('data-story');
    function m(){return window.HCI&&HCI[key];}
    acts.forEach(function(li){
      function go(e){ if(e&&e.target.closest('a,summary,details')) return; var x=m(); if(x) x.go(+li.getAttribute('data-j')); }
      li.addEventListener('click',go);
      li.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&e.target===li){ e.preventDefault(); go(); } });
    });
    var last=-1;
    function tick(){
      var x=m(); if(!x) return;
      if(!ol.classList.contains('live')) ol.classList.add('live');
      var B=x.beats,t=x.tl.time(),h=B[8],e=B[15],ph=t<h?0:(t<e?1:2);
      if(ph!==last){ last=ph; acts.forEach(function(li,i){ li.classList.toggle('on',i===ph); }); }
      acts[0].style.setProperty('--p',Math.min(1,t/h).toFixed(3));
      acts[1].style.setProperty('--p',t<h?'0':Math.min(1,(t-h)/(e-h)).toFixed(3));
    }
    if(window.gsap) gsap.ticker.add(tick);
  });
}();
