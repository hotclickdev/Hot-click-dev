import{a as e}from"./rolldown-runtime-BYbx6iT9.js";import{d as t,r as n}from"./vendor-clerk-QdevMKxx.js";var r=e(t(),1),i=e(n(),1),a=(0,r.forwardRef)(({label:e,error:t,hint:n,icon:a,id:o,className:s=``,containerClassName:c=``,type:l=`text`,...u},d)=>{let f=(0,r.useId)(),p=o||f;return(0,i.jsxs)(`div`,{className:`flex flex-col gap-1.5 ${c}`,children:[e&&(0,i.jsx)(`label`,{htmlFor:p,className:`hc-input-label`,children:e}),(0,i.jsxs)(`div`,{className:`relative`,children:[a&&(0,i.jsx)(`div`,{className:`absolute left-3.5 top-1/2 -translate-y-1/2 hc-input-icon pointer-events-none`,children:a}),(0,i.jsx)(`input`,{ref:d,id:p,type:l,className:`
            hc-input
            ${a?`pl-10 pr-4`:`px-4`}
            ${t?`hc-input-error-state`:``}
            disabled:opacity-40 disabled:cursor-not-allowed
            ${s}
          `,...u})]}),t&&(0,i.jsx)(`p`,{className:`hc-input-error`,children:t}),n&&!t&&(0,i.jsx)(`p`,{className:`hc-input-hint`,children:n})]})});a.displayName=`Input`;export{a as t};