var RequestRouter=require("./RequestRouter");
var http=require("http");

function indexCallback(req,res,unparsed,store) {
	var start=req.url.substr(0,req.url.length-unparsed.length);
	if (start[start.length-1]!="/")
		start+="/";
	var links=Object.keys(this.children).map(function(key) { return '<a href="'+start+key+'">'+key+'</a><br />'; }).join("");
	var body="<html><head><title>Index</title></head><body>"+links+"</body></html>";
	res.writeHead(200,{"Content-Type":"text/html","Content-Length":body.length});
	res.write(body);
	res.end();
}

function callbackFunctionsMyRequest(req,res,unparsed,store) {
	res.writeHead(200,{"Content-Type":"text/plain"});
	res.write("Hello world!\nThe URL parsed was '"+req.url+"', but I didn't actually look at '"+unparsed+"' yet");
	res.end();
}

function nonStaticChildrenCallback(req,res,unparsed,store) {
	var articleId=store['articleId'][1];
	res.writeHead(200,{"Content-Type":"text/plain"});
	res.write("Hello world!\nThis is article "+articleId+", the next one would be "+(parseInt(articleId)+1));
	res.end();
}

var httpRoot={
	callback: indexCallback,
	children: {
		'simpleNodes': {html:"<html><body><h1>Hello world</h1></body></html>"},
		'childNodes': {
			callback: indexCallback,
			children: {
				'file1.txt':{text:"This is file 1"},
				'file2.txt':{text:"This is file 2"}
			}
		},
		'indexFilesStatic': {
			text: 'Directory index',
			children: {
				'file1.txt':{text:"This is file 1"},
				'file2.txt':{text:"This is file 2"}
			}
		},
		'indexFilesRedir': {
			index: 'index.html',
			children: {
				'index.html':{html:"<html><body><h1>This is the index</h1></body></html>"},
				'file1.txt':{text:"This is file 1"},
				'file2.txt':{text:"This is file 2"}
			}
		},
		'callbackFunctions': {
			html: '<html><body><a href="/callbackFunctions/custom/hello-world/">Click here for example</a></body></html>',
			children: {
				'custom':{callback:callbackFunctionsMyRequest}
			}
		},
		'nonStaticChildren': {
			html: '<html><body><a href="/nonStaticChildren/articles/33/">Click here for example</a></body></html>',
			children: {
				'articles': {
					match: /^([0-9]+)$/,
					store: 'articleId',
					next: {text:"This is article {{articleId}}"}
				}
			}
		},
		'nonStaticChildrenCallback': {
			html: '<html><body><a href="/nonStaticChildrenCallback/articles/33/">Click here for example</a></body></html>',
			children: {
				'articles': {
					match: /^([0-9]+)$/,
					store: 'articleId',
					next: {callback:nonStaticChildrenCallback}
				}
			}
		}
	}
};
http.createServer(RequestRouter.createRequestHandler(httpRoot)).listen(8000);