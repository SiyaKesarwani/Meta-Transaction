const ethers = require('ethers')

// These should match with the ones used in contract and it is used in creating the domain of the blockchain to sign data
const SIGNING_DOMAIN_NAME = "LazyMinting-Voucher";
const SIGNING_DOMAIN_VERSION = "1.0"

class LazyMintLibrary{
    constructor({contract, signer}){
        this.contract = contract;
        this.signer = signer;
    }

    async createVoucher(tokenId, uri, minPrice = 0){
        const voucher = {tokenId, uri, minPrice}
        const chainId = await this.contract.getChainId();
        const domain = {
            name: SIGNING_DOMAIN_NAME,
            version: SIGNING_DOMAIN_VERSION,
            chainId,
            verifyingContract: this.contract.address
        };
        const types = {
            NFTVoucher : [
                {name: "tokenId", type: "uint256"},
                {name: "uri", type: "string"},
                {name: "minPrice", type: "uint256"}
            ]
        }
        const signature = await this.signer._signTypedData(domain, types, voucher)
        //console.log("After signing the data Signature is : ",signature)
        return{
            ...voucher, // to return all the three values in a single object
            signature
        }
    } 
}

module.exports = {
    LazyMintLibrary
}
