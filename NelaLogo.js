const toSvgData = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

// The original woven-ribbon N concept, refined with cleaner proportions,
// a more confident crossing and a quieter, more luxurious signature detail.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2d5"/><stop offset=".32" stop-color="#dfc48e"/><stop offset=".7" stop-color="#a97e40"/><stop offset="1" stop-color="#f5e3bd"/></linearGradient>
 <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0cf"/><stop offset="1" stop-color="#b18a4c"/></linearGradient>
</defs>
<path d="M112 365C77 267 105 151 194 94C268 47 367 68 414 139" fill="none" stroke="url(#gold)" stroke-width="2" opacity=".34"/>
<path d="M400 374C324 449 210 448 132 378" fill="none" stroke="url(#gold)" stroke-width="2" opacity=".25"/>
<path d="M157 367C143 299 139 205 175 151C198 116 230 124 261 160L355 274C376 300 393 326 381 359" fill="none" stroke="url(#gold)" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M365 143C385 210 383 296 350 349C330 381 300 373 271 340L177 229C157 205 143 179 151 149" fill="none" stroke="url(#edge)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M260 160L355 274" fill="none" stroke="#fff3d9" stroke-width="2.5" stroke-linecap="round" opacity=".82"/>
<path d="M256 87L262 103L278 109L262 115L256 131L250 115L234 109L250 103Z" fill="#ead4a5" opacity=".82"/>
</svg>`;
export const NELA_MARK_DATA = toSvgData(mark);
export const NELA_LOGO_DATA = toSvgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 850">
<defs>
 <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2d5"/><stop offset=".32" stop-color="#dfc48e"/><stop offset=".7" stop-color="#a97e40"/><stop offset="1" stop-color="#f5e3bd"/></linearGradient>
 <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0cf"/><stop offset="1" stop-color="#b18a4c"/></linearGradient>
</defs>
<path d="M157 595C108 459 147 290 271 207C374 138 512 167 578 265" fill="none" stroke="url(#g)" stroke-width="2" opacity=".34"/>
<path d="M558 608C451 713 292 711 183 613" fill="none" stroke="url(#g)" stroke-width="2" opacity=".25"/>
<path d="M221 595C202 500 196 369 246 294C278 246 323 257 366 307L498 466C528 503 552 539 535 585" fill="none" stroke="url(#g)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M511 283C539 377 536 497 490 570C461 614 419 604 378 559L247 404C219 370 198 333 209 291" fill="none" stroke="url(#edge)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M366 307L498 466" fill="none" stroke="#fff3d9" stroke-width="3" stroke-linecap="round" opacity=".82"/>
<path d="M360 202L368 224L390 232L368 240L360 262L352 240L330 232L352 224Z" fill="#ead4a5" opacity=".82"/>
<path d="M260 681H460" stroke="url(#g)" stroke-width="1.5" opacity=".65"/>
<circle cx="360" cy="681" r="4" fill="#d9bd83"/>
<text x="360" y="765" text-anchor="middle" fill="url(#g)" font-family="Cormorant Garamond,Georgia,serif" font-size="94" font-weight="500" letter-spacing="25">NELA</text>
<text x="360" y="807" text-anchor="middle" fill="#c8a66a" font-family="Manrope,Arial,sans-serif" font-size="16" font-weight="600" letter-spacing="7">AI ΓΡΑΜΜΑΤΕΙΑ</text>
</svg>`);
