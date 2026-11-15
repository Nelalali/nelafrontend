const toSvgData = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

// NELA signature: a bespoke architectural monogram, drawn as a single gold line.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5e7c8"/><stop offset=".42" stop-color="#c8a66a"/><stop offset="1" stop-color="#866437"/></linearGradient>
 <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d7bb83" stop-opacity=".12"/><stop offset="1" stop-color="#d7bb83" stop-opacity="0"/></linearGradient>
</defs>
<path d="M256 30C370 30 462 122 462 256S370 482 256 482 50 390 50 256 142 30 256 30Z" fill="url(#fill)" stroke="url(#gold)" stroke-width="3"/>
<path d="M256 55C356 55 437 136 437 256S356 457 256 457 75 376 75 256 156 55 256 55Z" fill="none" stroke="#d4b77e" stroke-opacity=".24" stroke-width="1"/>
<path d="M163 351V161L349 351V161" fill="none" stroke="url(#gold)" stroke-width="25" stroke-linecap="square" stroke-linejoin="miter"/>
<path d="M148 161h30M334 161h30" stroke="#f5e7c8" stroke-width="2" stroke-linecap="round" opacity=".8"/>
<path d="M214 391h84" stroke="#c8a66a" stroke-width="1.5" opacity=".7"/>
<circle cx="256" cy="391" r="3.5" fill="#e6d1a2"/>
</svg>`;

export const NELA_MARK_DATA = toSvgData(mark);
export const NELA_LOGO_DATA = toSvgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 850">
<defs>
 <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5e7c8"/><stop offset=".42" stop-color="#c8a66a"/><stop offset="1" stop-color="#866437"/></linearGradient>
 <linearGradient id="wash" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d7bb83" stop-opacity=".12"/><stop offset="1" stop-color="#d7bb83" stop-opacity="0"/></linearGradient>
</defs>
<path d="M360 35C493 35 600 142 600 275S493 515 360 515 120 408 120 275 227 35 360 35Z" fill="url(#wash)" stroke="url(#g)" stroke-width="3"/>
<path d="M360 61C478 61 574 157 574 275S478 489 360 489 146 393 146 275 242 61 360 61Z" fill="none" stroke="#d4b77e" stroke-opacity=".24"/>
<path d="M252 390V160L468 390V160" fill="none" stroke="url(#g)" stroke-width="27" stroke-linecap="square"/>
<path d="M235 160h34M451 160h34" stroke="#f5e7c8" stroke-width="2"/>
<path d="M275 572H445" stroke="url(#g)" stroke-width="1.5" opacity=".7"/>
<circle cx="360" cy="572" r="4" fill="#c8a66a"/>
<text x="360" y="680" text-anchor="middle" fill="url(#g)" font-family="Cormorant Garamond,Georgia,serif" font-size="100" font-weight="500" letter-spacing="28">NELA</text>
<text x="360" y="735" text-anchor="middle" fill="#c8a66a" font-family="Manrope,Arial,sans-serif" font-size="17" font-weight="600" letter-spacing="8">AI RECEPTIONIST</text>
<text x="360" y="773" text-anchor="middle" fill="#a98a55" font-family="Manrope,Arial,sans-serif" font-size="12" letter-spacing="5">BOOK · MANAGE · RELAX</text>
</svg>`);
