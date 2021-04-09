import { App, ButtonComponent, MarkdownView, Modal, MomentFormatComponent, TextComponent, ToggleComponent } from "obsidian";
import NaturalLanguageDates from "src/main";


export class DatePickerModal extends Modal {
  parsedDateString = "";
  activeView: MarkdownView;
  activeCursor: CodeMirror.Position;
  plugin: NaturalLanguageDates;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.plugin = plugin;
    
    const { workspace } = this.app;
    this.activeView = workspace.getActiveViewOfType(MarkdownView);
    if (!this.activeView) return;
    
    this.activeCursor = this.activeView.editor.getCursor();
  }

  onOpen() {
    let {
      contentEl
    } = this;

    contentEl.appendText("Date: ");

    let inputDateField = new TextComponent(contentEl).setPlaceholder("Date");
    contentEl.createEl("br");
    contentEl.appendText("Format: ");

    let momentFormatField = new MomentFormatComponent(contentEl)
      .setDefaultFormat("YYYY-MM-DD HH:mm")
      .setValue(this.plugin.settings.modalMomentFormat)
      .onChange((value) => {
        this.plugin.settings.modalMomentFormat = value ? value : "YYYY-MM-DD HH:mm";
        this.plugin.saveSettings();
      });

    contentEl.createEl("br");

    contentEl.appendText("Add as link?");
    let toggleLink = new ToggleComponent(contentEl)
      .setValue(this.plugin.settings.modalToggleLink)
      .onChange((value) => {
        this.plugin.settings.modalToggleLink = value;
        this.plugin.saveSettings();
      });
    contentEl.createEl("br");

    let inputButton = new ButtonComponent(contentEl)
      .setButtonText("Insert date")
      .onClick(() => {
        let parsedDate = this.plugin.parseDate(inputDateField.getValue());
        this.parsedDateString = parsedDate.moment.format(
          momentFormatField.getValue()
        );
        if (!parsedDate.moment.isValid()) this.parsedDateString = "";
        if (toggleLink.getValue() && this.parsedDateString !== "")
          this.parsedDateString = `[[${this.parsedDateString}]]`;
        this.activeView.editor.focus();
        this.activeView.editor.setCursor(this.activeCursor);
        this.plugin.insertDateString(
          this.parsedDateString,
          this.activeView.editor,
          this.activeCursor
        );
        this.close();
      });
    inputDateField.inputEl.focus();
  }

  onClose() {
    let {
      contentEl
    } = this;
    contentEl.empty();
  }
}