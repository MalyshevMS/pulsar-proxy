#!/usr/bin/env node
const net = require('net');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs')

const WS_PORT = 8080;
const TCP_PORT = 4171;
const TCP_HOST = '127.0.0.1';

function getArgValue(flag) {
    const ix = process.argv.findIndex(a => a === flag || a.startsWith(flag + '='));
    if (ix === -1) return undefined;
    const val = process.argv[ix];
    if (val.includes('=')) return val.split('=')[1];
    return process.argv[ix + 1];
}

const useTls = process.argv.includes('--tls') || process.argv.includes('--wss') || process.env.WSS === '1';

let server;
if (useTls) {
    const keyPath = getArgValue('--key') || process.env.WSS_KEY || './key.pem';
    const certPath = getArgValue('--cert') || process.env.WSS_CERT || './cert.pem';

    let key, cert;
    try {
        key = fs.readFileSync(keyPath);
        cert = fs.readFileSync(certPath);
    } catch (err) {
        console.error(`TLS enabled but failed to read key/cert:\n key: ${keyPath}\n cert: ${certPath}\n`, err.message);
        process.exit(1);
    }

    server = https.createServer({ key, cert });
} else {
    server = http.createServer();
}

const wss = new WebSocket.Server({ server });

const log = fs.createWriteStream('./proxy.log', {
    flags: 'a'
});

function dump(direction, data, limit = 256) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    const ascii = buf
        .slice(0, limit)
        .toString('utf8')
        .replace(/[^\x20-\x7E]/g, '.');
    
    const header = `[${direction}] ${buf.length} bytes` +
        (buf.length > limit ? ` (showing ${limit})` : '');

    console.log(header);
    console.log(ascii);

    log.write(header + '\n');
    log.write(ascii + '\n\n');
}

wss.on('connection', (ws) => {
    const tcp = net.connect(TCP_PORT, TCP_HOST);

    // Browser -> TCP server
    ws.on('message', (data) => {
        // dump('WS -> TCP', data);
        tcp.write(data);
    });

    // TCP server -> Browser
    tcp.on('data', (data) => {
        // dump('TCP -> WS');
        ws.send(data);
    });

    const close = () => {
        ws.close();
        tcp.destroy();
    };

    ws.on('close', close);
    ws.on('error', close);
    tcp.on('close', close);
    tcp.on('error', close);
});

server.listen(WS_PORT, () => {
    const proto = useTls ? 'WSS' : 'WS';
    console.log(`${proto} -> TCP proxy :${WS_PORT} -> ${TCP_HOST}:${TCP_PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    log.end(() => process.exit(0));
});