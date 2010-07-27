RequestRouter
=============
RequestRouter is a very simple HTTP router for Node.js.
How simple? It doesn't care about headers, or HTTP methods, it just parses the URL and delivers it to where it's needed.
It doesn't abstract away from the Node.js http.ServerRequest or http.ServerResponse at all.

Where to start?
===============
You start of with a node, the first one of which is always the root node.
You can compare a node to a directory, a file, or even a virtual file. It can be practically anything.
For example in
http://www.reddit.com/r/wtf/
http://www.reddit.com/ would be the root node
http://www.reddit.com/r/ would be a child of the root node,
http://www.reddit.com/r/wtf/ would be a child-node of http://www.reddit.com/r/

Simple nodes
============
A simple node can be used to represent a text or html object, like this:
	{html:"<html><body><h1>Hello world</h1></body></html>"}
or
	{text:"Hello world!"}
The only difference is that the first will be sent as text/html, whereas the other will be sent as text/plain.

Try it:
	var rr=require("./RequestRouter");
	var httpRoot={text:'Hello world'};
	http.createServer(rr.createRequestHandler(httpRoot)).listen(8000);
And go to
	http://localhost:8000/ and see your Hello world in action!

Child nodes
===========
Obviously, just text or html nodes aren't very much fun. What if you wanted to have a directory with multiple files?
Try this: (replace httpRoot in the previous example)
	var httpRoot={
		children: {
			'file1.txt':{text:"This is file 1"},
			'file2.txt':{text:"This is file 2"}
		}
	};
And check out
	http://localhost:8000/file1.txt
	http://localhost:8000/file2.txt
	
You can nest as far as you want:
	var httpRoot={
		children: {
			'subdir': {
				children: {
					'file2.txt':{text:"This is file 2"},
					'file3.txt':{text:"This is file 3"},
				}
			},
			'file1.txt':{text:"This is file 1"}
		}
	};
And get
	http://localhost:8000/file1.txt
	http://localhost:8000/subdir/file2.txt
	http://localhost:8000/subdir/file3.txt


Index files
===========
Child nodes are fun, but sometimes you want a default index file.
Try this for a static index:
	var httpRoot={
		text: 'Directory index',
		children: {
			'file1.txt':{text:"This is file 1"},
			'file2.txt':{text:"This is file 2"}
		}
	};
And check out
	http://localhost:8000/
	http://localhost:8000/file1.txt
	http://localhost:8000/file2.txt
	
In traditional web servers, you always get index.html when you ask for the directory,
That, too, is possible:
	var httpRoot={
		index: 'index.html',
		children: {
			'index.html':{html:"<html><body><h1>This is the index</h1></body></html>"},
			'file1.txt':{text:"This is file 1"},
			'file2.txt':{text:"This is file 2"}
		}
	};
Check out
	http://localhost:8000/
	http://localhost:8000/index.html
	http://localhost:8000/file1.txt
	http://localhost:8000/file2.txt
And notice that the first two refer to the same file.

Callback functions
==================
Most of the time, a simple file or directory isn't enough.
For that, you can simply plug in an existing request handler.
A request handler is very similar to the http.Server "request" event that you're probably already used to.
It looks like this:
	function(request,response,unparsed,store) {}
request and response are http.ServerRequest and http.ServerResponse objects,
unparsed is the not yet routed part of the url, and store is an object storing some routing data that will be explained later.
Also it's worth mentioning that createRequestHandler also returns a function of this type, and as such can be nested into other nodes.
Example:
	function myRequest(req,res,unparsed,store) {
		res.writeHead(200,{"Content-Type":"text/plain"});
		res.write("Hello world!\nThe URL parsed was '"+req.url+"', but I didn't actually look at '"+unparsed+"' yet");
		res.end();
	}

	var httpRoot={
		children: {
			'custom': {callback:myRequest}
		}
	};
And try:
	http://localhost:8000/custom/one
	http://localhost:8000/custom/one/two
	http://localhost:8000/custom/one/two/three
	
Non-static children
==================
Sometimes you don't know for sure which sub-nodes a node has.
For example, you'd like
	http://my.blog.com/articles/3/
	http://my.blog.com/articles/6/
But you don't want to manually register each article.
For that, you can write regular expressions against subnodes with a match, store, next set.
Example:
	var httpRoot={
		children: {
			'articles': {
				match: /^([0-9]+)$/,
				store: 'articleId',
				next: {text:"This is article {{articleId}}"}
			}
		}
	}
Try
	http://localhost:8000/articles/123/
	http://localhost:8000/articles/456/
	http://localhost:8000/articles/xyz/ (Should 404)
	
You can also use this from callback functions. The data returned from String.match is stored in the store object. Example:
	function myRequest(req,res,unparsed,store) {
		var articleId=store['articleId'][1];
		res.writeHead(200,{"Content-Type":"text/plain"});
		res.write("Hello world!\nThis is article "+articleId+", the next one would be "+(parseInt(articleId)+1));
		res.end();
	}

	var httpRoot={
		children: {
			'articles': {
				match: /^([0-9]+)$/,
				store: 'articleId',
				next: {callback: myRequest}
			}
		}
	}
Try the same URLs using this :)

Simple sub-nodes
================
You don't have to define it all in one place.
For example, you set up a nice blog, and a nice webpage, and want to merge them in the same app.
Simply:
	var homeRoot={...}; //Previous root of home
	var blogRoot={...}; //Previous root of blog
	var httpRoot={
		children: {
			'blog': blogRoot,
			'home': homeRoot
		}
	}

You can even simply split things in different modules:
	var blog=require("./blog");
	var home=require("./home");

	var httpRoot={
		children: {
			'blog': blog.root,
			'home': home.root
		}
	};