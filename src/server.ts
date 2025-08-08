import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import type { TLSSocket } from 'node:tls';
import express from 'express';
import logger from 'morgan';

/**
 * Carrega um arquivo obrigatório do sistema de arquivos.
 * Lança um erro com mensagem amigável caso o caminho esteja indefinido ou a leitura falhe.
 */
function carregarArquivoObrigatorio(caminho: string | undefined, nome: string): Buffer {
  if (!caminho || caminho.trim().length === 0) {
    throw new Error(`Variável de ambiente para ${nome} não configurada. Defina ${nome}.`);
  }
  try {
    const caminhoResolvido = path.isAbsolute(caminho)
      ? caminho
      : path.resolve(process.cwd(), caminho);
    return fs.readFileSync(caminhoResolvido);
  } catch (erro) {
    throw new Error(`Falha ao ler ${nome} em '${caminho}': ${(erro as Error).message}`);
  }
}

// Variáveis de ambiente esperadas
const {
  TLS_CERT_PATH,
  TLS_KEY_PATH,
  EFI_CA_PATH,
  PORT: ENV_PORT,
} = process.env;

let httpsOptions: https.ServerOptions;

try {
  httpsOptions = {
    cert: carregarArquivoObrigatorio(TLS_CERT_PATH, 'TLS_CERT_PATH'), // Certificado fullchain do domínio
    key: carregarArquivoObrigatorio(TLS_KEY_PATH, 'TLS_KEY_PATH'), // Chave privada do domínio
    ca: carregarArquivoObrigatorio(EFI_CA_PATH, 'EFI_CA_PATH'), // Certificado público da Efí (CA para validar o client cert)
    minVersion: 'TLSv1.2',
    requestCert: true,
    rejectUnauthorized: true, // Caso precise que os demais endpoints não rejeitem requisições sem mTLS, altere para false conscientemente
  };
} catch (erro) {
  console.error('[BOOT] Erro na configuração TLS/mTLS:', (erro as Error).message);
  process.exit(1);
}

const app = express();
const httpsServer = https.createServer(httpsOptions, app);
const PORT = Number(ENV_PORT ?? 8443);

app.use(logger("dev")); // Comente essa linha caso não queira que seja exibido o log do servidor no seu console
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health-check simples
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Endpoint para recepção do webhook (cadastrar: https://SEUDOMINIO.com/webhook/pix)
app.post("/webhook/pix", (request, response) => {
  // Suporte a dois cenários:
  // 1) mTLS terminado no Nginx: valida via header X-SSL-Client-Verify (SUCCESS/FAILED/NONE)
  // 2) mTLS direto no Node: fallback para TLSSocket.authorized
  const clientVerifyHeader = String(request.headers['x-ssl-client-verify'] ?? '').toUpperCase();
  const hasNginxVerification = clientVerifyHeader.length > 0;
  const isAuthorized = hasNginxVerification
    ? clientVerifyHeader === 'SUCCESS'
    : ((request.socket as TLSSocket).authorized === true);

  if (!isAuthorized) {
    console.warn('[WEBHOOK/PIX] Requisição sem mTLS válido (Nginx header ou TLSSocket). Negando com 401.', {
      clientVerifyHeader,
    });
    return response.status(401).end();
  }

  // Seu código tratando a callback
  // Dica: responda 200 rapidamente e processe assíncrono para evitar timeouts
  // Ex.: enfileirar processamento usando um job/worker, garantindo idempotência (por txid/endToEndId)
  console.log('[WEBHOOK/PIX] Payload recebido com autenticação válida:', request.body);
  return response.status(200).end();
});

httpsServer.listen(PORT, () =>
  console.log(`HTTPS server with mTLS running on port ${PORT}`)
);
//Desenvolvido pela Consultoria Técnica da Efí
