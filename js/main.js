app = Backbone.Router.extend({

    models: {},
    views:  {},
    collections: {},

    routes: {
        '' :    'mainGrid',
        ':id' : 'showMedia'
    },

    mainGrid: function() {

    },

    showMedia: function(id) {
        var model = this.mainCollection.get(id);
        this.mainView.mainImageView.showImage(model);
    },

    init: function() {
        var olympicCollection = new app.collections.pictures({
                                    name: 'Olympics',
                                    url: 'feeds/olympics_images_pretty.json',
                                    startDate: '2012-07-27',
                                    endDate:   '2012-08-12'
                                }),

            paralympicCollection = new app.collections.pictures({
                                    name: 'Paralympics',
                                    url: 'feeds/paralympics_images_pretty.json' ,
                                    startDate: '2012-08-29',
                                    endDate:   '2012-09-11'
                                });


        this.mainCollection = olympicCollection;

        this.mainView = new app.views.mainView({ collection: this.mainCollection });



        paralympicCollection.fetch();
        olympicCollection.fetch();
    }
});

app = new app();




/* MODELS/COLLECTIONS */
app.models.picture = Backbone.Model.extend({
    idAttribute: 'mediaId',
    initialize: function() {
        var dayOfEvent = (moment(this.attributes.epoch).sod().valueOf() - this.collection.eventStartEpoch);

        this.dayOfEvent  = dayOfEvent / 1000 / 60 / 60 / 24;
        this.prettyLabel = this.collection.name + ' Day ' + this.dayOfEvent;
    }
});

app.collections.pictures = Backbone.Collection.extend({
    model: app.models.picture,
    initialize: function(opts) {
        this.eventStartEpoch = moment(opts.startDate).sod().valueOf();
        this.eventEndEpoch = moment(opts.endDate).eod().valueOf();
        this.name = opts.name;
        this.url = opts.url;
        this.on('reset', function() {
            //console.log(this);
        });
    }
});



/* VIEWS */
app.views.mainView = Backbone.View.extend({
    el: '.container',

    initialize: function() {
        var self = this;

        this.layout();
        $(window).on('resize', function() {
            self.layout();
        });

        this.startupGridView = new app.views.startupGridView({ collection: this.collection });
        this.mainGridView = new app.views.mainGridView({ collection: this.collection });
        this.timelineView = new app.views.timelineView({ collection: this.collection });
        this.mainImageView = new app.views.mainImageView({ collection: this.collection });

        this.startupGridView.on('ready', function() {
            console.log('stage two');
            self.mainGridView.activate();
        });

        this.mainGridView.on('ready', function() {
            self.startupGridView.$el.hide();
            self.timelineView.show();
        });

        this.timelineView.on('active', function() {
            self.mainGridView.$el.addClass('faded'); //animate({ opacity: 0.3 });
        });

        this.timelineView.on('inactive', function() {
            self.mainGridView.$el.removeClass('faded'); //animate({ opacity: 1 });
        });

        this.mainImageView.on('active', function() {
            self.mainGridView.$el.addClass('faded'); //animate({ opacity: 0.3 });
        });

        this.mainImageView.on('inactive', function() {
            self.mainGridView.$el.removeClass('faded'); //animate({ opacity: 1 });
        });
    },

    layout: function() {
        // Figure out the optimal size for the container depending on window size
        this.winWidth = $(window).width();

        var optimalWidth = this.winWidth - (this.winWidth % 50);

        this.$el.width(optimalWidth);
    }
});


// The startup grid view gradually shows tiles
// to reveal the Olympics and Guardian logo
app.views.startupGridView = Backbone.View.extend({
    el: '.intro-grid',

    initialize: function() {
        var self = this;
        this.imageTotal = 0;
        this.imagesLoaded = 0;
        this.imagesVisible = 0;

        this.collection.on('reset', this.render, this);

        $(document).on('loadimage', function(data) {
            self.loadImage(data);
        });
    },

    loadImage: function(data) {
        var self = this,
            el = $(data.data[0]),
            randomDelay = Math.floor((Math.random()*5000)+1);

        this.imagesLoaded += 1;

        setTimeout(function() {
            el.animate({ opacity: 1 }, {
                duration: 1000,
                complete: function() {
                    self.imagesVisible += 1;

                    if (self.imagesVisible == self.imageTotal) {
                        setTimeout(function() {
                            self.trigger('ready');
                        }, 2000);
                    }
                }
            });
        }, randomDelay);


        if (this.imagesLoaded == this.imageTotal) {
            this.$el.animate({ opacity: 1 }, 1000);
        }
    },

    render: function() {
        var self = this,
            html = '';

        this.collection.each(function(entry, i) {
            if (i > 700) { return false; }

            if (entry.has('140x84')) {
                html += '<li><img src="'+entry.get('140x84')+'" onLoad="bodyNode.trigger(\'loadimage\', [this])"/></li>';
                self.imageTotal += 1;
            }

        });

        this.$el.html(html);
    }
});


app.views.mainGridView = Backbone.View.extend({
    el: '.main-grid',

    events: {
        'click img' : 'selectImage'
    },

    initialize: function() {
        var self = this;
        this.imageTotal = 0;
        this.imagesLoaded = 0;
        this.imagesVisible = 0;

        this.collection.on('reset', this.render, this);
    },

    activate: function() {
        var self = this;

        this.$('img').each(function(i) {
            var node = $(this),
                delay = i * 25,
                randomDelay = Math.floor((Math.random()*3000)+1);

            setTimeout(function() {
                node.animate({ opacity: 1 }, {
                    duration: 1000,
                    complete: function() {
                        self.imagesVisible += 1;

                        if (self.imagesVisible == self.imageTotal) {
                            $('header').animate({ opacity: 1 }, 2000);
                            self.trigger('ready');
                        }
                    }
                });
            }, randomDelay);
        });
    },

    selectImage: function(e) {
        var id = $(e.target).attr('data-id');
        app.navigate(id, { trigger: true, replace: true });
        //this.collection.trigger('goToModel', this.collection.get(id));
    },

    render: function() {
        var self = this,
            html = '';

        this.collection.each(function(entry, i) {
            if (i > 700) { return false; }

            if (entry.has('140x84')) {
                html += '<li><img src="'+entry.get('140x84')+'" data-id="'+entry.id+'" /></li>';
                self.imageTotal += 1;
            }

        });

        this.$el.html(html);
    }
});



app.views.timelineView = Backbone.View.extend({
    el: '.timeline',

    events: {
        'mousemove' : 'scrub',
        'mouseover' : 'showMarker',
        'mouseout'  : 'hideMarker',
        'click'     : 'selectImage'
    },

    initialize: function() {
        var self = this;

        this.collection.on('reset', function() {
            self.totalImages = this.length;
        });

        this.width = this.$el.width();
        this.previewNode      = this.$('.preview');
        this.imagePreviewNode = this.$('.preview .image-preview');
        this.datetimeNode     = this.$('.preview .datetime');
        this.markerNode       = this.$('.marker');

        $(window).on('resize', function() {
            self.width = self.$el.width();
        });
    },

    show: function() {
        this.$el.addClass('visible');
    },

    showMarker: function() {
        this.markerNode.addClass('visible');
        this.previewNode.addClass('visible');
        this.trigger('active');
    },

    hideMarker: function() {
        this.markerNode.removeClass('visible');
        this.previewNode.removeClass('visible');
        this.trigger('inactive');
    },

    scrub: function(e) {
        this.currentImageIndex = Math.round((e.offsetX / this.width) * this.totalImages);

        this.currentModel = this.collection.at(this.currentImageIndex);

        this.imagePreviewNode.attr('src', this.currentModel.get('140x84'));
        this.datetimeNode.text(this.currentModel.prettyLabel);

        var previewNodeX = e.offsetX - (140/2);
        // Don't put the preview box beyond the side edges
        if (previewNodeX > 5 && previewNodeX < this.width-145) {
            this.previewNode.css('left', previewNodeX);
        }



        this.markerNode.css('left', e.offsetX);
    },

    selectImage: function() {
        app.navigate(id, { trigger: true, replace: true });
        //this.collection.trigger('goToModel', this.currentModel);
    }
});


app.views.mainImageView = Backbone.View.extend({
    el: '.main-image',

    events: {
        'click' : 'close'
    },

    initialize: function() {
        this.collection.on('goToModel', this.showImage, this);
    },

    showImage: function(model) {
        this.$('img').attr('src', '');
        this.$el.show();

        this.$('img').attr('src', model.get('1024x614'));
        this.$('.caption').html('<span>'+model.prettyLabel + ':</span> ' + model.get('caption'));
        this.$el.animate({ opacity: 1 });

        this.trigger('active');
    },

    close: function() {
        var self = this;
        this.$el.animate({ opacity: 0 }, {
            complete: function() {
                self.$el.hide();
            }
        });

        this.trigger('inactive');
        app.navigate('', { trigger: true, replace: true });
    }
});


$(document).ready(function() {
    bodyNode = $(document.body);

    var rootUrl = window.location.href.match('deepcobalt') ? '/gudev/gu-olympics-explorer/' : '/dvella/gu-olympics-explorer/';

    Backbone.history.start({
        pushState: true,
        root:      rootUrl
    });
    app.init();
});