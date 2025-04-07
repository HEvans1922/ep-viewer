var timerid;
var savedKey;
var currentName = "";
var workingDocs = 0;
var osaSavedMessage = "";
var osaNewMessage = "Save your document to see further options";

// keeps track of open documents. This is set manually after click events as after
// a click to close a document the document clicked is still counted if relying on observing the DOM
var printLinesChecked = true;
// captures the state of the Answer lines checkbox before it is automatically unchecked when the Question checkbox is unchecked

// empty document object
function documentObj() {}

documentObj.prototype.documentname = "";
documentObj.prototype.documentkey = "";
documentObj.prototype.questionlist = "";
documentObj.prototype.showM = 1;
documentObj.prototype.showE = 1;
documentObj.prototype.showN = 1;
documentObj.prototype.showR = 1;
documentObj.prototype.author = "";
documentObj.prototype.documentpassword = "";
documentObj.prototype.passopen = 0;
documentObj.prototype.passsave = 0;
documentObj.prototype.passdelete = 0;
documentObj.prototype.totaltime = 0;
documentObj.prototype.totalmarks = 0;

$(document).ready(function () {
	// open a ready made document
	$("#readyMades").on("click", ".openDocument", function () {
		log(launched_subject, "LOG", "Opened ready made");

		var doc = $(this).closest("tr").data("meta");
		openDocument(null, doc);
	});

	$(".close-docbox").on("click", function () {
		$(".no-border-box").hide();
		$("#docbox").fadeOut("fast");
		$("#docModal").hide();
	});

	$(".close-editbox").on("click", function () {
		$("#docModal").hide();
		$(".hide-until-saved").hide();
	});

	// google interaction step 2 button clicked
	$("#googleNext").on("click", function () {
		var gfilename = $("#googleName").val();
		if (gfilename == "") {
			vex.dialog.buttons.YES.text = "Ok";
			vex.dialog.buttons.NO.text = "Cancel";

			vex.dialog.alert("A document name is required");
			return false;
		}

		$("#p_return").val("word");
		var request = $("#printForm").serialize();

		var gsrc = web_root + "https://app.doublestruck.eu/data/export.php?" + request;
		gapi.savetodrive.render("googleStep2", {
			src: gsrc,
			filename: gfilename,
			sitename: "Testbase / Exampro",
		});

		$(".googleContainer").fadeIn("fast");
		$("#googleNext").fadeOut("fast");
		$(".googleText").show();
	});

	$(".close-google").on("click", function () {
		$("#googleNext").show();
		$(".googleText").hide();
		$("#googleName").val("");
		$("#googleStep2").empty();
	});

	// show the share document screen
	$(".show-share-option").on("click", function () {
		var documentkey = $("#editDocument").data("documentkey");
		if (documentkey) {
			setShareForm(documentkey);
		} else {
			vex.dialog.buttons.YES.text = "Ok";
			vex.dialog.buttons.NO.text = "Cancel";

			vex.dialog.alert("Please save your document first.");
		}
	});

	// THE SAVE BUTTON on the document SAVE form. This does a few things..

	$(".save-document").on("click", function () {
		var saveAs = $(this).hasClass("save-as");

		log(launched_subject, "LOG", "Saved a document");

		// require a document name
		if ($("#docName").val() == "") {
			vex.dialog.buttons.YES.text = "Ok";
			vex.dialog.buttons.NO.text = "Cancel";

			vex.dialog.alert("A document name is required");
			return false;
		}

		// check if there is a document key assigned to the dialog
		// if true then this has been saved before and is pre existing
		// if false, this is a new document

		var documentkey = $("#editDocument").data("documentkey");
		var docid = $("#editDocument").data("docid");
		var doc;

		if (saveAs) {
			documentkey = null;

			//  docid = null;
		}

		if (documentkey) {
			doc = getDocument(documentkey);
			// pre existing, get form data
		}
		if (!documentkey) {
			doc = new documentObj();
			// new, make from object
		}

		// if there is NO docid then this is from the edit list and not from an open document
		// we don't try and access any related questionlist, otherwise:

		if (docid) {
			var docState = getDocInfo(docid);
			// collect the state from the open doc pane
			doc.questionlist = docState.questionlist;
			doc.totaltime = parseInt(docState.time);
			doc.totalmarks = parseInt(docState.marks);

			// set the questionlist
		}

		// in any case, we get the name and author

		doc.documentname = $("#docName").val().escapeChars();

		if (currentName && saveAs) {
			if (currentName == doc.documentname) {
				doc.documentname = doc.documentname + " (copy)";
				$("#docName").val(doc.documentname);
				currentName = doc.documentname;
			}
		}

		// set the name
		doc.author = $("#docAuthor").val().escapeChars();
		// set the author

		// if it previosly exists, update here
		if (documentkey) {
			setDocument(doc, documentkey, docid);
			// this actually saves it (existing)
		}

		// other wise update here, passing null as the documentkey
		else {
			setDocument(doc, null, docid);
			// this actually saves it (new)
		}

		$("#" + docid)
			.find(".saved-sign")
			.html("&nbsp;");
		return true;
	});

	$("#OSAV-Checkboxes").on("change", "input", function() { 

		var documentkey = $("#editDocument").data("documentkey");
		if (documentkey) {
			saveShareForm(documentkey);
		}

		if($("#viewerR").is(":checked")) {
			$(".osa-viewer-contain").css("opacity","1");
			//$(".osa-viewer-contain").css("background-color","rgba(255,255,255,1)");
		}
		else { 
			//$(".osa-viewer-contain").css("background-color","rgba(255,255,255,0.4)");
			$(".osa-viewer-contain").css("opacity",".4");
		}			


	});

	$(".close-no-border-box").on("click", function () {
		$(this).closest(".no-border-box").fadeOut("fast");
	});

	$("#doctabs").tabs();

	//========== listeners for the DOCUMENT LIST ====================

	$("#doclist").on("click", ".doc-icon", function (ev) {
		$(".no-border-box").hide();

		var documentkey = $(this).closest("tr").attr("id");
		var type = $(this).attr("data-type");

		var openDocs = getOpenDocs();

		if ($.inArray(documentkey, openDocs) > -1) {
			vex.dialog.buttons.YES.text = "OK";
			vex.dialog.alert("This document is already open and cannot be re-opened or edited here.");
			vex.dialog.buttons.YES.text = "Yes";
			return false;
		}

		switch (type) {
			case "edit":
				// set this as the document context is different than when called from
				// an open document, and we need to know where we called from

				$("#editDocument").data("calledfrom", "list");

				$(".save-as").hide();

				$("#editDocument").data("documentkey", documentkey);
				$("#editDocument").data("docid", null);

				setEditForm(documentkey);
				break;

			case "delete":
				deleteDocument(documentkey);

				break;

			case "open":
				openDocument(documentkey, $(this).closest("tr"));
				log(launched_subject, "LOG", "Opened a document");
				break;

			case "share":
				setShareForm(documentkey, $(this).closest("tr"));

			default:
				return;
		}
	});

	//====== TOGGLE THE COVER PAGE =========

	$("#printC").on("change", function () {
		if ($("#printC").is(":checked")) {
			$("#coverPagePane").show();
		} else {
			$("#coverPagePane").hide();
		}
	});

	// The PDF, WORD and GOOGLE buttons to export

	$(".printButton").on("click", function () {
		var documentid = $("#editDocument").data("docid");
		var action = $(this).attr("data-action");

		if (action) {
			$("#printDocument").data("currentDoc", documentid);
			$("#printDocument").data("printType", action);
			$(".print-type").html(action.toUpperCase());
			$("#printDocument").fadeIn("fast");

			// this is the red "Word messes up pagination" warning, only show if
			// output type is word.

			if (action == "word") {
				$(".word-warning").show();
			} else {
				$(".word-warning").hide();
			}

			/*if (action == "google") {
				//get export URL and pass to drive API popup

			}*/
		}
	});

	$(".osa-print-button").on("click", function () {
		var documentid = $("#editDocument").data("docid");
		let documentkey = $("#" + documentid).data("documentkey");
		var action = $(this).attr("data-action");
	});

	// The actual print button after selecting PDF, Word or Google

	$(".send-print").on("click", function () {
		var documentid = $("#printDocument").data("currentDoc");
		var action = $("#printDocument").data("printType");
		doPrint(documentid, action);
	});

	// save the share settings
	$(".save-share-settings").on("click", function () {
		var key = $("#shareDocument").data("current");
		saveShareForm(key);
		$("#shareDocument").fadeOut("fast");
	});

	$("#printQ").click(function () {
		if (!$(this).is(":checked")) {
			$("#compact-questions-radio").hide();
		} else {
			$("#compact-questions-radio").show();
		}
	});
});

// function to find a free slot on the screen for a new doc
// assumes that new docs are created sized 290h x 280w.

function getFreePosition() {
	// possible new doc-positions : [left, top, height, width]
	// we will try each of these until we find a free one

	var pos = [
		[462, 155, 290, 280],
		[762, 155, 290, 280],
		[1062, 155, 290, 280],
		[462, 455, 290, 280],
		[762, 455, 290, 280],
		[1062, 455, 290, 280],
		[462, 755, 290, 280],
		[762, 755, 290, 280],
		[1062, 755, 290, 280],
	];

	for (i = 0; i < pos.length; i++) {
		var thispos = 0;

		// check each existing doc's location against the coodinates
		$(".document").each(function () {
			var l1 = pos[i][0]; //left
			var t1 = pos[i][1]; //top
			var h1 = pos[i][2]; //height
			var w1 = pos[i][3]; //width
			var b1 = t1 + h1;
			var r1 = l1 + w1;
			var l2 = $(this).position().left;
			var t2 = $(this).position().top;
			var h2 = $(this).height();
			var w2 = $(this).width();
			var b2 = t2 + h2;
			var r2 = l2 + w2;

			// check if the bottom below the top  or
			// the top below the bottom or
			// the right edge to the left  or
			// the left edge to the right

			if (b1 < t2 || t1 > b2 || r1 < l2 || l1 > r2) {
				thispos++; // no collision - increment the number of successes
			}
		});

		// if the number of successful non-collision elements (thispos) = number of doc elements
		// then none of the documents collide with these coordinates: return the coordinates

		if (thispos == $(".document").length) return pos[i];
	}
}

function createDocument() {
	// allow a total of 4 open documents
	if ($(".docadded").length > 3) {
		vex.dialog.buttons.YES.text = "Ok";
		vex.dialog.alert(
			"A maximum of 5 opened documents is allowed. Please close a document to open another."
		);
		return false;
	}

	// get coordinates not in use by an open document
	var newDocCoordinates = getFreePosition();

	// show an error if the desktop is too cluttered
	if (!newDocCoordinates) {
		vex.dialog.buttons.YES.text = "Ok";
		vex.dialog.alert(
			"There is no free space for an additional window. Please resize or close one or more windows to free up some space."
		);
		return false;
	}

	var id = makeID();
	// get a pseudo random ID for the doc
	var list_id = makeID();
	// again, for the list

	var cnt = $(".document").length + 1;
	// number of documents on the screen + 1
	var doctitle = "New Document " + cnt;
	// set title with incrementing doc number

	// build the HTML for the new doc

	var newDoc = '<div class="document shadow roundedBox docadded" id="' + id + '">';
	newDoc +=
		'<div class="moveheader movecursor"><span class="saved-sign">&nbsp;</span><div class="docTitle">' +
		doctitle +
		"</div>";

	newDoc +=
		'<div class="add-menu-bar"><a href="#" class="menuitem" data-type="docClose" title="Close"><i class="fa fa-times-circle" aria-hidden="true"></i></a></div>';
	newDoc +=
		'<div class="add-menu-bar"><a href="#" class="menuitem" data-type="docHide" title="Minimise"><i class="fa fa-minus-circle" aria-hidden="true"></i></a></div>';
	newDoc +=
		'<div class="add-menu-bar margin-top-1 external-icon"><a href="#" class="menuitem" data-type="docSave" title="Export File"><i class="fa fa-external-link" aria-hidden="true"></i></a></div>';

	newDoc += "</div>";
	newDoc +=
		'<div class="listInstructions">Drag questions from the Question list or from other documents and drop them here</div>';
	newDoc += '<div class="fixme"><ul class="doclist dynamiclist" id="' + list_id + '"></ul></div>';
	newDoc += '<div class="listFooter"></div></div>';

	newDoc = $(newDoc);

	// make it come to front when displayed
	$(newDoc).css("z-index", currentZ++);

	// add it
	$("body").append(newDoc);

	$("#" + id).css("top", newDocCoordinates[1] + "px");
	$("#" + id).css("left", newDocCoordinates[0] + "px");

	$("#" + id).css("height", "290px");
	$("#" + id).css("width", "280px");

	// show it
	$("#" + id).fadeIn();

	// reset document screen listeners
	makeMovable();
	setupMenus();
	updateDetails();

	// setup return object with doc details
	// when we use the open function(s) use this for isolating the created doc after creating it on screen
	var doc = {};
	doc.id = id;
	doc.listid = list_id;
	// doc.menuid = menu_id;
	return doc;
}

// listener for menu classes - reinitialised with each created document
// this is print, save, share, etc

function setupMenus() {
	$(".menuitem").unbind("click");
	// remove the listener before (re)adding so we don't add it multiple times
	$(".menuitem").on("click", function (ev) {
		ev.preventDefault();
		var docid = $(this).closest(".document").attr("id");
		var doc = getDocInfo(docid);

		var docname = doc.title;
		var button = $(this).attr("data-type");

		if (button == "docHide") {
			hideDocument(docid, docname);
			return false;
		}

		if (button == "docSave") {
			if (doc.questions.length == 0) {
				vex.dialog.buttons.YES.text = "Ok";
				vex.dialog.alert("Please add at least one question before printing, sharing or saving");
				return false;
			}

			// setup the cover sheet form with all the data we've got from the retrieved DOC

			$("#pformTitle").val(doc.title);
			$("#pformTime").val(doc.time + " minutes");
			$("#pformMarks").val(doc.marks + " marks");

			// set this as the document context is different and we need to know where we called from
			$("#editDocument").data("calledfrom", "document");

			$(".save-as").show();
			$(".listItem").removeClass("selected");

			// this was opened or saved before as the key is here
			if ($("#" + docid).data("documentkey")) {
				var documentkey = $("#" + docid).data("documentkey");

				// set these so the save / print screen knows about it
				$("#editDocument").data("documentkey", documentkey);
				$("#editDocument").data("docid", docid);

				setEditForm(documentkey);
				return true;
			}

			// if no document, this is a new compilation, show the empty save form
			else {
				setSaveNewForm(docid);
				return true;
			}
		}

		// close a document - check if unsaved, etc.
		// any doc OTHER than the default document will be closed and removed, the default document stays
		// and is cleared when "closed".

		if (button == "docClose") {
			if (
				$("#" + docid)
					.find(".saved-sign")
					.html() == "*"
			) {
				vex.dialog.buttons.YES.text = "Yes";
				vex.dialog.buttons.NO.text = "Cancel";

				vex.dialog.confirm({
					overlayClosesOnClick: false,
					message: "This document has unsaved changes. Are you sure you wish to close?",
					callback: function (data) {
						if (data) {
							if (docid == "docZero") {
								resetDocument(docid);
							} else {
								$("#" + docid)
									.fadeOut()
									.remove();
								workingDocs--;
								setQuestionsStatus();
							}
						}
					},
				});
			}

			// here the different treatment for docZero, (the default document)
			else {
				if (docid == "docZero") {
					resetDocument(docid);
				} else {
					$("#" + docid)
						.fadeOut()
						.remove();
					workingDocs--;
					setQuestionsStatus();
				}
			}
			return true;
		}
	});
}

// clear a document and make it "new"
function resetDocument(docid) {
	var doc = $("#" + docid);

	doc.find("ul").empty();
	doc.data("documentkey", null);
	doc.find(".docTitle").html("New Document 1");
	doc.find(".saved-sign").html("&nbsp;");
	updateDetails();
}

// hide the doc and show an icon on the sidebar (minimize) It's called sidebar as it used to be on the side.
// it's now actually on the toolbar to the right of the HELP toolbar icon.

function hideDocument(docid, docname) {
	log(launched_subject, "LOG", "Minimised document");

	var doc = $("#" + docid);

	doc.css("height", doc.height()).css("bottom", "auto");

	// create sidebar icon
	var min = $(
		'<div class="sidebardoc" style="display:none;" data-docid="' +
			docid +
			'" title="' +
			docname +
			'"><i class="fa fa-file-text" aria-hidden="true"></i></div>'
	);
	//$("#" + docid).fadeOut();

	// Check if the sidebar already contains any minimised documents
	if ($("#sidebar .sidebardoc").length === 0) {
		// If this is the first minimised document, add the "Open files" text
		$("#sidebar").append('<p class="sidebar-text">Open files</p>');
	}

	// record the original position and save it in the document's data object
	// this is so we can put it back where it used to be when we restore.

	doc.data("pos", doc.offset());
	doc.fadeOut({
		queue: false,
		duration: "fast",
	});

	// have it "swoosh" upwards to the bar
	// when minimising while fading out.

	doc.animate(
		{
			top: "100px",
			left: "370px",
		},
		"fast"
	);

	// add it to the sidebar
	$("#sidebar").append(min);
	min.fadeIn();

	// Remove "open files" if no minimised docuemtns docs
	$("#sidebar").on("click", ".sidebardoc", function() {
		$(this).remove(); 
		if ($("#sidebar .sidebardoc").length === 0) {
			$("#sidebar .sidebar-text").remove(); // Remove "Open files" text
		}
	});

}

// center an object on the screen
// used exclusively for new documents but made it generic just because.

function setCenter(id) {
	$("#" + id).css("top", parseInt($(document).height() * 0.5) - 150 + "px");
	$("#" + id).css("left", parseInt($(document).width() * 0.5) - 172 + "px");
	$("#" + id).css("height", "300px");
	$("#" + id).css("width", "355px");
}

// return an object with document info as per the DOM object
// important - this isn't querying the document store, but rather the interface document on the screen and
// will include any transient, not yet saved characteristics.

function getDocInfo(docid) {
	var doc = {};
	var list = $("#" + docid).find(".li_item");
	var qarray = [];
	var indexarray = [];

	$.each(list, function (a, b) {
		qarray.push($(this).attr("data-id"));
		indexarray.push($(this).attr("data-index"));
	});

	doc.title = $.trim(
		$("#" + docid)
			.find(".docTitle")
			.html()
	);
	doc.questions = qarray;
	doc.questionlist = qarray.join(",");
	doc.qcount = qarray.length;
	doc.dbindex = indexarray;
	doc.changed = false;

	var sign = $("#" + docid)
		.find(".saved-sign")
		.html();
	if (sign == "*") {
		doc.changed = true;
	}

	var marks = 0;
	var time = 0;

	$.each(doc.dbindex, function (x, y) {
		if (itemDatabase[y].marks) marks = marks + parseInt(itemDatabase[y].marks);
		if (itemDatabase[y].time) time = time + parseInt(itemDatabase[y].time);
	});

	doc.time = time;
	doc.marks = marks;

	doc.documentkey = $("#" + docid).data("documentkey");

	return doc;
}

// calls the makeVisible function (in utility.js)
// to make loosing windows harder

function fixHidden() {
	// manually call for the question catalog
	makeVisible("catalog");

	// call for every not-minimised document
	$(".document:visible").each(function (x, y) {
		makeVisible(y.id);
	});

	if ($("#searchbox").is(":visible") == true) {
		makeVisible("searchbox");
	}
}

// update the document footers with the correct
// question count, number of marks and total time

function updateDetails() {
	$(".document").each(function (a, b) {
		var details = getDocInfo(b.id);
		var marks = 0;
		var time = 0;
		var cnt = details.qcount;

		$.each(details.dbindex, function (x, y) {
			marks = marks + parseInt(itemDatabase[y].marks);
			time = time + parseInt(itemDatabase[y].time);
		});

		var display =
			"<div class='docDetails'>Count: <b>" +
			cnt +
			"</b>,&nbsp;Marks: <b>" +
			marks +
			"</b>,&nbsp;Time: <b>" +
			time +
			"</b></div>";
		$("#" + b.id)
			.find(".listFooter")
			.html(display);

		$(".question-id-display").toggle(showQIDs);
	});

	workingDocs = getOpenDocs().length;
	setQuestionsStatus();
	// updates disabled/enabled questions when new documents are opened and questions are added or deleted
}

// make the user document list
// uses makeDoclistItem below.

function buildDocList() {
	$("#doclist").empty();

	var row = "";
	if (documents) {
		for (var i = 0; i < documents.length; i++) {
			var doc = documents[i];
			row = makeDoclistItem(doc);
			$("#doclist").append(row);
		}

		$("#documentTable").tablesorter();
		//$('#documentTable').trigger("update");
	}
}

// create and return a document list item
function makeDoclistItem(doc) {
	var row = "";
	row = row + "<tr id='" + doc.documentkey + "' class='documentItem'>";
	row =
		row +
		"<td class='col1'><i class='fa fa-folder-open-o openDocument doc-icon'  aria-hidden='true' data-type='open'></i></td>";

	if (isosa == "0")
		row =
			row +
			"<td class='col1b'><i class='fa fa-tablet openViewer doc-icon' aria-hidden='true' data-type='share'></i></td>";

	row = row + "<td class='col2'><span class='docname'>" + doc.documentname + "</span></td>";
	row = row + "<td class='col3'>" + doc.datesaved + "</td>";
	row = row + "<td class='col4'>" + doc.author + "</td>";
	row = row + "<td class='col5'>" + doc.questioncount + "</td>";

	if (isosa == "0")
		row =
			row +
			"<td class='col6'><i class='fa fa-pencil-square-o editDocument doc-icon'  aria-hidden='true' data-type='edit'></i></td>";

	row =
		row +
		"<td class='col7'><i class='fa fa-times deleteDocument doc-icon'  aria-hidden='true' data-type='delete'></i></td></tr>";
	return row;
}

// make the ready made doclist
function buildReadyMadeDocList(data) {
	$("#readyMades").empty();

	var row = "";
	if (data) {
		var head = "";

		for (var i = 0; i < data.length; i++) {
			var doc = data[i];
			var row;

			if (trimString(head) != trimString(doc.author)) {
				row = $(makeReadyMadeListHeader(doc));
				$("#readyMades").append(row);
			}

			head = doc.author;

			row = $(makeReadyMadeListItem(doc));
			row.data("meta", doc);
			$("#readyMades").append(row);
		}
	}
}

// create and return a ready made document list item
function makeReadyMadeListItem(doc) {
	var row = "";
	row = row + "<tr id='" + doc.documentkey + "' class='documentItem'>";
	row =
		row +
		"<td class='col1'><i class='fa fa-folder-open-o openDocument doc-icon'  aria-hidden='true' data-type='open'></i></td>";
	row = row + "<td class='col4'><span class='docname'>" + doc.documentname + "</span></td>";
	row = row + "<td class='col6'>" + doc.questioncount + "</td></tr>";
	return row;
}

function makeReadyMadeListHeader(doc) {
	var row = "<tr><td colspan='4' class='ready-header'>" + doc.author + "</td></tr>";
	return row;
}

//=============================
//These functions are for getting, saving and deleting the documents
//Documents are managed in the central array "documents". This array contains document objects and is initally populated when the product is launched.
//A new document can be created by calling var foo = new documentObj();
//Saving is done via setDocument(). This updates the local documents aray as well as saving to server.
//retrieving uses getDocument(). This retrieval is from the local documents array using the documentkey.
//The rest of the functions are to facilitate the interface as there are different contexts from which to save
//i.e. New document, New but previously saved, opened from doc list, edit button (name and author) and update Sharing all cause a
//document to be saved but require different interface considerations. setDocument() is however the ONLY place to send the object to the server AND to update the local documents data.
//=============================

// prepare the edit form when the user clicks the EDIT button in the document list

function setEditForm(key) {
	// documentkey and DOM ID of the document, if any
	// if KEY exists, this is editing an existing DOC
	if (key) var data = getDocument(key);

	if (data) {
		$("#docModal").show();
		$("#docName").val(data.documentname);
		$("#docAuthor").val(data.author);
		$("#editDocument").fadeIn("fast");

		if (isosa == "0") {
			var viewer = makeViewerURL(data.docid);
			$("#viewerQrCode").empty();
			let qrImage = `<img src="https://app.doublestruck.eu/data/makeQR.php?url=${viewer}&size=5"/>`;
			$("#viewerQrCode").append(qrImage);

			$("#qrFullScreen").attr("href", "https://app.doublestruck.eu/data/makeQR.php?url=" + viewer+ "&size=23");

			$(".share-url").html("<a href='" + viewer + "' target='_blank'>" + viewer + "</a>");
		} else {
			
			$(".osa-export-header").html(osaSavedMessage);
			$(".hide-until-saved").show();
			$(".osa-print-options-container").show();
			var osaviewer = makeOSAViewerURL(data.docid);
			$(".osa-viewer-link").html("<a href='" + osaviewer + "' target='_blank'>" + osaviewer + "</a>");
			$(".osa-viewer-qr").empty();
			let qrImage = `<img src="https://app.doublestruck.eu/data/makeQR.php?url=${osaviewer}&size=5"/>`;
			$(".osa-viewer-qr").html(qrImage);
			$("#qrFullScreenOsa").attr("href", "https://app.doublestruck.eu/data/makeQR.php?url=" + osaviewer+ "&size=23");

			setupOsaButtons(data);
			var documentkey = $("#editDocument").data("documentkey");
			if(key) setShareForm(key);
		}

		currentName = data.documentname;
	}
}

// prepare the edit form when the user clicks SAVE on the document and the document has NEVER been saved (NEW)
function setSaveNewForm(docid) {
	$("#docModal").show();
	$("#editDocument").data("documentkey", null);
	$("#editDocument").data("docid", docid);
	$("#docName").val("");
	$("#docAuthor").val("");
	$("#docPassword").val("");
	$(".passwordCheckbox").prop("checked", false);
	$("#docName").focus();
	$("#editDocument").fadeIn("fast");
	$(".share-url").html("Save your document to generate the URL");
	$("#viewerQrCode").empty();

	if (isosa == "1") {
		$(".osa-export-header").html(osaNewMessage);
		$(".hide-until-saved").show();
		$(".osa-print-options-container").hide();
	}

	currentName = null;
}

// setup the SHARE form in the documentlist when clicked
function setShareForm(key) {
	var data = getDocument(key);

	if (data) {
		// set the data attribute of the document clicked on
		$("#shareDocument").data("current", key);

		$(".viewer-checkbox").prop("checked", false);
		var viewer = makeViewerURL(data.docid);
		$(".share-url").html("<a href='" + viewer + "' target='_blank'>" + viewer + "</a>");

	if(isosa == 0) {
		$("#shareDocument").fadeIn("fast");
	}

	// check the related boxes
		$("#viewerM").prop("checked", data.showM);
		$("#viewerE").prop("checked", data.showE);
		$("#viewerN").prop("checked", data.showN);
		$("#viewerR").prop("checked", data.showR);

		if(isosa == 1) {
			var osaviewer = makeOSAViewerURL(data.docid);
			$(".osa-viewer-link").html("<a href='" + osaviewer + "' target='_blank'>" + osaviewer + "</a>");
			if(data.showR == 0) {
					$(".osa-viewer-contain").css("opacity",".4");
			}
			else { 
				$(".osa-viewer-contain").css("opacity","1");
			}					
	    }



  }

}

// collect data from the share form and update the document
function saveShareForm(key) {
	var data = getDocument(key);
	data.showM = boolToInt($("#viewerM").prop("checked"));
	data.showN = boolToInt($("#viewerN").prop("checked"));
	data.showE = boolToInt($("#viewerE").prop("checked"));
	data.showR = boolToInt($("#viewerR").prop("checked"));
	setDocument(data, key, null);
}

// retrieve a selected document from the documents array by documentkey
function getDocument(key) {
	for (var i = 0; i < documents.length; i++) {
		if (documents[i].documentkey == key) {
			return documents[i];
		}
	}
	return false;
}

// Anything that saves a document calls this. It's the only place to save a document to the server.
// if there is a documentkey passed, then this document existed before,
// if not, then we expect a docid which is the DOM id of the container so we can retrieve the details for the newly created document
// data is the document data to be saved, regardless of where it came from. (new or existing)

function setDocument(data, key, docid) {
	currentName = data.documentname;

	data.productkey = launched_subject_key;
	post(
		"tb5_application",
		"saveDocument",
		"json",
		[data],
		function (saved) {
			// this is an existing doc
			if (key) {
				for (var i = 0; i < documents.length; i++) {
					if (documents[i].documentkey == saved.documentkey) {
						// if the saved key = document list key..
						documents[i] = saved;
						// update documents array with the new saved values - this is in case they have a table sort, it updates in place
						$("#" + docid)
							.find(".docTitle")
							.html(saved.documentname);
						// set name title from saved result
						showSavedIndicator();
						updateDocList();

						// update display from the data
					}
				}

				$("#editDocument").data("documentkey", key);
				setupOsaButtons(saved);
				return;
			} else {
				// saved as a new DOC
				if (saved.documentkey) {
					$("#" + docid)
						.find(".docTitle")
						.html(saved.documentname);
					// set name from saved result
					$("#" + docid).data("documentkey", saved.documentkey);
					//set doc key
					documents.unshift(saved);
					// add to local documents array
					$("#doclist").prepend(makeDoclistItem(saved));
					// add to the doc list
					var viewer = makeViewerURL(saved.docid);
					$(".share-url").html("<a href='" + viewer + "' target='_blank'>" + viewer + "</a>");

					$("#viewerQrCode").empty();

					let qrImage = `<img src="https://app.doublestruck.eu/data/makeQR.php?url=${viewer}&size=5"/>`;
					$("#viewerQrCode").append(qrImage);

					$("#qrFullScreen").attr("href", "https://app.doublestruck.eu/data/makeQR.php?u=" + viewer + "&size=23");

					$("#editDocument").data("documentkey", saved.documentkey);
					// setup the data on the doc pane


					if(isosa == 1) {
						let qrImage = `<img src="https://app.doublestruck.eu/data/makeQR.php?url=${viewer}&size=5"/>`;
						var osaviewer = makeOSAViewerURL(saved.docid);
						$(".osa-viewer-link").html("<a href='" + osaviewer + "' target='_blank'>" + osaviewer + "</a>");
						$(".osa-viewer-qr").html(qrImage);
						$("#qrFullScreenOsa").attr("href", "https://app.doublestruck.eu/data/makeQR.php?url=" + osaviewer+ "&size=23");
					}

					updateDocList();
					showSavedIndicator();
					setupOsaButtons(saved);

					// update the display from the data
					//$("#editDocument").data("documentkey",key);

					return;
				}
				//else {

				// If we get anything other than a document object back, we throw an error.
				// IF the session has expired, the ajax handler would have sent them back to the login page already and they won't see this
				// so this would only show if something went gravely wrong.

				vex.dialog.buttons.YES.text = "Ok";
				vex.dialog.alert(
					"We are sorry, however an error occurred when saving. Please check your entries and try again."
				);
				return false;
				//}
			}
		},
		true
	);
}

// this deletes a document.
function deleteDocument(key) {
	vex.dialog.buttons.YES.text = "Yes";
	vex.dialog.buttons.NO.text = "Cancel";
	vex.dialog.confirm({
		message: "Are you sure you wish to permanently delete this document?",
		callback: function (value) {
			if (value) {
				log(launched_subject, "LOG", "Deleted a document"); //log iff "yes"
				get("tb5_application", "deleteDocument", "json", [key], function (k) {
					$("#" + k).remove();
				});
			}
		},
	});
}

function openDocument(documentkey, docobj) {
	//if the default doc (docZero, default lower left block on the screen) is empty, we use it when we open a new document.
	// otherwise we create a new floating doc and populate that.

	if ($("#docZero").length > 0 && $("#listZero li").length == 0) {
		var newdoc = {};
		// simulate the newdoc created when a noew document is invoked
		newdoc.id = "docZero";
		newdoc.listid = "listZero";
		$("#docZero").show();
	} else {
		// .. otherwise create a new doc and use the real newdoc meta data on return
		var newdoc = createDocument();
		// newdoc contains the id of the new doc, the listid in that doc and the menuid
	}
	var rm = 0;

	if (documentkey) {
		var doc = getDocument(documentkey);
		// get the document object
	} else {
		var doc = docobj;
		rm = 1;
	}

	var doclist = doc.questionlist;
	var doclist = doclist.split(".").join("");
	// remove the dots from the list

	var docitems = doclist.split(",");
	// the question IDs in the document as an array
	var fragment = document.createDocumentFragment();
	// new document fragment to add the questions to

	// we loop through all the questions once and add meta data for the ones that match our document
	for (var i = 0; i < itemDatabase.length; i++) {
		// loop the question database

		var item = itemDatabase[i];

		var qid = item.qid;
		qid = qid.split(".").join("");
		// remove the dots to deal with legacy data (with and without dots)

		var order = $.inArray(qid, docitems);
		// get the position of the matched element in OUR document (if any)

		if (order > -1) {
			// if the item questionID in the database is in our document
			var d = {};
			// build an object with the item and the database index (need this when creating the items in the doc)
			d.item = item;
			d.index = i;
			docitems[order] = d;
			// update the value in the docitems using the "order" position
		}
	}

	for (var i = 0; i < docitems.length; i++) {
		// once we've got our document items, add them to the DOM fragment

		var domItem = makeItem(docitems[i].item, docitems[i].index, 1);
		if (domItem) fragment.appendChild(domItem);
	}

	var clist = document.getElementById(newdoc.listid);
	// get the new list in the new document
	clist.appendChild(fragment);
	// append all our questions to it

	$("#" + newdoc.id)
		.find(".docTitle")
		.html(doc.documentname);
	// update the document name

	if (rm == 0) {
		// === Important ===========================================     // this is the indicator of  A. if the documnent has been saved before and B. which document it is
		$("#" + newdoc.id).data("documentkey", doc.documentkey);
		// attach the documentkey to the doc container using the DOM element's data object
		// =========================================================
	}

	if (rm == 1) {
		$("#" + newdoc.id)
			.find(".saved-sign")
			.html("*");
		// unsaved
		$("#" + newdoc.id)
			.find(".docTitle")
			.html(doc.documentname + " (import)");
		// update the document name
	}

	$("#" + newdoc.id)
		.find(".removeQuestion")
		.show();

	$(".close-docbox").click();
	// close the document box (click here as we deal with a few other things as well)
	updateDetails();
	// update the summary data in the document footers
	return true;
}

// updates the table form the document object
function updateDocList() {
	for (var i = 0; i < documents.length; i++) {
		var doc = documents[i];
		documentkey = doc.documentkey;
		$("#" + documentkey).replaceWith(makeDoclistItem(doc));
	}

	//   $('#documentTable').tablesorter();
	$("#documentTable").trigger("update");
}

// This is the print stuff ====================== PRINT =====

function doPrint(documentid, action) {
	var calledfrom = $("#editDocument").data("calledfrom");
	var documentkey = $("#editDocument").data("documentkey");

	// if calledfrom = list, then get the doc from the doc object only
	// if calledfrom = document then get the doc from the pane identified with docid

	// setup some things about the document we want to print
	// we have to get this from the DOM object as printing is allowed without having saved anything,
	// so the doc to be printed is not necessarily in the local documents array.

	if (calledfrom == "document") {
		var doclist = $("#" + documentid).find(".doclist .listItem");
		var docname = trimString(
			$("#" + documentid)
				.find(".docTitle")
				.html()
				.escapeChars()
		);

		//.escapeChars();

		var questionlist = [];
		var folderlist = [];

		$.each(doclist, function (x, y) {
			questionlist.push($(y).attr("data-file"));
			folderlist.push($(y).attr("data-folder"));

			// make the question and folder lists from the DOM UL
		});

		$("#p_folderlist").val(folderlist.join(","));
		$("#p_questionlist").val(questionlist.join(",")); // this is the filename, not always the qid
	}

	if (calledfrom == "list") {
		var doc = getDocument(documentkey);
		// ================================================================================

		var doclist = getFilesFromDocs(doc.questionlist); // returns array
		var docname = doc.documentname.escapeChars();

		var qlist = doc.questionlist;

		$("#p_folderlist").val(getFolderList(qlist.split(",")));
		$("#p_questionlist").val(doclist);
	}

	var returntype = "";

	$(".printCheckbox:checked").each(function (a, b) {
		returntype += b.value;
		// get the return attributes Q, M, E, N
	});

	$("#p_types").val(returntype);
	$("#p_title").val($("#pformTitle").val());
	$("#p_subtitle").val($("#pformSubtitle").val());
	$("#p_time").val($("#pformTime").val());
	$("#p_marks").val($("#pformMarks").val());
	$("#p_comments").val($("#pformComments").val());
	$("#p_showcover").val(boolToInt($("#printC").is(":checked")));
	$("#p_filename").val(docname);
	$("#p_lines").val($("#answer-lines-on").is(":checked"));

	// setup some things to control the bahaviour of the download depending on what they selected.

	switch (action) {
		case "browser":
			$("#printForm").attr("target", "_blank");
			$("#printForm").attr("action", "https://app.doublestruck.eu/data/printpreview.php");
			$("#p_return").val($("browser"));
			$("#printForm").submit();
			break;

		case "pdf":
			log(launched_subject, "LOG", "Printed PDF");

			$("#printForm").attr("target", "printTarget");
			$("#printForm").attr("action", "https://app.doublestruck.eu/data/export.php");
			$("#p_return").val("pdf");
			printIndicator();
			$("#printForm").submit();
			break;

		case "word":
			log(launched_subject, "LOG", "Printed word");

			$("#printForm").attr("target", "printTarget");
			$("#printForm").attr("action", "https://app.doublestruck.eu/data/export.php");
			$("#p_return").val("word");
			printIndicator();
			$("#printForm").submit();
			break;

		case "google":
			log(launched_subject, "LOG", "Printed Google");
			
			// SAVE TO DRIVE METHOD
			// Google Save To Drive widget - comment out to switch to API
			$("#googleExport").fadeIn("fast");
			$("#printDocument").hide();

			// Custom integration using Drive API - uncomment the below and comment out widget code to use this
			//open popup with save to drive dialog, passing the src url
			/*$("#p_return").val("word");
			var request = $("#printForm").serialize();
			var gsrc = btoa("https://app.doublestruck.eu/data/export.php?" + request);
			driveWindow = window.open(web_root + 'savetodrive.php?theme=' + launched_brand + '&s=' + encodeURIComponent(gsrc), 'DriveWindow', 'height=700,width=500');*/

			break;

		default:
			alert("Under construction");
			break;
	}
}

// the whole cookeie-timer thing is because the browser can't really
// track the download or know if it completes
// We set a cookie at begin and the download processor updates it when it returns the print payload which causes the timer to stop and hides the wait indicator

function printIndicator() {
	try {
		$.cookie("ptime", "A", {
			path: "https://app.doublestruck.eu/",/* CHANGE IF SOMETHING GOES WACKY! */
		});
		$("#printSpinner").show();
		timerid = setInterval(checkCookie, 1000);
	} catch (e) {
		$("#printSpinner").hide();
		clearInterval(timerid);
	}
}

function checkCookie() {
	if ($.cookie("ptime") == "finished") {
		$("#printSpinner").hide();
		clearInterval(timerid);
		// close the print window when finished
		$("#docModal").hide();
		$("#printDocument").fadeOut("fast");
		$("#editDocument").fadeOut("fast");
	}
}

function getOpenDocs() {
	var openDocs = [];
	var docs = $(".document");
	$.each(docs, function (a, b) {
		openDocs.push($(b).data("documentkey"));
	});
	$(".document").tooltip({
		tooltipClass: "custom-tooltip",
		show: {
			delay: 350,
		},
	});
	return openDocs;
}

function showSavedIndicator() {
	$(".save-indicator").show().delay(1800).fadeOut(200);

	if (isosa == "1") {
		$(".osa-print-options-container").fadeIn("fast");
		$(".osa-export-header").html(osaSavedMessage);
		$(".hide-until-saved").show();
	}
}

function setQuestionsStatus() {
	var usedQuestions = [];
	//  array to contain data-id's of all questions in open documents

	$(".document").each(function () {
		// loop through each document and populate usedQuestions array
		$(this)
			.find(".li_item")
			.each(function () {
				usedQuestions.push($(this).attr("data-id"));
			});
	});

	var usedQuestionCounts = {};
	// object to contain each question id as a key and it's number of occurances in usedQuestions array as a value

	for (var question in usedQuestions) {
		// loop through usedQuestions array and populate usedQuestionCounts
		var quest = usedQuestions[question];
		usedQuestionCounts[quest] ? usedQuestionCounts[quest]++ : (usedQuestionCounts[quest] = 1);
	}

	$("#catalog li").each(function () {
		var id = $(this).attr("data-id");
		var enabled = { opacity: 1, userSelect: "default" };
		var disabled = { opacity: 0.3, userSelect: "none" };

		if (usedQuestionCounts.hasOwnProperty(id) && usedQuestionCounts[id] === workingDocs) {
			$("#catalog li[data-id='" + id + "']")
				.css(disabled)
				.draggable("disable");
		} else {
			$("#catalog li[data-id='" + id + "']")
				.css(enabled)
				.draggable("enable");
		}
	});
	// loop through each catelog question and if it is present in all the open docs, disable it, else enable it
}

// create a list of folders 1:1 with the list of questions
// this is so the print function "knows" where each question is to be retrieved from

function getFolderList(doclist) {
	/*
  for(x = 0; x < doclist.length; x++) {
    doclist[x] = doclist[x].replace(/\./g, "");
  }
  */

	var folderlist = new Array(doclist.length);

	for (var it in itemDatabase) {
		var item = itemDatabase[it];
		var qid = item.qid;

		var idx = $.inArray(qid, doclist);
		if (idx > -1) {
			folderlist[idx] = item.fld;
		}
	}
	return folderlist.toString();
}

function getFilesFromDocs(doclist) {
	docarray = doclist.split(",");
	result = [];

	$.each(itemDatabase, function (a, b) {
		if ($.inArray(b.qid, docarray) > -1) {
			result.push(b.fil);
		}
	});
	return result;
}

function setupOsaButtons(data) {
	$("#pdfPrintLink").attr(
		"href",
		"https://osapdf.doublestruck.eu/data/tbsource.php?doc=" + data.docid
	);
	$("#assignLink").attr(
		"href",
		"https://app.doublestruck.eu/osa/?menu=newassignment&pid=" + launched_subject + "&doc=" + data.docid
	);
}
