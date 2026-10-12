// Reuse the installed compiler without copying caches or the browser profile.
const path = require('path')
const toolRoot = process.env.ZEUS_TOOL_ROOT || path.resolve(__dirname, '../watchface01/.tools')
process.env.PATH = path.dirname(process.execPath) + path.delimiter + process.env.PATH
const cli = path.join(toolRoot, 'zeus/node_modules/@zeppos/zeus-cli')
const fs = require('fs')
const qrTerminal = require(path.join(toolRoot, 'zeus/node_modules/qrcode-terminal'))
const generateQr = qrTerminal.generate
qrTerminal.generate = function (url, ...args) {
  const QRCode = require(path.join(toolRoot, 'zeus/node_modules/qrcode-terminal/vendor/QRCode'))
  const qr = new QRCode(-1, this.error)
  qr.addData(url)
  qr.make()
  fs.writeFileSync(path.join(__dirname, 'zepp-install-url.txt'), url)
  fs.writeFileSync(path.join(__dirname, 'zepp-qr-matrix.json'), JSON.stringify(qr.modules))
  return generateQr.call(this, url, ...args)
}
require(path.join(toolRoot, 'zeus/node_modules/module-alias')).addAlias('zeppos-app-utils', path.join(cli, 'private-modules/zeppos-app-utils'))
require(path.join(cli, 'bin/main.js'))
