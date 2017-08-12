var consortwords = ["牛逼","厉害"];
function RPP(instr) {
    for(idx in consortwords)
    {
        instr = instr.replace(consortwords[idx],"****");
    }
    return instr;
}
exports.RPP = RPP;