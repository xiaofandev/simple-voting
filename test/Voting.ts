import hre from "hardhat";
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("contract", function () {
  async function deploy() {
    const Contract = await hre.ethers.getContractFactory("Voting");
    const contract = await Contract.deploy();
    return { contract };
  }

  describe("Creating a new ballot", async function () {
    it("should create a new ballot", async function () {
      const { contract } = await loadFixture(deploy);
      const title = "What are you going to eat tonight?";
      const options = ["Fish", "Chicken", "Beef"];
      const startTime = (await time.latest()) + 60; // start the ballot in 1 minute
      const duration = 300; // 5 minutes

      await contract.createBallot(title, options, startTime, duration);

      expect(await contract.getBallotByIndex(0)).to.deep.eq([
        title,
        options,
        startTime,
        duration,
      ]);
    });

    it("should revert if the ballot has less than 2 options", async function () {
      const { contract } = await loadFixture(deploy);
      const title = "What are you going to eat tonight?";
      const options = ["Fish"];
      const startTime = (await time.latest()) + 60; // start the ballot in 1 minute
      const duration = 300; // 5 minutes

      await expect(
        contract.createBallot(title, options, startTime, duration)
      ).to.be.revertedWith("Provide at least 2 options");
    });

    it("should revert if the start time is less than the current time", async function () {
      const { contract } = await loadFixture(deploy);
      const title = "What are you going to eat tonight?";
      const options = ["Fish", "Chicken", "Beef"];
      const startTime = (await time.latest()) - 60; // start the ballot in 1 minute
      const duration = 300; // 5 minutes

      await expect(
        contract.createBallot(title, options, startTime, duration)
      ).to.be.revertedWith("Start time must be in the future");
    });

    it("should revert if the duration is less than 1 second", async function () {
      const { contract } = await loadFixture(deploy);
      const title = "What are you going to eat tonight?";
      const options = ["Fish", "Chicken", "Beef"];
      const startTime = (await time.latest()) + 60; // start the ballot in 1 minute
      const duration = 0;

      await expect(
        contract.createBallot(title, options, startTime, duration)
      ).to.be.revertedWith("Duration must be at least 1 second");
    });
  });

  describe("Casting a vote", async function () {
    let contract: any;
    let waitToStartTime = 60;
    let duration = 300;

    this.beforeEach(async function () {
      const fixure = ({ contract } = await loadFixture(deploy));
      const title = "What are you going to eat tonight?";
      const options = ["Fish", "Chicken", "Beef"];
      const startTime = (await time.latest()) + waitToStartTime; // start the ballot in 1 minute

      await contract.createBallot(title, options, startTime, duration);
    });

    it("should be able to cast a vote", async function () {
      const [signer] = await ethers.getSigners();
      await time.increase(waitToStartTime + 1); // move the time forward to start the ballot
      await contract.castVote(0, 0);
      expect(await contract.hasVoted(signer.address, 0)).to.eq(true);
      expect(await contract.getVotingCount(0, 0)).to.eq(1);
    });

    it("should revert if ballot not started.", async function () {
      await expect(contract.castVote(0, 0)).to.be.revertedWith(
        "Ballot has not started yet"
      );
    });

    it("should revert if ballot expired", async function () {
      await time.increase(waitToStartTime + duration + 1);
      await expect(contract.castVote(0, 0)).to.be.revertedWith(
        "Ballot has ended"
      );
    });

    it("should revert if someone has already voted", async function () {
      await time.increase(waitToStartTime + 1); // move the time forward to start the ballot
      await contract.castVote(0, 0);
      await expect(contract.castVote(0, 0)).to.be.rejectedWith(
        "You have already voted in this ballot"
      );
    });
  });

  describe("Tallying votes", function () {
    let contract: any;
    let waitToStartTime = 60;
    let duration = 300;

    this.beforeEach(async function () {
      const fixure = ({ contract } = await loadFixture(deploy));
      const title = "What are you going to eat tonight?";
      const options = ["Fish", "Chicken", "Beef"];
      const startTime = (await time.latest()) + waitToStartTime; // start the ballot in 1 minute

      await contract.createBallot(title, options, startTime, duration);
    });

    it("should get the correct result after voting", async function () {
      const signers = await ethers.getSigners();
      await time.increase(waitToStartTime + 1); // move the time forward to start the ballot
      await contract.castVote(0, 0);
      await contract.connect(signers[1]).castVote(0, 1);
      await contract.connect(signers[2]).castVote(0, 1);

      await expect(await contract.getResult(0)).to.deep.equal([1, 2, 0]);
    });

    it("should get the correct winner", async function () {
      await time.increase(waitToStartTime + 1);

      await contract.castVote(0, 0);
      expect(await contract.getWinners(0)).to.deep.eq([true, false, false]);
    });

    it("should get multiple correct winner", async function () {
      await time.increase(waitToStartTime + 1);
      const signers = await ethers.getSigners();

      await contract.castVote(0, 0);
      await contract.connect(signers[1]).castVote(0, 1);
      expect(await contract.getWinners(0)).to.deep.eq([true, true, false]);
    });
  });
});
