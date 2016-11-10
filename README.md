# Paloma

Paloma is a Jonah-style Twine 2 story format based on [Snowman](https://bitbucket.org/klembot/snowman-2/).  It uses Markdown rather than TiddlyWiki-style text formatting, so it is not a drop-in replacement for Jonah.

The Paloma page is [here](http://mcdemarco.net/tools/scree/paloma/).

View a demo story [here](http://mcdemarco.net/tools/scree/test-paloma.html).

To add Paloma to Twine 2, use this URL (under Formats > Add a New Format): [https://mcdemarco.net/tools/scree/paloma/format.js](https://mcdemarco.net/tools/scree/paloma/format.js).

## Changes From Snowman

Paloma displays a running log of all passages, like Jonah.  All story links from previous passages are disabled, and previously selected links are highlighted.

By default, clicking a passage link adds an entry to the reader's browser history.  The reader can back up through this history, but cannot go forward again (except by clicking story links again).  Paloma does not have Snowman's checkpoint functionality; history is node-by-node only.

### Non-changes from Snowman

Paloma uses [Marked](https://github.com/chjj/marked/) for Markdown formatting and [jQuery](http://jquery.com) and [Underscore](http://underscorejs.org/) for scripting and templating.

As in Snowman, state is not restored on navigating back.

Some basic Snowman scripting:

* Set a variable `gender`:  `<% s.gender = "male" %>`.
* Show the variable's value:  `<%= s.gender %>`.
* Add a comment: `/* My ToDo list for this node: spellcheck! */`

See [the Snowman docs](https://bitbucket.org/klembot/snowman-2/) for more details.

## Versions

### 1.0.1

Added the title inline in the story.  To restyle or remove it, use the selector `#ptitle`.

### 1.0.0

Initial version.

## Building From Source

Run `npm install` to install dependencies.  Run `grunt package` to create a release version for Twine under `dist/`.  Run `grunt --help` to list other grunt targets.

