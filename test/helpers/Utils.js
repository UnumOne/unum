function isException(error) {
    let strError = error.toString();
    return strError.includes('invalid opcode') || strError.includes('invalid JUMP');
}

function ensureException(error) {
    assert(isException(error), error.toString());
}

let ETH_PRICE = 321.5;

let OMG_PRICE =  7.56;

let CONVERSION_FEE = .0005;

module.exports = {
    zeroAddress: '0x0000000000000000000000000000000000000000',
    isException: isException,
    ensureException: ensureException,
    ETH_PRICE,
    OMG_PRICE,
    CONVERSION_FEE
};