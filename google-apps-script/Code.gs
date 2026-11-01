// ESMOJO: statuscontrole en afgeschermde accountprofielen (Accounts.gs).
const ESMOJO_FOLDER_ID = '1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk';

// Eerst handmatig uitvoeren in de Apps Script-editor.
function testConnection() {
  const folder = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
  if (folder.isTrashed() || folder.getId() !== ESMOJO_FOLDER_ID) {
    throw new Error('ESMOJO-map is niet beschikbaar.');
  }
  console.log('ESMOJO: toegang tot de ingestelde map is bevestigd. Geen bestanden gewijzigd.');
}

function doGet() {
  return esmojoReply_({ ok: false, error: 'Gebruik een ondertekend serververzoek.' });
}

function doPost(event) {
  try {
    const raw = event && event.postData && event.postData.contents;
    if (raw && raw.length <= 120000) {
      const envelope = JSON.parse(raw);
      if (envelope.action === 'accounts') return esmojoAccounts_(envelope);
      if (envelope.action === 'shows') return esmojoShows_(envelope);
    }
    if (!raw || raw.length > 4096) return esmojoReply_({ ok: false, error: 'Geen toegang.' });
    const input = JSON.parse(raw);
    const secret = PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
    if (!secret || secret.length < 32 || input.action !== 'status'
        || !Number.isSafeInteger(input.timestamp)
        || Math.abs(Date.now() - input.timestamp) > 120000
        || typeof input.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(input.nonce)
        || typeof input.signature !== 'string' || !/^[a-f0-9]{64}$/.test(input.signature)) {
      return esmojoReply_({ ok: false, error: 'Geen toegang.' });
    }
    const message = input.action + '\n' + input.timestamp + '\n' + input.nonce;
    const expected = Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8)
      .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
    let difference = 0;
    for (let i = 0; i < expected.length; i++) {
      difference |= expected.charCodeAt(i) ^ input.signature.charCodeAt(i);
    }
    if (difference !== 0) return esmojoReply_({ ok: false, error: 'Geen toegang.' });
    // Geen schrijfoperaties: herhalen van deze statuscheck verandert niets.
    const folder = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
    if (folder.isTrashed() || folder.getId() !== ESMOJO_FOLDER_ID) throw new Error();
    return esmojoReply_({ ok: true, action: 'status', folderAccessible: true });
  } catch (_) {
    // Geen foutdetails, sleutels of bestandsnamen in response of logs.
    return esmojoReply_({ ok: false, error: 'Drive-controle mislukt.' });
  }
}

function esmojoReply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
