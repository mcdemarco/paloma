# Paloma

Paloma is a Jonah-style Twine 2 story format based on [Snowman](https://bitbucket.org/klembot/snowman-2/).

Paloma uses Markdown formatting and [jQuery](http://jquery.com) and [Underscore](http://underscorejs.org/) scripting.

## Changes From Snowman

Paloma displays a running log of all passages, like Jonah.  All story links from previous passages are disabled, and the selected link is left highlighted.

By default, clicking a passage link adds an entry to the reader's browser history.  The reader can back up through this history, but cannot go forward again (except by clicking story links again).

## Building From Source

Run `npm install` to install dependencies.  Run `grunt package` to create a release version for Twine under `dist/`.  Run `grunt --help` to list other grunt targets.

