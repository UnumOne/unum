const fs = require('fs');

//var QTUM = artifacts.require('HumanStandardToken');
//var OMG = artifacts.require('OMGToken');
//var EOS = artifacts.require('DSToken');
//var PayToken = artifacts.require('PayToken');

let addresses = {};

let QTUM = require('../build/contracts/HumanStandardToken');
addresses.QTUM = QTUM.networks['4447'].address;

let OMG = require('../build/contracts/OMGToken');
addresses.OMG = OMG.networks['4447'].address;

let EOS = require('../build/contracts/DSToken');
addresses.EOS = EOS.networks['4447'].address;

let PAY = require('../build/contracts/PayToken');
addresses.PAY = PAY.networks['4447'].address;

fs.writeFileSync('contractAddresses.json', JSON.stringify(addresses));