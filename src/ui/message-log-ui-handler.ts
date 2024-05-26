import BattleScene from "../battle-scene";
import { TextStyle, addTextObject } from "./text";
import { Mode } from "./ui";
import UiHandler from "./ui-handler";
import { addWindow } from "./ui-theme";
import {Button} from "../enums/buttons";
import i18next from "../plugins/i18n";

const ROWS_TO_DISPLAY = 9;
const MAX_LOG_LENGTH = 500;
const TRUNCATED_LOG_LENGTH = MAX_LOG_LENGTH - 100;
const LINE_MAX_LEN = 50;
const log : String[] = [];

const LOG_TO_CONSOLE = true; // switch to

// add a new message to the message log;
export function logMsg(msg: String):void {
  if (LOG_TO_CONSOLE) {
    // optionally also log it to the console
    console.info(msg);
  }
  const parts = msg.split("\n");

  for (let i = 0, l = parts.length; i < l; i++) {
    if (parts[i].length > LINE_MAX_LEN) {
      // trim very long messages
      let spliced = "";
      parts[i].split(" ").forEach((word) => {
        spliced += spliced ? " " + word : word;
        if (spliced.length > 50) {
          log.push(spliced);
          spliced = "";
        }
      });
      log.push(spliced);
    } else if ((i + 1) < l && (parts[i].length + parts[i + 1].length) < LINE_MAX_LEN) {
      // splice very short messages
      log.push(parts[i] + " " + parts[i+1]);
      i++;
    } else {
      // print the rest
      log.push(parts[i]);
    }
  }


  if (log.length > MAX_LOG_LENGTH) {
    // delete the oldest messages if there are too many
    log.splice(0, log.length - TRUNCATED_LOG_LENGTH);
  }
}

// Message Log, based on the SettingsUiHandler
export default class MessageLogUiHandler extends UiHandler {
  private msgLogContainer: Phaser.GameObjects.Container;
  private msgContainer: Phaser.GameObjects.Container;

  private scrollCursor: integer;

  private msgLogBg: Phaser.GameObjects.NineSlice;

  private msgs: Phaser.GameObjects.Text[] = [];

  private cursorObj: Phaser.GameObjects.NineSlice;

  constructor(scene: BattleScene, mode?: Mode) {
    super(scene, mode);
  }

  setup() {
    const ui = this.getUi();
    // prepare ui elements

    this.msgLogContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);

    this.msgLogContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);

    const headerBg = addWindow(this.scene, 0, 0, (this.scene.game.canvas.width / 6) - 2, 24);
    headerBg.setOrigin(0, 0);

    const headerText = addTextObject(this.scene, 0, 0, i18next.t("menuUiHandler:MSG_LOG"), TextStyle.SETTINGS_LABEL);
    headerText.setOrigin(0, 0);
    headerText.setPositionRelative(headerBg, 8, 4);

    this.msgLogBg = addWindow(this.scene, 0, headerBg.height, (this.scene.game.canvas.width / 6) - 2, (this.scene.game.canvas.height / 6) - headerBg.height - 2);
    this.msgLogBg.setOrigin(0, 0);

    this.msgContainer = this.scene.add.container(0, 0);

    this.msgLogContainer.add(headerBg);
    this.msgLogContainer.add(headerText);
    this.msgLogContainer.add(this.msgLogBg);
    this.msgLogContainer.add(this.msgContainer);

    ui.add(this.msgLogContainer);

    // prepare cursor
    this.setCursor(0);
    this.setScrollCursor(0);

    // as this component is loaded at startup, hide it until toggled by user
    this.msgLogContainer.setVisible(false);
  }

  show(args: any[]): boolean {
    super.show(args);
    const ui = this.getUi();

    // remove old messages
    this.msgs.forEach(t => t.destroy());
    // prepare content to display
    this.msgs = new Array(log.length);

    log.forEach((msg, s) => {
      this.msgs[s] = addTextObject(this.scene, 8, 28 + s * 16, msg, TextStyle.WINDOW);
      this.msgs[s].setOrigin(0, 0);

      this.msgContainer.add(this.msgs[s]);
    });

    // set box visible and update cursor position
    this.msgLogContainer.setVisible(true);
    this.moveCursorToEnd(); // set cursor to end

    ui.moveTo(this.msgLogContainer, this.getUi().length - 1);

    ui.hideTooltip();

    return true;
  }

  /**
   * Processes input from a specified button.
   * This method handles navigation through a UI menu, including movement through menu items
   * and handling special actions like cancellation. Each button press may adjust the cursor
   * position or the menu scroll, and plays a sound effect if the action was successful.
   *
   * @param button - The button pressed by the user.
   * @returns `true` if the action associated with the button was successfully processed, `false` otherwise.
   */
  processInput(button: Button): boolean {
    const ui = this.getUi();
    // Defines the maximum number of rows that can be displayed on the screen.

    let success = false;

    if (button === Button.CANCEL) {
      success = true;
      // Reverts UI to its previous state on cancel.
      this.scene.ui.revertMode();
    } else {
      const cursor = this.cursor + this.scrollCursor;
      switch (button) {
      case Button.UP:
        if (cursor) {
          if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          } else {
            success = this.setScrollCursor(this.scrollCursor - 1);
          }
        }
        break;
      case Button.LEFT:
      // jump 1 "page" backwards or ROWS_TO_DISPLAY-1 entries
        if (cursor) {
          if (this.scrollCursor >= (ROWS_TO_DISPLAY-1)) {
            this.setCursor(0);
            success = this.setScrollCursor(this.scrollCursor - (ROWS_TO_DISPLAY - 1));
          } else {
            this.setCursor(0);
            success = this.setScrollCursor(0);
          }
        }
        break;
      case Button.DOWN:
        if (cursor < this.msgs.length - 1) {
          if (this.cursor < ROWS_TO_DISPLAY - 1) { // if the visual cursor is in the frame of 0 to 8
            success = this.setCursor(this.cursor + 1);
          } else if (this.scrollCursor < this.msgs.length - ROWS_TO_DISPLAY) {
            success = this.setScrollCursor(this.scrollCursor + 1);
          }
        }
        break;
      case Button.RIGHT:
        // jump 1 "page" forward or ROWS_TO_DISPLAY-1 entries
        if (cursor <= this.msgs.length -1) {
          if (this.scrollCursor + ROWS_TO_DISPLAY + (ROWS_TO_DISPLAY - 1) < this.msgs.length) {
            this.setCursor(ROWS_TO_DISPLAY-1);
            success = this.setScrollCursor(this.scrollCursor + ROWS_TO_DISPLAY - 1);
          } else {
            this.setCursor(ROWS_TO_DISPLAY-1);
            success = this.setScrollCursor(this.msgs.length - ROWS_TO_DISPLAY);
          }
        }
        break;
      }
    }

    // Plays a select sound effect if an action was successfully processed.
    if (success) {
      ui.playSelect();
    }

    return success;
  }

  moveCursorToEnd() {
    const lastEntry = Math.max(this.msgs.length - 1, 0);

    this.setCursor(Math.min(lastEntry, ROWS_TO_DISPLAY - 1));
    if (lastEntry - ROWS_TO_DISPLAY >= 0) {
      this.setScrollCursor(lastEntry - ROWS_TO_DISPLAY + 1);
    }
  }

  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.nineslice(0, 0, "summary_moves_cursor", null, (this.scene.game.canvas.width / 6) - 10, 16, 1, 1, 1, 1);
      this.cursorObj.setOrigin(0, 0);
      this.msgContainer.add(this.cursorObj);
    }

    this.cursorObj.setPositionRelative(this.msgLogBg, 4, 4 + (this.cursor + this.scrollCursor) * 16);

    return ret;
  }

  setScrollCursor(scrollCursor: integer): boolean {
    if (scrollCursor === this.scrollCursor) {
      return false;
    }

    this.scrollCursor = scrollCursor;

    this.updateLogScroll();

    this.setCursor(this.cursor);

    return true;
  }

  updateLogScroll(): void {
    this.msgContainer.setY(-16 * this.scrollCursor);

    for (let s = 0; s < this.msgs.length; s++) {
      const visible = s >= this.scrollCursor && s < this.scrollCursor + 9;
      this.msgs[s].setVisible(visible);
    }
  }

  clear() {
    super.clear();
    this.msgLogContainer.setVisible(false);
    this.eraseCursor();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }
}
