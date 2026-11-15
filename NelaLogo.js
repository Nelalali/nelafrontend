const toSvgData = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

// NELA's bespoke woven monogram: an asymmetric ribbon, orbital strokes and a
// small four-point signature star. Drawn specifically for this identity.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0cf"/><stop offset=".34" stop-color="#d9bd83"/><stop offset=".72" stop-color="#b18a4c"/><stop offset="1" stop-color="#f0ddb3"/></linearGradient>
 <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f9ebcd"/><stop offset="1" stop-color="#a47b3e"/></linearGradient>
</defs>
<path d="M94 330C62 230 108 111 214 75C306 43 402 91 432 177" fill="none" stroke="url(#gold)" stroke-width="1.8" opacity=".55"/>
<path d="M419 211C446 308 390 407 294 438C210 465 126 424 87 358" fill="none" stroke="url(#gold)" stroke-width="1.8" opacity=".32"/>
<path d="M151 361C131 295 127 209 163 161C188 128 222 134 253 170L350 286C370 311 385 337 379 365" fill="none" stroke="url(#gold)" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M365 147C386 214 386 297 354 349C335 380 303 377 273 342L177 226C157 202 143 177 149 148" fill="none" stroke="url(#shine)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".96"/>
<path d="M252 169L350 286" fill="none" stroke="#fff0d0" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
<path d="M256 82L263 101L282 108L263 115L256 134L249 115L230 108L249 101Z" fill="#ead4a5" opacity=".9"/>
<circle cx="379" cy="365" r="5" fill="#f3dfb6"/>
</svg>`;
export const NELA_MARK_DATA = toSvgData(mark);
export const NELA_LOGO_DATA = toSvgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 850">
<defs>
 <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0cf"/><stop offset=".34" stop-color="#d9bd83"/><stop offset=".72" stop-color="#b18a4c"/><stop offset="1" stop-color="#f0ddb3"/></linearGradient>
 <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f9ebcd"/><stop offset="1" stop-color="#a47b3e"/></linearGradient>
</defs>
<path d="M150 345C105 205 174 76 315 50C440 27 555 108 579 220" fill="none" stroke="url(#g)" stroke-width="2" opacity=".48"/>
<path d="M562 265C596 398 504 530 375 566C257 599 140 538 105 445" fill="none" stroke="url(#g)" stroke-width="2" opacity=".3"/>
<path d="M231 427C204 335 198 220 247 155C281 110 326 118 367 168L499 326C526 361 547 397 539 435" fill="none" stroke="url(#g)" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M520 137C549 229 549 341 505 411C479 453 436 449 395 402L264 244C235 211 216 177 224 138" fill="none" stroke="url(#shine)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M367 168L499 326" fill="none" stroke="#fff0d0" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
<path d="M360 54L369 78L393 87L369 96L360 120L351 96L327 87L351 78Z" fill="#ead4a5"/>
<path d="M260 625H460" stroke="url(#g)" stroke-width="1.5" opacity=".65"/>
<circle cx="360" cy="625" r="4" fill="#d9bd83"/>
<text x="360" y="730" text-anchor="middle" fill="url(#g)" font-family="Cormorant Garamond,Georgia,serif" font-size="100" font-weight="500" letter-spacing="28">NELA</text>
<text x="360" y="780" text-anchor="middle" fill="#c8a66a" font-family="Manrope,Arial,sans-serif" font-size="17" font-weight="600" letter-spacing="8">AI RECEPTIONIST</text>
</svg>`);
