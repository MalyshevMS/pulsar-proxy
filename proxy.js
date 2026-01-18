// proxy.js
const net = require("net");

const LISTEN_PORT = 8080;
const TARGET_PORT = 4171;
const TARGET_HOST = "127.0.0.1";

const server = net.createServer((clientSocket) => {
    const targetSocket = net.connect(TARGET_PORT, TARGET_HOST);

    // client -> target
    clientSocket.pipe(targetSocket);
    // target -> client
    targetSocket.pipe(clientSocket);

    clientSocket.on("error", () => targetSocket.destroy());
    targetSocket.on("error", () => clientSocket.destroy());
});

server.listen(LISTEN_PORT, () => {
    console.log(`Proxy listening on port ${LISTEN_PORT}, forwarding to ${TARGET_HOST}:${TARGET_PORT}`);
});
