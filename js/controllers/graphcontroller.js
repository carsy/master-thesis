require([
  'js/controllers/controller#controller',
  '$api/models',
  '$views/throbber#Throbber',
  'js/models/artistgraph#ArtistGraph',
  'js/components/settings#Settings',
  'js/components/playqueue#playqueue'
], function(Controller, _models, _throbber, _artistGraph, _settings, _playqueue) {

  var models;
  var Throbber;
  var ArtistGraph;
  var Settings;
  var PlayQueue;

  models = _models;
  Throbber = _throbber;
  ArtistGraph = _artistGraph;
  Settings = _settings;
  PlayQueue = _playqueue;

  var GraphController = new Class({
    Extends: Controller,

    initialize: function(name, config) {
      this.parent(name, config);

      this.options = config.options;

    }
  });

  GraphController.implement({

  });

  GraphController.prototype = {

    afterLoad: function() {
      console.log(this);
    },
    currentArtist: {
      load: function(self, callback) {
        models.player.load('track').done(function(player) {
          callback(self,
            models.Artist.fromURI(player.track.artists[0].uri),
            player.track.advertisement);
        });
      }
    },
    loadView: function() {
      var self = this;

      $(this.selector).load(this.viewpath, function() {
        models.player.load('track').done(self, self.setArtistGraph);
        console.log(this);
        self.loadSettingsMenu();

        models.player.addEventListener('change', function(player) {
          self.events.onPlayerChange(self, player);
        });
      });



      // $(this.selector).load(this.viewpath, this.eventsuite.afterLoad);
    },
    updateView: function() {
      if (this.artistGraph) {
        this.artistGraph.redraw();
        if (this.artistGraph.throbber)
          this.artistGraph.throbber.setPosition('center', 'center');
      }
      return this;
    },
    events: {
      onPlayerChange: function(self, player) {
        self.currentArtist.load(self,
          function(self, currentArtist, advertisement) {
            var oldArtistURI = self.artistGraph.artist.uri;

            if (advertisement)
              return;

            if (currentArtist.uri !== oldArtistURI) {
              self.setArtistGraph(self, currentArtist);
              PlayQueue.updateView();
            }
          });
      },
      onNodeDoubleClick: function(self, data) {
        var node = _.findWhere(self.artistGraph.data.nodes, {
          id: parseInt(data.nodes[0])
        });

        if (!node || node.id === 1)
          return;

        node.artist.load('compilations').done(function(artist) {
          models.player.playContext(artist.compilations);
        });
      }
    },

    loadSettingsMenu: function() {
      var self = this;

      this.settings = new Settings({
        selector: this.selector + ' ' + '.settings'
      });

      this.settings.loadView([

        function onChangeValue(input, value) {
          var config = {};
          config[input] = parseInt(value) || value;

          self.showThrobber();
          self.artistGraph.updateGraph(config);
          self.artistGraph.buildGraph();
        }
      ]);
    },

    /**
    Set artist from the current playing track.
    Creates the artistGraph.
  */
    setArtistGraph: function(player) {
      var config = {
        options: this.options
      };

      if (this.artistGraph) {
        config.branching = this.artistGraph.branching;
        config.depth = this.artistGraph.depth;
        config.treemode = this.artistGraph.treemode;
      }

      this.artistGraph = new ArtistGraph(
        $(this.selector + ' #graph')[0],
        player.track.artists[0],
        config
      );

      this.showThrobber();
      this.artistGraph.buildGraph();
      var self = this;
      this.artistGraph.on('doubleClick', function doubleClick(data) {
        this.events.onNodeDoubleClick(self, data);
      });
    },
    showThrobber: function() {
      if (this.artistGraph.throbber)
        this.artistGraph.throbber.hide();

      this.artistGraph.throbber =
        Throbber.forElement(document.getElementById(this.viewId));
      this.artistGraph.throbber.setPosition('center', 'center');
      this.artistGraph.throbber._addBackground();
    }
  };

  exports.graphcontroller = GraphController;
});