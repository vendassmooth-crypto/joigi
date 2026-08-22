const QRCode = require('qrcode');

function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '');
}

function emv(id, value) {
  const size = String(value.length).padStart(2, '0');
  return `${id}${size}${value}`;
}

// CRC16-CCITT (FALSE), exigido pelo padrão do Banco Central
function crc16(payload) {
  let polinomio = 0x1021;
  let resultado = 0xffff;

  for (let offset = 0; offset < payload.length; offset++) {
    resultado ^= payload.charCodeAt(offset) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((resultado <<= 1) & 0x10000) resultado ^= polinomio;
      resultado &= 0xffff;
    }
  }
  return resultado.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o payload "Pix Copia e Cola" (BR Code) válido conforme especificação do Bacen.
 * @param {Object} params
 * @param {string} params.key - chave pix (cpf, cnpj, email, telefone ou aleatória)
 * @param {string} params.merchantName - nome do recebedor (máx 25 caracteres)
 * @param {string} params.merchantCity - cidade do recebedor (máx 15 caracteres)
 * @param {number} [params.amount] - valor da cobrança (opcional; se omitido, pagador digita o valor)
 * @param {string} [params.txid] - identificador da transação (máx 25 caracteres, sem espaços)
 * @param {string} [params.description] - descrição curta (opcional)
 */
function buildPixPayload({ key, merchantName, merchantCity, amount, txid, description }) {
  const name = removeAccents(merchantName || 'SMOOTH VENDAS').toUpperCase().slice(0, 25) || 'SMOOTH VENDAS';
  const city = removeAccents(merchantCity || 'SAO PAULO').toUpperCase().slice(0, 15) || 'SAO PAULO';
  const cleanTxid = (txid || 'SMOOTHVENDAS').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  const gui = emv('00', 'br.gov.bcb.pix');
  const chave = emv('01', key);
  const desc = description ? emv('02', removeAccents(description).slice(0, 25)) : '';
  const merchantAccountInfo = emv('26', gui + chave + desc);

  const merchantCategoryCode = emv('52', '0000');
  const transactionCurrency = emv('53', '986'); // BRL
  const transactionAmount = amount ? emv('54', Number(amount).toFixed(2)) : '';
  const countryCode = emv('58', 'BR');
  const merchantNameField = emv('59', name);
  const merchantCityField = emv('60', city);
  const additionalData = emv('62', emv('05', cleanTxid));

  let payload =
    emv('00', '01') + // Payload Format Indicator
    emv('01', '12') + // Point of Initiation (12 = dinâmico/valor definido - usamos sempre reutilizável)
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantNameField +
    merchantCityField +
    additionalData +
    '6304'; // CRC id + tamanho fixo, valor calculado a seguir

  const crc = crc16(payload);
  return payload + crc;
}

/**
 * Gera um Buffer PNG do QR Code a partir do payload PIX.
 */
async function generateQrCodeBuffer(payload) {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    scale: 8,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

module.exports = { buildPixPayload, generateQrCodeBuffer, crc16 };
