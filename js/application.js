// ==================================================
//  file:    application.js
//  uses functions in: utility.js, documents.js
//  uses libraries:    jquery, jquery ui, tablesorter
//  used in:           index.php
// ==================================================
// this global is for positioning new or selected (clicked) windows in front of existing windows
// each time a window is clicked, this var is incremented by 1 and assigned as the z-index for
// the clicked window. This way clicking any window brings it to front.

var currentZ = 5;
// incrementing z-index (see above)
var itemDatabase = [];
// the question array database (complete)
var loadedQuestion = "";
// the currently loaded question, so we know not to reload if clicked again
var product;
// the product header information, populated on initialisation
var catalogOrig = true;
// lets us know if the question window has been moved or resized
var docZeroOrig = true;
// lets us know if the default document window has been moved or resized
var dbLength = 0;
// the total question count of our question list
var result = [];
// the search results - needed for lazy loading
var documents = [];
// the loaded documents - managed globally for edit, retrieval, etc.
var hasLevels = 0;
// if there are level icons to be shown
var levelIds = {};
var typeIds = {};
var showQIDs = true;
// manage the state of the QIDs to reset after lazy loading the question list
var maxQuestions = 15;
// the max size of a document
var useCdn = 0;
var touchDevice = false;
// if the device supports TOUCH (alternative add question features)
var startpos;
var serial = new Date().getTime();

$(document).ready(function () {
	if (is_touch_device()) {
		touchDevice = true;
		myItem = document.getElementById("catalog");
		var hammertime = new Hammer(myItem);
		hammertime.on("press", function (ev) {
			if (ev.pointerType === "touch") {
				addMultipleItems();
			}
		});
	}

	$("img").on("error", function (t) {
		console.log(this, t);
	});

	//touchDevice = true;

	// removed and logged in the database
	//log(launched_subject, "LOG", "Product launched");

	// initialise tooltips
	$("#toolbar").tooltip({
		tooltipClass: "custom-tooltip",
		show: {
			delay: 350,
		},
	});

	$(".document").tooltip({
		tooltipClass: "custom-tooltip",
		show: {
			delay: 350,
		},
	});

	// initialise tooltips
	$(".osa-viewer-info-tooltip").tooltip({

		content: "<span class='osa-doc-tooltip'><b>Enable check marks:</b> When ticked, students will be able to view the marks that they achieve. Non-automarkable questions will show as '-'<hr/><b>Show mark scheme:</b> When ticked, students will be able to view the mark scheme associated with each question.<hr/><b>Quicklink live:</b> When ticked, the Quicklink will be accessible via the QR code and URL. Untick this box to close the Quicklink and prevent access.</span>",
		tooltipClass: "ui-tooltip-viewer",
		position: {
			my: "center bottom-20",
			at: "center top",
			using: function( position, feedback ) {
			  $( this ).css( position );
			}
		  },
		show: {
			delay: 350,
		},
	});


	$("input").alphanum();

	// JSON retrieval of the complete index file
	// this payload is the basis of the entire initial environment. It contains:
	//.product -- object contains product description
	//.index -- contains the product indices
	//.documents -- the user documents
	//.readymades -- the ready made documents (if any)
	// requires a valid PHP session with a user token

	$("#loading").show();

	// get the index file from the configured path
	var json_url = json_index_path + launched_subject + ".json?ser=" + serial;

	$.getJSON(json_url, function (data) {
		$("#loading").hide();
		if (data.index && data.product) {
			product = data.product;

			if (product.maxquestions) maxQuestions = product.maxquestions;

			itemsRaw = data.index.QuestionIndex.content.q;
			itemDatabase = [];

			for (var ind in itemsRaw) {
				var val = itemsRaw[ind];
				if (maxyear && maxyear > 0) {
					if (val.year && parseInt(val.year) > parseInt(maxyear)) {
						continue;
					}
				}
				if (limitbyflag && limitbyflag == 1) {
					if (val.flag1 == 0) {
						continue;
					}
				}
				// create the field to search with free text and add it to each item : this could be done server side but would inflate the index size by 2x
				var rtt = val.des + "|" + val.ttext + "|" + val.qid;
				val.ft = rtt.toLowerCase();
				val.resource = null;
				// build the index with items that pass the year filter
				itemDatabase.push(val);

				// add to the ft node for the item as lower case
			}
			dbLength = itemDatabase.length;

			$(".productTitle").html(product.label);
			document.title = product.label;

			// set inital positioning
			setupScreen();

			// setup movable resizable, draggable
			makeMovable();

			// add listneners for menu items (must be called after creating new docs as well)
			setupMenus();

			//	set the count, marks and time display in the document footer(s)
			updateDetails();

			// make the index trees and set the catalog up
			makeIndexTrees(data.index);
			clearSearch();

			if (isosa == 1) checkOsaStudents();
		} else {
			// If the index is invalid then we need to stop here.
			// for staging, the retrieval of the JSON stuff is being converted from the legacy XML indices on the fly which causes a few issues in some products, mostly due to improper encoding of the XML. (ANSI as UTF8)
			// when live, the JSON indices will exist statically and be tested for validity so this should never happen, but it is here as a failsafe for now.

			vex.dialog.alert(
				"<b>Sorry, incomplete index or bad product.</b><br><br>This product cannot currently be loaded and execution will now stop.<br><br>Product ID: <b>" +
					launched_subject +
					"</b><br><br>Request returned:<br> " +
					data
			);
			throw new Error("FATAL ERROR - Index or product description incomplete");
		}
		// various interface listeners

		$(".makedoc").on("click", function () {
			log(launched_subject, "LOG", "New document clicked");

			createDocument();
			return true;
		});

		$(".close-button").on("click", function () {
			$(this).closest(".shadow").fadeOut();
			$("#docModal").hide();
		});

		$("#dontShow").on("change", function () {
			dontShowAgain();
		});

		$(".viewer-control").on("click", function () {
			$("#viewerWindow").toggleClass("right-container viewer-max");
			$(".viewer-button").toggleClass("viewer-win-ctrl viewer-win-ctrl-max");

			if ($("#viewerWindow").hasClass("viewer-max")) {
				$("#viewerWindow").draggable("disable");
				$("#viewerWindow").resizable("disable");
			} else {
				$("#viewerWindow").draggable("enable");
				$("#viewerWindow").resizable("enable");
			}
		});

		$(".toggle-question-id").on("click", function () {
			showQIDs = !showQIDs;
			$(".question-id-display").toggle(showQIDs);
		});

		$("#sidebar").on("click", ".sidebardoc", function (ev) {
			var docid = $(this).attr("data-docid");
			var pos = $("#" + docid).data("pos");

			$("#" + docid).css("z-index", currentZ++);
			$("#" + docid).fadeIn({
				queue: false,
				duration: "fast",
			});
			$("#" + docid).animate(pos, "fast");
			$(".document").tooltip({
				tooltipClass: "custom-tooltip",
				show: {
					delay: 350,
				},
			});

			$(this).remove();
		});

		// Content retrieval

		// mousedown here so we always select a question, even when dragging
		// click comes after a mouse up and allows a drag without selecting (not desired)

		// key arrow navigation and delete
		$(document).bind("keydown", function (e) {
			var k = e.keyCode;

			// down and up arrows
			if (k == 38 || k == 40) {
				$("#tabs").tabs("option", "active", false);
				navigateList(k);
				return false;
			}
		});

		// freetext search, clear and search reset buttons

		$(".freetext").on("keyup", function () {
			doSearch();
		});

		$(".clear-freetext").on("click", function () {
			$(".freetext").val("");
			doSearch();
		});

		$(".clear-search").on("click", function () {
			clearSearch();
		});

		// selecting an item (any list)

		$(".add-items").on("click", function () {
			addMultipleItems();
		});

		$("#catalog").on("dblclick", ".li_item", function (ev) {
			addMultipleItems();
		});

		$(document).on("mousedown", ".listItem", function (ev) {
			var t = $(ev.target);
			// get the actual clicked thing to differentiate between delete button and item
			var th = $(this);
			// assign $(this) to var if we are going to call it a lot

			// user clicked the delete X on the list item
			if (t.hasClass("delete-question")) {
				th.closest(".listItem").mousedown();
				removeItem();
				return true;
			}
			// set the selected item exclusively - 'selected' is the class of the selected listitem
			// if the shift key is pressed while clicking then multi-select
			if (!ev.shiftKey) $(".listItem").removeClass("selected");
			th.toggleClass("selected");

			// only show the add button if > 1 item is selected
			if ($("#cataloglist .selected").length > 1) {
				$(".add-items").show();
				shiftSelect();
				// this selects all between the max / min selected in the list
			} else {
				$(".add-items").hide();
			}

			// get the atributes from the selected question
			var qid = th.attr("data-id");
			var dbindex = th.attr("data-index");
			var folder = th.attr("data-folder");
			var filename = th.attr("data-file");
			var res = th.attr("data-res");

			// load the content for this item
			getContent(qid, dbindex, folder, res);
		});

		//make the content tabs tabs (jq ui tabs plugin) and show them

		$("#tabs").tabs();
		//   $('#tabs').tabs().find('.ui-tabs-nav').css('white-space','nowrap').css('overflow','hidden').find('li').css('display','inline-block').css('float','none').css('vertical-align','bottom');
		// $('#tabs').tabs().find('.ui-tabs-nav').css('white-space','nowrap').css('overflow-x','auto').css('overflow-y','hidden').find('li').css('display','inline-block').css('float','none').css('vertical-align','bottom');

		$("#tabs").show();

		$(".buttonContainer").each(function (index) {
			var id = $(this).attr("id");

			switch (
				id.substring(0, id.indexOf("-")) // hide the print button and button text if printing to
			) {
				case "word": // that format is not supported for the product
					if (!data.product.printword) $(this).hide();
					break;
				case "pdf":
					if (!data.product.printpdf) $(this).hide();
					break;
				case "cloud":
					if (!data.product.printcloud) $(this).hide();
					break;
				default:
					$(this).show();
			}
		});

		if (!data.product.printcompact) {
			$("#compact-questions-radio").hide();
			// hide the answer lines checkbox if printcompact is not supported for the product
		} else {
			$(".send-print").css("bottom", "0px");
			// fixes problem of button overlapping input box in firefox
		}
	});

	get("tb5_content", "getProduct", "json", [launched_subject_key], function (data) {
		// if there are documents, set them up
		// document related functions are in documents.js
		if (data.documents) {
			documents = data.documents;
			buildDocList();
		}

		// if there are ready made documents, set them up
		// document related functions are in documents.js
		if (data.readymade) {
			if (limitbyflag && limitbyflag == 1) {
				$("#dt2").remove();
				return;
			}
			buildReadyMadeDocList(data.readymade);
		}
	});

	// reset the size of the doc0 list so the footer fits
	// this is necessary as this window is in page flow UNTIL it is dragged or resized, then it is absolute.
	// same goes for the content and viewer panes but they don't have abs. positioned footers.

	$(window).on("resize", function (e) {
		var zh = $("#docZero").height();
		$("#listZero").css("height", zh - 60 + "px");

		// re-set the screen if the resized element is the whole browser
		if (e.target === window) {
			setupScreen();
		}
	});

	// ======= TOOLBAR BUTTONS ====================

	$(".toolbarButton").on("click", function () {
		var funct = $(this).attr("id");
		// uses the button ID to steer
		$(".no-border-box").hide();

		switch (funct) {
			case "searchButton":
				//$("#searchbox").css("z-index", currentZ++);
				log(launched_subject, "LOG", "Searched clicked toolbar");

				$("#searchbox").show();
				$(".ui-textfield").focus();
				break;

			case "resetButton":
				log(launched_subject, "LOG", "Search cleared toolbar");
				clearSearch();
				break;

			case "documentListButton":
				$("#docModal").show();
				$("#docbox").show();
				break;

			case "homeButton":
				log(launched_subject, "LOG", "Home clicked toolbar");

				$(".content-tabs").hide();
				$(".welcome-screen").fadeIn("fast");
				break;

			default:
				return;
		}
	});

	// ========= WELCOME PAGE LISTENERS ============

	$(".welcome-btn-search").on("click", function () {
		$("#searchbox").show();
		log(launched_subject, "LOG", "Search welcome screen clicked");
	});

	$(".welcome-btn-docs").on("click", function () {
		$("#docModal").show();
		$("#docbox").show();
		$("#dt1").click();
	});

	$(".welcome-btn-readymade").on("click", function () {
		$("#docModal").show();
		$("#docbox").show();
		$("#dt2").click();
	});

	// =============================================

	// clicking the breadcrumb in the search summary
	// this opens the search window and selects the tab where the selected breadcrumb lives

	$(".search-crumbs").on("click", ".data-breadcrumb", function (ev) {
		log(launched_subject, "LOG", "Search crumbs clicked");

		ev.preventDefault();
		//$("#searchbox").css("z-index", currentZ++);
		$("#searchbox").show();
		var dta = $(this).attr("data-index");
		setSelectedIndex(dta);
	});

	// this facilitates the lazy loading
	// Any search only initially parses and displays
	// 50 items. When scrolling reaches the bottom, the next 50 are loaded, etc. This is the scrolling part.

	$("#cataloglist").scroll(function () {
		var div = $(this);
		var fragment = document.createDocumentFragment();

		// see utility.js
		if (isScrolledToBottom(this)) {
			//if (div[0].scrollHeight - div.scrollTop() == div.height())// we're at the bottom of the list
			// if (div[0].scrollHeight - div[0].scrollTop == div.outerHeight())// we're at the bottom of the list

			var start = $("#cataloglist li").length;
			// the number of items currently
			var end = start + 50;
			// the numer of items + 50

			if (end <= start) return;
			// if there are no more items, exit
			if (end > result.length) end = result.length;
			// if there are less than 50, reset the end to the remainder

			for (var i = start; i < end; i++) {
				try {
					fragment.appendChild(result[i]);
				} catch (e) {} // loop through start to end - add the items from the search result in the start/end window
			}

			document.getElementById("cataloglist").appendChild(fragment);
			$(".question-id-display").toggle(showQIDs);

			// add the items to the existing display
			resetCatalog();
			// this reinitialises the drag/drop, as the newly added items aren't included in the existing listener
		}
	});

	// OSA source tab listener
	if (isosa == 1) {
		$("#tabs-3").on("click", ".sourceTabText", function (ev) {
			var target = $(this).attr("data-toggle");
			$(".sourceTabContent").hide();
			$(".sourceTabText").removeClass("sourceTabTextSelected");
			$(this).addClass("sourceTabTextSelected");
			$("#" + target).fadeIn("fast");
		});
	}
}); // end document.ready()

// ==== LOAD CONTENT =========
// the global database item array, itemDatabase, contains  2 nodes used for caching
// .loaded and .content. When a question is retrieved from the server the first time, .content is populated with the retrieved
// content and .loaded is set to 1 (it is 0 as default).  any subsequent request for this item (from any list) will be loaded from the content node
// and not from the server. This makes subsequent retrievals of questions instantaneous and local.
// One could imagine a pre-cached version that contained all the content with base64 inline images for offline use, but that is beyond the scope of this comment.

function getContent(qid, dbindex, folder, res) {
	$(".welcome-screen").hide();
	$(".content-tabs").fadeIn("fast");

	// don't do anything if it's the question currently loaded and this is a load tab request
	// ignore if caching is disabled

	if (enableCache) {
		if (loadedQuestion == qid) return false;
	}

	if (!enableCache) {
		$(".viewerTitle").html(qid);
	}

	// check if this item's .loaded node is set to 0 or 1. If 1, it is cached locally so retrieve from there
	// if NOT, load from server, add to local cache, and set to 1 so it loads from cache next time

	if (!enableCache || itemDatabase[dbindex].loaded == 0) {
		var filename = itemDatabase[dbindex].fil.toUpperCase();
		itemDatabase[dbindex].loaded = 1; // set cached to 1

		let contentURL = "";
		if (isosa == 0) {
			contentURL = json_path + folder + "/" + filename + ".json?ser=" + serial;
		} else {
			contentURL =
				osa_path +
				"?pid=" +
				launched_subject +
				"&qid=" +
				qid +
				"&ser=" +
				serial +
				"&draft=" +
				draftContent;
		}

		$.getJSON(contentURL, function (tab) {
			if (isosa == 0) tab = fixImgs(tab);

			itemDatabase[dbindex].content = tab;
			return output(qid, tab, res);
		}).fail(function () {
			log(launched_subject, "CONTENT MISSING", qid);

			// retrieve the custom error message
			$.get("/data/qerror/qerror.php?br=" + launched_brand + "&qid=" + qid, function (data) {
				$("#tabs-1").html(data);
				itemDatabase[dbindex].content.question = data;
				$("#tabs").tabs("option", "active", 0);
				$("#tabs").tabs("disable");
			});
			return false;
		});
	} else {
		// cached, get it from the local cache in this item

		var content = itemDatabase[dbindex].content;
		return output(qid, content, res);
	}

	function fixImgs(imgTab) {
		var ser = "?ser=" + serial;
		$.each(imgTab, function (index, value) {
			if (value != null) {
				if (value.indexOf("<img") > -1) {
					imgTab[index] = value.replace(
						/<img ([^>]*)src=(['"])([^'"]+)['"]([^>]*)>/gi,
						"<img $1src=$2" + json_path + "$3" + ser + "$2$4 />"
					);
				}
			}
		});

		return imgTab;
	}

	function output(sqid, tcontent, res) {
		loadedQuestion = sqid;

		if (isosa == 0) {
			var resource = fixResPath(res);
			$(".tab5").off("click");
			$(".tab5").on("click", function () {
				$("#resourceIframe").attr("src", resource);
			});
			populateTabs(tcontent, resource);
		} else {
			populateTabs(tcontent, null);
		}

		$(".cTab").scrollTop(0);
		return true;
	}
}

function populateTabs(tab, res) {
	// we check for content for each of the tabs
	// as well as if the tab is selected and the next
	// question has no content for it.
	// in this case we default to the Question
	if (res == "null") res = null;

	var active = $("#tabs").tabs("option", "active");
	// get the active tab
	$("#tabs").tabs("disable");
	// disable all tabs

	if (tab.markscheme) {
		// same for ms
		$("#tabs").tabs("enable", 1);
		tab.markscheme = tab.markscheme.replace(/\/RESOURCES\//gi, resources_url);
		$("#tabs-2").html(tab.markscheme);
	} else {
		// only here we disable if no content
		// and set the active tab to question if markscheme was selected when we switched to the question without one
		if (active == 1) {
			$("#tabs").tabs("option", "active", 0);
		}
	}

	if (tab.question) {
		// the question tab, tab index 0
		$("#tabs").tabs("enable", 0);
		// if there is a question enable the tab
		$("#tabs-1").html(tab.question);

		if (isosa == 1) {
			initAnswerBlocks();
			addMarks();
		}

		// set the content with the contents of tab.question
	}

	if (tab.examinerreport) {
		// same here ex report
		$("#tabs").tabs("enable", 2);
		tab.examinerreport = tab.examinerreport.replace(/\/RESOURCES\//gi, resources_url);
		$("#tabs-3").html(tab.examinerreport);
	} else {
		if (active == 2) {
			$("#tabs").tabs("option", "active", 0);
		}
	}

	if (tab.notes) {
		// same here notes
		$("#tabs").tabs("enable", 3);
		$("#tabs-4").html(tab.notes);
	} else {
		if (active == 3) {
			$("#tabs").tabs("option", "active", 0);
		}
	}

	if (isosa == 0) {
		if (res) {
			// resources are in an iframe to be populated
			$("#tabs").tabs("enable", 4);
		} else {
			if (active == 4) {
				$("#tabs").tabs("option", "active", 0);
			}
		}

		if (active == 4 && res) {
			// if the resource tab is selected when we switch questions, just update in place
			$("#resourceIframe").attr("src", res);
		}
		if (active != 4 && res) {
			// otherwise set the resources iframe to a blank page, and it will be invoked upon clicking the tab
			$("#resourceIframe").attr("src", "/data/blank.htm");
		}
	} else {
		// this is an OSA source
		// there can be > 1 so iterate over

		if (tab.resource) {
			var source = tab.resource;
			var restab = $('<div id="sourcetabs">');
			var tabhead = $('<div class="d-flex justify-content-start tabHeadContainer"/>');
			var tabbody = $('<div class="source-tab-content-container"/>');
			$.each(source, function (a, b) {
				let cl = "";
				if (a == 0) cl = " sourceTabTextSelected";
				if (source.length > 1)
					tabhead.append(
						'<div class="sourceTabText' +
							cl +
							'" data-toggle="sourceTab' +
							a +
							'">' +
							b.label +
							"</div>"
					);
				tabbody.append(
					'<div class="sourceTabContent" id="sourceTab' + a + '">' + b.html + "</div>"
				);
			});

			restab.append(tabhead).append(tabbody);

			$("#tabs").tabs("enable", 2);

			$("#tabs-3").html(restab);
			$("#sourceTab0").show();

			$(".nav-link").off("click");
			$(".nav-link").on("click", function (ev) {
				ev.preventDefault();
				$(".nav-link").removeClass("active");
				$(this).addClass("active");
				let id = $(this).attr("href");
				id = id.replace("#", "");

				$(".tab-pane").hide();
				$("#" + id).show();
			});

			if (active == 2) {
				$("#tabs").tabs("option", "active", 2);
			}
		} else {
			$("#tabs").tabs("option", "active", 0);
			$("#tabs-3").html("");
		}
	}

	if (isosa == 1) {
		// $("#t3").hide();
		$("#t4").hide();
		$("#t5").hide();
	}
}

function makeTouchable() {
	try {
		$(".doclist").sortable("destroy");
	} catch (e) {}
	$(".doclist").sortable();
}

function makeMovable() {
	//    if(touchDevice) {

	//       makeTouchable();
	//       return;
	//   }

	// These make the drag and drop / resize / sortable stuff come true

	// bring any clicked window to front
	$(".shadow").on("mousedown", function (ev) {
		var downid = ev.currentTarget.id; // get the one actually clicked

		if (downid != "searchbox" && downid != "viewerWindow") {
			$("#" + downid).css("z-index", currentZ++);
		}
	});

	// check any moved window isn't in illegal space
	$(".shadow").on("mouseup", function () {
		fixHidden();

		// this function checks some position parameters and centers the window if it is out of bounds
	});

	try {
		$(".ui-resizable").resizable("destroy");
	} catch (e) {}
	try {
		$(".ui-draggable").draggable("destroy");
	} catch (e) {}

	$("#catalog").resizable({
		resize: function () {
			catalogOrig = false;
			// set this global on resize so we know it's been moved or resized
		},
	});

	var origMaxWidth;

	$(".docadded").resizable({
		resize: function (e, ui) {
			// set the list height manually on resize
			var winheight = ui.size.height;
			var listid = $(this).find(".doclist").attr("id");
			$("#" + listid).css("height", winheight - 60 + "px");

			origMaxWidth = $(this).css("max-width");
			var colls = $(this).collision(".document");
			if (colls.length > 1) {
				// stop collision caused by resizing
				$(this).resizable("option", "maxWidth", ui.size.width);
			}
		},

		stop: function (e, ui) {
			// reset max width
			$(this).resizable("option", "maxWidth", origMaxWidth);
		},
	});

	//$("#tabbox").resizable();
	$("#viewerWindow").resizable();

	$("#docZero").resizable({
		resize: function (e, ui) {
			docZeroOrig = false;
			// set this global on resize so we know it's been moved or resized

			origMaxWidth = $(this).css("max-width");
			var colls = $(this).collision(".document");

			if (colls.length > 1) {
				// stop collision caused by resizing
				$(this).resizable("option", "maxWidth", ui.size.width);
			}
		},
		stop: function (e, ui) {
			// reset max width
			$(this).resizable("option", "maxWidth", origMaxWidth);
		},
	});

	$("#catalog").draggable({
		handle: ".moveheader",
		scroll: false,
		stop: function () {
			fixHidden();
			// make sure we didn't drag it out of bounds
		},
		start: function () {
			catalogOrig = false;

			// set this global on resize so we know it's been moved or resized
		},
	});

	$("#searchbox")
		.draggable({
			handle: ".moveheader-alt",
			scroll: false,
		})
		.resizable();

	$(".docadded").draggable({
		handle: ".moveheader",
		scroll: false,
		start: function (ev, ui) {
			startpos = ui.position;
		},

		stop: function (e, ui) {
			var colls = $(this).collision(".document");
			if (colls.length > 1) {
				$(this).css(startpos);
			}

			if (ui.position.top < 20 || $(this).width() + ui.position.left < 100) {
				$(this).css(startpos);
			}
		},
	});

	$("#docZero").draggable({
		handle: ".moveheader",
		scroll: false,

		start: function (e, ui) {
			docZeroOrig = false;
			startpos = ui.position;
		},
		stop: function (e, ui) {
			var colls = $(this).collision(".document");
			if (colls.length > 1) {
				$(this).css(startpos);
			}

			if (ui.position.top < 20 || $(this).width() + ui.position.left < 100) {
				$(this).css(startpos);
			}
		},
	});

	$("#viewerWindow").draggable({
		// $("#tabbox").draggable({
		handle: ".moveheader",
		scroll: false,
	});

	// this is the dragging among lists part

	try {
		$(".doclist").sortable("destroy");
	} catch (e) {}

	$(".doclist")
		.sortable({
			revert: 200,
			connectWith: ".doclist", // connect with any other .doclist
			placeholder: "dropPlaceholder",
			//appendTo : "body",
			zIndex: 99999,
			scroll: true,
			tolerance: "intersect",
			compareZIndex: true,

			beforeStop: function (ev, ui) {
				var cnt = $(this).find(".listItem").length;
				if (cnt > maxQuestions) {
					vex.dialog.buttons.YES.text = "Ok";
					vex.dialog.alert(
						"Question not added.<p>You have reached the maximum allowed number of questions (" +
							maxQuestions +
							") in a single document for this subject.</p>"
					);
					ui.item.remove();
				}
			},

			/*
        over : function(ev, ui) {

             $(this).closest(".document").css("z-index", currentZ++);
             $(ui.item).css("z-index", currentZ++);
        },
        */

			sort: function (ev, ui) {
				$(ui.item).css("z-index", currentZ++);
				ev.stopPropagation();
			},

			stop: function (ev, ui) {
				$(this).closest(".document").find(".saved-sign").html("*");
				$(ui.helper).removeClass("helper");
				$(ui.item).removeClass("helper");
				$(ui.helper).css("width", "");
				$(ui.helper).css("height", "");
				$(".dropPlaceholder").hide();
				updateDetails();
				// update the doc summaries in the footers
			},
			start: function (e, ui) {
				$(ui.helper).addClass("helper");
				$(ui.helper).css("width", $(this).width() + "px");

				// set the dragging li to the width of the source li
			},
			// remove duplicates

			receive: function (event, ui) {
				var did = $(this).closest("ul").attr("id");
				// show the delete X
				$(this).find(".removeQuestion").show();
				// show the delete button on the item (X, upper right)
				// $("#catalog .listItem").removeClass("selected");

				$(this).closest(".document").find(".saved-sign").html("*");

				var identicalItemCount = 0;
				var lid = $(this).attr("id");
				try {
					// get the count of items with the same Id (duplicates)
					// in a try block because if we are in preview mode, the line below breaks due to malformed legacy content HTML
					identicalItemCount = $("#" + lid).children("li:contains(" + ui.item.text() + ")").length;
				} catch (err) {
				} finally {
					if (identicalItemCount > 1) {
						// duplicate found...
						var did = $(this).closest(".document").attr("id");
						$("#" + did).addClass("redBorder");
						// flash the border red for half a second
						setTimeout(function () {
							$("#" + did).removeClass("redBorder");
						}, 500);

						$("#" + lid)
							.children("li:contains(" + ui.item.text() + ")")
							.first()
							.remove();
						// ditch the duplicate
					}
				}
			},
		})
		.disableSelection();

	resetCatalog();
}

// This needs to be in its own function (and not in MakeMovable())  as we have to reset the draggability of the list
// items after every search. The draggable listener must be on the LI elements, and we add and remove these in the search functions.

function resetCatalog() {
	// if (!touchDevice) {

	// main question list: clone, no dropping
	$("#cataloglist li").draggable({
		connectToSortable: ".doclist",
		helper: "clone",
		appendTo: "body",
		revert: "invalid",
		revertDuration: 20,
		placeholder: "dropPlaceholder",
		cursor: "move",
		zIndex: 9999,

		stop: function (ev, ui) {
			$(ui.helper).css("width", "");
			// bug that we need to collapse this before hiding otherwise the list doesn't flow to fill the space
			$(ui.helper).css("height", "");
			$(ui.helper).removeClass("helper");
		},

		start: function (e, ui) {
			$(ui.helper).addClass("helper");
			$(ui.helper).css("width", $(this).width() + "px");
		},
	});

	setQuestionsStatus();
	// updates disabled/enabled questions when scroll bar refreshes the list or a search is performed
	//   }
}

// setup the initial positions of the windows
function setupScreen() {
	var h = $(document).height() - 80;

	if (h > 400) {
		var cat_height = parseInt(h * 0.5);
		var doc_height = parseInt(h * 0.5);

		if (catalogOrig && docZeroOrig) {
			// this is where we need to know if the boxes have been moved or resized

			$("#catalog").css("left", "10px");
			$("#catalog").css("top", "55px");
			$("#catalog").css("height", cat_height - 20 + "px");

			$("#docZero").css("left", "10px");
			$("#docZero").css("top", parseInt(cat_height + 50) + "px");
			$("#docZero").css("bottom", "20px");
		}
	}

	$(".page").fadeIn();
	// page is the container for all the screen elements
}

// create the tree elements for the indices
// we only use indices named index1 .. index7 so this is checked for.

function makeIndexTrees(data) {
	$(".index-tab").hide();
	var indexList = ["index1", "index2", "index3", "index4", "index5", "index6", "index7"];
	// allowed indices
	var indexPresent = [];

	// we look if there is an iconold node - this contains the custom icon descriptor for the index
	// If so, we get the icon definition from the iconLookup array and replace the standard icon in the index tree
	// using jstree's icon node to override.

	$.each(data, function (x, y) {
		if ($.inArray(y.id, indexList) > -1) {
			// check if the indexid is present in our allowed array

			// index 3 can have custom icons steered by the .oldicon node in the index
			// this looks that value up (if any) against a static array of styles and applies in place
			// of the default tree icon

			if (y.content[1].iconold && y.id == "index3") {
				for (var i = 1; i < y.content.length; i++) {
					var node = y.content[i];
					var icon = iconLookup[node.iconold];
					if (icon) {
						y.content[i].icon = "fa " + icon.icon + " " + icon.css + " hide-icon";
						var tid = node.id;
						tid = tid.match(/\d+/)[0];
						typeIds[tid] = node.iconold;
					}
				}
			}

			// index 1 can have icons as well, see comment above
			if (y.content[1].iconold && y.id == "index2") {
				hasLevels = 1;
				// if this is true for index 2 then we turn on level icons in the items

				for (var i = 1; i < y.content.length; i++) {
					var node = y.content[i];
					var icon = levelLookup[node.iconold];
					if (icon) {
						y.content[i].icon = "levelIcon " + icon.css + " hide-icon";
						var nid = node.id;
						nid = nid.match(/\d+/)[0];
						levelIds[nid] = node.iconold;
					}
				}
			}

			indexPresent.push(y.id);
			// if so, we add it to our array

			// Make the tab handle for this index with the index label
			var tabTab = $(
				'<li class="' +
					y.id +
					' index-tab"><a href="#' +
					y.id +
					'" id="' +
					y.id +
					'label">' +
					y.label +
					"</a></li>"
			);

			// Make the content container for this index
			var tabContent = $('<div id="' + y.id + '" class="iTab ' + y.id + ' index-tab"></div>');

			// append the items to the tab container
			$("#tabTab").append(tabTab);
			$("#tabContent").append(tabContent);

			// setup the data object for the tree plugin. https://www.jstree.com

			var dta = {};
			dta.data = y.content;
			// the index content
			var dtaf = {};
			dtaf.core = dta;
			dtaf.plugins = ["wholerow"];

			$("#" + y.id).jstree(dtaf);
			$("#" + y.id).on("changed.jstree", function (e, data) {
				// set the changed listener to execute a search

				doSearch();
			});

			$("#" + y.id).on("select_node.jstree", function (e, data) {
				//$('#' + y.id).toggle_node(data.node);
				data.instance.toggle_node(data.node);
			});
		}
	});

	// create the index tabs and make them fixed (no wrapping, only horiz scroll bar)
	$("#indextabs").tabs();
	$("#indextabs")
		.tabs()
		.find(".ui-tabs-nav")
		.css("white-space", "nowrap")
		.css("overflow-x", "auto")
		.css("overflow-y", "hidden")
		.find("li")
		.css("display", "inline-block")
		.css("float", "none")
		.css("vertical-align", "bottom");
}

function doSearch() {
	var start = new Date().getTime();

	$(".search-crumbs").html("");

	// had this dynamic before but it was actually slower.
	// since we have the constraint of 7 indices, I just run each search over all
	// whether it is selected or not. The explicit values of all 7 benchmark much faster than dynamically creating the search string and executing it.

	var ft = $(".freetext").val();
	ft = ft.toLowerCase();

	var str = "";
	var cnt = 0;
	var index1 = "";
	var index2 = "";
	var index3 = "";
	var index4 = "";
	var index5 = "";
	var index6 = "";
	var index7 = "";

	var index1t = "";
	var index2t = "";
	var index3t = "";
	var index4t = "";
	var index5t = "";
	var index6t = "";
	var index7t = "";

	// retrieve index tree values

	try {
		index1t = $("#index1").jstree().get_selected(true)[0].text;
	} catch (ee) {}
	try {
		index2t = $("#index2").jstree().get_selected(true)[0].text;
	} catch (ee) {}
	try {
		index3t = $("#index3").jstree().get_selected(true)[0].text;
	} catch (ee) {}
	try {
		index4t = $("#index4").jstree().get_selected(true)[0].text;
	} catch (ee) {}
	try {
		index5t = $("#index5").jstree().get_selected(true)[0].text;
	} catch (ee) {}
	try {
		index6t = $("#index6").jstree().get_selected(true)[0].text;
	} catch (ee) {}
	try {
		index7t = $("#index7").jstree().get_selected(true)[0].text;
	} catch (ee) {}

	// retrieve index tree selected value objects

	try {
		index1 = $("#index1").jstree(true).get_selected();
	} catch (ee) {}
	try {
		index2 = $("#index2").jstree(true).get_selected();
	} catch (ee) {}
	try {
		index3 = $("#index3").jstree(true).get_selected();
	} catch (ee) {}
	try {
		index4 = $("#index4").jstree(true).get_selected();
	} catch (ee) {}
	try {
		index5 = $("#index5").jstree(true).get_selected();
	} catch (ee) {}
	try {
		index6 = $("#index6").jstree(true).get_selected();
	} catch (ee) {}
	try {
		index7 = $("#index7").jstree(true).get_selected();
	} catch (ee) {}

	// set any value where text = ALL to blank (will not impact search)
	if (index1t.indexOf("ALL") > -1) {
		index1 = "";
		index1t = "";
	}
	if (index2t.indexOf("ALL") > -1) {
		index2 = "";
		index2t = "";
	}
	if (index3t.indexOf("ALL") > -1) {
		index3 = "";
		index3t = "";
	}
	if (index4t.indexOf("ALL") > -1) {
		index4 = "";
		index4t = "";
	}
	if (index5t.indexOf("ALL") > -1) {
		index5 = "";
		index5t = "";
	}
	if (index6t.indexOf("ALL") > -1) {
		index6 = "";
		index6t = "";
	}
	if (index7t.indexOf("ALL") > -1) {
		index7 = "";
		index7t = "";
	}

	// clear the result global
	result = [];

	// loop through each question and compare the indices to the selected values plus freetext
	for (var i = 0; i < itemDatabase.length; i++) {
		var q = itemDatabase[i];
		if (
			q["index1"].indexOf(index1) > -1 &&
			q["index2"].indexOf(index2) > -1 &&
			q["index3"].indexOf(index3) > -1 &&
			q["index4"].indexOf(index4) > -1 &&
			q["index5"].indexOf(index5) > -1 &&
			q["index6"].indexOf(index6) > -1 &&
			q["index7"].indexOf(index7) > -1 &&
			q["ft"].indexOf(ft) > -1
		) {
			// if ALL match, add to the result array
			var domItem = makeItem(q, i, 1);
			if (domItem) result.push(domItem);
			// makeItem returns a valid DOM <li> object for the item
			cnt++;
		}
	}

	// append only the first 50 to the list.
	// The actual programatic search above is almost instantaneous (< 10ms). Any lag is caused by updating the reults on the screen.
	// So we keep the result set in the global |results|, but add only 50 at a time to the screen. This is very fast. 500 items was taking round 200ms on a fast machine. Too slow.
	// 50 never takes more than a few ms even on poorer hardware.

	// see   $('#cataloglist').scroll listener up by the listener declarations for the lazy loading stuff, next 50, next 50, etc.

	// I do not use Jquery here as the added overhead and abstraction for loops and appending is not neessary nor desired
	// This DOM fragment is created outside the application DOM and the results are appended to it.

	var fragment = document.createDocumentFragment();

	// we loop through the results and add the first 50, again no Jquery
	for (var i = 0; i < 50; i++) {
		try {
			fragment.appendChild(result[i]);
		} catch (e) {} // error catching for results with < 50 items
	}

	// clear the list and append the results
	var clist = document.getElementById("cataloglist");
	try {
		clist.innerHTML = "";
	} catch (e) {
		$("#cataloglist").empty();
	} // use innerHTML, if that doesn't go, Jquery.empty
	clist.appendChild(fragment);
	// add the populated DOM fragment to the empty question list all in one go.
	// reset the drag listener as we have recreated all the LIs

	resetCatalog();

	// if there is a result, scroll to the top and select the first item
	if (cnt > 0) {
		$("#cataloglist").scrollTop(0);
		$("#cataloglist .listItem").eq(0).mousedown();
	}

	// set the numnber of questions text
	if (cnt > 1) $(".question-count").html(cnt + " questions");
	if (cnt == 1) $(".question-count").html(cnt + " question");
	if (cnt == 0) $(".question-count").html("No questions found");

	// This is for populating the bradcrumb text in the question list.
	// 2 arrays so we can know what index the value came from (index1..index7)
	// this is so we can click later on the breadcrumb and have it open
	// to the index that was clicked

	if (ft) ft = "&apos;" + ft + "&apos;";
	// put the free text var in quotes so it is differentiatable from the rest

	var i = [];
	// allowed indices

	$(".ui-tabs-anchor").each(function () {
		// populate allowed indices with order layed out by the renderd tabs

		var index = $(this).attr("href");

		if (index.match(/#index[0-7]/)) {
			i.push(index.match(/index[0-7]/)[0]);
		}
	});

	var p = [index1t, index2t, index3t, index4t, index5t, index6t, index7t];
	var q = [];

	// search values

	for (var k = 0; k < i.length; k++) {
		// make the search values in array q match order of allowed indices in array i

		var pMatch = parseInt(i[k].match(/\d/)[0]) - 1;
		// index of item in p that will match the number of the allowed index in array i

		q.push(p[pMatch]);
	}

	q.push(ft);

	var res = [];

	// make the breadcrumb HTML only if there is a value
	// assigning the index source as data-index

	let searchLog = [];

	$.each(q, function (x, y) {
		if (y.length > 0) {
			var idx = "<span class='data-breadcrumb' data-index='" + i[x] + "'>" + y + "&nbsp;</span>";
			searchLog.push(y);
			// data-index is so we know what tab to show when it is clicked
			res.push(idx);
		}
	});

	// join the array with a pipe delimiter
	if (res.length == 0) {
		res = ["No search"];
	} else {
		log(launched_subject, "SEARCH", searchLog.join());
	}

	$(".search-crumbs").append(res.join("&nbsp;|&nbsp;"));
	$(".question-id-display").toggle(showQIDs);

	// populate the breadcrumb DIV by joining the array to a string
}

// reset all search controls and call search (returns all)
function clearSearch() {
	$(".question-count").html(dbLength + " questions");
	$(".search-crumbs").html("No search");
	$(".freetext").val("");

	try {
		$("#index1").jstree(true).deselect_all(true);
	} catch (ee) {}
	try {
		$("#index2").jstree(true).deselect_all(true);
	} catch (ee) {}
	try {
		$("#index3").jstree(true).deselect_all(true);
	} catch (ee) {}
	try {
		$("#index4").jstree(true).deselect_all(true);
	} catch (ee) {}
	try {
		$("#index5").jstree(true).deselect_all(true);
	} catch (ee) {}
	try {
		$("#index6").jstree(true).deselect_all(true);
	} catch (ee) {}
	try {
		$("#index7").jstree(true).deselect_all(true);
	} catch (ee) {}

	doSearch();
}

// select an index tab by it's data-index value
function setSelectedIndex(index) {
	if (index) {
		var tabToActivate = 0;
		/* set the index of tab to activate as the iteration index (i) of the tab with the id matching the data-index of the breadcrumb
        that was clicked. This way, if the id's of the tabs are out of order or missing a number it will not matter */
		$("#searchbox .ui-tabs-anchor").each(function (i) {
			var href = $(this).attr("href");
			if (href === "#" + index) {
				tabToActivate = i;
			}
		});
		$("#indextabs").tabs("option", "active", tabToActivate);
	}
}

// create a question list item (li) and return it as a valid DOM element

function makeItem(val, ind, sm) {
	if (val) {
		val.loaded = 0;
		val.content = {};

		var mdis = val.marks;

		// remove legacy "marks" text
		mdis = mdis.replace(" marks", "");
		mdis = mdis.replace(" mark", "");

		var $li = "";

		$li =
			$li +
			'<div  class="listItem" data-id="' +
			val.qid +
			'" data-index="' +
			ind +
			'" data-file="' +
			val.fil +
			'" data-folder="' +
			val.fld +
			'" data-res="' +
			val.res +
			'">';
		$li =
			$li +
			'<div class="topic"><span class="indexIcon">' +
			getIcon(val) +
			"</span>" +
			val.ttext +
			"</div>";
		$li =
			$li +
			'<div class="des tittext"><span class="levelIcon">' +
			getLevelIcon(val) +
			"</span>" +
			val.des +
			"</div>";
		$li =
			$li +
			'<span class="removeQuestion"><i class="fa fa-trash-o delete-question" aria-hidden="true"></i></span>';

		if (sm != 0) {
			$li =
				$li +
				'<div class="marks"><i class="fa fa-clock-o flag-blue" aria-hidden="true"></i>' +
				val.time +
				"<br>";
			$li = $li + '<i class="fa fa-check flag-green" aria-hidden="true"></i>' + mdis + "<br>";

			// this is where the flag would go
			// $li = $li + '<i class="fa fa-flag flag-blue ' + val.qid + '" aria-hidden="true"></i></div>';
			$li = $li + "</div>";
			$li = $li + '<div class="question-id-display">' + val.qid + "</div>";
		}

		// create the item as a DOM element

		var newItem = document.createElement("li");
		newItem.setAttribute("class", "li_item " + val.qid);
		newItem.setAttribute("data-id", val.qid);
		newItem.setAttribute("data-index", ind);
		//newItem.setAttribute("data-path", val.path);

		newItem.innerHTML = $li;
		// this turned out to be faster than specifing each sub-node (div, etc) and it's easier.
		return newItem;
	} else {
		return false;
	}
}

// these 2 functions are for retrieving index specific icons for display in the questions
// called in makeItem just above

function getIcon(item) {
	if (item.index3) {
		var it = item.index3;
		try {
			var i = it.match(/\d+/)[0];
			var icon = iconLookup[typeIds[i]];
			if (icon) {
				return "<i class='fa " + icon.icon + " " + icon.css + "'></i>&nbsp;&nbsp;";
			}
		} catch (ev) {
			return "";
		}
	}

	return "";
}

function getLevelIcon(item) {
	if (hasLevels == 0) return "";

	// this is set to 1 if any index2 items have an icon directive

	if (item.index2) {
		var it = item.index2;
		try {
			var i = it.match(/\d+/)[0];
			var icon = levelLookup[levelIds[i]];
			if (icon) {
				return "<span class='" + icon.css + "'></span>&nbsp;&nbsp;";
			}
		} catch (ev) {
			return "";
		}
	}
	return "";
}

// add a multiple selection to the document by clickin the little plus icon
function addMultipleItems() {
	// get current list as an array
	var current = [];
	$("#listZero li").each(function () {
		current.push($(this).attr("data-id"));
	});

	// get the selected items
	var items = $("#cataloglist .selected").closest("li");

	if (items.length + current.length > maxQuestions) {
		vex.dialog.buttons.YES.text = "Ok";
		vex.dialog.alert(
			"Questions not added.<p>Adding the current selection would exceed the maximum allowed number of questions (" +
				maxQuestions +
				") in a single document for this subject.</p>"
		);
		return false;
	}

	$.each(items, function (x, y) {
		var qid = $(y).attr("data-id");
		// only add if it doesn't already exist
		if ($.inArray(qid, current) == -1) $("#listZero").append($(y).clone());
	});

	$("#listZero li").find(".removeQuestion").show();
	$("#docZero").find(".saved-sign").html("*");
	$(".listItem").removeClass("selected");
	$(".add-items").hide();

	updateDetails();
}

// this is for when the user holds the shift key down and clicks in the question list we
// select all the elements in between the highest and lowest index value of the selection.
// It copies normal list behavior typical in non-browser environments.

function shiftSelect() {
	var range = [];
	var items = $("#cataloglist .selected").closest("li");

	$.each(items, function (a, b) {
		range.push($(b).index());
		// array contains all selected items index values
	});

	var min = Math.min.apply(null, range);
	// get the smallest number in the array
	var max = Math.max.apply(null, range);
	// get the largest number in the array

	// loop through from min to max (inclusive) and add the select class
	for (var i = min; i < max + 1; i++) {
		$("#cataloglist li").eq(i).find(".listItem").addClass("selected");
	}
}

function fixResPath(path) {
	if (!path) return null; // path.match throws an error if this is undefined

	//check for mp3 template
	m = path.match(/([^\/]+)\/MP3\/([^.]+)/i);
	if (m != null) {
		return "https://app.doublestruck.eu/data/resource.php?s=" + m[1] + "&type=MP3&qid=" + m[2];
	}

	//check for old mp3 path
	m = path.match(/\/resources\/([^\/]+)\/([^\/]+)\/([^.]+).asp/i);
	if (m != null) {
		return "https://app.doublestruck.eu/data/resource.php?s=" + m[1] + "&type=" + m[2] + "&qid=" + m[3];
	}

	return path.replace(/\/resources\//i, resources_url);
}

function openManager(subject) {
	let path = "/osa/?pid=" + subject;
	// window.open(path, 'TeacherConsole');

	var a = document.createElement("a");
	a.setAttribute("href", path);
	a.setAttribute("target", "TeacherConsole");
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
}

function checkOsaStudents() {
	let hideStudentWarning = false;

	try {
		hideStudentWarning = localStorage.getItem("hideStudentWarning");
	} catch (e) {}

	if (
		studentcount == 0 &&
		isosa == 1 &&
		(hideStudentWarning == false || hideStudentWarning == null)
	) {
		get("tb5_application", "getManagers", "json", [], function (data) {
			if (data && data.length > 0) {
				let man = $("<table class='manager-table'>");
				$.each(data, function (a, b) {
					man.append(
						"<tr><td class='first-column'>" + b.name + "</td><td>" + b.emailaddress + "</td></tr>"
					);
				});
				$(".manager-list").html(man);

				// show message with data managers
			} else {
				$(".manager-list").html("No administrators have been nominated");
			}

			$("#docModal").show();
			$("#studentDataPopUp").fadeIn("fast");
		});
	}
}
function dontShowAgain() {
	if ($("#dontShow").is(":checked")) {
		localStorage.setItem("hideStudentWarning", true);
	} else {
		localStorage.setItem("hideStudentWarning", false);
	}
}
