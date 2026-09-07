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

// Convierte la respuesta cruda (que puede ser un array, un string, etc.) a
// texto legible para guardar en la planilla.
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
