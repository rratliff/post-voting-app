$(function() {
    var baseUrl = "/wp-admin/admin-ajax.php";

    // Fix console for IE
    if (typeof console === 'undefined') {
        console = {log:function(){}};
    }

    var openDialog = function(title, msg) {
        var d = $('#overlay');
        d.find('.title').html(title);
        d.find('.container').html(msg);
        $('#overlay').fadeIn('fast');

    }

    var closeDialog = function() {
        $('#overlay').fadeOut('fast', function() {
            $('#overlay .title').empty();
            $('#overlay .container').empty();
        });
    }

    var Animation = function(spinner) {
        this.spinner = spinner;
        this.fps = 30; // frames per second
        this.frameTime = Math.floor(1000/this.fps);
        this.i = 0; // which step we are currently on
        this.R = 20; // radius of spinner animation
        this.r = 4; // radius of little dots
        this.step = 12; // number of discrete steps

        // If canvas is supported, start the animation
        var canvasSupported = !!document.createElement("canvas").getContext;
        if (canvasSupported) {
            this.c = this.spinner.getContext('2d');
            this.drawAnimationFrame();
        }
    }
    // Draw animation frame and setTimeout for the next frame
    Animation.prototype.drawAnimationFrame = function() {
        this.i++;
        if (this.i === this.step) this.i = 0;
        var theta = this.i*(2*Math.PI/this.step);

        this.spinner.width = this.spinner.width;
        this.c.beginPath();
        this.c.arc(25+this.R*Math.cos(theta),
                25+this.R*Math.sin(theta),
                this.r,
                0,
                2*Math.PI,
                false);
        this.c.fill();

        var that = this;
        this.nextFrame = setTimeout(
                function() {that.drawAnimationFrame()}, that.frameTime);
    }
    Animation.prototype.stopAnimation = function() {
        if (this.nextFrame) {
            clearTimeout(this.nextFrame);
        }
        this.spinner.width = this.spinner.width;
    }

    var ajaxWrapper = function(options) {
        var spinner = document.getElementById('spinner');
        // start animation
        var a = new Animation(spinner);
        return $.Deferred(function(dfd) {
            options.type = 'post';
            options.url = baseUrl;
            options.data = options.data + '&action=' + options.action;
            $.ajax(options).always(function() {
                a.stopAnimation();
            }).done(function(data) {
                // If the server returns false, this is actually an error
                if (data === false) {
                    dfd.reject();
                } else {
                    dfd.resolve(data);
                }
            }).fail(function() {
                dfd.reject();
            });
        });
    }

    var getCookies = function() {
        var cookies = {};
        var all = document.cookie;
        if (all === '')
            return cookies;
        var list = all.split('; ');
        for (var i = 0; i < list.length; i++) {
            var cookie = list[i];
            var p = cookie.indexOf('=');
            var name = cookie.substring(0,p);
            var value = cookie.substring(p+1);
            value = decodeURIComponent(value);
            cookies[name] = value;
        }
        return cookies;
    }

    var setCookie = function(name, value, days) {
        var cookie = name + '=' + encodeURIComponent(value);
        if (typeof days === 'number') {
            var expires = new Date();
            expires.setDate(expires.getDate() + days);
            cookie += '; max-age=' + (days*60*60*24);
            cookie += '; expires=' + expires.toUTCString();
        }
        document.cookie = cookie;
    }

    var votingActionAllowed = function() {
        var n = new Date();

        // No voting allowed on weekends
        var weekend = (n.getDay() === 0 || n.getDay() === 6);
        if (weekend) {
            throw new Error('Voting is not allowed on the weekend');
        }

        // Generate today at midnight
        // if lastVote > midnight then return false
        var midnight = new Date();
        midnight = new Date(midnight.getFullYear(), midnight.getMonth(),
                midnight.getDate(), 0, 0, 0, 0);
        if(parseInt(getCookies()['lastVote']) > midnight.getTime()) {
            throw new Error('Voting is only'+
                    ' allowed once per day (midnight to midnight)');
        }

        // voting action is allowed
        return true;
    }

    // Compatibility for IE8 and earlier
    if (!Date.now) {
        Date.now = function() {
            return new Date().valueOf();
        }
    }

    var setVotingCookie = function() {
        setCookie('lastVote', Date.now(), 2);
    }

    var Post = function(model) {
        // Date is in SQL date format, e.g. "2014-09-20 20:35:04"
        var t = model.date.split(/[- :]/);
        model.date = new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));
        this.model = model;
    }
    Post.prototype.addVote = function() {
        var that = this;
        // Model doesn't care about business logic, so just add the vote
        return ajaxWrapper({
            action: 'pva_addvote',
            data: 'id='+that.model.id
        }).done(function() {
            that.model.votes += 1;
        });
    }

    var PostView = function(post) {
        this.post = post;
        this.model = post.model;
        this.$el = $('<li></li>');
        this.$el.on('click', '.addvote', this, this.addVote);
        this.template = _.template($('#post-template').html());
    }
    PostView.prototype.render = function() {
        this.$el.empty();
        this.$el.append(this.template(this.model));
        return this.$el;
    }
    PostView.prototype.addVote = function(ev) {
        ev.preventDefault();
        var that = ev.data;
        try {
            votingActionAllowed();
            that.post.addVote().done(function() {
                setVotingCookie();
                that.render();
                $(document).trigger('postvoting.refresh');
            }).fail(function() {
                openDialog('Server error', 'Error while adding vote on post id '+that.model.id);
            });
        } catch(e) {
            if (e instanceof Error){
                openDialog(e.name, e.message);
            } else {
                alert('error');
            }
        }
    }


    // actually a list of PostViews
    var PostList = function(el, comparator) {
        this.list = [];
        this.comparator = comparator;
        this.element = $(el);
    }
    PostList.prototype.reset = function() {
        this.list = [];
    }
    PostList.prototype.add = function(item) {
        var p = new Post(item);
        var pv = new PostView(p);
        this.list.push(pv);
    }
    PostList.prototype.sort = function() {
        this.list = _.sortBy(this.list, this.comparator);
    }
    PostList.prototype.render = function() {
        var that = this;
        this.sort();
        this.element.empty();
        $.each(this.list, function(index, item) {
            that.element.append(item.render());
        });
    }


    var ListManager = function(comparator) {
        this.blogposts = new PostList('#post-list', comparator);
    }
    ListManager.prototype.fetch = function() {
        var that = this;
        return ajaxWrapper({
            action: 'pva_getposts'
        }).done(function(data) {
            that.reset();
            $.each(data, function(index, item) {
                that.add(item);
            });
        });
    }
    ListManager.prototype.add = function(item) {
        this.blogposts.add(item);
    }
    ListManager.prototype.reset = function() {
        this.blogposts.reset();
    }
    ListManager.prototype.render = function() {
        this.blogposts.render();
    }


    var AppView = function() {
        var sortDate = document.getElementById('sort-date');
        var sortTitle = document.getElementById('sort-title');
        var sortVotes = document.getElementById('sort-votes');
        sortDate.comparator = function(item) {
            return item.model.date;
        }
        sortVotes.comparator = function(item) {
            // Descending sort of votes
            return -1 * item.model.votes;
        }
        sortTitle.comparator = function(item) {
            return item.model.title;
        }
        this.List = new ListManager(sortVotes.comparator);
        this.element = $("#votingapp");
    }
    AppView.prototype.init = function() {
        this.refresh();
        this.bindEvents();
    }
    AppView.prototype.refresh = function() {
        var that = this;
        this.List.fetch().done(function(){
            that.List.render();
        }).fail(function() {
            openDialog('Server error', 'Error while getting posts');
        });
    }
    AppView.prototype.bindEvents = function() {
        var that = this;
        $(document).on('postvoting.refresh', function() {
            that.refresh();
        });
        $('#sorting-buttons .btn').on('click', function() {
            $('#sorting-buttons .btn-active').removeClass('btn-active');
            $(this).addClass('btn-active');
            that.List.blogposts.comparator = this.comparator;
            that.List.render();
            return false;
        });
    }

    var App = new AppView();
    App.init();

    // dialog event handler
    // this is not the right place to put this!
    $('#overlay .ok').on('click', function() {
        closeDialog();
        return false;
    });

});
