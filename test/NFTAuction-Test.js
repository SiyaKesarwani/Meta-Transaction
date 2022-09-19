const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const { LazyMintLibrary } = require('../lib')

async function deploy() {
    const [minter, bidder1, bidder2, bidder3] = await ethers.getSigners()

    const factory = await ethers.getContractFactory("NFTAuction")
    const contract = await factory.deploy(minter.address, 120)
    await contract.deployed();

  // the redeemerContract is an instance of the contract that's wired up to the redeemer's signing key
    const bidderFactory1 = factory.connect(bidder1)
    const bidderContract1 = bidderFactory1.attach(contract.address)
    //console.log("Redeemer Contract is deployed at :", redeemerContract.address)

    const bidderFactory2 = factory.connect(bidder2)
    const bidderContract2 = bidderFactory2.attach(contract.address)

    const bidderFactory3 = factory.connect(bidder3)
    const bidderContract3 = bidderFactory3.attach(contract.address)

  return {
    minter,
    bidder1,
    bidder2,
    bidder3,
    contract,
    bidderContract1,
    bidderContract2,
    bidderContract3
  }
}

describe("NFTAuction", () => {
    it("Should deploy", async function () {
      const signers = await ethers.getSigners();
      const minter = signers[0].address;

      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const NFTauction = await NFTAuction.deploy(minter, 120);
      await NFTauction.deployed();
    });

    it("Should accept a bid amount greater than or equal to the minimum price of NFT signed voucher", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
  
        await expect(bidderContract1.bid(bidder1.address, voucher, {value: 4}))
          .to.emit(bidderContract1, 'HighestBidIncreased')
      });

      it("Should make the higgest bidder as the winner, transfer the NFT to his account and send the highest bid to signer", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
        
        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 4}))
          .to.emit(bidderContract2, 'HighestBidIncreased')

        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 6}))
          .to.emit(bidderContract2, 'HighestBidIncreased')

        await expect(contract.auctionEnd())
        .to.emit(contract, 'Transfer') // transfer from null address to minter
          .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
          .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
          .withArgs(minter.address, bidder2.address, voucher.tokenId)
          .and.to.emit(contract, 'AuctionEnded')
      });

      it("Should return the funds of the bidders who are not winners and should revert if the winner reclaims the bid amount", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
        
        await expect(bidderContract1.bid(bidder1.address, voucher, {value: 4}))
          .to.emit(bidderContract1, 'HighestBidIncreased')

        await expect(bidderContract1.connect(bidder2).bid(bidder2.address, voucher, {value: 5}))
          .to.emit(bidderContract1, 'HighestBidIncreased')

        await expect(bidderContract1.connect(bidder3).bid(bidder3.address, voucher, {value: 6}))
          .to.emit(bidderContract1, 'HighestBidIncreased') 

        await ethers.provider.send('evm_increaseTime', [121]);

        await expect(bidderContract1.connect(bidder3).withdrawFundsAfterAuctionEnd())
        .to.be.revertedWith('Winner cannot reclaim the bid amount!')

        await bidderContract1.connect(bidder1).withdrawFundsAfterAuctionEnd()

        await bidderContract1.connect(bidder2).withdrawFundsAfterAuctionEnd()

      });

      it("Should revert a bid amount less than the minimum price of NFT signed voucher", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
  
        await expect(bidderContract1.bid(bidder1.address, voucher, {value: 1}))
          .to.be.revertedWithCustomError(bidderContract1, "BidIsLessThanMinimumPriceOfNFT")
      });

      it("Should revert if the auction is ended without any bid", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
  
        await expect(bidderContract1.auctionEnd())
          .to.be.revertedWith('Nobody participated in the bid but auction ended!')
      });

      it("Should revert if anyone tries to end the auction or participate in bid after it has already ended", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
        
        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 4}))
          .to.emit(bidderContract2, 'HighestBidIncreased')

        await expect(contract.auctionEnd())
        .to.emit(contract, 'Transfer') // transfer from null address to minter
          .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
          .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
          .withArgs(minter.address, bidder2.address, voucher.tokenId)
          .and.to.emit(contract, 'AuctionEnded')
          .and.to.emit(contract, 'Transfer');
    
        await expect(bidderContract2.auctionEnd())
          .to.be.revertedWithCustomError(bidderContract2,'AuctionEndAlreadyCalled')

        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 5}))
          .to.be.revertedWithCustomError(bidderContract2,'AuctionEndAlreadyCalled')
      });

      it("Should revert if anyone tries to bid or end the auction after the auction time expires", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
        
        await ethers.provider.send('evm_increaseTime', [121]);

        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 4}))
          .to.be.revertedWithCustomError(bidderContract2,'AuctionHasAlreadyEnded')

        await expect(bidderContract2.auctionEnd())
          .to.be.revertedWithCustomError(bidderContract2,'AuctionHasAlreadyEnded')
      });

      it("Should revert if bid is not higher than the last highest bid", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);

        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 4}))
          .to.emit(bidderContract2, 'HighestBidIncreased')

        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 3}))
        .to.be.revertedWithCustomError(bidderContract2,'BidIsNotHigher');
      });

      it("Should revert if the bidders try to withdraw their funds before the end of auction", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
        
        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 4}))
          .to.emit(bidderContract2, 'HighestBidIncreased')

        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 6}))
          .to.emit(bidderContract2, 'HighestBidIncreased')

        await expect(bidderContract2.withdrawFundsAfterAuctionEnd())
        .to.be.revertedWithCustomError(bidderContract2, 'AuctionIsStillGoingOn')
      });

      it("Should revert if any non-bidder tries to withdraw funds", async function () {
        const { contract, bidderContract1, bidderContract2, bidderContract3, minter, bidder1, bidder2, bidder3 } = await deploy();
  
        const lazyMinter = new LazyMintLibrary({ contract, signer: minter });
        const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 2);
        
        await expect(bidderContract2.bid(bidder2.address, voucher, {value: 4}))
          .to.emit(bidderContract2, 'HighestBidIncreased')

        await ethers.provider.send('evm_increaseTime', [121]);
        //await bidderContract2.auctionEnd()

        await expect(bidderContract2.connect(bidder1).withdrawFundsAfterAuctionEnd())
        .to.be.revertedWithCustomError(bidderContract2, 'BidderHasNotParticipatedInAuction')
      });
      
});
