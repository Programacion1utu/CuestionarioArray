# Quiz de Arrays en Java

Cuestionario interactivo en HTML (sin dependencias externas, salvo la fuente
Lora de Google Fonts) sobre el concepto de arrays en Java: declaración,
acceso por índice, recorrido con `for` y modificación de valores. Corrige
automáticamente y guarda cada intento en una planilla de Google Sheets.

## Características

- 10 preguntas automáticas (selección múltiple, verdadero/falso y completar
  código) más 1 pregunta abierta de desarrollo.
- El orden de las 10 preguntas automáticas se mezcla al azar en cada intento
  (la corrección en el servidor es por id, no por posición, así que el orden
  no afecta el puntaje).
- La **pregunta abierta no suma** al puntaje de las 10 anteriores. Queda
  guardada en la planilla, sin corregir automáticamente, para que la docente
  la lea y la puntúe aparte.
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
- **Link de reinicio para la docente**: abrir el cuestionario agregando
  `?reset=reiniciar123` al final de la URL borra la marca de "ya enviado" en
  ESE navegador, permitiendo que un estudiante puntual lo intente de nuevo
  ahí. No es una contraseña segura, solo una traba simple — no compartir la
  URL con ese parámetro públicamente. La clave se puede cambiar editando la
  constante `RESET_CODE` en el HTML.
- Los dispositivos que no soportan pantalla completa vía web (por ejemplo
  Safari en iPhone, y cualquier navegador dentro de iOS) dejan continuar
  igual, con un aviso, para no bloquear el cuestionario por completo.
- Diseño **responsive**: se adapta a pantallas de celular (opciones más
  grandes y táctiles, botón y contador apilados, diagramas con scroll propio
  para no romper el diseño en pantallas angostas).
- Tema visual **"Crema y tinta"** (papel de examen): fondo color hueso,
  tipografía Lora (serif), rojo vino como acento principal, verde oliva para
  respuestas correctas. Los bloques de código mantienen tipografía
  monoespaciada para diferenciarlos del texto general.
- La corrección se hace **del lado del servidor** (Google Apps Script): las
  respuestas correctas no viajan en el HTML, así que no aparecen si un
  estudiante abre las herramientas de desarrollador (F12) o el código fuente
  de la página.
- Cada intento queda registrado en una planilla de Google Sheets con fecha,
  nombre y apellido, puntaje, total, la respuesta literal de cada una de las
  10 preguntas automáticas (columnas P1 a P10) y la respuesta abierta — así
  queda todo guardado por si hay que revisar algún reclamo puntual.
- El envío usa un único pedido por **GET, con formato JSONP** (un
  `<script src="...">`, no `fetch`). Esto es deliberado: Google Apps Script
  redirige cada pedido internamente, y en ese salto algunos navegadores
  convierten un POST en GET y descartan el cuerpo del mensaje — con GET no
  hay ese problema porque no hay cuerpo que perder, y JSONP evita además los
  problemas de CORS que tiene Apps Script al leer una respuesta de POST. Si
  en 15 segundos no llega respuesta, el cuestionario asume igual que se
  envió (el pedido ya se disparó) y avisa sin mostrar el detalle de
  corrección, en vez de quedar trabado esperando.

## Uso

Abrir `quiz-arrays.html` (o el archivo renombrado, por ejemplo `index.html`
para GitHub Pages) en cualquier navegador — no necesita servidor propio,
salvo conexión a internet para enviar la corrección. Se puede compartir el
archivo directamente, subirlo a GitHub Pages, o distribuirlo por classroom.
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
   `Puntaje`, `Total`, `P1`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`, `P8`, `P9`,
   `P10`, `Respuesta abierta`. El script agrega una fila nueva por cada
   envío, en ese mismo orden.

### 2. Agregar el script de corrección

1. En la planilla, ir a **Extensiones → Apps Script**. Se abre un editor de
   código vinculado a esa planilla.
2. Borrar el contenido de `Code.gs` y pegar el siguiente código completo:

```javascript
// ---------- Clave de respuestas de las 10 preguntas automáticas ----------
var ANSWER_KEY = {
  q1:  { type: "multi",  correct: ["b"] },
  q2:  { type: "multi",  correct: ["a", "c", "d", "e"] },
  q3:  { type: "tf",     correct: "V" },
  q4:  { type: "blank",  accepted: [["string[]"], ["cars"]] },
  q5:  { type: "blank",  accepted: [["colores[1]"]] },
  q6:  { type: "blank",  accepted: [["colores[0]"], ['"amarillo"']] },
  q7:  { type: "tf",     correct: "V" },
  q8:  { type: "tf",     correct: "V" },
  q9:  { type: "single", correct: ["b"] },
  q10: { type: "blank",  accepted: [["length"], ["i"]] }
};

// Id de la pregunta abierta (debe coincidir con openQuestion.id del HTML).
// No se corrige automáticamente: solo se guarda para revisión manual.
var OPEN_QUESTION_ID = "q11";

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

// Convierte la respuesta cruda (array, string, etc.) a texto legible para
// guardar en la planilla.
function answerToText(type, value) {
  if (type === "multi") {
    return Array.isArray(value) ? value.join(", ") : "";
  }
  if (type === "blank") {
    return Array.isArray(value) ? value.join(" | ") : "";
  }
  if (type === "tf") {
    return value === "V" ? "Verdadero" : (value === "F" ? "Falso" : "");
  }
  return value || "";
}

function gradeSubmission(body) {
  var answers = body.answers || {};
  var score = 0;
  var results = [];
  var qids = Object.keys(ANSWER_KEY);

  qids.forEach(function (qid) {
    var key = ANSWER_KEY[qid];
    var r = gradeOne(key, answers[qid]);
    r.id = qid;
    if (r.ok) score++;
    results.push(r);
  });

  var total = qids.length;
  var openAnswer = answers[OPEN_QUESTION_ID] || "";

  var row = [new Date().toISOString(), body.nombre || "", score, total];
  qids.forEach(function (qid) {
    row.push(answerToText(ANSWER_KEY[qid].type, answers[qid]));
  });
  row.push(openAnswer);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow(row);

  var output = { score: score, total: total, results: results };
  if (openAnswer.trim() !== "") {
    output.open = { ok: null, feedback: "Guardada. Pendiente de revisión manual." };
  }
  return output;
}

// Todo pasa por acá: recibe las respuestas por GET (parámetro "data", JSON
// codificado en la URL) y devuelve el resultado en formato JSONP
// (parámetro "callback"). No se usa doPost ni POST en ningún punto.
function doGet(e) {
  var callback = (e.parameter.callback || "callback").replace(/[^a-zA-Z0-9_]/g, "");

  if (!e.parameter.data) {
    return ContentService.createTextOutput(callback + "(null)")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  try {
    var body = JSON.parse(e.parameter.data);
    var output = gradeSubmission(body);
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(output) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (err) {
    return ContentService.createTextOutput(callback + "(null)")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}
```

3. Guardar (ícono de disco o `Ctrl+S`).

### 3. Publicar como aplicación web

1. Clic en **Implementar → Nueva implementación**.
2. En "Tipo", elegir **Aplicación web**.
3. Configurar:
   - **Ejecutar como:** Yo (la cuenta dueña de la planilla).
   - **Quién tiene acceso:** Cualquiera.
4. Clic en **Implementar**.
5. La primera vez, Google pide autorización: **Configuración avanzada → Ir a
   [nombre del proyecto] (no seguro) → Permitir** (es un script propio, por
   eso aparece ese aviso).
6. Copiar la URL que termina en `/exec` (la de la sección **"App web"**, no
   la de "Biblioteca" — esa es para otra cosa).

### 4. Conectar el cuestionario con la planilla

Abrir `quiz-arrays.html` (o `index.html`) con un editor de texto, buscar la
línea:

```javascript
const SHEET_WEBAPP_URL = "PEGAR_AQUI_LA_URL_DE_TU_WEB_APP";
```

y reemplazar el texto entre comillas por la URL copiada en el paso anterior.
Guardar el archivo y volver a subirlo a donde esté publicado (GitHub Pages,
etc.) — editar el archivo local no actualiza por sí solo lo que ya está
publicado.

### Actualizar el script más adelante

Si se necesita modificar la clave de respuestas o cualquier otra parte de
`Code.gs`, para que la URL **no cambie**, hay que actualizar la implementación
existente en lugar de crear una nueva:

**Implementar → Administrar implementaciones → ícono de lápiz (editar) →
Versión: Nueva versión → Implementar.**

Crear una implementación nueva desde cero genera una URL distinta y hay que
volver a pegarla en el HTML (y volver a publicar el HTML).

### Diagnóstico rápido si algo no anda

- **El botón se queda en "Enviando…" sin moverse**: esperar 15 segundos, el
  cuestionario asume igual que se envió y muestra un aviso genérico. Revisar
  igual la planilla para confirmar que la fila haya quedado guardada.
- **No llega nada a la planilla**: lo más común es que la implementación
  activa (la URL que tiene el HTML) no sea la última versión de `Code.gs`.
  Confirmar en **Implementar → Administrar implementaciones** cuál es la
  URL activa, y que coincida con la del HTML.
- **Error 404 apenas se abre la página**: casi siempre es el pedido
  automático de `favicon.ico` del navegador — no afecta nada, se puede
  ignorar. Confirmar mirando la pestaña Network (no solo Console) y
  revisando el "Request URL" de la fila en rojo.
- **Ejecuciones con error `Cannot read properties of undefined`**: revisar
  que `Code.gs` tenga exactamente el código de este README (versión GET,
  sin `doPost`).

## Estructura del proyecto

```
quiz-arrays.html   # Cuestionario (sin la clave de respuestas)
README.md          # Este archivo
```

La clave de respuestas vive únicamente en `Code.gs`, dentro del proyecto de
Apps Script de la planilla — no forma parte de este repositorio.
