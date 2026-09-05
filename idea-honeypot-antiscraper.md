# Idea: señuelos anti-scraper de datos Nostr (honeypot)

**Estado:** idea para implementar en otra ocasión. No implementada aún.

## Objetivo
Evitar que bots/scraper que copian el HTML crudo o hacen `grep "npub1"` (o `wss://`) sobre el repo/sitio encuentren datos reales de Nostr. Que las cifras falsas los confundan y repliquen señuelos en vez de lo auténtico.

## Problema hoy
- `js/ui/rightpanel.js:261` tiene el npub del Blog (Nostr) **hardcodeado como literal** → un `grep npub1` revela la identidad real sin esfuerzo.
- `js/utils/relays.js` lista los relays reales `wss://` en texto plano.
- `index.html` se sirve tal cual por GitHub Pages: cualquiera lo descarga completo.

## Concepto central
Que un scraper automático encuentre SOLO datos falsos, y los reales se compongan en runtime (fragmentos concatenados, no como literal). Un humano con intención lo descifra; un bot no.

## Cambios propuestos

1. **NUEVO `js/utils/honeypot.js`**
   - `REAL_NPUB` compuesto por partes (ej: `"npub1" + "zdy6e00hkv" + "pus0wwt4..."`), nunca string completo.
   - `REAL_RELAYS` por fragmentos.
   - `plantDecoys()`: inyecta bloque señuelo en el DOM si falta.

2. **`index.html` — señuelos estáticos (lo que ve un `wget`/espejo)**
   - `<meta name="nostr:nprofile" content="npub1FALSO...">`
   - Bloque oculto `aria-hidden="true"` con relays falsos (`wss://relay.fake`) y npub falso bech32 válido pero inexistente.
   - `<script type="application/ld+json">` con los relays señuelo.

3. **`js/ui/rightpanel.js`**
   - Sustituir el literal `npub1zdy6e...` de la línea 261 por `REAL_NPUB` importado de `honeypot.js`.

4. **`js/main.js`**
   - Importar e inicializar `plantDecoys()` al arranque.

5. **Bonus barato**: direcciones de donación (MATIC/BTC) señuelo junto a las reales en el bloque oculto, para scrapers de wallets.

## Verificación posterior
- `node --input-type=module --check` en los módulos tocados.
- `rg "npub1" js/ index.html` → el único literal debe ser el falso.
- Cargar el sitio y confirmar que el enlace "Blog (Nostr)" sigue apuntando al npub real.

## Alcance (lo que NO cubre)
- Los relays reales siguen en `relays.js` (indispensables). Solo frustra copia automática / grep, no a alguien leyendo el código a propósito.
- No agrega backend ni detección de IP (imposible en GitHub Pages estático).
- Los posts ya van firmados con nsec (autoría Nostr real): esto complementa, no reemplaza.