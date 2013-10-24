This is a simple Javascript app for voting for things.

Dependencies:
  - [jQuery]
  - [Underscore]

The dependencies are included for now, but in the future they should be linked.

Post Voting App was created to vote for wordpress posts. It uses an HTTP API provided by the WordPress plugin [post-voting-api].

It also has the following features:
  - Voting is restricted to once per day (using a cookie)
  - Voting is not allowed on weekends (using browser clock)
  - Tested in IE 7-10, Chrome latest, and Firefox latest
  - Canvas spinner while loading (for browsers that support it)
  - Modal alert dialog
  - `getCookies` and `setCookie` courtesy of Flanagan's _Javascript, The Definitive Guide_
  - Underscore templates are used to generate items in the list


  [jQuery]: http://jquery.com
  [Underscore]: http://underscorejs.org/
  [post-voting-api]: https://github.com/rratliff/post-voting-api
