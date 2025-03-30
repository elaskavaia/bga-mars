import { expect } from "chai";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import sinon from "sinon";

global["$"] = sinon.stub();
const $ = global["$"];
global["_"] = function _(x: string) {
  return x;
};

// class GameXBody {
//   public getTokenName = Sinon.stub();
// }

describe("CustomRenders", () => {
  var CustomRenders;
  var xfile: string;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  before(() => {
    xfile = fs.readFileSync("tests/dist/src/CustomRenders.js", "utf8");
    expect(xfile).to.be.not.equal("");
    xfile += "\nmodule.exports.CustomRenders = CustomRenders;\n";
    fs.writeFileSync("tests/dist/src/CustomRenders_mod.js", xfile);
    var mod = require("./dist/src/CustomRenders_mod.js");
    CustomRenders = mod.CustomRenders;
  });

  describe("parseExprToHtml", () => {
    it("should return empty string for null expression", () => {
      const result = CustomRenders.parseExprToHtml(null);
      expect(result).to.equal("");
    });

    it("should return empty string for empty expression", () => {
      const result = CustomRenders.parseExprToHtml([]);
      expect(result).to.equal("");
    });

    it("should handle single token expression", () => {
      const result = CustomRenders.parseExprToHtml(["forest"]);
      expect(result).to.include("tracker tracker_forest");
    });
  });
  describe("parseExprItem", () => {
    it("should handle single item array", () => {
      const result = CustomRenders.parseExprItem(["tagSpace"], 0);
      expect(result[0]).to.have.property("classes", "tracker badge tracker_tagSpace");
    });

    it("should handle special case play_cardSpaceEvent", () => {
      const result = CustomRenders.parseExprItem(["play_cardSpaceEvent"], 0);
      expect(result).to.have.length(2);
      expect(result[0]).to.have.property("classes", "tracker badge tracker_tagSpace");
      expect(result[1]).to.have.property("classes", "tracker badge tracker_tagEvent");
    });
  });

  describe("getParse", () => {
    it("should return parse object for known item", () => {
      const result = CustomRenders.getParse("forest");
      expect(result).to.have.property("classes", "tracker tracker_forest");
    });

    it("should handle unknown parse items", () => {
      const result = CustomRenders.getParse("unknown_item");
      expect(result).to.have.property("class", "unknown");
      expect(result).to.have.property("content", "unknown_item");
    });
  });

  describe("parseSingleItemToHTML", () => {
    it("should render basic item", () => {
      const item = {
        classes: "test-class",
        content: "test-content",
        depth: 0
      };
      const result = CustomRenders.parseSingleItemToHTML(item);
      expect(result).to.include("test-class");
      expect(result).to.include("test-content");
    });

    it("should handle quantity multiplier", () => {
      const item = {
        classes: "test-class",
        content: "",
        depth: 0,
        norepeat: false
      };
      const result = CustomRenders.parseSingleItemToHTML(item, 2);
      // Should repeat the element twice since qty=2
      expect(result.match(/test-class/g)).to.have.length(2);
    });
  });

  describe("updateUIFromCorp", () => {
    var document;
    beforeEach(() => {
      // Create a fake DOM element for testing

      document = new JSDOM().window.document;
      const div = document.createElement("div");
      div.id = "card_stanproj_2";
      document.body.appendChild(div);
    });

    it("should update UI for card_corp_12", () => {
      const fakeNode = {
        dataset: {},
        classList: {
          add: sinon.spy()
        }
      };

      $.withArgs("card_stanproj_2").returns(fakeNode);

      CustomRenders.updateUIFromCorp("card_corp_12");

      expect((fakeNode.dataset as any).cost).to.equal("8");
      expect(fakeNode.classList.add.calledWith("discounted")).to.be.true;
    });
  });

  describe("parsePrereqToText", () => {
    let gameMock;

    beforeEach(() => {
      // Create a mock game object with getTokenName method
      gameMock = {
        getTokenName: sinon.stub()
      };

      // Setup default behavior for getTokenName
      gameMock.getTokenName.callsFake((token) => {
        const tokens = {
          tagScience: "Science",
          tagSpace: "Space",
          tracker_p: "Plant",
          res_Animal: "Animal",
          tracker_pu: "Titanium Production",
          tracker_ps: "Steel Production"
        };
        return tokens[token] || token;
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should handle empty or null prerequisites", () => {
      expect(CustomRenders.parsePrereqToText(null, gameMock)).to.equal("");
      expect(CustomRenders.parsePrereqToText(undefined, gameMock)).to.equal("");
    });

    it("should handle oxygen requirements", () => {
      expect(CustomRenders.parsePrereqToText([">=", "o", 7], gameMock)).to.equal("Requires 7% Oxygen.");

      expect(CustomRenders.parsePrereqToText(["<=", "o", 4], gameMock)).to.equal("Oxygen must be 4% or less.");
    });

    it("should handle temperature requirements", () => {
      expect(CustomRenders.parsePrereqToText([">=", "t", -10], gameMock)).to.equal("Requires -10°C or warmer.");

      expect(CustomRenders.parsePrereqToText(["<=", "t", -20], gameMock)).to.equal("It must be -20°C or colder.");
    });

    it("should handle ocean tile requirements", () => {
      expect(CustomRenders.parsePrereqToText([">=", "w", 3], gameMock)).to.equal("Requires 3 ocean tiles.");

      expect(CustomRenders.parsePrereqToText(["<=", "w", 2], gameMock)).to.equal("2 ocean tiles or less.");
    });

    it("should handle forest/greenery requirements", () => {
      expect(CustomRenders.parsePrereqToText("forest", gameMock)).to.equal("Requires that you have a greenery tile.");

      expect(CustomRenders.parsePrereqToText([">=", "forest", 3], gameMock)).to.equal("Requires 3 greenery tiles.");
    });

    it("should handle city requirements", () => {
      expect(CustomRenders.parsePrereqToText([">=", "all_city", 2], gameMock)).to.equal("Requires 2 cities in play.");
    });

    it("should handle tag requirements", () => {
      expect(CustomRenders.parsePrereqToText("tagScience", gameMock)).to.equal("Requires a Science tag.");

      expect(CustomRenders.parsePrereqToText([">=", "tagSpace", 2], gameMock)).to.equal("Requires 2 Space tags.");

      // Verify getTokenName was called
      expect(gameMock.getTokenName.calledWith("tagScience")).to.be.true;
      expect(gameMock.getTokenName.calledWith("tagSpace")).to.be.true;
    });

    it("should handle resource requirements", () => {
      expect(CustomRenders.parsePrereqToText([">=", "res_Animal", 2], gameMock)).to.equal("Requires that you have 2 Animal resources.");

      // Verify getTokenName was called
      expect(gameMock.getTokenName.calledWith("res_Animal")).to.be.true;
    });

    it("should handle production requirements", () => {
      expect(CustomRenders.parsePrereqToText("ps", gameMock)).to.equal("Requires that you have Steel Production.");

      expect(CustomRenders.parsePrereqToText("pu", gameMock)).to.equal("Requires that you have Titanium Production.");
    });
  });
});
