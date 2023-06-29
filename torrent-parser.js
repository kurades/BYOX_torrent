'use strict'
import fs from 'fs'
import bencode from 'bencode'
import crypto from 'crypto'

const BLOCK_LEN = Math.pow(2, 14)

function pieceLen(torrent, pieceIndex) {
    const totalLength = Number(size(torrent).readBigInt64BE())
    const pieceLength = torrent.info['piece length']

    const lastPieceLength = totalLength % pieceLength
    const lastPieceIndex = Math.floor(totalLength / pieceLength)

    return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength
}

const blockPerPiece = (torrent, pieceIndex) => {
    const pieceLength = pieceLen(torrent, pieceIndex)
    return Math.ceil(pieceLength / BLOCK_LEN)
}

const blockLen = (torrent, pieceIndex, blockIndex) => {
    const pieceLength = pieceLen(torrent, pieceIndex)
    const lastPieceLength = pieceLength % BLOCK_LEN
    const lastPieceIndex = Math.floor(pieceLength /BLOCK_LEN)
    return blockIndex == lastPieceIndex ? lastPieceLength : BLOCK_LEN
}

const open = (filePath) => {
    return bencode.decode(fs.readFileSync(filePath))
}

const size = (torrent) => {
    const buf = Buffer.alloc(8)

    const size = torrent.info.files
        ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
        : torrent.info.length
    console.log(size);
    buf.writeBigInt64BE(BigInt(size))
    return buf
}

const infoHash = torrent => {
    const info = bencode.encode(torrent.info);
    return crypto.createHash('sha1').update(info).digest()
}

export default { open, size, infoHash, BLOCK_LEN, pieceLen, blockPerPiece, blockLen }