const net = require('net');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs')

const WS_PORT = 8080;
const TCP_PORT = 4171;
const TCP_HOST = '127.0.0.1';

const server = http.createServer();
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
        dump('WS -> TCP', data);
        tcp.write(data);
    });

    // TCP server -> Browser
    tcp.on('data', (data) => {
        dump('TCP -> WS');
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
    console.log(`WS -> TCP proxy :${WS_PORT} -> ${TCP_HOST}:${TCP_PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    log.end(() => process.exit(0));
});