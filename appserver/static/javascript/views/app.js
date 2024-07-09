
/**
 * This is an example using pure react, with no JSX
 * If you would like to use JSX, you will need to use Babel to transpile your code
 * from JSK to JS. You will also need to use a task runner/module bundler to
 * help build your app before it can be used in the browser.
 * Some task runners/module bundlers are : gulp, grunt, webpack, and Parcel
 */

import * as Setup from "./setup_page.js";

define(["react", "splunkjs/splunk"], function(react, splunk_js_sdk){
    const e = react.createElement;

    // MacroConfigRow REACT class ---------------------------------------------------------
    class MacroConfigRow extends react.Component {
      constructor(props) {
        super(props);
        this.state = props;
        this.resolveMacroName = this.resolveMacroName.bind(this);
      }

      // Helper to convert the macro passed in props to a label to display on the GUI
      resolveMacroName(macro) {
        switch(macro) {
          case "common_index_recent_window":
              return "Common Index Recent Threshold:";
          case "common_index_quiet_window":
              return "Common Index Quiet Threshold:";
          case "uncommon_index_recent_window":
              return "Uncommon Index Recent Threshold:";
          case "uncommon_index_quiet_window":
              return "Uncommon Index Quiet Threshold:";
      }
      }

      render() {
        const macro = this.state['macro'];
        const macroLabel = this.resolveMacroName(macro);
        const updateWindowMacroValue = this.state['updateWindowMacroValue'];
        const valueID = macro + '-value';
        const unitID = macro + '-unit';
        const customID = macro + '-custom';
        return e("tr", { "class" : "input-row" }, [
          e("td", null, [
            e("span", null, macroLabel)
          ]),
          e("td", null, [
            e("input", { 'id' : valueID, 'onChange' : (e) => updateWindowMacroValue(e) })
          ]),
          e("td", null, [
            e("select", { 'id' : unitID, 'onChange' : (e) => updateWindowMacroValue(e) }, [
              e("option", { 'value' : "s@s"}, "Seconds"),
              e("option", { 'value' : "m@m"}, "Minutes"),
              e("option", { 'value' : "h@h"}, "Hours"),
              e("option", { 'value' : "d@d"}, "Days"),
              e("option", { 'value' : "w@w"}, "Weeks"),
              e("option", { 'value' : "mon@mon"}, "Months"),
              e("option", { 'value' : "y@y"}, "Years"),
            ])
          ]),
          e("td", null, [
            e("input", { 'id' : customID, 'onChange' : (e) => updateWindowMacroValue(e) })
          ])
        ]);
    }
  }

  // SetupPage REACT class ---------------------------------------------------------
  class SetupPage extends react.Component {
    constructor(props) {
      super(props);

      this.state = {
        'common_indices': '',
        // Each macro has an entry that is a dictionary for each input needed for the definition, 
        'common_index_recent_window': {
          'value': '',
          'unit': 's@s',
          'custom': ''},
        'common_index_quiet_window': {
          'value': '',
          'unit': 's@s',
          'custom': ''},
        'uncommon_index_recent_window': {
          'value': '',
          'unit': 's@s',
          'custom': ''},
        'uncommon_index_quiet_window': {
          'value': '',
          'unit': 's@s',
          'custom': ''} 
      };

      // Bind internal functions
      this.handleSubmit = this.handleSubmit.bind(this);
      this.updateWindowMacroValue = this.updateWindowMacroValue.bind(this);
      this.updateIndicesMacroValue = this.updateIndicesMacroValue.bind(this);
      this.resolveWindowMacroName = this.resolveWindowMacroName.bind(this);
    }

    // Helper to keep the attributes of the window macros up to date in the state dictionary
    updateWindowMacroValue(event) {
      let macro = event.target.id.split("-")[0];
      let attribute = event.target.id.split("-")[1];
      this.state[macro][attribute] = event.target.value;
    }

    // Helper to keep common_indices macro up to date in the state dictionary
    updateIndicesMacroValue(event) {
      this.state['common_indices'] = event.target.value;
    }

    // Helper to resolve the full macro definition when the submit button is clicked
    resolveWindowMacroName(macro) {
      let attributes = this.state[macro];
      // If they added a custom definition, just use that
      if (attributes['custom']) { return '"-' + attributes['custom'] + '"'; }
      // Otherwise, combine the value and units appropriately
      return '"-' + attributes['value'] + attributes['unit'] + '"';
    }

    async handleSubmit(event) {
      event.preventDefault();

      //TODO verify all inputs are filled in correctly
      const macros = {
        'common_indices' : "(" + this.state['common_indices'] + ")",
        'common_index_recent_window' : this.resolveWindowMacroName("common_index_recent_window"),
        'common_index_quiet_window' : this.resolveWindowMacroName("common_index_quiet_window"),
        'uncommon_index_recent_window' : this.resolveWindowMacroName("uncommon_index_recent_window"),
        'uncommon_index_quiet_window' : this.resolveWindowMacroName("uncommon_index_quiet_window")
      }
      
      await Setup.perform(splunk_js_sdk, macros);
    }

    render() {
      return e("div", null, [
        e("h3", null, "Index Health Setup Page"),
        e("div", null, [
          e("h4", null, "Common Indices"),
          e("p", null, "Enter a comma separated list of indices in your environment that you would consider the noisier/more common ones."),
          e("table", { "id" : "common-indices-table" }, [
            e("tr", null, [
              e("th", { "class" : "table-header" }, "Macro"),
              e("th", null, "Value")
            ]),
            e("tr", { "class" : "input-row" }, [
              e("td", null, [
                e("span", null, "Common Indices:")
              ]),
              e("td", null, [
                e("input", { 'onChange' : (e) => this.updateIndicesMacroValue(e) })
              ])
            ])
          ])
        ]),
        e("div", null, [
          e("h4", null, "Status Thresholds"),
          e("p", null, "Next we will define the thresholds you would like to use to determine the \"status\" of a given index, that is, whether the index has recently received a log, has been quiet, or seems to be missing. The separation between common and uncommon indices allows you to apply different thresholds to your noisier indices than your less talkative ones. This way for example, if your \"firewall\" index is constantly receiving logs, you can consider it \"quiet\" if it hasn't seen a log in 10 minutes. But, say your \"network_changes\" index only sees a log once a day, it instead will use the \"uncommon\" thresholds, which may mark an index as quiet only when it hasn't received a log in 3 days."),
          e("p", null, "Please set the values you would like to use for your thresholds. The \"Recent Window\" values will mark an index as \"Seen Recently\" if a log has been seen within the timeframe. The \"Quiet Window\" will mark the index as quiet if the latest log is beyond the Recent Window but before the Quiet Window. If the latest log is older than the Quiet Window then the index will be marked as missing. The \"Common\" values will apply to the indices you defined above in the common_indices macro. All other indices will have the uncommon values applied to them."),
          e("p", null, "For each threshold, enter a numerical value in the value section, and choose a unit of time from the unit dropdown. If you want to define a custom time frame, enter a valid Splunk time modifier in the \"Custom\" column."),
          e("table", { "id" : "thresholds-table" }, [
            e("tr", null, [
              e("th", { "class" : "table-header" }, "Macro"),
              e("th", null, "Value"),
              e("th", null, "Unit"),
              e("th", null, "Custom")
            ]),
            e(MacroConfigRow, { 'macro' : "common_index_recent_window", 'updateWindowMacroValue' : this.updateWindowMacroValue }),
            e(MacroConfigRow, { 'macro' : "common_index_quiet_window", 'updateWindowMacroValue' : this.updateWindowMacroValue }),
            e(MacroConfigRow, { 'macro' : "uncommon_index_recent_window", 'updateWindowMacroValue' : this.updateWindowMacroValue }),
            e(MacroConfigRow, { 'macro' : "uncommon_index_quiet_window", 'updateWindowMacroValue' : this.updateWindowMacroValue })
            ])
          ]),
          e("button", { "onClick" : this.handleSubmit }, "Complete Setup"),
          e("div", { "class" : "success" }, "Settings saved successfully, redirecting to app..."),
          e("div", { "class" : "error" }, "Issue encountered during setup, details below:"),
          e("code", { "id" : "error_details"})
        ])
    }
  }
  return e(SetupPage);
});
