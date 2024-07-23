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

    // IndexListConfigInput REACT class ---------------------------------------------------------
    class ConfigurationParametersTable extends react.Component {
      constructor(props) {
        super(props);
        this.state = props;
      }

      render () {
        const updateIndicesMacroValue = this.state['updateIndicesMacroValue'];
        return e("div", null, [
          e("h4", null, "Configuration Parameters"),
          e("table", null, [
            e("tr", null, [
              e("th", { "class" : "table-header" }, "Macro"),
              e("th", null, "Value"),
              e("th", null, "Description")
            ]),
            e("tr", { "class" : "input-row" }, [
              e("td", { 'class' : 'parameterCell' }, [
                e("span", null, 'Common Indices:')
              ]),
              e("td", { 'class' : 'parameterCell' }, [
                e("input", { 'id' : 'common_indices', 'onChange' : (e) => updateIndicesMacroValue(e) })
              ]),
              e("td", { 'class' : 'descriptionCell' }, "Enter a comma separated list of indices in your environment that you would consider the noisier/more common ones.")
            ]),
            e("tr", { "class" : "input-row" }, [
              e("td", { 'class' : 'parameterCell' }, [
                e("span", null, 'Known Missing Indices:')
              ]),
              e("td", { 'class' : 'parameterCell' }, [
                e("input", { 'id' : 'known_missing_indices', 'onChange' : (e) => updateIndicesMacroValue(e) })
              ]),
              e("td", { 'class' : 'descriptionCell' }, "Enter a comma separated list of indices in your environment that are known as \"missing\". These indices may be retired or no longer populated but are maintained for searchability. Putting them in this list will filter them out from the dashboard view. Leave blank to filter out no indices.")
            ]),
            e("tr", { "class" : "input-row" }, [
              e("td", { 'class' : 'parameterCell' }, [
                e("span", null, 'Time Display Format:')
              ]),
              e("td", { 'class' : 'parameterCell' }, [
                e("input", { 'id' : 'last_log_time_format', 'onChange' : (e) => updateIndicesMacroValue(e) })
              ]),
              e("td", { 'class' : 'descriptionCell' }, "Enter a valid Splunk time format to display when the latest log of each index was received. If left blank the format \"%m-%d-%Y %H:%M:%S\" will be used.")
            ])
          ])
        ]);
      }
    }

  // SetupPage REACT class ---------------------------------------------------------
  class SetupPage extends react.Component {
    constructor(props) {
      super(props);

      this.state = {
        'common_indices': '*',
        'known_missing_indices': '',
        'last_log_time_format': '%m-%d-%Y %H:%M:%S',
        // Each macro has an entry that is a dictionary for each input needed for the definition, 
        'common_index_recent_window': {
          'value': '10',
          'unit': 's@s',
          'custom': ''},
        'common_index_quiet_window': {
          'value': '60',
          'unit': 's@s',
          'custom': ''},
        'uncommon_index_recent_window': {
          'value': '5',
          'unit': 'm@m',
          'custom': ''},
        'uncommon_index_quiet_window': {
          'value': '10',
          'unit': 'm@m',
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
      var defaults = {
        'common_index_recent_window': {
          'value': '10',
          'unit': 's@s',
          'custom': ''},
        'common_index_quiet_window': {
          'value': '60',
          'unit': 's@s',
          'custom': ''},
        'uncommon_index_recent_window': {
          'value': '5',
          'unit': 'm@m',
          'custom': ''},
        'uncommon_index_quiet_window': {
          'value': '10',
          'unit': 'm@m',
          'custom': ''}
      };

      let macro = event.target.id.split("-")[0];
      let attribute = event.target.id.split("-")[1];
      // If the field has been changed to empty then reset it to the default
      if (event.target.value != '') {
        this.state[macro][attribute] = event.target.value;
      } else {
        this.state[macro][attribute] = defaults[macro][attribute]; 
      }
    }

    // Helper to keep common_indices macro up to date in the state dictionary
    updateIndicesMacroValue(event) {
      var defaults = {
        'common_indices': '*',
        'known_missing_indices': '',
        'last_log_time_format': '%m-%d-%Y %H:%M:%S'
      };
      // If the field has been changed to empty then reset it to the default
      if (event.target.value != '') { 
        this.state[event.target.id] = event.target.value;
      } else {
        this.state[event.target.id] = defaults[event.target.id];
      }
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
        'common_indices' : '(' + this.state['common_indices'] + ')',
        'known_missing_indices' : '(' + this.state['known_missing_indices'] + ')',
        'last_log_time_format' : '"' + this.state['last_log_time_format'] + '"',
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
        e(ConfigurationParametersTable, { 'updateIndicesMacroValue' : this.updateIndicesMacroValue }),
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
