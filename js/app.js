$(function() {
    var ajaxWrapper = function(action, data, options) {
        $.ajax({
                url: "/wp-admin/admin-ajax.php",
                data: _.extend(_.omit(data, 'action'), {action: action}),
                method: 'POST',
                error: options.error,
                success: options.success
        });
    }

    var Post = Backbone.Model.extend({

        convertDate: function(date) {
            var t = date.split(/[- :]/);
            return new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));
        },
        toJSON: function() {
            var json = Backbone.Model.prototype.toJSON.call(this);
            json.date = this.convertDate(this.get('date'));
            return json;
        },
        addVote: function() {
            this.save({votes: this.get("votes")+1});
        },
        sync: function(method, model, options) {
            if (method == "update") {
                ajaxWrapper('pva_addvote', {id: model.id}, options);
            }
        }
    });

    var PostList = Backbone.Collection.extend({

        model: Post,
        sync: function(method, model, options) {
            if (method == "read") {
                ajaxWrapper('pva_getposts', {}, options);
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
        addVote: function() {
            this.model.addVote();
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

