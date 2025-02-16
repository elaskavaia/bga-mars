const ALL_SORT_TYPES = ["none", "playable", "cost", "vp", "manual"] as const;
type SortTuple = typeof ALL_SORT_TYPES; // magic
type SortType = SortTuple[number]; // "none" | "playable" | "cost" | "vp" | "manual";

/** Hand of cards (also Draw, Draft, etc) */
class CardHand {
  public constructor(
    readonly game: GameXBody // game reference
  ) {}

  hookSort() {
    try {
      //generate buttons
      //I wanted first to attach them to every handy area, but it prevents areas to hide (there is no way in css to evaluate the number of children of a node)
      //So I attached it to the hand area block.
      document.querySelectorAll(".tm_sortable").forEach((node) => this.addSortButtonsToHandy(node));
      this.enableManualReorder("hand_area");
      this.game.connectClass("hs_button", "onclick", (event) => this.onClickHandSort(event));
    } catch (e) {
      this.game.showError("error during sorting setup, card sorting is disabled");
    }
  }

  onClickHandSort(event: Event) {
    dojo.stopEvent(event);
    if (this.game._helpMode) return;
    let btn = event.currentTarget as HTMLElement;
    let prevType = btn.dataset.type as SortType;
    let newtype: SortType;

    switch (prevType) {
      case "none":
        newtype = "playable";
        break;
      case "playable":
        newtype = "cost";
        break;
      case "cost":
        newtype = "vp";
        break;
      case "vp":
        newtype = "manual";
        break;
      case "manual":
        newtype = "none";
        break;
    }
    this.switchHandSort(btn, newtype);
  }

  switchHandSort(button: HTMLElement, newtype: SortType): void {
    let sortInfo = this.game.getRulesFor(`sort_${newtype}`, "*", undefined);
    if (!sortInfo) {
      return;
    }

    button.dataset.type = newtype;

    button.querySelector("i").removeAttribute("class");
    button.querySelector("i").classList.add("fa", sortInfo.icon);

    const handId: string = button.dataset.target;
    $(handId).dataset.sort_type = newtype;
    this.updateButtonTooltip(button, sortInfo);

    const localColorSetting = new LocalSettings(this.game.getLocalSettingNamespace(`card_sort_${handId}`));
    localColorSetting.writeProp("sort_type", newtype);

    this.applySortOrder($(handId));
  }

  updateButtonTooltip(button: HTMLElement, sortInfo: any) {
    let fullmsg = _("Click to select next sorting mode");
    fullmsg += ".<br>";
    fullmsg += _("The selected sort mode is stored in local browser storage, not in the game database.");

    for (const otherSort of ALL_SORT_TYPES) {
      let oInfo = this.game.getRulesFor(`sort_${otherSort}`, "*", undefined);
      let name = this.game.getTokenName(otherSort);
      fullmsg += this.game.generateTooltipSection(name, `<i class="fa ${oInfo.icon}"></i> ` + _(oInfo.tooltip));
    }
    const title = _("Sort Order: ") + `<i class="fa ${sortInfo.icon}"></i> ` + _(sortInfo.name);
    const html = this.game.getTooptipHtml(title, fullmsg, "");

    this.game.addTooltipHtml(button.id, html);
    button.classList.add("withtooltip");
  }

  addSortButtonsToHandy(attachNode: Element): void {
    const id = attachNode.id;
    const buttonId = "hs_button_" + id + "_switch";
    const htm = `<div id="${buttonId}" class="hs_button" data-target="${id}" data-type="none"><div class="hs_picto hs_cost"><i id="hs_button_${id}_picto" class="fa fa-times" aria-hidden="true"></i></div></div>       `;
    const node = this.game.createDivNode("", "hand_sorter", attachNode.id);
    node.innerHTML = htm;

    const localColorSetting = new LocalSettings(this.game.getLocalSettingNamespace(`card_sort_${id}`));
    let sortType = localColorSetting.readProp("sort_type", "manual") as SortType;
    this.switchHandSort($(buttonId), sortType);
  }

  /* Manual reordering of cards via drag'n'drop */
  enableManualReorder(idContainer: string) {
    $(idContainer).addEventListener("drop", namedEventPreventDefaultAndStopHandler);
    $(idContainer).addEventListener("dragover", namedEventPreventDefaultHandler);
    $(idContainer).addEventListener("dragenter", namedEventPreventDefaultHandler);
  }
  enableDragOnCard(node: HTMLElement) {
    if (node.draggable) return;
    //disable on mobile for now
    if ($("ebd-body").classList.contains("mobile_version")) return;
    //console.log("enable drag on ", node.id);
    node.querySelectorAll("*").forEach((sub: HTMLElement) => {
      sub.draggable = false;
    });
    node.draggable = true;
    node.addEventListener("dragstart", onDragStart);
    node.addEventListener("dragend", onDragEnd);
  }
  disableDragOnCard(node: HTMLElement) {
    if (!node.draggable) return;
    //console.log("disable drag on ", node.id);
    node.draggable = false;
    node.removeEventListener("dragstart", onDragStart);
    node.removeEventListener("dragend", onDragEnd);
  }
  maybeEnabledDragOnCard(tokenNode: HTMLElement) {
    if (dojo.hasClass(tokenNode.parentElement, "tm_sortable")) {
      if (this.isManualSortOrderEnabled(tokenNode.parentElement)) {
        this.enableDragOnCard(tokenNode);
        return;
      }
    }
    this.disableDragOnCard(tokenNode);
  }

  isManualSortOrderEnabled(tokenNode: HTMLElement) {
    if (tokenNode?.dataset?.sort_type == "manual") {
      return true;
    } else {
      return false;
    }
  }

  applySortOrder(node?: HTMLElement | undefined) {
    if (node === undefined) {
      document.querySelectorAll(".tm_sortable").forEach((node) => this.applySortOrder(node as HTMLElement));
      return;
    }
    const containerNode = node;
    const sortType = containerNode.dataset.sort_type;

    if (this.isManualSortOrderEnabled(containerNode)) {
      this.loadLocalManualOrder(containerNode);
      containerNode.querySelectorAll(".card").forEach((card: HTMLElement) => {
        this.enableDragOnCard(card);
        card.style.removeProperty("--sort-order");
      });
    } else {
      // disable on all cards in case it was moved
      document.querySelectorAll(".card").forEach((card: HTMLElement) => {
        if (!this.isManualSortOrderEnabled(card.parentElement)) this.disableDragOnCard(card);
      });

      containerNode.querySelectorAll(".card").forEach((card: HTMLElement) => {
        let weight = 0;
        switch (sortType) {
          case "cost":
            weight = parseInt(card.dataset.discount_cost ?? card.dataset.cost);
            break;
          case "playable":
            weight = this.getSortWeightPlayability(card);
            break;
          case "vp":
            weight = this.getSortWeightVp(card);
            break;
          default:
            card.style.removeProperty("--sort-order");
            return;
        }
        // card num is last sort disambiguator
        const num = parseInt(getPart(card.id, 2));
        card.style.setProperty("--sort-order", String(weight * 1000 + num));
      });
    }
  }

  getSortWeightVp(card: HTMLElement): number {
    const vpattr = this.game.getRulesFor(card.id, "vp", undefined);
    let vp = 0;
    if (vpattr) {
      vp = Number(vpattr);
      if (isNaN(vp)) {
        const sp = vpattr.split("/");
        if (sp.length == 2) vp = 5 - parseInt(sp[1]);
        else vp = 5;
      }
    }
    return vp;
  }

  getSortWeightPlayability(card: HTMLElement): number {
    const cost = parseInt(card.dataset.discount_cost ?? card.dataset.cost);
    let sort_playable: number = 0;
    if (card.dataset.invalid_prereq != "0") sort_playable += 1;
    sort_playable = sort_playable * 2;
    if (card.dataset.cannot_resolve != "0") sort_playable += 1;
    sort_playable = sort_playable * 2;
    if (card.dataset.cannot_pay != "0") sort_playable += 1;
    return sort_playable * 50 + cost;
  }

  loadLocalManualOrder(containerNode: HTMLElement | undefined) {
    if (!containerNode) return;
    const sortOrder = getDivLocalSetting(containerNode.id).readProp("custom_order", "");
    if (!sortOrder) return;

    const cards = sortOrder.split(",");
    cards.reverse().forEach((card_id) => {
      const node = $(card_id);
      if (node?.parentElement === containerNode) {
        containerNode.prepend(node);
      }
    });
  }
}
function getDivLocalSetting(divId: string) {
  const game = gameui as GameXBody;
  const localOrderSetting = new LocalSettings(getGamePlayerNamespace(game.table_id, divId));
  return localOrderSetting;
}
function getGamePlayerNamespace(a: string | number = "", b: string | number = "") {
  const game = gameui as GameXBody;
  if (b) return `${game.game_name}-${game.player_id}-${a}_${b}`;
  return `${game.game_name}-${game.player_id}-${a}`;
}

function saveLocalManualOrder(containerNode: HTMLElement) {
  const game = gameui as GameXBody;
  let sortOrder: string = "";
  //query should return in the same order as the DOM
  dojo.query("#" + containerNode.id + " .card").forEach((card) => {
    sortOrder += `${card.id},`;
  });
  sortOrder = sortOrder.substring(0, sortOrder.length - 1);

  getDivLocalSetting(containerNode.id).writeProp("custom_order", sortOrder);
}

function onDragEnd(event: DragEvent) {
  // no prevent defaults
  const selectedItem = event.target as HTMLElement;
  console.log("onDragEnd", selectedItem?.id);

  let x = event.clientX;
  let y = event.clientY;

  const containerNode: HTMLElement = selectedItem.parentElement;
  const pointsTo = document.elementFromPoint(x, y);

  if (pointsTo === selectedItem || pointsTo === null) {
    // do nothing
  } else if (containerNode === pointsTo) {
    //dropped in empty space on container
    containerNode.append(selectedItem);
  } else if (
    pointsTo.parentElement !== undefined &&
    pointsTo.parentElement.parentElement !== undefined &&
    pointsTo.parentElement.parentElement == selectedItem.parentElement &&
    pointsTo.classList.contains("dragzone_inside")
  ) {
    containerNode.insertBefore(selectedItem, pointsTo.parentElement);
  } else if (containerNode === pointsTo.parentNode) {
    containerNode.insertBefore(pointsTo, selectedItem);
  } else {
    console.error("Cannot determine target for drop", pointsTo.id);
  }

  selectedItem.classList.remove("drag-active");
  $("ebd-body").classList.remove("drag_inpg");
  containerNode.style.removeProperty("width");
  containerNode.style.removeProperty("height");

  document.querySelectorAll(".dragzone").forEach(dojo.destroy);

  console.log("onDragEnd commit");
  try {
    saveLocalManualOrder(containerNode);
  } catch (e) {
    console.error(e);
  }
}

function onDragStart(event: DragEvent) {
  const selectedItem = event.currentTarget as HTMLElement;
  console.log("onDragStart", selectedItem?.id);
  const cardParent = selectedItem.parentElement;
  // no prevent defaults
  if (!cardParent.classList.contains("handy") || !selectedItem.id) {
    event.preventDefault();
    event.stopPropagation();
    console.log("onDragStart - no");
    return;
  }

  // no checks, handler should not be installed if on mobile and such

  //prevent container from changing size
  const rect = cardParent.getBoundingClientRect();
  cardParent.style.setProperty("width", String(rect.width) + "px");
  cardParent.style.setProperty("height", String(rect.height) + "px");

  $("ebd-body").classList.add("drag_inpg");
  selectedItem.classList.add("drag-active");
  selectedItem.style.setProperty("user-select", "none");

  // event.dataTransfer.setData("text/plain", "card"); // not sure if needed
  // event.dataTransfer.effectAllowed = "move";
  // event.dataTransfer.dropEffect = "move";

  // selectedItem.classList.add("hide"); not in css?

  // without timeout the dom changes cancel the start drag in a lot of cases because the new element under the mouse
  setTimeout(() => {
    cardParent.querySelectorAll(".dragzone").forEach(dojo.destroy);
    cardParent.querySelectorAll(".card").forEach((card) => {
      //prevent
      if (card.id == selectedItem.id) return;

      if (card.nextElementSibling == null) {
        const dragNodeId = "dragright_" + card.id;
        const righthtm: string = `<div class="dragzone outsideright"><div id="${dragNodeId}" class="dragzone_inside dragright"></div></div>`;
        card.insertAdjacentHTML("afterend", righthtm);
        const dragNode = $(dragNodeId);
        dragNode.parentElement.addEventListener("dragover", dragOverHandler);
        dragNode.parentElement.addEventListener("dragleave", dragLeaveHandler);
      }
      if (
        (card.previousElementSibling != null && card.previousElementSibling.id != selectedItem.id) ||
        card.previousElementSibling == null
      ) {
        const dragNodeId = "dragleft_" + card.id;
        const lefthtm: string = `<div class="dragzone"><div id="${dragNodeId}" class="dragzone_inside dragleft"></div></div>`;
        card.insertAdjacentHTML("beforebegin", lefthtm);
        const dragNode = $(dragNodeId);
        dragNode.parentElement.addEventListener("dragover", dragOverHandler);
        dragNode.parentElement.addEventListener("dragleave", dragLeaveHandler);
      }
    });
  }, 1);
  console.log("onDragStart commit");
}

function namedEventPreventDefaultHandler(event) {
  event.preventDefault();
}
function namedEventPreventDefaultAndStopHandler(event) {
  event.preventDefault();
  event.stopPropagation();
}

function dragOverHandler(event: Event) {
  event.preventDefault();
  (event.currentTarget as HTMLElement).classList.add("over");
}

function dragLeaveHandler(event: Event) {
  event.preventDefault();
  (event.currentTarget as HTMLElement).classList.remove("over");
}
