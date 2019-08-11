/**
 An object representing the entire story. After the document has completed
 loading, an instance of this class will be available at `window.story`.

 @class Story
 @constructor
**/

'use strict';
var $ = require('jquery');
var _ = require('underscore');
var LZString = require('lz-string');

var Story = function() {
	//Find the story and infer the Twine version.

	var el, twVersion, selectorAuthor, selectorCSS, selectorScript, selectorSubtitle; //, selectorStoryData;

	if ($('tw-storydata').length > 0) {
		el = $('tw-storydata');
		twVersion = 2;
		selectorAuthor = 'tw-passagedata[name=StoryAuthor]';
		selectorCSS = '*[type="text/twine-css"]';
		selectorScript = '*[type="text/twine-javascript"]';
		selectorSubtitle = 'tw-passagedata[name=StorySubtitle]';
		//selectorStoryData = 'tw-passagedata[name=StoryData]';
	} else {
		el = $('#storeArea');
		twVersion = 1;
		selectorAuthor = 'div[tiddler=StoryAuthor]';
		selectorCSS = '*[tags*="stylesheet"]';
		selectorScript = '*[tags*="script"]';
		selectorSubtitle = 'div[tiddler=StorySubtitle]';
		//selectorStoryData = 'div[tiddler=StoryData]';
	}

	// set up basic properties

	this.el = el;

	/**
	 The name of the story.
	 @property name
	 @type String
	 @readonly
	**/

	this.name = twVersion == 2 ? el.attr('name') : el.find("div[tiddler=StoryTitle]").text();

	/**
	 The subtitle of the story.
	 @property subtitle
	 @type String
	 @readonly
	**/

	this.subtitle = el.find(selectorSubtitle).html();

	/**
	 The name of the author.
	 @property author
	 @type String
	 @readonly
	**/

	this.author = el.find(selectorAuthor).text();

	/**
	 The ID of the first passage to be displayed.
	 @property startPassage
	 @type Number
	 @readonly
	**/

	this.startPassage = twVersion == 2 ? parseInt(el.attr('startnode')) : $('[tiddler=Start]').index();

	/**
	 The program that created this story.

	 @property creator
	 @type String
	 @readonly
	**/

	this.creator = el.attr('creator');

	/**
	 The version of the program used to create this story.

	 @property creatorVersion
	 @type String
	 @readOnly
	**/

	this.creatorVersion = el.attr('creator-version');

	/**
	 The end tag for colophon placement.

	 @property endTag
	 @type String
	 @readOnly
	**/

	this.endTag = "end";

	/**
	 The horizontal navigation state (Journal-style css and js scrolling).

	 @property journal
	 @type Boolean
	 @readOnly
	**/

	this.horizontal = false;

	/**
	 The renavigation state (a feature request out of Journal, but also works vertically).

	 @property pournelle
	 @type Boolean
	 @readOnly
	**/

	this.pournelle = false;

	/**
	 The scrolling adjustment in absolute pixels.

	 @property scrollAdjust
	 @type Integer
	 @readOnly
	**/

	this.scrollAdjust = 5;

	
	// initialize history and state

	/**
	 An array of passage IDs, one for each passage viewed during the current
	 session.

	 @property history
	 @type Array
	 @readOnly
	**/

	this.history = [];

	/**
	 An object that stores data that persists across a single user session.
	 Any other variables will not survive the user pressing back or forward.

	 @property state
	 @type Object
	**/

	this.state = {};

	/**
	 If set to true, then any JavaScript errors are ignored -- normally, play
	 would end with a message shown to the user. 

	 @property ignoreErrors
	 @type Boolean
	**/

	this.ignoreErrors = false;

	/**
	 The message shown to users when there is an error and ignoreErrors is not
	 true. Any %s in the message will be interpolated as the actual error
	 messsage.

	 @property errorMessage
	 @type String
	**/

	this.errorMessage = '\u26a0 %s';

	// create passage objects

	/**
	 An array of all passages, indexed by ID.

	 @property passages
	 @type Array
	**/

	this.passages = [];

	var p = this.passages;

	if (twVersion == 2) {
		el.children('tw-passagedata').each(function(el) {
			var $t = $(this);
			var id = parseInt($t.attr('pid'));
			var tags = $t.attr('tags');
			
			p[id] = new Passage(
				id,
				$t.attr('name'),
				(tags !== '' && tags !== undefined) ? tags.split(' ') : [],
				$t.html()
			);
		});
	} else {
		el.children('*[tiddler]').each(function (index,el) {
			var $t = $(el);
			var id = index;
			var tags = $.trim($t.attr('tags'));

			p[id] = new Passage(
				id,
				$t.attr('tiddler'),
				(tags !== '' && tags !== undefined) ? tags.split(' ') : [],
				$t.html().replace(/\\n/g, '\n').replace(/\\t/g, '\t')
			);

		});

		$('title').html(this.name);
		$('#ptitle').html(this.name);

	}

	/**
	 An array of user-specific scripts to run when the story is begun.

	 @property userScripts
	 @type Array
	**/

	this.userScripts = _.map(
		el.children(selectorScript),
		function(el) {
			if (twVersion == 1)
				return $(el).html().replace(/\\n/g, '\n').replace(/\\t/g, '\t');
			else
				return $(el).html();
		}
	);

	/**
	 An array of user-specific style declarations to add when the story is begun.

	 @property userStyles
	 @type Array
	**/

	this.userStyles = _.map(
		el.children(selectorCSS),
		function(el) {
			if (twVersion == 1)
				return $(el).html().replace(/\\n/g, '\n').replace(/\\t/g, '\t');
			else
				return $(el).html();
		}
	);
};

_.extend(Story.prototype, {
	/**
	 Begins playing this story.

	 @method start
	**/

	start: function() {
		// Initialize special passages.
		$('#psubtitle').html(this.subtitle);
		if (this.author)
			$('#pauthor').html(' by ' + this.author);

		// set up history event handler

		$(window).on('popstate', function(event) {
			var state = event.originalEvent.state;

			if (state) {
				this.state = state.state;
				this.history = state.history;
				
				/**
				 Remove the previous passage from the visual history before reopening it.
				 Remove the current passage after/because it gets added to the visual history 
				   (but not the state history) during this.show().
				 If the user did a browser forward (determined by the history length being off)
				   back out using a helper class; this effectively disables the forward button.
				 **/

				if (this.history.length == $('div.phistory').length && !$('#phistory').hasClass('fakeBack')) {
					$('div.phistory:last').remove();
					this.show(this.history[this.history.length - 1], true);
					$('div.phistory:last').remove();
				} else {
					if ($('#phistory').hasClass('fakeBack')) {
						$('#phistory').removeClass('fakeBack');
					} else {
						$('#phistory').addClass('fakeBack');
						window.history.back();
					}
				}
			}
			else if (this.history.length > 1) {
				this.state = {};
				this.history = [];
				this.show(this.startPassage, null, true);
				$('div#phistory').html('');
			}
		}.bind(this));

		// set up passage link handler; don't handle historical links

		$('body').on('click', 'a[data-passage]', function (e) {
			if ($(e.target).closest('#phistory').length == 0 || window.story.pournelle) {
				this.show(_.unescape($(e.target).closest('[data-passage]').addClass('visited').attr('data-passage')),
									parseInt($(e.target).closest('[data-ppassage]').attr('data-ppassage'),10));
			}
		}.bind(this));

		// set up hash change handler for save/restore

		$(window).on('hashchange', function() {
			this.restore(window.location.hash.replace('#', ''));	
		}.bind(this));

		// set up error handler

		window.onerror = function(message, url, line) {
			if (! this.errorMessage || typeof(this.errorMessage) != 'string') {
				this.errorMessage = Story.prototype.errorMessage;
			}

			if (!this.ignoreErrors) {
				if (url) {
					message += ' (' + url;

					if (line) {
						message += ': ' + line;
					}

					message += ')';
				}

				$('#passage').html(this.errorMessage.replace('%s', message));
			}
		}.bind(this);

		// activate user styles

		_.each(this.userStyles, function(style) {
			$('body').append('<style>' + style + '</style>');
		});

		// run user scripts

		_.each(this.userScripts, function(script) {
			eval(script);
		});

		// if the author has switched to horizontal or pournelle, we can switch over here.
		if (this.horizontal) {
			$("body").addClass("horizontal");

		}

		if (this.pournelle) {
			$("body").addClass("pournelle");

			//The start passage is visible, so we calculate how much to pad the div 
			//(to avoid degenerate scrolling cases near the start of the story).
			if (this.horizontal && $("body").width() < $(window).width())
				$("#phistory").css("paddingRight", 100 - ($("body").width()/$(window).width()) + "vh");
			else if ($("body").height() < $(window).height())
				$("#phistory").css("paddingBottom", 100 - ($("body").height()/$(window).height()) + "vh");

		}

		if (this.horizontal && this.pournelle) {
			//Adjustments to center the passage.  

			//The horizonal passage size is 30em; derive its actual size in pixels from the base font.
			var passize = Number(getComputedStyle(document.body, "").fontSize.match(/(\d*(\.\d*)?)px/)[1]) * 30;
			this.scrollAdjust = Math.max(parseInt(($("body").width() - passize)/2, 10),0);

			//Centering can be overridden by the user by setting scrollAdjust back to the default (5), or another value.
			//In this case (unlike other settings), the user should make the adjustment after the startstory trigger,
			//e.g., $(document).on('startstory', function() {window.story.scrollAdjust = 0;});
		}

		/**
		 Triggered when the story is finished loading, and right before
		 the first passage is displayed. The story property of this event
		 contains the story.

		 @event startstory
		**/

		$.event.trigger('startstory', { story: this });

		// try to restore based on the window hash if possible	

		if (window.location.hash === '' ||
			!this.restore(window.location.hash.replace('#', ''))) {

			this.show(this.startPassage);
		}
	},

	/**
	 Returns the Passage object corresponding to either an ID or name.
	 If none exists, then it returns null.

	 @method passage
	 @param idOrName {String or Number} ID or name of the passage
	 @return Passage object or null
	**/

	passage: function(idOrName) {
		if (_.isNumber(idOrName)) {
			return this.passages[idOrName];
		}
		else if (_.isString(idOrName)) {
			return _.findWhere(this.passages, { name: idOrName });
		}
	},

	/**
	 Displays a passage on the page, replacing the current one. If
	 there is no passage by the name or ID passed, an exception is raised.

	 Calling this immediately inside a passage (i.e. in its source code) will
	 *not* display the other passage. Use Story.render() instead.

	 @method show
	 @param idOrName {String or Number} ID or name of the passage
	 @param noHistory {Boolean} if true, then this will not be recorded in the story history
	**/

	show: function(idOrName, parentId, noHistory) {
		var passage = this.passage(idOrName);

		if (!passage) {
			throw new Error(
				'There is no passage with the ID or name "' + idOrName + '"'
			);
		}

		//We never hide passages, so snowman's hidepassage has been removed.

		if (this.pournelle && $("div#phistory" + passage.id).length > 0) {
			//The Journal-style insertion mode is a new, weird case, 
			//especially when the passage is already "visible".

			$.event.trigger('revisitpassage', { passage: passage });

			//Scrolling to an existing passage is complicated by the possibility that the passage is on screen already,
			//in which case we need to move the passage to the top or center to make it clear to the reader which passage they're on.
			//Horizontal scroll is also complicated by possibly needing to scroll back to the top of the page on long passages.
			if (this.horizontal)
				$('html, body').animate({scrollLeft: ($("div#phistory" + passage.id).offset().left - $("#phistory").scrollLeft()) - this.scrollAdjust,
												scrollTop: 1}, 500);
			else
				$('html, body').animate({scrollTop: ($("div#phistory" + passage.id).offset().top - $("#phistory").scrollTop()) - this.scrollAdjust}, 1000);

			$.event.trigger('revisitpassage:after', { passage: passage });

			return;
		}
		
		//Else we return you to your regular passage showing process.

		/**
		 Triggered whenever a passage is about to be shown onscreen.
		 The passage being displayed is stored in the passage property of the event.

		 @event showpassage
		**/

		$.event.trigger('showpassage', { passage: passage });

		if (!noHistory) {
			this.history.push(passage.id);

			try {
				window.history.pushState(
					{
						state: this.state,
						history: this.history
					},
					'',
					''
				);
			}
			catch (e) {
				// this may fail due to security restrictions in the browser

				/**
				 Triggered whenever a passage fails to be saved to browser history.

				 @event checkpointfailed
				**/

				$.event.trigger('checkpointfailed', { error: e });
			}
		}

		/**
		 Save the old passage html to the passage history.  Checkpoint all passages.
		 **/

		if (!this.pournelle) {
			//Copy old passage on opening new.
			$('#passage').hide();
			this.pcopy();
		}
		
		//Always render the passage in normal mode; render unseen passages in pournelle mode.
		window.passage = passage;

		if (this.pournelle) 
			$('#passage').html(passage.render());
		else
			$('#passage').html(passage.render()).fadeIn('slow');

		this.pcolophon();

		if (!this.pournelle) {
			//This scroll is simple because we're appending the passage to the end of the story.
			if (this.horizontal)
				$('html, body').animate({scrollLeft: $("#passage").offset().left - this.scrollAdjust, scrollTop: 1}, 500);
			else
				$('html, body').animate({scrollTop: $("#passage").offset().top - this.scrollAdjust}, 1000);
		}

		/**
		 Triggered after a passage has been shown onscreen, and is now
		 displayed in the div with id passage. The passage being displayed is
		 stored in the passage property of the event.

		 @event showpassage:after
		 **/

		$.event.trigger('showpassage:after', { passage: passage });

		if (this.pournelle) {
			//We move (and show) the passage now even though it was already supposed to be visible to the user
			//when triggering, so that scripts don't need to find it by its new id.
			//Since pournelle is not really intended for scripting, hopefully this is a good compromise.

			//Store new passages immediately.
			$('#passage').hide();
			this.pcopy(parentId);

			//This scroll is simple because we're appending the passage nearby.
			if (this.horizontal)
				$('html, body').animate({scrollLeft: $("#phistory" + passage.id).offset().left - this.scrollAdjust,
																scrollTop: 1}, 500);
			else
				$('html, body').animate({scrollTop: $("#phistory" + passage.id).offset().top - this.scrollAdjust}, 1000);
		}
	},

	/**
	 Copies the colophon into an end passage.

	 @method pcolophon
	**/
	
	pcolophon: function() {
		if ($.inArray(window.story.endTag, window.passage.tags) > -1 && this.passage('StoryColophon') != null) {
			$(this.passage('StoryColophon').render()).hide().appendTo("#passage").fadeIn('slow');
		}
	},
	
	/**
	 Copies the current passage text into the passage history div.

	 @method pcopy
	 @param parentId {Number} ID of the previous passage, only needed for pournelle
	**/
	
	pcopy: function(parentId) {
		if (!parseInt(window.passage.id,10))
			return;

		if (this.pournelle && parentId && $('#phistory' + parentId).length > 0)
			$('#phistory' + parentId).after('<div class="phistory" id="phistory' + window.passage.id + '" data-ppassage="' + window.passage.id + '">' + $('#passage').html() + '</div>');
		else
			$('#phistory').append('<div class="phistory" id="phistory' + window.passage.id + '" data-ppassage="' + window.passage.id + '">' + $('#passage').html() + '</div>');
	},
	
	/**
	 Returns the HTML source for a passage. This is most often used when
	 embedding one passage inside another. In this instance, make sure to
	 use <%= %> instead of <%- %> to avoid incorrectly encoding HTML entities.

	 @method render
	 @param idOrName {String or Number} ID or name of the passage
	 @return {String} HTML source code
	**/

	render: function(idOrName) {
		var passage = this.passage(idOrName);

		if (!passage) {
			throw new Error('There is no passage with the ID or name ' + idOrName);
		}

		return passage.render();
	},

	/**
	 Returns a hash value representing the current state of the story.

	 @method saveHash
	 @return String hash
	**/

	saveHash: function() {	
		return LZString.compressToBase64(JSON.stringify({ state: this.state, history: this.history }));
	},

	/**
	 Sets the URL's hash property to the hash value created by saveHash().

	 @method save
	 @return String hash
	**/

	save: function() {
		/**
		 Triggered whenever story progress is saved.

		 @event save
		**/

		$.event.trigger('save');
		window.location.hash = this.saveHash();
	},

	/**
	 Tries to restore the story state from a hash value generated by saveHash().

	 @method restore
	 @param hash {String} 
	 @return {Boolean} whether the restore succeeded
	**/

	restore: function (hash) {
		/**
		 Triggered before trying to restore from a hash.

		 @event restore
		**/

		$.event.trigger('restore');

		try
		{
			var save = JSON.parse(LZString.decompressFromBase64(hash));
			this.state = save.state;
			this.history = save.history;
			this.show(this.history[this.history.length - 1], true);
		}
		catch (e)
		{
			// swallow the error

			/**
			 Triggered if there was an error with restoring from a hash.

			 @event restorefailed
			**/

			$.event.trigger('restorefailed', { error: e });
			return false;
		};

		/**
		 Triggered after completing a restore from a hash.

		 @event restore:after
		**/

		$.event.trigger('restore:after');
		return true;
	}
});

module.exports = Story;
