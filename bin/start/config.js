import os from 'os'
import path from 'path'
import config, { option } from '../config.js'

process.env.NODE_ENV = 'production'

const env = process.env
const sslCert = option('--ssl-cert', env.SSL_CERT)
const acme = sslCert === 'acme' && getAcme()
const ssl = sslCert && getSSL()
const workers = option('--workers', 1)
const port = option('port', env.PORT, parseInt)
const domain = option('--domain', acme && acme.domains[0])
const httpsPort = option('--https-port', ssl ? port || 443 : null)
const httpPort = ssl && ssl.mode === 'only' ? null : option('--http-port', ssl ? 80 : port || 80)
const address = option('--address', env.ADDRESS || '0.0.0.0')

export default {
  ...config,
  workers: workers === 'cpus' ? os.cpus().length : parseInt(workers),
  httpsPort,
  httpPort,
  address,
  domain,
  acme,
  ssl
}

function getAcme() {
  return {
    dir        : option('--acme-dir', path.join(config.home, 'acme'), env.ACME_DIR),
    domains    : option('--acme-domain', option('--acme-domains') || env.ACME_DOMAIN || env.ACME_DOMAINS).split(' '),
    email      : option('--acme-email', env.ACME_EMAIL),
    test       : option('--acme-test', env.ACME_TEST),
    eab        : option('--acme-eab', env.ACME_EAB),
    kid        : option('--acme-kid', env.ACME_KID),
    key        : option('--acme-key', env.ACME_KEY),
    ca         : option('--acme-ca', env.ACME_CA || 'letsencrypt')
  }
}

function getSSL() {
  return {
    cert: sslCert,
    key: option('--ssl-key', env.SSL_KEY),
    passphrase: option('--ssl-passphrase', env.SSL_PASSPHRASE),
    mode: option('--ssl-mode', env.SSL_MODE || 'redirect') // only | redirect | optional
  }
}
