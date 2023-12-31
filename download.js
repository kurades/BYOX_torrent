import net from 'net'
import { Buffer } from 'buffer'
import tracker from './tracker.js'
import fs from 'fs'
import message from './message.js'
import piece from './piece.js'
import Queue from './queue.js'
export default (torrent, path) => {
    tracker.getPeers(torrent, peers => {
        const pieces = new piece(torrent);
        const file = fs.openSync(path, 'w');
        peers.forEach(peer => download(peer, torrent, pieces, file));
      });
}

function download(peer, torrent, pieces) {
    const socket = net.Socket()
    socket.on('error', console.log)
    socket.connect(peer.port, peer.ip, () => {
        socket.write(message.buildHandshake(torrent))
    })
    const queue = new Queue(torrent)
    onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue))
}

function onWholeMsg(socket, callback) {
    let saveBuf = Buffer.alloc(0)
    let handshake = true
    socket.on('data', recvBuf => {
        const msgLen = () => handshake ? saveBuf.readUInt8(0) + 49 : saveBuf.readInt32BE(0) + 4
        saveBuf = Buffer.concat([saveBuf, recvBuf])
        while (saveBuf.length >= 4 && saveBuf.length >= msgLen()) {
            callback(saveBuf.slice(0, msgLen()))
            saveBuf = saveBuf.slice(msgLen())
            handshake = false
        }
    })
}

function msgHandler(msg, socket, pieces, queue) {
    if (isHandshake(msg)) {
        socket.write(message.buildInterested())
    } else {
        const m = message.parse(msg)
        if (m.id === 0) chokeHandler(socket)
        if (m.id === 1) unchokeHandler(socket, pieces, queue)
        if (m.id === 4) haveHandler(m.payload)
        if (m.id === 5) bitfieldHandler(m.payload)
        if (m.id === 7) pieceHandler(m.payload)
    }

}

function chokeHandler(socket) {
    socket.end()
}
function unchokeHandler(socket, pieces, queue) {
    queue.choked = false
    requestPiece(socket, pieces, queue)
}
function haveHandler(socket, pieces, queue, payload) {
    const pieceIndex = payload.readUInt32BE(0);
    const queueEmpty = queue.length === 0;
    queue.queue(pieceIndex);
    if (queueEmpty) requestPiece(socket, pieces, queue);
}
function bitfieldHandler(socket, pieces, queue, payload) {
    const queueEmpty = queue.length === 0;
    payload.forEach((byte, i) => {
        for (let j = 0; j < 8; j++) {
            if (byte % 2) queue.queue(i * 8 + 7 - j);
            byte = Math.floor(byte / 2);
        }
    });
    if (queueEmpty) requestPiece(socket, pieces, queue);
}
function pieceHandler(socket, pieces, queue, torrent, file, pieceResp) {
    console.log(pieceResp);
    pieces.addReceived(pieceResp);

    const offset = pieceResp.index * torrent.info['piece length'] + pieceResp.begin;
    fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => { });

    if (pieces.isDone()) {
        console.log('DONE!');
        socket.end();
        try { fs.closeSync(file); } catch (e) { }
    } else {
        requestPiece(socket, pieces, queue);
    }
}

function requestPiece(socket, pieces, queue) {
    if (queue.choked) return null
    while (queue.length()) {
        const pieceBlock = queue.deque();
        if (pieces.needed(pieceBlock)) {
            socket.write(message.buildRequest(pieceBlock));
            pieces.addRequested(pieceBlock);
            break;
        }
    }
}

function isHandshake(msg) {
    return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'bitTorrent protocol'
}
