/**
Timeline plugin! Written by Steve Levine (original google charts code by Tiago Vaquero)
*/

function setup_timeline_gui() {
  // Name the divs
  var main_div = 'timeline_plugin_main_div';
  var chart_div = 'timeline_plugin_chart_div';
  // Create a new tab for the timeline
  window.new_tab('Timeline Viewer', function(editor_name) {
    var html = '<div id="' + main_div + '" style="padding: 20px;"></div>';
    $('#' + editor_name).html(html);
    changeDocument(editor_name);
    // Populate with the text area and google charts div
    var html_main_div = '<h2>Timeline Visualizer</h2>';
    html_main_div += '<p>Cut and paste the output of a temporal planner below to see it visualized in a pretty timeline! Colors are uniquely chosen based on each action name.</p>';
    html_main_div +='<textarea id="timeline_plugin_planner_output_textbox" class="form-control" rows="12"></textarea>';
    html_main_div += '<br/><div id="' + chart_div + '"></div>';
    $('#'+main_div).html(html_main_div);

    // Add the google chart
    var options = {
      height: 100,
      animation: {
        duration: 1000,
        easing: 'out',
      },
      hAxis: {
        gridlines: {count: 15}
      },
      timeline: {
        showRowLabels: true,
        groupByRowLabel: false,
        colorByRowLabel: false,
      }
    };
    var chart = new google.visualization.Timeline(document.getElementById(chart_div));
    window.timeline_chart = chart;
    window.timeline_options = options;

    // Ease of use: automatically highlight textbox when it is focused, allowing for
    // easy cutting-and-pasting
    $('#timeline_plugin_planner_output_textbox').focus(
      function() {
        $(this).select();
    });

    // Define an update function, ane make sure it is triggered
    // whenever the textbox is updated, update the graph
    trigger_timeline_update_fn = function() {
      // Get planner texxt
      var planner_output = $('#timeline_plugin_planner_output_textbox').val();
      // Find all matches for lines that appear to be temporal actions
      var regexp = /^([\d.]+)\s*:\s*(\(.*\))\s*\[([\d.]+)\]$/gm;
      var matches = [];
      var match;
      while ((match = regexp.exec(planner_output)) !== null) {
        matches.push(match);
      }

      // Load the data into a table
      var data = new google.visualization.DataTable();
      window.timeline_data = data;
      data.addColumn('string', 'Task ID');
      data.addColumn('string', 'Task Name');
      data.addColumn('number', 'Start');
      data.addColumn('number', 'End');
      data.addRows([]);
      colors_for_activities = [];
      for(var i = 0; i < matches.length; i++) {
        var match = matches[i];
        data.addRows([activity_to_table_row(match, i)])
        var color = activity_to_color(match)
        colors_for_activities.push(color);
      }

      // Draw the chart!
      options.height = data.getNumberOfRows() * 43 + 100;
      options.colors = colors_for_activities;
      chart.draw(data, options);
    };
    $('#timeline_plugin_planner_output_textbox').on('input', trigger_timeline_update_fn);
  });

  // Now that we're all set up, initialize with default contents
  $('#timeline_plugin_planner_output_textbox').val(';; PASTE TEMPORAL PLANNER OUTPUT HERE!\n\n0.000: (here is) [1.000]\n1.000: (an example) [2.000]\n2.000: (of a timeline) [1.500]');
  trigger_timeline_update_fn();
}

// 'http://bicycle.csail.mit.edu/planning.domains/timeline-plugin/sha1.js'
// 'http://bicycle.csail.mit.edu/planning.domains/timeline-plugin/tinycolor-min.js'
function initialize_timeline_plugin() {
  requirejs(['https://editor.planning.domains/plugins/featured/timeline-viewer/sha1.js'], function () {
    // Loaded as CryptoJS global variable
    requirejs(['https://editor.planning.domains/plugins/featured/timeline-viewer/tinycolor-min.js'], function(m) {
      tinycolor = m;
      setup_timeline_gui();
    });
  });
}


function get_terms(pred) {
  // Cut off the first and last characters - the parenthesis
  pred = pred.trim().slice(1, pred.length - 1);
  var words = pred.split(" ");
  return words;
}

function wordToColor(word, sat, lightness) {
  // Helper function that converts a word to a color based on the SHA1 sum
  var sha1_word = CryptoJS.SHA1(word).words[0];
  sha1_word = sha1_word % 360;
  if (sha1_word < 0) {
    sha1_word += 360;
  }
  var hsl_string = 'hsl(' + sha1_word + ", " + (100 * sat) + "%, " + (100 * lightness) + "%)";
  return '#' + tinycolor(hsl_string).toHex();
}

function activity_to_table_row(match, id) {
  var start_time = 1000*parseFloat(match[1]);
  var end_time = 1000*parseFloat(match[3]) + start_time;

  // This is a hack required because Google Charts will set every row
  // with the same description (i.e., match[2], the full PDDL string) to the same
  // color, even if they are commanded different colors. To prevent this, we add
  // a unique number of non-printing ASCII characters to each description string
  // to force the commanded coloring to be used.
  var unique_suffix = '';
  for (var i = 0; i < id; i++) {
    //unique_suffix += "\x1A"; // Appears to be no longer needed!
  }
  return ["" + id, match[2] + unique_suffix,  start_time, end_time];
}


function activity_to_color(match) {
  var words = get_terms(match[2]);
  var action_name = words[0].trim();
  var color = wordToColor(action_name, 0.7, 0.75);
  return color;
}




define(function () {

    window.viz_gcharts_loaded = false;

    return {

        name: "Timeline Viewer",
        author: "Steve Levine",
        email: "sjlevine@mit.edu",
        description: "Visualize the timeline of a plan from a temporal planner's output",
        thumbnail: "https://editor.planning.domains/plugins/featured/timeline-viewer/timeline-logo.svg",

        // This will be called whenever the plugin is loaded or enabled
        initialize: function() {

            // Load the google charts api
            if (!(window.viz_gcharts_loaded)) {
                requirejs(['https://www.gstatic.com/charts/loader.js'],
                    function() {
                        window.viz_gcharts_loaded = true;
                        google.charts.load('current', {packages: ['timeline']});
                        google.charts.setOnLoadCallback(initialize_timeline_plugin);
                    });
            }

        },

        // This is called whenever the plugin is disabled
        disable: function() {

        },

        save: function() {
            // Used to save the plugin settings for later
            return {};
        },

        load: function(settings) {
            // Restore the plugin settings from a previous save call
        }
    };
});
