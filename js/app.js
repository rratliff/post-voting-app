$(function() {
    var Post = Backbone.Model.extend({

        convertDate: function(date) {
            var t = date.split(/[- :]/);
            return new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));
        },
        toJSON: function() {
            var json = Backbone.Model.prototype.toJSON.call(this);
            json.date = this.convertDate(this.get('date'));
            return json;
        }
    });

    var PostList = Backbone.Collection.extend({

        model: Post,
        sync: function(method, model, options) {
            if (method == "read") {
                $.ajax({
                        url: "/wp-admin/admin-ajax.php",
                        data: {action: 'pva_getposts'},
                        method: 'POST'
                }).done(function(data) {
                    // If the server returns false, this is actually an error
                    if (data === false || data === 'false') {
                        options.error();
                    } else {
                        options.success(data, true, {});
                    }
                }).fail(function() {
                    options.error();
                });
            }
        }
    });

    var Posts = new PostList;

    var PostView = Backbone.View.extend({
        tagName: "li",
        template: _.template($('#post-template').html()),
        events: {
            "click .addvote" : "addVote"
        },
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    var AppView = Backbone.View.extend({
        el: $('#votingapp'),
        initialize: function() {
            this.listenTo(Posts, 'reset', this.addAll);
            //this.listenTo(Posts, 'all', this.render);

            Posts.fetch({reset: true});
        },
        addAll: function() {
            Posts.each(function(post) {
                var view = new PostView({model: post});
                this.$('#post-list').append(view.render().el);
            }, this);
        }
    });

    var App = new AppView({});
});

