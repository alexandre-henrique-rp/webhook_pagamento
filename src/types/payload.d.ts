/**
 * Payload do webhook
 * 
 * @description retorno do webhook da Efí
 * 
 * @interface Payload
 * @property {object<{ pix: [{ endToEndId: string; txid: string; chave: string; valor: string; horario: string; infoPagador: string; }] }>} payload
 * @property {string} payload.pix.endToEndId - Identificador único do pagamento
 * @property {string} payload.pix.txid - Identificador único do pagamento
 * @property {string} payload.pix.chave - Chave do pagamento
 * @property {string} payload.pix.valor - Valor do pagamento
 * @property {string} payload.pix.horario - Horário do pagamento
 * @property {string} payload.pix.infoPagador - Informações do pagador
 */
export interface Payload {
  pix: [
    {
      endToEndId: string;
      txid: string;
      chave: string;
      valor: string;
      horario: string;
      infoPagador: string;
    }
  ];
}
