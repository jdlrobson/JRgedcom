/***
|''Name''|GEDCOMImporterPlugin|
|''Description''|Imports gedcom files into tiddlywiki|
|''Version''|0.2.1|
|''Requires''|JRGgedcom.js|
|''Author''|Jon Robson|
|''License''|BSD|
***/
//{{{
(function($) {
var macro = config.macros.gedcomImport = {
	locale: {
		describe: "Please paste the text of your gedcom file into the box below to import it into this TiddlyWiki"
	},
	handler: function(place) {
		var container = $("<div />").appendTo(place)[0];
		$("<div/>").text(macro.locale.describe).appendTo(container);
		$("<textarea />").appendTo(container);
		$("<button />").appendTo(container).text("import gedcom").click(function(ev) {
			var text = $("textarea", container).val();
			$("textarea", container).val("");
			var tiddlers = gedcom.import(text);
			$(ev.target).attr("disabled", true);
			var save = [];
			for(var i = 0; i < tiddlers.length; i++) {
				var tid = tiddlers[i];
				var tiddler = new Tiddler(tid.title);
				tiddler.text = tid.text || "";
				tiddler.fields = tid.fields;
				if(tid.fields.spouses) {
					tiddler.fields.spouse = String.encodeTiddlyLinkList(tid.fields.spouses);
					delete tiddler.fields.spouses;
				}
				tiddler.tags = tid.tags || [];
				merge(tiddler.fields, config.defaultCustomFields);
				tiddler = store.saveTiddler(tiddler);
				save.push(tiddler);
			}
			autoSaveChanges(null, save)
			refreshAll();
			$(ev.target).attr("disabled", false);
		})
	}
};

})(jQuery);
//}}}
