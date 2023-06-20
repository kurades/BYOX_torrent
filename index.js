'use strict';
// const fs = require('fs')
// const bencode = require('bencode')
import fs from 'fs'
import bencode from 'bencode'
import tracker from './tracker.js'

const torrent = bencode.decode(fs.readFileSync('puppy.torrent'))

tracker.getPeers(torrent, peers =>{
    console.log('list of peers: ',peers);
})