'use strict';
import fs from 'fs'
import bencode from 'bencode'
import dgram from 'dgram'
import { Buffer } from 'buffer';
import { parse as urlParse } from 'url';
import crypto from 'crypto'
const getPeers = (torrent, callback) => {
    const socket = dgram.createSocket('udp4')
    const url = new TextDecoder().decode(torrent.announce)

    udpSend(socket, buildConnReq(), url)

    socket.on('message', response => {
        if (respType(response) === 'connect') {
            const connResp = parseConnResp(response)
            const announceReq = buildAnnounceReq(connResp.connectionId)

            udpSend(socket, announceReq, url)
        } else if (respType(response) === 'announce') {
            const announceResp = parseAnnounceResp(response)

            callback(announceResp.peers)
        }
    })
}

function udpSend(socket, message, rawUrl, callback = () => { }) {
    const url = urlParse(rawUrl)

    socket.send(message, 0, message.length, url.port, url.host, callback)
}
function respType(resp) {
    // ...
}

function buildConnReq() {
    const buf = Buffer.alloc(16)
// connection id
    buf.writeUInt32BE(0x417, 0)
    buf.writeUInt32BE(0x27101980, 4)
// action
    buf.writeUInt32BE(0,8)
// transaction id
    crypto.randomBytes(4).copy(buf,12)
    return buf
}

function parseConnResp(resp) {
    return {
        action : resp.readUInt32BE(0),
        transactionId: resp.readUInt32BE(4),
        connectionId: resp.slice(8)
    }
}

function buildAnnounceReq(connId) {
    // ...
}

function parseAnnounceResp(resp) {
    // ...
}
export default { getPeers }