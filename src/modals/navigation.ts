import { App, Scope, setIcon, SuggestModal } from "obsidian";
import { NLDResult } from "src/parser";
import NaturalLanguageDates from "src/main";
import { Moment } from "moment";
import { getDailyNoteSettings, getMonthlyNoteSettings, getWeeklyNoteSettings } from "obsidian-daily-notes-interface";

interface DateNavigationItem {
  file: any;
  moment: Moment;
  date: string;
}

const DEFAULT_INSTRUCTIONS = [
      // {command: 'mode: ', purpose: 'daily'},
      {command: '↑↓', purpose: "to navigate"},
      {command: '↵', purpose: "to open"},
      {command: 'esc', purpose: "to dismiss"},
    ]

class NavigationModalScope extends Scope {

  constructor(modal:NLDNavigator) {
    super();
    
    this.register([], 'ArrowUp', (evt: KeyboardEvent) => {
      //  this.chooser.useSelectedItem(evt);
      console.log(evt);
      return false;
    });
    
    this.register([], 'ArrowDown', (evt: KeyboardEvent) => {
      //  this.chooser.useSelectedItem(evt);
      
      console.log(evt);
      return false;
    });
    
    this.register([], 'Enter', (evt: KeyboardEvent) => {
    //  this.chooser.useSelectedItem(evt);
      modal.newPane = false;
      // modal.selectSuggestion(, evt)
      console.log(evt);
      return false;
    });

    this.register(['Ctrl'], 'Enter', (evt: KeyboardEvent) => {
    //  this.chooser.useSelectedItem(evt);
      console.log(evt);
      return false;
    });

    this.register(['Alt'], 'W', (evt: KeyboardEvent) => {
      modal.changeMode('Weekly');
      console.log("Changed to weekly mode")
      return false;
    });

    this.register(['Alt'], 'D', (evt: KeyboardEvent) => {
      modal.changeMode('Daily');
      console.log("Changed to daily mode")
      return false;
    });

  }

}
export class NLDNavigator extends SuggestModal<DateNavigationItem> {
    plugin: NaturalLanguageDates;
    scope: Scope;
    mode: string;
    newPane: boolean;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.plugin = plugin;
    this.mode = "Daily";
    this.newPane = false;
    this.setInstructions(DEFAULT_INSTRUCTIONS);
    this.setPlaceholder("Type date to find daily note")
    
    // this.scope = new NavigationModalScope(this)
  }


  /**
   * Return a list of suggested dates based on the parsed result
   * @param query string
   * @param parsedResult NLDResult
   * @returns Moment[]
   */
  getDateSuggestions(query:string, parsedResult: NLDResult) {
    let start = window.moment(parsedResult.moment)
    let dateArray = [];
    let end;
    console.log(start)

    if (query.includes("week")){
      end = window.moment(start).endOf("week")
    } else if (query.includes("month")) {
      end = window.moment(start).endOf("month")
    } else {
      // Add one day just so we enter the while loop
      end = window.moment(start);
    }

    console.log(end)

    do {
      dateArray.push(window.moment(start.format("YYYY-MM-DD")));
      console.log("Current day: ", start.format("YYYY-MM-DD"))
      start.add(1, "day");
    } while(!start.isAfter(end, "day"))

    console.log(dateArray.length)
    return dateArray;
  }

  changeMode(mode:string) {
    // let newInstructions = DEFAULT_INSTRUCTIONS;
    // newInstructions[0] = {command: 'mode: ', purpose: mode};
    // this.setInstructions(newInstructions);
    this.mode = mode;
  }

  getDailyNoteFile(dateString:string) {
    // let files = this.app.vault.getFiles();
    // let files = this.app.vault.getMarkdownFiles();
    let files = this.app.vault.getMarkdownFiles(); // Get all links (including unresolved ones) and find their files
    const dateFile = files.filter(e => e.name.contains(dateString) //hat-tip 🎩 to @MrJackPhil for this little workflow 
      || e.path.contains(dateString)
      || e.basename.contains(dateString)
    );
    return dateFile;
  }

  getSuggestions(query: string) : DateNavigationItem[]{
    let suggestions = [];

    let nldates = this.plugin;
    let parsedResult :NLDResult = nldates.parseDate(query);
    let format = this.plugin.settings.format;

    // let settings = getDailyNoteSettings();
    // let weeklySettings = getWeeklyNoteSettings();
    // let monthlySettings = getMonthlyNoteSettings();

    // if (query.contains("weeks")) {
    //   console.log("Multiple weeks")
    // } else if (query.contains("week")){
    //   console.log("A single week")
    // }

    if (parsedResult.moment.isValid()) {
      let dates = this.getDateSuggestions(query, parsedResult);
      for (let date of dates) {
        let dateFile = this.getDailyNoteFile(date.format(format));
        if (dateFile.length > 0) {
          dateFile.sort();
          for (let f of dateFile){
            suggestions.push({date: date.format(format), file: f, moment: window.moment(date)})
          }
        } else {
          suggestions.push({date: date.format(format), file: null, moment: window.moment(date)});
        }
      }
      // suggestions.sort()
      return suggestions;
    } else {
      return [];
    }
  }
  
  renderSuggestion(value: DateNavigationItem, el: HTMLElement) {
    // console.log(value.file)
    if (!value.file){
      el.setText(value.date)
      el.createEl('kbd', {cls: 'suggestion-hotkey', text: "Enter to create"});
      return;
    } else if (value.date !== value.file.basename){
      el.setText(value.file.basename);
      el.createEl('div', {cls: 'suggestion-note', text: value.date});
      el.createEl('span', {cls: 'suggestion-flair', prepend: true}, el => {
            setIcon(el, 'calendar-with-checkmark', 13);
            // setTooltip(el, i18n('interface.tooltip.alias'));
      });
      return;
    }

    el.appendText(value.file.basename);

  }

  async onChooseSuggestion(item: DateNavigationItem, evt: MouseEvent | KeyboardEvent) {
    console.log(item)
    console.log(evt);

    const { workspace } = this.app;

    if (item.moment.isValid()) {
      let dailyNote = await this.plugin.getDailyNote(item.moment);

      let leaf = workspace.activeLeaf;
      if (this.newPane) {
        leaf = workspace.splitActiveLeaf();
      }

      await leaf.openFile(dailyNote);

      workspace.setActiveLeaf(leaf);
    }

  }
  
}