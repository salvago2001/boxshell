/**
 * import-wallapop.ts
 * Extrae todos tus anuncios de Wallapop conectándose a un Chrome
 * ya abierto con sesión iniciada, vía CDP (Chrome DevTools Protocol).
 *
 * Solo lectura — no modifica ningún dato en Wallapop.
 *
 * Uso: npm run import:wallapop
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as https from 'https';
import * as http from 'http';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// ─── Rutas ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const OUTPUT_FILE   = path.join(__dirname, 'wallapop-export.json');
const PARTIAL_FILE  = path.join(__dirname, 'wallapop-export-partial.json');
const PHOTOS_DIR    = path.join(__dirname, 'wallapop-photos');

// ─── Tipo compatible con Item[] de BoxSell ────────────────────────────────────
interface WallapopItem {
  id:          string;
  nfcUid:      string;
  boxId:       string;
  name:        string;
  description: string;
  price:       number;
  soldPrice:   number;
  status:      'stock' | 'reserved' | 'sold';
  wallapopUrl: string;
  photos:      string[];   // base64
  tags:        string[];
  notes:       string;
  createdAt:   string;
  updatedAt:   string;
  soldAt:      string;
}

// ─── Estado de progreso ───────────────────────────────────────────────────────
interface PartialProgress {
  scrapedUrls: string[];   // URLs ya procesadas completamente
  items:        WallapopItem[];
  photoErrors:  string[];
}

// ─── Utilidades de consola ────────────────────────────────────────────────────
function log(msg: string)  { console.log(msg); }
function info(msg: string) { console.log(`  \x1b[36m→\x1b[0m ${msg}`); }
function ok(msg: string)   { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg: string) { console.log(`  \x1b[33m⚠\x1b[0m ${msg}`); }
function err(msg: string)  { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} [s/n]: `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 's');
    });
  });
}

function askText(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question}: `, answer => { rl.close(); resolve(answer.trim()); });
  });
}

function randomDelay(min = 1500, max = 3500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Descarga de imagen → base64 ──────────────────────────────────────────────
function downloadImageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadImageToBase64(res.headers.location!).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const buf    = Buffer.concat(chunks);
        const mime   = res.headers['content-type'] || 'image/jpeg';
        const b64    = buf.toString('base64');
        resolve(`data:${mime};base64,${b64}`);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── Guardar fotos en disco (adicional al base64) ─────────────────────────────
async function savePhotoToDisk(
  url: string,
  itemId: string,
  index: number
): Promise<void> {
  const dir = path.join(PHOTOS_DIR, itemId);
  fs.mkdirSync(dir, { recursive: true });
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        savePhotoToDisk(res.headers.location!, itemId, index).then(resolve).catch(reject);
        return;
      }
      const ext  = (res.headers['content-type'] || '').includes('png') ? 'png' : 'jpg';
      const file = fs.createWriteStream(path.join(dir, `${index}.${ext}`));
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error',  reject);
    }).on('error', reject);
  });
}

// ─── Guardar progreso parcial ─────────────────────────────────────────────────
function savePartial(progress: PartialProgress): void {
  fs.writeFileSync(PARTIAL_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// ─── Guardar resultado final ──────────────────────────────────────────────────
function saveFinal(items: WallapopItem[]): void {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2), 'utf8');
}

// ─── Mapeo de estado ──────────────────────────────────────────────────────────
function mapStatus(raw: string): 'stock' | 'reserved' | 'sold' {
  const s = raw.toLowerCase();
  if (s.includes('reserv'))         return 'reserved';
  if (s.includes('vend') || s.includes('sold')) return 'sold';
  return 'stock';
}

// ─── Extraer precio numérico ──────────────────────────────────────────────────
function parsePrice(raw: string): number {
  const match = raw.replace(/\./g, '').replace(',', '.').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// ─── Intentar un selector con fallback interactivo ────────────────────────────
async function trySelect(
  page: Page,
  selectors: string[],
  description: string,
  allowSkip = false
): Promise<string | null> {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) return sel;
    } catch { /* continuar */ }
  }

  warn(`No encontré el selector para: ${description}`);
  warn(`Selectores probados: ${selectors.join(', ')}`);

  if (allowSkip) {
    const skip = await askYesNo('¿Saltar este elemento y continuar?');
    if (skip) return null;
  }

  const custom = await askText(
    'Inspecciona el elemento en Chrome y escribe el selector CSS correcto'
  );
  return custom || null;
}

// ─── Navegar al perfil y obtener la URL de "mis artículos" ───────────────────
async function navigateToMyItems(page: Page): Promise<void> {
  // Comprobar si ya estamos en una página de Wallapop
  const currentUrl = page.url();
  const alreadyOnWallapop = currentUrl.includes('wallapop.com');

  if (alreadyOnWallapop) {
    info(`Pestaña de Wallapop detectada: ${currentUrl}`);
  } else {
    info('Abriendo Wallapop en el navegador...');
    await page.goto('https://es.wallapop.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await checkProtection(page);
  }

  // Comprobar si ya estamos en "Mis artículos"
  const isOnMyItems = page.url().includes('mis-articulos') || page.url().includes('my-items');
  if (isOnMyItems) {
    info('Ya estás en la página de tus artículos.');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    info(`URL actual: ${page.url()}`);
    return;
  }

  // Guiar al usuario para navegar manualmente — más fiable que intentar hacer click en un UI que cambia
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────┐');
  console.log('  │  Navega a TUS ARTÍCULOS en Chrome:                  │');
  console.log('  │  1. Haz click en tu avatar / foto de perfil         │');
  console.log('  │  2. Selecciona "Mis artículos" o "Mis productos"    │');
  console.log('  │  3. Espera a que cargue la página con tus anuncios  │');
  console.log('  └─────────────────────────────────────────────────────┘');
  console.log('');
  await waitForEnter('  Pulsa ENTER cuando estés en la página de tus artículos...');

  // Esperar a que la SPA termine de renderizar
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await checkProtection(page);

  const finalUrl = page.url();
  info(`URL actual: ${finalUrl}`);

  if (!finalUrl.includes('wallapop.com')) {
    warn('La URL no parece ser de Wallapop. Asegúrate de estar en la página correcta.');
  }
}

// ─── Detectar protecciones (Cloudflare, CAPTCHA, página en blanco) ───────────
async function checkProtection(page: Page): Promise<void> {
  const title = page.title ? await page.title() : '';
  const url   = page.url();

  // Cloudflare "Just a moment..." challenge
  if (
    title.includes('Just a moment') ||
    title.includes('Momento') ||
    url.includes('cdn-cgi') ||
    url.includes('/challenge')
  ) {
    warn('┌─ Cloudflare / verificación de navegador detectada ─┐');
    warn('│  Completa el desafío manualmente en Chrome          │');
    warn('└────────────────────────────────────────────────────┘');
    await waitForEnter('  Pulsa ENTER cuando la página haya cargado correctamente...');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    return;
  }

  // Página en blanco o vacía
  const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? '').catch(() => '');
  if (!bodyText) {
    warn('La página parece estar en blanco.');
    warn(`URL: ${url} | Título: "${title}"`);
    await page.screenshot({ path: path.join(__dirname, 'debug-wallapop-blank.png') }).catch(() => {});
    warn('Screenshot guardado en scripts/debug-wallapop-blank.png');
    await waitForEnter('  Revisa Chrome, recarga si es necesario y pulsa ENTER para continuar...');
    return;
  }

  // CAPTCHA clásico (reCAPTCHA / hCaptcha) — solo iframes visibles, sin class/id genéricos
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[title*="reCAPTCHA"]',
    'iframe[title*="hCaptcha"]',
  ];

  for (const sel of captchaSelectors) {
    const el = await page.$(sel);
    if (el && await el.isVisible().catch(() => false)) {
      warn('¡CAPTCHA detectado!');
      warn('Resuélvelo manualmente en Chrome y pulsa ENTER para continuar...');
      await waitForEnter('');
      return;
    }
  }
}

// Alias para compatibilidad con llamadas anteriores a checkCaptcha
async function checkCaptcha(page: Page): Promise<void> {
  return checkProtection(page);
}

// ─── Extraer anuncios del listado (sin entrar en cada ficha) ─────────────────
async function scrapeListings(page: Page): Promise<Array<{
  title: string;
  price: number;
  status: 'stock' | 'reserved' | 'sold';
  url: string;
  thumbnail: string;
}>> {
  // Selectores candidatos para los cards de anuncio
  const cardSelectors = [
    '[data-testid*="item"]',
    '[class*="ItemCard"]',
    '[class*="item-card"]',
    'walla-grid-card',
    'a[href*="/item/"]',
    '[class*="product-card"]',
    '[class*="listing"]',
  ];

  // Esperar a que la SPA de Wallapop termine de renderizar
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Verificar protecciones antes de leer el DOM
  await checkProtection(page);

  let workingSelector: string | null = null;
  for (const sel of cardSelectors) {
    const count = await page.$$(sel).then(els => els.length).catch(() => 0);
    if (count > 0) { workingSelector = sel; break; }
  }

  if (!workingSelector) {
    warn('No encontré cards de anuncios en la página actual.');

    // Diagnóstico: mostrar texto visible y guardar screenshot
    const preview = await page.evaluate(() =>
      (document.body?.innerText ?? '').slice(0, 600).replace(/\s+/g, ' ')
    ).catch(() => '');
    warn(`Texto visible en la página: "${preview}"`);
    await page.screenshot({ path: path.join(__dirname, 'debug-wallapop-listings.png') }).catch(() => {});
    warn('Screenshot guardado en scripts/debug-wallapop-listings.png');

    warn('Probando estructura alternativa — introduce el selector CSS de las tarjetas...');
    workingSelector = await trySelect(page, cardSelectors, 'tarjetas de anuncio');
    if (!workingSelector) throw new Error('No se encontraron anuncios en la página.');
  }

  // Detectar total de anuncios si está indicado
  const totalSelectors = [
    '[data-testid*="count"]',
    '[class*="count"]',
    'span:has-text("artículo")',
    'h1:has-text("artículo")',
    '[class*="total"]',
  ];

  for (const sel of totalSelectors) {
    try {
      const el   = await page.$(sel);
      const text = el ? await el.textContent() : null;
      if (text && /\d+/.test(text)) {
        const num = text.match(/\d+/)?.[0];
        if (num) { info(`Total indicado por Wallapop: ${num} anuncios`); break; }
      }
    } catch { /* continuar */ }
  }

  // ── Scroll infinito o botón "Ver más" ────────────────────────────────────
  info('Cargando todos los anuncios...');
  let prevCount = 0;
  let stable    = 0;

  while (stable < 3) {
    // Intentar botón "Ver más"
    const loadMoreSelectors = [
      'button:has-text("Ver más")',
      'button:has-text("Cargar más")',
      'button:has-text("Load more")',
      '[data-testid*="load-more"]',
      '[class*="load-more"]',
    ];

    let clickedButton = false;
    for (const sel of loadMoreSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(2000);
          clickedButton = true;
          break;
        }
      } catch { /* continuar */ }
    }

    // Scroll al final si no hay botón
    if (!clickedButton) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    const currentCount = await page.$$(workingSelector).then(els => els.length).catch(() => 0);
    if (currentCount === prevCount) {
      stable++;
    } else {
      stable    = 0;
      prevCount = currentCount;
    }
  }

  const totalFound = await page.$$(workingSelector).then(els => els.length).catch(() => 0);
  ok(`Encontrados ${totalFound} anuncios`);

  // ── Extraer datos de cada card ────────────────────────────────────────────
  const items = await page.evaluate((sel: string) => {
    const results: Array<{
      title:     string;
      priceRaw:  string;
      statusRaw: string;
      url:       string;
      thumbnail: string;
    }> = [];

    const cards = document.querySelectorAll<HTMLElement>(sel);

    cards.forEach(card => {
      // URL
      const link = card.tagName === 'A'
        ? card as HTMLAnchorElement
        : card.querySelector<HTMLAnchorElement>('a[href*="/item/"]');
      const url = link?.href || '';
      if (!url) return;

      // Título
      const titleEl =
        card.querySelector('[class*="title"]') ||
        card.querySelector('h3') ||
        card.querySelector('h2') ||
        card.querySelector('p');
      const title = titleEl?.textContent?.trim() || '';

      // Precio
      const priceEl =
        card.querySelector('[class*="price"]') ||
        card.querySelector('[class*="Price"]') ||
        card.querySelector('[data-testid*="price"]');
      const priceRaw = priceEl?.textContent?.trim() || '0';

      // Estado (badge sobre la imagen, texto, etc.)
      const statusEl =
        card.querySelector('[class*="status"]')  ||
        card.querySelector('[class*="badge"]')   ||
        card.querySelector('[class*="sold"]')    ||
        card.querySelector('[class*="reserved"]');
      const statusRaw = statusEl?.textContent?.trim() || 'stock';

      // Thumbnail
      const img = card.querySelector<HTMLImageElement>('img');
      const thumbnail = img?.src || img?.dataset.src || '';

      results.push({ title, priceRaw, statusRaw, url, thumbnail });
    });

    return results;
  }, workingSelector);

  return items.map(i => ({
    title:     i.title,
    price:     parsePrice(i.priceRaw),
    status:    mapStatus(i.statusRaw),
    url:       i.url,
    thumbnail: i.thumbnail,
  }));
}

// ─── Extraer detalles de una ficha ────────────────────────────────────────────
async function scrapeDetail(page: Page, url: string): Promise<{
  description: string;
  photoUrls:   string[];
  createdAt:   string;
  tags:        string[];
}> {
  await checkCaptcha(page);

  const descSelectors = [
    '[data-testid*="description"]',
    '[class*="description"]',
    '[class*="Description"]',
    'walla-detail-description',
    '[itemprop="description"]',
  ];

  const photoSelectors = [
    '[data-testid*="gallery"] img',
    '[class*="gallery"] img',
    '[class*="carousel"] img',
    'walla-gallery img',
    '[class*="photo"] img',
    '[class*="slide"] img',
    'img[class*="detail"]',
  ];

  const dateSelectors = [
    '[data-testid*="date"]',
    '[class*="date"]',
    'time',
    '[datetime]',
    '[class*="publish"]',
  ];

  // Selectores de categoría ordenados de más a menos específico.
  // NOTA: evitamos [class*="tag"] porque es demasiado genérico y captura
  //       elementos de UI de Wallapop que no son la categoría del artículo.
  const tagSelectors = [
    // Breadcrumb de categoría — el más fiable (muestra "Electrónica > Móviles"…)
    '[data-testid="item-detail-category-breadcrumb"] a',
    '[data-testid*="breadcrumb"] a',
    '[data-testid*="category"] a',
    // Hashtags del anuncio (aparecen bajo la descripción)
    '[data-testid*="hashtag"]',
    '[data-testid*="tag"]:not([data-testid*="price"]):not([data-testid*="status"])',
    // Fallbacks estructurales — solo breadcrumb, no cualquier elemento con "tag"
    '[class*="breadcrumb"] a',
    '[class*="Breadcrumb"] a',
    '[class*="category-path"] a',
    '[class*="categoryPath"] a',
  ];

  // Texto que indican navegación genérica de Wallapop (no categorías del artículo)
  const SKIP_TAGS = new Set([
    'inicio', 'home', 'wallapop', 'mi perfil', 'vender', 'subir', 'chat',
    'favoritos', 'notificaciones', 'buscar', 'ajustes', 'ayuda', '...', '›', '/',
  ]);

  // Descripción
  let description = '';
  for (const sel of descSelectors) {
    const el = await page.$(sel);
    if (el) { description = (await el.textContent() || '').trim(); break; }
  }

  // Fotos
  const photoUrls: string[] = [];
  for (const sel of photoSelectors) {
    const imgs = await page.$$(sel);
    if (imgs.length > 0) {
      for (const img of imgs) {
        const src =
          await img.getAttribute('src') ||
          await img.getAttribute('data-src') ||
          await img.getAttribute('data-original') || '';
        if (src && !src.startsWith('data:') && !photoUrls.includes(src)) {
          photoUrls.push(src);
        }
      }
      if (photoUrls.length > 0) break;
    }
  }

  // Fecha
  let createdAt = new Date().toISOString();
  for (const sel of dateSelectors) {
    const el = await page.$(sel);
    if (el) {
      const dt = await el.getAttribute('datetime');
      const tx = await el.textContent();
      if (dt) { createdAt = new Date(dt).toISOString(); break; }
      if (tx && tx.trim()) { createdAt = tx.trim(); break; }
    }
  }

  // Tags / Categoría
  // Probamos selectores en orden; al primer grupo que devuelva resultados, paramos.
  const tags: string[] = [];
  for (const sel of tagSelectors) {
    const els = await page.$$(sel);
    if (els.length > 0) {
      const candidates: string[] = [];
      for (const el of els) {
        const text = (await el.textContent() || '').trim();
        const lower = text.toLowerCase();
        if (text && text.length > 1 && text.length < 60 && !SKIP_TAGS.has(lower)) {
          if (!candidates.includes(text)) candidates.push(text);
        }
      }
      if (candidates.length > 0) {
        tags.push(...candidates);
        break;
      }
    }
  }

  return { description, photoUrls, createdAt, tags };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // ── 1. Instrucciones previas ───────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  PASOS PREVIOS — léelos antes de continuar               ║
║                                                          ║
║  1. Abre Google Chrome manualmente                       ║
║  2. Ve a https://es.wallapop.com e inicia sesión         ║
║  3. Lanza Chrome con depuración remota activada:         ║
║                                                          ║
║  Mac/Linux:                                              ║
║  /Applications/Google\\ Chrome.app/Contents/MacOS/       ║
║  Google\\ Chrome --remote-debugging-port=9222            ║
║                                                          ║
║  Windows (PowerShell):                                   ║
║  & "C:\\Program Files\\Google\\Chrome\\Application\\        ║
║    chrome.exe" --remote-debugging-port=9222              ║
║                                                          ║
║  4. Pulsa ENTER aquí cuando estés listo                  ║
╚══════════════════════════════════════════════════════════╝
`);

  await waitForEnter('  Pulsa ENTER para continuar...');

  // ── 2. Detectar progreso parcial ───────────────────────────────────────────
  let progress: PartialProgress = { scrapedUrls: [], items: [], photoErrors: [] };
  let resuming = false;

  if (fs.existsSync(PARTIAL_FILE)) {
    warn(`Encontré un progreso parcial en ${PARTIAL_FILE}`);
    const partial = JSON.parse(fs.readFileSync(PARTIAL_FILE, 'utf8')) as PartialProgress;
    info(`  ${partial.items.length} anuncios ya procesados`);
    const resume = await askYesNo('¿Continuar desde donde se quedó?');
    if (resume) {
      progress = partial;
      resuming  = true;
      ok(`Continuando desde el anuncio ${progress.items.length + 1}`);
    } else {
      info('Empezando de cero...');
    }
  }

  // ── 3. Conectar a Chrome vía CDP ───────────────────────────────────────────
  let browser: Browser;
  try {
    info('Conectando a Chrome en localhost:9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    ok('Conectado a Chrome');
  } catch (e) {
    err('No se pudo conectar a Chrome en el puerto 9222.');
    err('Asegúrate de haber arrancado Chrome con:');
    err('  & "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222  (Windows PowerShell)');
    err('  Google\\ Chrome --remote-debugging-port=9222  (Mac/Linux)');
    err(`Detalle técnico: ${(e as Error).message}`);
    process.exit(1);
  }

  // ── 4. Obtener el contexto y la pestaña activa ─────────────────────────────
  const contexts = browser.contexts();
  const context: BrowserContext = contexts[0] ?? await browser.newContext();

  let page: Page;
  const pages = context.pages();
  if (pages.length > 0) {
    page = pages[0];
    info(`Reutilizando pestaña: ${page.url()}`);
  } else {
    page = await context.newPage();
    info('Abriendo nueva pestaña');
  }

  // ── 5. Navegar a "Mis artículos" ───────────────────────────────────────────
  if (!resuming) {
    await navigateToMyItems(page);
  } else {
    info('Sesión reanudada — asegúrate de que Chrome está en la página de tus artículos.');
    await waitForEnter('Navega a tus artículos en Chrome y pulsa ENTER...');
  }

  // ── 6. Extraer el listado ──────────────────────────────────────────────────
  let listings: Awaited<ReturnType<typeof scrapeListings>> = [];
  try {
    listings = await scrapeListings(page);
  } catch (e) {
    err(`Error al extraer el listado: ${(e as Error).message}`);
    err('Asegúrate de estar en la página de tus artículos y vuelve a intentarlo.');
    process.exit(1);
  }

  if (listings.length === 0) {
    warn('No se encontraron anuncios. Verifica que estás en la página correcta.');
    process.exit(0);
  }

  // Filtrar los ya procesados si estamos reanudando
  const pending = resuming
    ? listings.filter(l => !progress.scrapedUrls.includes(l.url))
    : listings;

  info(`${pending.length} anuncios por procesar (de ${listings.length} totales)`);

  // ── 7. Entrar en cada ficha ────────────────────────────────────────────────
  let photoDownloaded = 0;
  const totalItems = listings.length;
  const startIndex = progress.items.length;

  for (let i = 0; i < pending.length; i++) {
    const listing   = pending[i];
    const globalIdx = startIndex + i + 1;

    info(`${globalIdx}/${totalItems} — Cargando: ${listing.title || listing.url}`);

    // Navegar a la ficha
    try {
      await page.goto(listing.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    } catch (e) {
      warn(`No se pudo cargar ${listing.url}: ${(e as Error).message}`);
      progress.photoErrors.push(`${listing.url}: no se pudo cargar la ficha`);
      savePartial(progress);
      continue;
    }

    await checkCaptcha(page);
    await page.waitForTimeout(1000);

    // Extraer detalle
    let detail: Awaited<ReturnType<typeof scrapeDetail>>;
    try {
      detail = await scrapeDetail(page, listing.url);
    } catch (e) {
      warn(`Error al extraer detalle de ${listing.url}: ${(e as Error).message}`);
      detail = { description: '', photoUrls: [], createdAt: new Date().toISOString(), tags: [] };
    }

    // Descargar fotos
    const photoSrcs = detail.photoUrls.length > 0 ? detail.photoUrls : [listing.thumbnail].filter(Boolean);
    const photos: string[] = [];
    const itemId = randomUUID();

    for (let p = 0; p < photoSrcs.length; p++) {
      const photoUrl = photoSrcs[p];
      try {
        const b64 = await downloadImageToBase64(photoUrl);
        photos.push(b64);
        await savePhotoToDisk(photoUrl, itemId, p + 1).catch(() => {}); // no crítico
        photoDownloaded++;
      } catch (e) {
        const msg = `${listing.url} foto ${p + 1}: ${(e as Error).message}`;
        warn(`Error descargando foto: ${msg}`);
        progress.photoErrors.push(msg);
      }
    }

    // Determinar fechas
    let createdAt: string;
    try {
      createdAt = new Date(detail.createdAt).toISOString();
    } catch {
      createdAt = new Date().toISOString();
    }

    const item: WallapopItem = {
      id:          itemId,
      nfcUid:      '',
      boxId:       '',
      name:        listing.title,
      description: detail.description,
      price:       listing.price,
      soldPrice:   listing.status === 'sold' ? listing.price : 0,
      status:      listing.status,
      wallapopUrl: listing.url,
      photos,
      tags:        detail.tags,
      notes:       '',
      createdAt,
      updatedAt:   createdAt,
      soldAt:      listing.status === 'sold' ? createdAt : '',
    };

    progress.items.push(item);
    progress.scrapedUrls.push(listing.url);

    // Guardar parcial cada 10 anuncios
    if (progress.items.length % 10 === 0) {
      savePartial(progress);
      info(`Progreso guardado (${progress.items.length} anuncios)`);
    }

    // Delay aleatorio entre fichas
    if (i < pending.length - 1) {
      await randomDelay(1500, 3500);
    }
  }

  // ── 8. Guardar resultado final ─────────────────────────────────────────────
  saveFinal(progress.items);

  // Borrar archivo parcial si terminó bien
  if (fs.existsSync(PARTIAL_FILE)) {
    fs.unlinkSync(PARTIAL_FILE);
  }

  // ── 9. Resumen ─────────────────────────────────────────────────────────────
  const stockCount    = progress.items.filter(i => i.status === 'stock').length;
  const reservedCount = progress.items.filter(i => i.status === 'reserved').length;
  const soldCount     = progress.items.filter(i => i.status === 'sold').length;

  console.log('');
  console.log('─────────────────────────────────────────────');
  ok(`${progress.items.length} anuncios exportados`);
  ok(`${stockCount} en stock / ${reservedCount} reservados / ${soldCount} vendidos`);
  ok(`${photoDownloaded} fotos descargadas / ${progress.photoErrors.length} errores`);
  log(`  → Archivo guardado en scripts/wallapop-export.json`);
  log(`  → Importa este archivo en BoxSell desde Ajustes → Importar JSON`);
  console.log('─────────────────────────────────────────────');

  if (progress.photoErrors.length > 0) {
    warn('Errores de fotos:');
    progress.photoErrors.forEach(e => warn(`  ${e}`));
  }

  await browser.close().catch(() => {});
}

main().catch(e => {
  err(`Error inesperado: ${e.message}`);
  process.exit(1);
});
