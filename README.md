# Quiz de Arrays en Java

Cuestionario interactivo en HTML (sin dependencias externas) sobre el concepto
de arrays en Java: declaración, acceso por índice, recorrido con `for` y
modificación de valores. Corrige automáticamente y guarda cada resultado en
una planilla de Google Sheets.

## Características

- 10 preguntas de selección múltiple, verdadero/falso y completar código.
- Pide nombre y apellido antes de mostrar cualquier pregunta.
- El cuestionario se abre en **pantalla completa**. Si se sale de pantalla
  completa antes de terminar (Esc, otro atajo, etc.), se envía
  automáticamente lo que esté respondido hasta ese momento — sin aviso
  previo ni posibilidad de continuar.
- Las preguntas sin responder cuentan como incorrectas, pero no bloquean el
  envío manual.
- Una vez enviado (manual o automático), el cuestionario queda bloqueado y
  **no se puede volver a abrir en ese mismo navegador** (usa `localStorage`
  para recordarlo). Esto no es infalible: abrirlo en otro navegador, en modo
  incógnito, o en otro dispositivo lo evade. Si un mismo nombre aparece más
  de una vez en la planilla, conviene revisarlo manualmente y descartar los
  intentos de más.
- Los dispositivos que no soportan pantalla completa vía web (por ejemplo
  Safari en iPhone) dejan continuar igual, con un aviso, para no bloquear el
  cuestionario por completo.
- La corrección se hace **del lado del servidor** (Google Apps Script): las
  respuestas correctas no viajan en el HTML, así que no aparecen si un
  estudiante abre las herramientas de desarrollador (F12) o el código fuente
  de la página.
- Cada intento queda registrado en una planilla de Google Sheets con fecha,
  nombre y apellido, puntaje y total.

## Uso

Abrir `quiz-arrays.html` en cualquier navegador (no necesita servidor propio,
salvo la conexión a internet para enviar la corrección). Se puede compartir
el archivo directamente, subirlo a GitHub Pages, o distribuirlo por classroom.
Como la pantalla completa depende del navegador, conviene distribuirlo como
un link que se abra en su propia pestaña — si se embebe dentro de un iframe
(por ejemplo, incrustado en el contenido de un assignment), la pantalla
completa puede no funcionar salvo que ese iframe tenga el atributo
`allow="fullscreen"`.

## Configurar la planilla de notas

El cuestionario necesita una planilla de Google Sheets con un script de
Google Apps Script publicado como aplicación web. Son dos partes: crear la
planilla y pegar el script, y después apuntar el HTML a esa URL.

### 1. Crear la planilla

1. Ir a [sheets.google.com](https://sheets.google.com) y crear una planilla
   nueva (o usar una existente).
2. En la fila 1, agregar los encabezados: `Fecha`, `Nombre y Apellido`,
   `Puntaje`, `Total`. El script agrega una fila nueva por cada envío, en
   ese mismo orden.

### 2. Agregar el script de corrección

1. En la planilla, ir a **Extensiones → Apps Script**. Se abre un editor de
   código vinculado a esa planilla.
2. Borrar el contenido de `Code.gs` y pegar el siguiente código completo:

```javascript
// ---------- Clave de respuestas (solo existe acá, del lado del servidor) ----------
var ANSWER_KEY = {
  q1:  { type: "multi",  correct: ["b"] },
  q2:  { type: "multi",  correct: ["a", "c", "d", "e"] },
  q3:  { type: "tf",     correct: "V" },
  q4:  { type: "blank",  accepted: [["string[]"], ["cars"]] },
  q5:  { type: "blank",  accepted: [["cars[1]"]] },
  q6:  { type: "blank",  accepted: [["cars[0]"], ['"opel"']] },
  q7:  { type: "tf",     correct: "V" },
  q8:  { type: "tf",     correct: "V" },
  q9:  { type: "single", correct: ["b"] },
  q10: { type: "blank",  accepted: [["length"], ["i"]] }
};

function normalize(s) {
  return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, "");
}

function gradeOne(key, value) {
  if (key.type === "multi") {
    var chosen = Array.isArray(value) ? value : [];
    var ok = key.correct.length === chosen.length &&
      key.correct.every(function (c) { return chosen.indexOf(c) !== -1; });
    return { ok: ok, correct: key.correct };
  }
  if (key.type === "single") {
    return { ok: key.correct.indexOf(value) !== -1, correct: key.correct };
  }
  if (key.type === "tf") {
    return { ok: value === key.correct, correct: key.correct };
  }
  if (key.type === "blank") {
    var vals = Array.isArray(value) ? value : [];
    var flags = key.accepted.map(function (accList, i) {
      return accList.indexOf(normalize(vals[i])) !== -1;
    });
    var expected = key.accepted.map(function (accList) { return accList[0]; });
    return { ok: flags.every(function (f) { return f; }), flags: flags, expected: expected };
  }
  return { ok: false };
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var nombre = body.nombre || "";
  var answers = body.answers || {};

  var score = 0;
  var results = [];

  Object.keys(ANSWER_KEY).forEach(function (qid) {
    var key = ANSWER_KEY[qid];
    var r = gradeOne(key, answers[qid]);
    r.id = qid;
    if (r.ok) score++;
    results.push(r);
  });

  var total = Object.keys(ANSWER_KEY).length;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([new Date().toISOString(), nombre, score, total]);

  var output = { score: score, total: total, results: results };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Guardar (ícono de disco o `Ctrl+S`).

### 3. Publicar como aplicación web

1. Clic en **Implementar → Nueva implementación**.
2. En "Tipo", elegir **Aplicación web**.
3. Configurar:
   - **Ejecutar como:** Yo (la cuenta dueña de la planilla).
   - **Quién tiene acceso:** Cualquier usuario.
4. Clic en **Implementar**.
5. La primera vez, Google pide autorización: **Configuración avanzada → Ir a
   [nombre del proyecto] (no seguro) → Permitir** (es un script propio, por
   eso aparece ese aviso).
6. Copiar la URL que termina en `/exec`.

### 4. Conectar el cuestionario con la planilla

Abrir `quiz-arrays.html` con un editor de texto, buscar la línea:

```javascript
const SHEET_WEBAPP_URL = "PEGAR_AQUI_LA_URL_DE_TU_WEB_APP";
```

y reemplazar el texto entre comillas por la URL copiada en el paso anterior.
Guardar el archivo.

### Actualizar el script más adelante

Si se necesita modificar la clave de respuestas o cualquier otra parte de
`Code.gs`, para que la URL **no cambie**, hay que actualizar la implementación
existente en lugar de crear una nueva:

**Implementar → Administrar implementaciones → ícono de lápiz (editar) →
Versión: Nueva versión → Implementar.**

Crear una implementación nueva desde cero genera una URL distinta y hay que
volver a pegarla en el HTML.

## Estructura del proyecto

```
quiz-arrays.html   # Cuestionario (sin la clave de respuestas)
README.md          # Este archivo
```

La clave de respuestas vive únicamente en `Code.gs`, dentro del proyecto de
Apps Script de la planilla — no forma parte de este repositorio.
