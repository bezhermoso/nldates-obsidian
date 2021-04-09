import {
  Plugin,
  MarkdownView,
} from "obsidian";

import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";

import { NLDSettingsTab, NLDSettings, DEFAULT_SETTINGS } from "./settings"
import {NLDResult, getParsedDate } from './parser'
import { DatePickerModal } from './modals/date-picker'

export default class NaturalLanguageDates extends Plugin {
  settings: NLDSettings;

  onInit() {}

  async onload() {
    console.log("Loading natural language date parser plugin");
    await this.loadSettings();

    this.addCommand({
      id: "nlp-dates",
      name: "Parse natural language date",
      callback: () => this.parseCommand("replace"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-dates-link",
      name: "Parse natural language date (as link)",
      callback: () => this.parseCommand("link"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-date-clean",
      name: "Parse natural language date (as plain text)",
      callback: () => this.parseCommand("clean"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-parse-time",
      name: "Parse natural language time",
      callback: () => this.parseCommand("time"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-now",
      name: "Insert the current date and time",
      callback: () => this.getNowCommand(),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-today",
      name: "Insert the current date",
      callback: () => this.getCurrentDateCommand(),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-time",
      name: "Insert the current time",
      callback: () => this.getCurrentTimeCommand(),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-picker",
      name: "Date picker",
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            new DatePickerModal(this.app, this).open();
          }
          return true;
        }
        return false;
      },
      hotkeys: [],
    });

    this.addSettingTab(new NLDSettingsTab(this.app, this));

    this.registerObsidianProtocolHandler("nldates", this.actionHandler.bind(this));
  }

  onunload() {
    console.log("Unloading natural language date parser plugin");
  }

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  getSelectedText(editor: any) {
    if (editor.somethingSelected()) {
      return editor.getSelection();
    } else {
      const wordBoundaries = this.getWordBoundaries(editor);
      editor.getDoc().setSelection(wordBoundaries.start, wordBoundaries.end);
      return editor.getSelection();
    }
  }

  getWordBoundaries(editor: any) {
    const cursor = editor.getCursor();
    const line = cursor.line;
    const word = editor.findWordAt({
      line: line,
      ch: cursor.ch
    });
    const wordStart = word.anchor.ch;
    const wordEnd = word.head.ch;

    return {
      start: {
        line: line,
        ch: wordStart
      },
      end: {
        line: line,
        ch: wordEnd
      },
    };
  }

  getMoment(date: Date): any {
    return window.moment(date);
  }

  getFormattedDate(date: Date): string {
    return this.getMoment(date).format(this.settings.format);
  }

  getFormattedTime(date: Date): string {
    return this.getMoment(date).format(this.settings.timeFormat);
  }

  /*
  @param dateString: A string that contains a date in natural language, e.g. today, tomorrow, next week
  @returns NLDResult: An object containing the date, a cloned Moment and the formatted string.

  */
  parseDate(dateString: string): NLDResult {
    let date = getParsedDate(dateString);
    let formattedDate = this.getFormattedDate(date);
    if (formattedDate === "Invalid date") {
      console.debug("Input date " + dateString + " can't be parsed by nldates");
    }

    let result = {
      formattedString: formattedDate,
      date: date,
      moment: this.getMoment(date),
    };
    return result;
  }

  parseTime(dateString: string): NLDResult {
    let date = getParsedDate(dateString);
    let formattedTime = this.getFormattedTime(date);
    if (formattedTime === "Invalid date") {
      console.debug("Input date " + dateString + " can't be parsed by nldates");
    }

    let result = {
      formattedString: formattedTime,
      date: date,
      moment: this.getMoment(date),
    };
    return result;
  }

  parseTruthy(flag: string): boolean {
    return ["y", "yes", "1", "t", "true"].indexOf(flag.toLowerCase()) >= 0;
  }

  parseCommand(mode: string) {
    const { workspace } = this.app;
    const activeView = workspace.getActiveViewOfType(MarkdownView);

    if (activeView) {  // The active view might not be a markdown view
      const editor = activeView.editor;
      const cursor = editor.getCursor();
      const selectedText = this.getSelectedText(editor);

      let date = this.parseDate(selectedText);

      if (!date.moment.isValid()) {
        editor.setCursor({
          line: cursor.line,
          ch: cursor.ch
        });
      } else {
        //mode == "replace"
        let newStr = `[[${date.formattedString}]]`;

        if (mode == "link") {
          newStr = `[${selectedText}](${date.formattedString})`;
        } else if (mode == "clean") {
          newStr = `${date.formattedString}`;
        } else if (mode == "time") {
          let time = this.parseTime(selectedText);

          newStr = `${time.formattedString}`;
        }

        editor.replaceSelection(newStr);
        this.adjustCursor(editor, cursor, newStr, selectedText);
        editor.focus();
      }
    }
  }

  adjustCursor(editor: any, cursor: any, newStr: string, oldStr: string) {
    const cursorOffset = newStr.length - oldStr.length;
    editor.setCursor({
      line: cursor.line,
      ch: cursor.ch + cursorOffset
    });
  }

  insertMomentCommand(date: Date, format: string) {
    const { workspace } = this.app;
    const activeView = workspace.getActiveViewOfType(MarkdownView);

    if (activeView) {  // The active view might not be a markdown view
      const editor = activeView.editor;
      editor.replaceSelection(
        this.getMoment(date).format(format)
      );
    }
  }

  getNowCommand() {
    let format = `${this.settings.format}${this.settings.separator}${this.settings.timeFormat}`
    let date = new Date();
    this.insertMomentCommand(date, format);
  }

  getCurrentDateCommand(): void {
    let format = this.settings.format; 
    let date = new Date();
    this.insertMomentCommand(date, format);
  }

  getCurrentTimeCommand() {
    let format = this.settings.timeFormat; 
    let date = new Date();
    this.insertMomentCommand(date, format);
  }

  insertDateString(dateString: string, editor: any, cursor: any) {
    editor.replaceSelection(dateString);
  }

  getDateRange() {}

  async actionHandler(params: any) {

    let date = this.parseDate(params.day);
    let newPane = this.parseTruthy(params.newPane || "yes");

    console.log(date);
    const {
      workspace
    } = this.app;

    if (date.moment.isValid()) {
      let dailyNote = await this.getDailyNote(date.moment);

      let leaf = workspace.activeLeaf;
      if (newPane) {
        leaf = workspace.splitActiveLeaf();
      }

      await leaf.openFile(dailyNote);

      workspace.setActiveLeaf(leaf);
    }
  }

  getDailyNote(date: any) {
    // Borrowed from the Slated plugin:
    // https://github.com/tgrosinger/slated-obsidian/blob/main/src/vault.ts#L17
    const desiredNote = getDailyNote(date, getAllDailyNotes());
    if (desiredNote) {
      console.log("Note exists")
      return Promise.resolve(desiredNote);
    } else {
      console.log("Creating daily note")
      return Promise.resolve(createDailyNote(date));
    }
  }

}
