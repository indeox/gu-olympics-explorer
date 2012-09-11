app = {

    models: {},
    views:  {},
    collections: {},

    init: function() {
        var olympicCollection    = new app.collections.pictures({ url: 'feeds/olympics_images_pretty.json' }),
            paralympicCollection = new app.collections.pictures({ url: 'feeds/paralympics_images_pretty.json' });

        var mainView = new app.views.mainView({ collection: olympicCollection });

        olympicCollection.fetch();
    }
};


/* MODELS/COLLECTIONS */
app.models.picture = Backbone.Model.extend({
    idAttribute: 'mediaId'
});

app.collections.pictures = Backbone.Collection.extend({
    model: app.models.picture,
    initialize: function(opts) {
        this.url = opts.url;
        this.on('reset', function() {
            //console.log(this);
        });
    }
});



/* VIEWS */
app.views.mainView = Backbone.View.extend({
    initialize: function() {
        var self = this;
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
        this.collection.trigger('goToModel', this.collection.get(id));
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
        var datetime = moment(this.currentModel.get('epoch')).format('MMM Do');
        this.datetimeNode.text(datetime);

        var previewNodeX = e.offsetX - (140/2);
        // Don't put the preview box beyond the side edges
        if (previewNodeX > 5 && previewNodeX < 1000-145) {
            this.previewNode.css('left', previewNodeX);
        }



        this.markerNode.css('left', e.offsetX);
    },

    selectImage: function() {
        this.collection.trigger('goToModel', this.currentModel);
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
        this.$('.caption').text(model.get('caption'));
        this.$el.animate({ opacity: 1 });
    },

    close: function() {
        var self = this;
        this.$el.animate({ opacity: 0 }, {
            complete: function() {
                self.$el.hide();
            }
        });
    }
});


$(document).ready(function() {
    bodyNode = $(document.body);
    app.init();
});