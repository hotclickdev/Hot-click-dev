import{a as e}from"./rolldown-runtime-BYbx6iT9.js";import{h as t,s as n}from"./vendor-clerk-DisX1_A1.js";import{n as r}from"./vendor-motion-97T6-8CT.js";var i=e(t(),1),a=e(n(),1),o={primary:`hc-btn-primary`,secondary:`hc-btn-outline`,ghost:`hc-btn-ghost`,danger:`hc-btn-danger`,success:`hc-btn-success`},s={sm:`hc-btn-sm`,md:``,lg:`hc-btn-lg`,xl:`hc-btn-xl`},c=(0,i.forwardRef)(({variant:e=`primary`,size:t=`md`,className:n=``,disabled:i,loading:c,children:l,icon:u,...d},f)=>(0,a.jsxs)(r.button,{ref:f,whileTap:!i&&!c?{scale:.97}:{},transition:{duration:.12},disabled:i||c,className:`
        hc-btn
        ${o[e]}
        ${s[t]}
        disabled:opacity-40 disabled:cursor-not-allowed
        ${n}
      `,...d,children:[c&&(0,a.jsxs)(`svg`,{className:`animate-spin h-4 w-4 shrink-0`,fill:`none`,viewBox:`0 0 24 24`,children:[(0,a.jsx)(`circle`,{className:`opacity-25`,cx:`12`,cy:`12`,r:`10`,stroke:`currentColor`,strokeWidth:`4`}),(0,a.jsx)(`path`,{className:`opacity-75`,fill:`currentColor`,d:`M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z`})]}),!c&&u&&(0,a.jsx)(`span`,{className:`shrink-0`,children:u}),l]}));c.displayName=`Button`;export{c as t};