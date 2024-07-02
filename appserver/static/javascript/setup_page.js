"use strict";

const MACROS_CONF = 'macros';
const COMMON_INDICES_CONF = 'common_indices';
const COM_IND_REC_CONF = 'common_index_recent_window';
const COM_IND_QUIET_CONF = 'common_index_quiet_window';
const UNCOM_IND_REC_CONF = 'uncommon_index_recent_window';
const UNCOM_IND_QUIET_CONF = 'uncommon_index_quiet_window';
const appName = "IndexHealthApp";
const appNamespace = {
    owner: "nobody",
    app: appName,
    sharing: "app",
};

// Splunk Web Framework Provided files
require([
    "jquery", "splunkjs/splunk",
], function($, splunkjs) {
    // Register .on( "click", handler ) for "Complete Setup" button
    $("#setup_button").click(completeSetup);

    // onclick function for "Complete Setup" button from setup_page_dashboard.xml
    async function completeSetup() {
        const common_indices = $('#common_indices_input').val();
        const com_ind_rec = $('#com_ind_recent_input').val();
        const com_ind_quiet = $('#com_ind_quiet_input').val();
        const uncom_ind_rec = $('#uncom_ind_recent_input').val();
        const uncom_ind_quiet = $('#uncom_ind_quiet_input').val();
        stage = "Entering try/catch";
        try {
            // Initialize a Splunk Javascript SDK Service instance
            const http = new splunkjs.SplunkWebHttp();
            const service = new splunkjs.Service(
                http,
                appNamespace,
            );
            // Get app.conf configuration
            stage = 'Retrieving configurations SDK collection';
            const configCollection = service.configurations(appNamespace);
            await configCollection.fetch();
            stage = `Retrieving app.conf values for ${appName}`;
            const appConfig = configCollection.item('app');
            await appConfig.fetch();
            stage = `Retrieving app.conf [install] stanza values for ${appName}`;
            const installStanza = appConfig.item('install');
            await installStanza.fetch();
            // Verify that app is not already configured
            const isConfigured = installStanza.properties().is_configured;
            if (isTrue(isConfigured)) {
                console.warn(`App is configured already (is_configured=${isConfigured}), skipping setup page...`);
                reloadApp(service);
                redirectToApp();
            }

            // Update all macros with inputted values
            // common_indices
            console.log("Updating common_indices macro to: " + common_indices);
            await update_configuration_file(service, MACROS_CONF, COMMON_INDICES_CONF, { definition: common_indices, iseval : 0 } );
            // common_index_recent_window
            console.log("Updating common_index_recent_window macro to: " + com_ind_rec);
            await update_configuration_file(service, MACROS_CONF, COM_IND_REC_CONF, { definition: com_ind_rec, iseval : 0 } );
            // common_index_quiet_window
            console.log("Updating common_index_quiet_window macro to: " + com_ind_quiet);
            await update_configuration_file(service, MACROS_CONF, COM_IND_QUIET_CONF, { definition: com_ind_quiet, iseval : 0 } );
            // uncommon_index_recent_window
            console.log("Updating uncommon_index_recent_window macro to: " + uncom_ind_rec);
            await update_configuration_file(service, MACROS_CONF, UNCOM_IND_REC_CONF, { definition: uncom_ind_rec, iseval : 0 } );
            // uncommon_index_quiet_window
            console.log("Updating uncommon_index_quiet_window macro to: " + uncom_ind_quiet);
            await update_configuration_file(service, MACROS_CONF, UNCOM_IND_QUIET_CONF, { definition: uncom_ind_quiet, iseval : 0 } );
            console.log("Updated conf files.");
            await setIsConfigured(service);
            console.log("Set configured to true.");
            reloadApp(service);
            redirectToApp(800);




        } catch (e) {
            console.warn(e);
            $('.error').show();
            $('#error_details').show();
            let errText = `Error encountered during stage: ${stage}<br>`;
            errText += (e.toString() === '[object Object]') ? '' : e.toString();
            if (e.hasOwnProperty('status')) errText += `<br>[${e.status}] `;
            if (e.hasOwnProperty('responseText')) errText += e.responseText;
            $('#error_details').html(errText);
        }

    };

    // ---------------------
    // App helpers
    // ---------------------

    async function reloadApp(service) {
        // In order for the app to register that it has been configured
        // it first needs to be reloaded
        var apps = service.apps();
        await apps.fetch();

        var app = apps.item(appName);
        await app.fetch();
        await app.reload();
    };

    function redirectToApp(waitMs) {
        setTimeout(() => {
            window.location.href = `/app/${appName}`;
        }, waitMs); // wait 800ms and redirect
    };

    function isTrue(v) {
        if (typeof(v) === typeof(true)) return v;
        if (typeof(v) === typeof(1)) return v!==0;
        if (typeof(v) === typeof('true')) {
            if (v.toLowerCase() === 'true') return true;
            if (v === 't') return true;
            if (v === '1') return true;
        }
        return false;
    };

    async function setIsConfigured(splunk_js_sdk_service) {
        var configuration_file_name = "app";
        var stanza_name = "install";
        var properties_to_update = {
            is_configured: "true",
        };
      
        await update_configuration_file(
            splunk_js_sdk_service,
            configuration_file_name,
            stanza_name,
            properties_to_update,
        );
      };

    // ---------------------
    // Update Functions
    // ---------------------
    async function update_configuration_file(
        splunk_js_sdk_service,
        configuration_file_name,
        stanza_name,
        properties,
      ) {
        // Retrieve the accessor used to get a configuration file
        var splunk_js_sdk_service_configurations = splunk_js_sdk_service.configurations(
            {
                // Name space information not provided
            },
        );
        await splunk_js_sdk_service_configurations.fetch();
      
        // Check for the existence of the configuration file
        var configuration_file_exist = does_configuration_file_exist(
            splunk_js_sdk_service_configurations,
            configuration_file_name,
        );
      
        // If the configuration file doesn't exist, create it
        if (!configuration_file_exist) {
            await create_configuration_file(
                splunk_js_sdk_service_configurations,
                configuration_file_name,
            );
      
            // BUG WORKAROUND: re-fetch because the client doesn't do so
            await splunk_js_sdk_service_configurations.fetch();
        }
      
        // Retrieves the configuration file accessor
        var configuration_file_accessor = get_configuration_file(
            splunk_js_sdk_service_configurations,
            configuration_file_name,
        );
        await configuration_file_accessor.fetch();
      
        // Checks to see if the stanza where the inputs will be
        // stored exist
        var stanza_exist = does_stanza_exist(
            configuration_file_accessor,
            stanza_name,
        );
      
        // If the configuration stanza doesn't exist, create it
        if (!stanza_exist) {
            await create_stanza(configuration_file_accessor, stanza_name);
        }
        // Need to update the information after the creation of the stanza
        await configuration_file_accessor.fetch();
      
        // Retrieves the configuration stanza accessor
        var configuration_stanza_accessor = get_configuration_file_stanza(
            configuration_file_accessor,
            stanza_name,
        );
        await configuration_stanza_accessor.fetch();
      
        // We don't care if the stanza property does or doesn't exist
        // This is because we can use the
        // configurationStanza.update() function to create and
        // change the information of a property
        await update_stanza_properties(
            configuration_stanza_accessor,
            properties,
        );
      };
    
    function update_stanza_properties(
        configuration_stanza_accessor,
        new_stanza_properties,
      ) {
        var parent_context = this;
      
        return configuration_stanza_accessor.update(
            new_stanza_properties,
            function(error_response, entity) {
                // Do nothing
            },
        );
    };

    // ---------------------
    // Creation Functions
    // ---------------------
    function create_configuration_file(
        configurations_accessor,
        configuration_file_name,
      ) {
        var _parent_context = this;
      
        return configurations_accessor.create(configuration_file_name, function(
            _error_response,
            _created_file,
        ) {
            // Do nothing
        });
    };

    function create_stanza(
        configuration_file_accessor,
        new_stanza_name,
      ) {
        var parent_context = this;
      
        return configuration_file_accessor.create(new_stanza_name, function(
            error_response,
            created_stanza,
        ) {
            // Do nothing
        });
    };

    // ---------------------
    // Existence Functions
    // ---------------------
    function does_configuration_file_exist(
    configurations_accessor,
    configuration_file_name,
  ) {
    var was_configuration_file_found = false;
  
    var configuration_files_found = configurations_accessor.list();
    for (var index = 0; index < configuration_files_found.length; index++) {
        var configuration_file_name_found =
            configuration_files_found[index].name;
        if (configuration_file_name_found === configuration_file_name) {
            was_configuration_file_found = true;
            break;
        }
    }
  
    return was_configuration_file_found;
    };

    function does_stanza_exist(
    configuration_file_accessor,
    stanza_name,
  ) {
    var was_stanza_found = false;
  
    var stanzas_found = configuration_file_accessor.list();
    for (var index = 0; index < stanzas_found.length; index++) {
        var stanza_found = stanzas_found[index].name;
        if (stanza_found === stanza_name) {
            was_stanza_found = true;
            break;
        }
    }
  
    return was_stanza_found;
    };

    // ---------------------
    // Retrieval Functions
    // ---------------------
    function get_configuration_file(
    configurations_accessor,
    configuration_file_name,
  ) {
    var configuration_file_accessor = configurations_accessor.item(
        configuration_file_name,
        {
            // Name space information not provided
        },
    );
  
    return configuration_file_accessor;
    };

    function get_configuration_file_stanza(
    configuration_file_accessor,
    configuration_stanza_name,
  ) {
    var configuration_stanza_accessor = configuration_file_accessor.item(
        configuration_stanza_name,
        {
            // Name space information not provided
        },
    );
  
    return configuration_stanza_accessor;
    };
});