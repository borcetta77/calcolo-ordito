const DEFAULT_LOOMS = [
  { id:'anastasia18', name:'Anastasia 18', yarn:'Cotone Ne 60/2', density:70.2, tube:216, calD:353, calM:200 },
  { id:'picanol21', name:'Picanol 21', yarn:'Ne 40/2', density:39, tube:216, calD:348.5, calM:200 },
  { id:'donnadicoppe19', name:'Donnadicoppe 19', yarn:'Cotone Ne 16/2', density:17.5, tube:210, calD:350, calM:200 },
  { id:'zodiaco14', name:'Zodiaco 14', yarn:'Cotone Ne 16/2', density:12, tube:191, calD:293, calM:200 },
  { id:'lazio16', name:'Lazio 16', yarn:'Cotone Ne 30/2', density:11, tube:191, calD:null, calM:null },
  { id:'tarocchi15', name:'Tarocchi 15', yarn:'Cotone 16/2', density:16, tube:160, calD:294, calM:200 },
  { id:'purolino17', name:'Purolino 17', yarn:'Lino Nm 26/2', density:12, tube:160, calD:null, calM:null }
];

const KEY = 'calcolo_ordito_looms_v1';

let looms = loadLooms();
let selectedId = looms[0]?.id;
let editingId = null;

const $ = id => document.getElementById(id);

function num(value) {
  const n = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function fmt(value) {
  return Number(value).toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function loadLooms() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {}
  return structuredClone(DEFAULT_LOOMS);
}

function saveLooms() {
  localStorage.setItem(KEY, JSON.stringify(looms));
}

function current() {
  return looms.find(x => x.id === selectedId);
}

/*
  Taratura:
  calD = diametro al quale conosciamo i metri reali
  calM = metri reali a quel diametro

  Il tubo centrale viene escluso dal calcolo.
*/
function coefficient(loom) {
  if (!loom || !(loom.calD > loom.tube) || !(loom.calM > 0)) {
    return null;
  }

  return (
    Math.PI * (loom.calD ** 2 - loom.tube ** 2)
  ) / (4 * loom.calM * 1000);
}

function metersFor(loom, diameter) {
  const c = coefficient(loom);

  if (c === null) return null;

  return (
    Math.PI * (diameter ** 2 - loom.tube ** 2)
  ) / (4 * c * 1000);
}

function renderLooms() {
  $('loomSelect').innerHTML = '';

  looms.forEach(loom => {
    const option = document.createElement('option');
    option.value = loom.id;
    option.textContent = loom.name;
    $('loomSelect').appendChild(option);
  });

  if (!looms.some(x => x.id === selectedId)) {
    selectedId = looms[0]?.id;
  }

  $('loomSelect').value = selectedId || '';

  renderInfo();
  calculate();
}

function renderInfo() {
  const loom = current();

  if (!loom) {
    $('loomInfo').textContent = 'Nessuna macchina disponibile.';
    return;
  }

  $('loomInfo').innerHTML = `
    <strong>${escapeHtml(loom.yarn || '')}</strong><br>
    Densità: ${fmt(loom.density)} fili/cm<br>
    Tubo: ${fmt(loom.tube)} mm<br>
    Taratura:
    ${
      loom.calD && loom.calM
        ? `${fmt(loom.calD)} mm = ${fmt(loom.calM)} m`
        : 'non ancora impostata'
    }
  `;
}

/*
  CALCOLO PRINCIPALE
*/
function calculate() {
  const loom = current();

  $('error').textContent = '';
  $('meters').textContent = '—';
  $('diameterComputed').textContent = '';

  if (!loom) return;

  const diameterValue = num($('diameter').value);
  const circumferenceValue = num($('circumference').value);

  let diameter = diameterValue;

  /*
    Se l'utente ha inserito la circonferenza,
    calcoliamo il diametro.
  */
  if (
    circumferenceValue !== null &&
    circumferenceValue > 0 &&
    !diameterValue
  ) {
    diameter = circumferenceValue / Math.PI;

    $('diameterComputed').textContent =
      `Diametro calcolato: ${fmt(diameter)} mm`;
  }

  /*
    Se l'utente ha inserito il diametro,
    calcoliamo la circonferenza.
  */
  if (
    diameterValue !== null &&
    diameterValue > 0 &&
    !circumferenceValue
  ) {
    const circumference = diameterValue * Math.PI;

    $('diameterComputed').textContent =
      `Circonferenza calcolata: ${fmt(circumference)} mm`;
  }

  if (diameter === null || diameter <= 0) return;

  if (diameter <= loom.tube) {
    $('error').textContent =
      'Il diametro deve essere maggiore del tubo.';
    return;
  }

  const meters = metersFor(loom, diameter);

  if (meters === null) {
    $('error').textContent =
      'Questa macchina non è ancora tarata.';
    return;
  }

  $('meters').textContent = `${fmt(meters)} m`;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#39;',
      '"':'&quot;'
    }[c])
  );
}

/* =========================
   GESTIONE MACCHINE
========================= */

function openEditor(id) {
  const loom = looms.find(x => x.id === id);
  if (!loom) return;

  editingId = id;

  $('editorTitle').textContent =
    `Modifica: ${loom.name}`;

  $('eName').value = loom.name;
  $('eYarn').value = loom.yarn;
  $('eDensity').value = loom.density ?? '';
  $('eTube').value = loom.tube ?? '';
  $('eCalD').value = loom.calD ?? '';
  $('eCalM').value = loom.calM ?? '';

  $('deleteBtn').classList.remove('hidden');
  $('editor').classList.remove('hidden');
}

function newEditor() {
  editingId = crypto.randomUUID();

  $('editorTitle').textContent = 'Nuova macchina';

  $('eName').value = 'Nuova macchina';
  $('eYarn').value = '';
  $('eDensity').value = '';
  $('eTube').value = '';
  $('eCalD').value = '';
  $('eCalM').value = '';

  $('deleteBtn').classList.add('hidden');
  $('editor').classList.remove('hidden');
}

function saveEditor() {
  const loom = {
    id: editingId,
    name: $('eName').value.trim() || 'Nuova macchina',
    yarn: $('eYarn').value.trim(),
    density: num($('eDensity').value) || 0,
    tube: num($('eTube').value) || 0,
    calD: num($('eCalD').value),
    calM: num($('eCalM').value)
  };

  const index = looms.findIndex(x => x.id === editingId);

  if (index >= 0) {
    looms[index] = loom;
  } else {
    looms.push(loom);
  }

  selectedId = loom.id;

  saveLooms();

  $('editor').classList.add('hidden');

  renderLooms();
}

function deleteEditor() {
  if (!editingId) return;

  if (looms.length <= 1) {
    alert('Devi mantenere almeno una macchina.');
    return;
  }

  if (!confirm('Eliminare questa macchina?')) return;

  looms = looms.filter(x => x.id !== editingId);

  selectedId = looms[0].id;

  saveLooms();

  $('editor').classList.add('hidden');

  renderLooms();
}

/* =========================
   EVENTI
========================= */

$('loomSelect').addEventListener('change', e => {
  selectedId = e.target.value;

  $('diameter').value = '';
  $('circumference').value = '';

  renderInfo();
  calculate();
});

/*
  Quando scriviamo il DIAMETRO:
  calcoliamo soltanto la circonferenza
  come informazione.
*/
$('diameter').addEventListener('input', () => {
  const value = num($('diameter').value);

  if (value !== null && value > 0) {
    const circumference = value * Math.PI;

    $('circumference').value = fmt(circumference);
  } else {
    $('circumference').value = '';
  }

  calculate();
});

/*
  Quando scriviamo la CIRCONFERENZA:
  il diametro viene calcolato.
*/
$('circumference').addEventListener('input', () => {
  const value = num($('circumference').value);

  if (value !== null && value > 0) {
    const diameter = value / Math.PI;

    $('diameter').value = fmt(diameter);
  } else {
    $('diameter').value = '';
  }

  calculate();
});

$('editBtn').addEventListener(
  'click',
  () => openEditor(selectedId)
);

$('newBtn').addEventListener(
  'click',
  newEditor
);

$('saveBtn').addEventListener(
  'click',
  saveEditor
);

$('cancelBtn').addEventListener(
  'click',
  () => $('editor').classList.add('hidden')
);

$('deleteBtn').addEventListener(
  'click',
  deleteEditor
);

$('resetBtn').addEventListener('click', () => {
  if (
    confirm(
      'Ripristinare tutte le macchine ai dati originali?'
    )
  ) {
    looms = structuredClone(DEFAULT_LOOMS);
    selectedId = looms[0].id;

    saveLooms();
    renderLooms();
  }
});

$('exportBtn').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify(looms, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = 'calcolo-ordito-dati.json';

  a.click();

  URL.revokeObjectURL(a.href);
});

$('importInput').addEventListener('change', e => {
  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!Array.isArray(data) || !data.length) {
        throw new Error();
      }

      looms = data;
      selectedId = looms[0].id;

      saveLooms();
      renderLooms();

      alert('Dati importati.');
    } catch (error) {
      alert('File non valido.');
    }
  };

  reader.readAsText(file);
});

/* =========================
   INSTALLAZIONE
========================= */

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();

  deferredPrompt = event;

  $('installBtn').classList.remove('hidden');
});

$('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  await deferredPrompt.userChoice;

  deferredPrompt = null;

  $('installBtn').classList.add('hidden');
});

/* =========================
   OFFLINE
========================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .catch(() => {});
  });
}

/* =========================
   AVVIO
========================= */

/* =========================
AVVIO CON PASSWORD
========================= */

const ACCESS_PASSWORD = "Gessica";

function chiediPassword() {
    const enteredPassword = prompt(
        "Inserisci la password per accedere:"
    );

    if (enteredPassword === ACCESS_PASSWORD) {
        renderLooms();
        return;
    }

    document.body.innerHTML = `
        <div style="
            text-align:center;
            margin-top:100px;
            font-family:Arial,sans-serif;
        ">
            <h2>Accesso negato</h2>
            <p>Password non corretta.</p>
            <button onclick="location.reload()" style="
                padding:12px 25px;
                font-size:16px;
                border-radius:8px;
                border:1px solid #999;
                background:#f2f2f2;
            ">
                Riprova
            </button>
        </div>
    `;
}

chiediPassword();
