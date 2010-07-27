var http=require("http");

/**
 * @author fw@hardijzer.nl
 * param {root} Root object to route into.
 */
function createRequestHandler(root) {
	return function(req,res,unparsed,store) {
		unparsed=unparsed || req.url;
		store=store || {};
		var current=root;
		var upstack=[]; //Stack to handle /../ requests
		//Keep parsing the path until current no longer has any children to descend into.
		while (unparsed.length>0 && typeof(current)=="object") {
			if (typeof(current.children)!=="object" && typeof(current.match)!=="function")
				break;
			//If it doesn't start with /, something went terribly wrong
			if (unparsed[0]!="/")
				return sendCodeResponse(res,400);
			//Split off first path-bit
			var split=unparsed.indexOf("/",1);
			var bit;
			if (split===-1) {
				bit=unparsed.substr(1);
				unparsed="";
			} else {
				bit=unparsed.substr(1,split-1);
				unparsed=unparsed.substr(split);
			}
			if (bit=="." || bit=="") //Nonsense, but used, so let's just continue on our journey
				continue;
			if (bit=="..") { //Traverse upwards
				current=upstack.pop() || root;
				continue;
			}
			if (typeof(current.match)==="function") {
				var match=current.match(bit);
				if (match) {
					if (typeof(current.store)==="string" || typeof(current.store)==="number")
						store[current.store]=match;
					if (typeof(current.next)==="object") {
						upstack.push(current);
						current=current.next;
						continue;
					} else {
						return sendCodeResponse(res,415);
					}
				}
			}
			//For now disallow any names that are also on Object.prototype
			//TODO: Allow names like __defineGetter__ or hasOwnProperty, but *only* if they're not that same as the ones on Object.prototype
			if (typeof(current.children)!=="object" || !(bit in current.children) || Object.prototype.hasOwnProperty(bit))
				return sendCodeResponse(res,404);
			upstack.push(current);
			current=current.children[bit];
		}
		//Somehow undefined?
		if (current===undefined)
			return sendCodeResponse(res,404);
		if (typeof(current)!=="object")
			return sendCodeResponse(res,500);
		//Redirect to defined index if possible
		if (typeof(current)==="object" && typeof(current.children)==="object" && typeof(current.index)==="string")
			current=current.children[current.index];
		//Function to pass on to?
		if (typeof(current.callback)==="function")
			return current.callback(req,res,unparsed,store);
		//predefined HTML or Text
		function readStore(tag,name) {
			if (name in store) {
				var match=store[name];
				return store[name][(match.length>1)?1:0];
			}
			return "{{VARIABLE NOT FOUND}}";
		}
		var storeRe=/{{([\w\W]*?)}}/g;
		if (typeof(current.html)=="string")
			return sendTextResponse(res,current.html.replace(storeRe,readStore),"text/html");
		if (typeof(current.text)=="string")
			return sendTextResponse(res,current.text.replace(storeRe,readStore),"text/plain");
		return sendCodeResponse(res,404);
	}
}

function sendTextResponse(res,text,type) {
	res.writeHead(200,{"Content-Type":type||"text/plain","Content-Length":text.length});
	res.write(text);
	res.end();
}

function sendCodeResponse(res,code,message) {
	var msg=http.STATUS_CODES[code];
	var body="<html><head><title>"+code+": "+msg+"</title><head><body><h1>"+code+": "+msg+"</h1>"+(message?("<p>"+message+"</p>"):"")+"</body></html>";
	res.writeHead(code,{"Content-Type":"text/html","Content-Length":body.length});
	res.write(body);
	res.end();
}

//Exports
exports.createRequestHandler=createRequestHandler;