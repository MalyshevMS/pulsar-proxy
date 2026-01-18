// proxy.js
const net = require("net");

const LISTEN_PORT = 8080;
const TARGET_PORT = 4171;
const TARGET_HOST = "127.0.0.1";

const server = net.createServer((clientSocket) => {
    const targetSocket = net.connect(TARGET_PORT, TARGET_HOST);

    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);

    clientSocket.on("error", () => targetSocket.destroy());
    targetSocket.on("error", () => clientSocket.destroy());
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${LISTEN_PORT} is already in use`);
    } else {
        console.error(err);
    }
    process.exit(1);
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
    console.log(`Proxy listening on ${LISTEN_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`);
});
