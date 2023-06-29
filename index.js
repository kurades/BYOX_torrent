'use strict'
import tracker from './tracker.js'
import torrentParser from './torrent-parser.js';
import download from './download.js';
const torrent = torrentParser.open('./test.torrent')
download(torrent, torrent.info.name)
// tracker.getPeers(torrent, peers => {
//     console.log('list of peers: ', peers);
// })