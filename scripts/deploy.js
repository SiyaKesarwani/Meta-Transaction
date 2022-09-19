const hardhat = require("hardhat");
const { ethers } = hardhat;
const { LazyMintLibrary } = require('../lib')

async function deploy(){
const [minter, bidder1, bidder2, bidder3] = await ethers.getSigners()

const factory = await ethers.getContractFactory("NFTAuction")
const contract = await factory.deploy(minter.address, 120)
await contract.deployed();
/*console.log("Address of Minter : ", minter.address)
console.log("Address of Redeemer : ", redeemer.address)
console.log("Contract is deployed at : ", contract.address)
*/


// the redeemerContract is an instance of the contract that's wired up to the redeemer's signing key
const bidderFactory1 = factory.connect(bidder1)
const bidderContract1 = bidderFactory1.attach(contract.address)
//console.log("Redeemer Contract is deployed at :", redeemerContract.address)

const bidderFactory2 = factory.connect(bidder2)
const bidderContract2 = bidderFactory2.attach(contract.address)

const bidderFactory3 = factory.connect(bidder3)
const bidderContract3 = bidderFactory3.attach(contract.address)

const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
//console.log("Signature passed : ",voucher.signature)

await bidderContract1.bid(bidder1.address, voucher, {value: 3})
console.log("Bid 1 successful!")

// reverts as the bid amount is less than the highest bid amount
/*await bidderContract2.bid(bidder2.address, voucher, {value: 2})
console.log("Bid 2 successful!")*/

await bidderContract3.bid(bidder3.address, voucher, {value: 4})
console.log("Bid 3 successful!")

await contract.auctionEnd();
}

deploy();
