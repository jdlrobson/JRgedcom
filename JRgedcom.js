/***
|''Name''|JRgedcom|
|''Description''|Turns a text file GEDCOM into traversable XML.|
|''Version''|0.2.0|
|''Author''|Jon Robson|
|''Source''|https://github.com/jdlrobson/JRgedcom|
|''License''|BSD|
!Notes
Note this implementation is incomplete and may not import all data from a GEDCOM file. It however should import the basic structure of a family tree.
***/
//{{{
var gedcom;
(function($) {
gedcom = {
	_convert_to_timestamp: function(value, time) {
		// TODO: cope with FROM 1 JAN 1980 TO 1 FEB 1982
		// TODO: cope with ABT 1809
		// TODO: cope with time arg
		var timestamp = "000000";
		// STRIP prefixes
		if(value.indexOf("ABT ") > -1) {
			value = value.substr(value.indexOf("ABT ") + "ABT ".length, value.length)
		}
		var parts = value.split(" ");
		if(parts.length === 1) { // assume just a year
			return parts[0] + "0000";
		} else if(parts.length > 1) {
			var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
			var monthid, date;
			if(parts.length > 2) {
				date = parts[0];
				monthid = months.indexOf(parts[1]) + 1;
			} else {
				date = "00";
				monthid = months.indexOf(parts[0]) + 1;
			}
			monthid = monthid < 10 ? "0" + monthid : monthid;
			return parts[2]  + monthid + date + timestamp;
		} else {
			return value;
		}
	},
	_get_info_from_line: function(line) {
		var level, tag, value;
		var m = line.match(/([^ ]*) ([^ ]*) (.*)/);
		if(m) {
			level = m[1]
			tag = m[2];
			value = m[3];
		} else {
			m = line.match(/([^ ]*) ([^ ]*)/);
			if(m) {
				level = m[1];
				tag = m[2];
			}
		}
		var rtn = {level: level, tag: tag, value: value};
		return rtn;
	},
	import: function(text) {
		var g = this;
		var xml = this.toXML(text);
		var tiddlers = {};
		function newTiddler(name) {
			if(name && !tiddlers[name]) {
				tiddlers[name] = { title: name, fields: { spouses: [] } };
			}
		}
		var families = [];
		$('[data-value="INDI"]', xml).each(function(i, el) {
			var name = $(el).attr("data-title");
			var value = $(el).attr("data-value");

			newTiddler(name);
			var title = $('[data-title="NAME"]', el).attr("data-value");
			var surname = title.match(/\/(.*)\//)[1];
			title = title.replace(/\/(.*)\//, "$1") + " (" + name + ")";
			var sex = $('[data-title="SEX"]', el).attr("data-value");
			var dob = $('[data-title="BIRT"] [data-title="DATE"]', el).attr("data-value");
			var dod = $('[data-title="DEAT"] [data-title="DATE"]', el).attr("data-value");
			var dob_time = $('[data-title="BIRT"] [data-title="TIME"]', el).attr("data-value");
			var dod_time = $('[data-title="DEAT"] [data-title="TIME"]', el).attr("data-value");
			var placeofbirth = $('[data-title="BIRT"] [data-title="PLAC"]', el).attr("data-value");
			var placeofdeath = $('[data-title="DEAT"] [data-title="PLAC"]', el).attr("data-value");
			var occupation = $('[data-title="OCCU"]', el).attr("data-value");
			var placeofburial = $('[data-title="BURI"] [data-title="PLAC"]', el).attr("data-value");
			var causeofdeath = $('[data-title="DEAT"] [data-title="CAUS"]', el).attr("data-value");
			tiddlers[name].fields.surname = surname;
			tiddlers[name].title = title;
			if(placeofburial) {
				tiddlers[name].fields.placeofburial = placeofburial;
			}
			if(placeofdeath) {
				tiddlers[name].fields.placeofdeath = placeofdeath;
			}
			if(dob) {
				if(dob.indexOf("ABT ") > -1) {
					tiddlers[name].fields.dobaccuracy = "about";
				}
				tiddlers[name].fields.dob = g._convert_to_timestamp(dob, dob_time);
			}
			tiddlers[name].fields.sex = sex;
			if(dod) {
				if(dod.indexOf("ABT ") > -1) {
					tiddlers[name].fields.dodaccuracy = "about";
				}
				tiddlers[name].fields.dod = g._convert_to_timestamp(dod, dod_time);
			}
			if(placeofbirth) {
				tiddlers[name].fields.placeofbirth = placeofbirth;
			}
			if(occupation) {
				tiddlers[name].fields.occupation = occupation;
			}
			if(causeofdeath) {
				tiddlers[name].fields.causeofdeath = causeofdeath;
			}
		});

		$('[data-value="FAM"]', xml).each(function(i, el) {
			var husb = $('[data-title="HUSB"]', el).attr("data-value");
			var wife = $('[data-title="WIFE"]', el).attr("data-value");
			newTiddler(husb);
			newTiddler(wife);
			$('[data-title="CHIL"]', el).each(function(i, child) {
				var name = $(child).attr("data-value");
				newTiddler(name);
				if(husb) {
					tiddlers[name].fields.father = tiddlers[husb].title;
				}
				if(wife) {
					tiddlers[name].fields.mother = tiddlers[wife].title;
				}
			});
			if(husb && wife) {
				tiddlers[husb].fields.spouses.push(tiddlers[wife].title);
				tiddlers[wife].fields.spouses.push(tiddlers[husb].title);
			}
			var dom = $('[data-title="MARR"] [data-title="DATE"]', el).attr("data-value");
			if(dom) {
				tiddlers[wife].fields.dom = dom;
				tiddlers[husb].fields.dom = dom;
			}
		});
		var tids = [];
		for(var i in tiddlers) {
			if(true) {
				tids.push(tiddlers[i]);
			}
		}
		return tids;
	},
	toXML: function(text) {
		var tree = document.createElement("div");
		tree.setAttribute("title", "root");
		var lines = text.split("\n");
		// lines.length
		var lastNode;
		for(var i = 0; i < lines.length - 1; i++) {
			var line = lines[i];
			var info = gedcom._get_info_from_line(line)
			var tag = info.tag;
			var val = info.value;
			var level = info.level;
			if(tag) {
				if(tag === "CONT") {
					if(lastNode) {
						var newVal = lastNode.getAttribute("data-value") + "\n" + val;
						lastNode.setAttribute("data-value", newVal);
					}
				} else if(tag == "CONC") {
					if(lastNode) {
						var newVal = lastNode.getAttribute("data-value") + val;
						lastNode.setAttribute("data-value", newVal);
					}
				} else {
					var node = document.createElement("div");
					node.setAttribute("data-title", tag);
					if(val) {
						node.setAttribute("data-value", val);
					}
					var levelNo = parseInt(level, 10);
					var parent = tree;
					for(var j = 0; j < levelNo; j++) {
						//console.log(j, levelNo, tree.childNodes);
						parent = parent.childNodes[parent.childNodes.length - 1];
					}
					parent.appendChild(node);
					lastNode = node;
				}
			}
		}
		return tree;
	}
}
})(jQuery);
//}}}
