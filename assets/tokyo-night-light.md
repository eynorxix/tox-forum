# Tokyo Night Day — Paleta de Colores Claro

Paleta completa basada en la variante **Day** de Tokyo Night.
Referencia oficial: [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim)

---

## Fondo y Superficie

| Nombre | Hex | Descripcion |
|--------|-----|-------------|
| `bg` | `#e1e2e7` | Fondo principal |
| `bg_dark` | `#d0d5e3` | Fondo oscuro (sidebar, statusbar) |
| `bg_dark1` | `#c1c9df` | Fondo oscuro alternativo |
| `bg_float` | `#d0d5e3` | Fondo de ventanas flotantes |
| `bg_highlight` | `#c4c8da` | Resaltado de fondo |
| `bg_popup` | `#d0d5e3` | Fondo de popups |
| `bg_search` | `#7890dd` | Fondo de busqueda |
| `bg_sidebar` | `#d0d5e3` | Fondo de barra lateral |
| `bg_statusline` | `#d0d5e3` | Fondo de barra de estado |
| `bg_visual` | `#b7c1e3` | Fondo de seleccion visual |

---

## Texto

| Nombre | Hex | Descripcion |
|--------|-----|-------------|
| `fg` | `#3760bf` | Texto principal (foreground) |
| `fg_dark` | `#62b0b0` | Texto oscuro |
| `fg_gutter` | `#a8aecb` | Texto de gutter (numeros de linea) |
| `comment` | `#848cb5` | Comentarios |

---

## Borde y Sutil

| Nombre | Hex | Descripcion |
|--------|-----|-------------|
| `border` | `#b4b5b9` | Bordes generales |
| `border_highlight` | `#4094a3` | Bordes resaltados |
| `dark3` | `#8990b3` | Borde oscuro nivel 3 |
| `dark5` | `#68709a` | Borde oscuro nivel 5 |

---

## Colores de Syntax (Tokens)

| Token | Hex | Descripcion | Oscuro equivalente |
|-------|-----|-------------|---------------------|
| `red` | `#f52a65` | Keywords, HTML elements, Regex | `#f7768e` |
| `red1` | `#c64343` | Errores | `#db4b4b` |
| `orange` | `#b15c00` | Constantes numericas, Booleanos | `#ff9e64` |
| `yellow` | `#8c6c3e` | Parametros de funcion, Regex charset | `#e0af68` |
| `green` | `#587539` | Strings, clases CSS | `#9ece6a` |
| `green1` | `#387068` | Keys de objetos, Markdown links | `#73daca` |
| `green2` | `#38919f` | Regex literal strings | `#b4f9f8` |
| `teal` | `#118c74` | Terminal Green alternativo | `#73daca` |
| `cyan` | `#007197` | Funciones de soporte, CSS HTML elements | `#2ac3de` |
| `blue` | `#2e7de9` | Nombres de funciones, CSS properties | `#7aa2f7` |
| `blue0` | `#7890dd` | Blue alternativo | `#7dcfff` |
| `blue1` | `#188092` | Object properties, Regex quantifiers | `#7dcfff` |
| `blue2` | `#07879d` | Info token | `#0db9d7` |
| `blue5` | `#006a83` | Markdown code, Import/export | `#7dcfff` |
| `blue6` | `#2e5857` | Blue oscuro | `#2ac3de` |
| `blue7` | `#92a6d5` | Blue claro | `#7dcfff` |
| `purple` | `#7847bd` | Control keywords, Storage types | `#bb9af7` |
| `magenta` | `#9854f1` | Regex symbols, HTML attributes | `#bb9af7` |
| `magenta2` | `#d20065` | Magenta intenso | `#f7768e` |

---

## Colores de Terminal

| Terminal | Hex | Oscuro equivalente |
|----------|-----|---------------------|
| `black` | `#b4b5b9` | `#414868` |
| `black_bright` | `#a1a6c5` | `#545c7e` |
| `red` | `#f52a65` | `#f7768e` |
| `green` | `#587539` | `#9ece6a` |
| `yellow` | `#8c6c3e` | `#e0af68` |
| `blue` | `#2e7de9` | `#7aa2f7` |
| `magenta` | `#9854f1` | `#bb9af7` |
| `cyan` | `#007197` | `#7dcfff` |
| `white` | `#3760bf` | `#c0caf5` |

---

## Diff / Git

| Tipo | Hex | Descripcion |
|------|-----|-------------|
| `added` | `#387068` | Lineas agregadas |
| `changed` | `#8c6c3e` | Lineas modificadas |
| `deleted` | `#8c4351` | Lineas eliminadas |

---

## UI Especifico

| Elemento | Hex | Descripcion |
|----------|-----|-------------|
| `cursor` | `#3760bf` | Cursor |
| `cursorline` | `#c4c8da` | Linea del cursor |
| `selection` | `#b7c1e3` | Seleccion de texto |
| `match` | `#b4b5b9` | Coincidencia de busqueda |
| `accent` | `#2e7de9` | Color de acento principal |

---

## Mapeo de Variables CSS (estilo proyecto)

```css
[data-theme="light"] {
  --bg: #e1e2e7;
  --bg-elev: #d0d5e3;
  --bg-card: #d0d5e3;
  --bg-inset: #c4c8da;
  --border: #b4b5b9;
  --text: #3760bf;
  --text-dim: #848cb5;
  --accent: #2e7de9;
  --accent-dim: rgba(46, 125, 233, 0.12);
  --red: #f52a65;
  --green: #587539;
  --yellow: #8c6c3e;
  --glow: rgba(46, 125, 233, 0.15);
}
```

---

## Referencia Visual

```
Fondo principal:      #e1e2e7  ░░░░░░░░
Fondo sidebar:        #d0d5e3  ░░░░░░░░
Fondo elevated:       #c4c8da  ░░░░░░░░
Borde:                #b4b5b9  ░░░░░░░░
Texto principal:      #3760bf  ████████
Texto secundario:     #848cb5  ████████
Red:                  #f52a65  ████████
Orange:               #b15c00  ████████
Yellow:               #8c6c3e  ████████
Green:                #587539  ████████
Cyan:                 #007197  ████████
Blue:                 #2e7de9  ████████
Purple:               #7847bd  ████████
Magenta:              #9854f1  ████████
```
