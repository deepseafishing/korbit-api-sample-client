//	Customization
var config = require('./config.js');

var appPort = config.appPort;
var korbitPseudo = "Korbit";
// Librairies

var express = require('express');
var app = express();
var http = require('http')
	, https = require('https')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
var querystring = require('querystring');

var jade = require('jade');
// var io = require('socket.io').listen(app);
//var pseudoArray = ['admin']; //block the admin username (you can disable it)
var pseudoArray = [];

var btcUserSend = /^send ([0-9.]+) to (.+)$/;
var btcEmailSend = /^send ([0-9.]+) to (\S+@\S+\.\S+)$/;
var btcAddressSend = /^send ([0-9.]+) to ([13mn][a-zA-Z0-9]{26,34})$/;
var btcOrder = /^(buy|sell) ([0-9.]+) at ([0-9.]+)$/;
var krwWithdraw = /^withdraw ([0-9.]+)$/;
var bankRegister = /^register (.+) ([0-9]+)$/;


// Get the access token object.
var tokenMap = {};

var credentials = {
  clientID: config.clientID,
  clientSecret: config.clientSecret,
  site: "https://" + config.apiDomain + ":" + config.apiPort,
  tokenPath: config.tokenPath
};

// Initialize the OAuth2 Library
var OAuth2 = require('simple-oauth2')(credentials);

// Save the access token
function saveToken(pseudo, email, result) {
  console.log("GOT result: " + JSON.stringify(result));
  result.email = email;
  tokenMap[pseudo] = OAuth2.AccessToken.create(result);
};

// Views Options

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set("view options", { layout: false })

app.configure(function() {
	app.use(express.static(__dirname + '/public'));
});

// Render and send the main page

app.get('/', function(req, res){
  res.render('home.jade');
});
server.listen(appPort);
// app.listen(appPort);
console.log("Server listening on port " + appPort);

// Handle the socket.io connections

var users = 0; //count the users

var sendMessage = function(socket, msg) {
	console.log("sending message: " + msg);
	var transmit = {date : new Date().toISOString(), pseudo : korbitPseudo, message : msg}
	socket.emit('message', transmit);
};

var sendProcessing = function(socket) {
	var transmit = {date : new Date().toISOString(), pseudo : korbitPseudo, message : "processing..."}
	socket.emit('message', transmit);
}


io.sockets.on('connection', function (socket) { // First connection

	socket.on('message', function (data) { // Broadcast the message to all

		if(pseudoSet(socket)) {
			console.log("user "+ returnPseudo(socket) +" said \""+data+"\"");
			if (data === 'info') {
				sendProcessing(socket);
				getInfo(socket, sendMessage);
			} else if (data === 'price') {
				sendProcessing(socket);
				getTicker(socket, sendMessage);
			} else if (data === 'wallet') {
				sendProcessing(socket);
				getWallet(socket, sendMessage);
			} else if (data === 'asks' || data === 'bids') {
				sendProcessing(socket);
				getOrders(socket, data, sendMessage);
			} else if (data === 'tx') {
				sendProcessing(socket);
				getTx(socket, sendMessage);
			} else if (data === 'pending orders') {
				sendProcessing(socket);
				getUserOrders(socket, sendMessage);
			} else if (data === 'fills') {
				sendProcessing(socket);
				getUserTx(socket, "fills", sendMessage);
			} else if (data === 'fiats') {
				sendProcessing(socket);
				getUserTx(socket, "krw", sendMessage);
			} else if (data === 'btcs') {
				sendProcessing(socket);
				getUserTx(socket, "btc", sendMessage);
			} else if (data === 'pending fiats') {
				sendProcessing(socket);
				getPending(socket, "fiat", sendMessage);
			} else if (data === 'pending btcs') {
				sendProcessing(socket);
				getPending(socket, "btc", sendMessage);
			} else if (bankRegister.test(data)) {
				sendProcessing(socket);
				var array = data.match(bankRegister);
				postBank(socket, sendMessage, {
					bank: array[1],
					account: array[2]
				});
			} else if (btcAddressSend.test(data)) {
				sendProcessing(socket);
				var array = data.match(btcAddressSend);
				postBtc(socket, sendMessage, {
					size: array[1],
					address: array[2]
				});
			} 
			/*else if (btcEmailSend.test(data)) {
				sendProcessing(socket);
				var array = data.match(btcEmailSend);
				postBtc(socket, sendMessage, {
					size: array[1],
					email: array[2]
				});
			} else if (btcUserSend.test(data)) {
				sendProcessing(socket);
				var array = data.match(btcUserSend);
				
				if (tokenMap[array[2]]) {
					console.log(JSON.stringify(tokenMap[array[2]]));
					postBtc(socket, sendMessage, {
						size: array[1],
						email: tokenMap[array[2]].token.email
					});
				} 
				else {
					sendMessage(socket, "No known user in chat");
				}

				
			} */else if (btcOrder.test(data)) {
				sendProcessing(socket);
				var array = data.match(btcOrder);
				console.log(array);
				postOrder(socket, sendMessage, {
					type: array[1],
					size: array[2],
					price: array[3]
				});
			} else if (krwWithdraw.test(data)) {
				sendProcessing(socket);
				var array = data.match(krwWithdraw);
				postFiat(socket, sendMessage, {
					size: array[1]
				});
			} else {
				var transmit = {date : new Date().toISOString(), pseudo : returnPseudo(socket), message : data};
				socket.broadcast.emit('message', transmit);
			}
		}

	});
	socket.on('setPseudo', function (data) { // Assign a name to the user
		
		var creds = JSON.parse(data);
		var username = creds.username;
		var email = creds.email;
		console.log("Setting pseudo: " + email);
		var password = creds.password;
		if (pseudoArray.indexOf(username) == -1) // Test if the name is already taken
		{
			

			
			socket.set('pseudo', username, function(){
				// to chat without korbit api
				/*
				pseudoArray.push(username);
				users += 1; // Add 1 to the count
				console.log("users: " + users);
				reloadUsers(); // Send the count to all the users
				socket.emit('pseudoStatus', 'ok');
				console.log("user " + username + " connected");
				*/

				
				// Get the access token object for the client
				OAuth2.Password.getToken({
			  	username: email,
					password: password
				}, function(error, result) {
					if (error) {
						console.log("error: " + error);
						socket.emit('pseudoStatus', 'invalid') // Send the error
					} else {
						saveToken(username, email, result);
						pseudoArray.push(username);
						
						users += 1; // Add 1 to the count
						console.log("users: " + users);
						
						reloadUsers(); // Send the count to all the users
		
						socket.emit('pseudoStatus', 'ok');
						console.log("user " + username + " connected");
					}
					
				});
				
				
			});


		}
		else
		{
			socket.emit('pseudoStatus', 'error') // Send the error
		}
	});
	socket.on('disconnect', function () { // Disconnection of the client
		users -= 1;
		reloadUsers();
		if (pseudoSet(socket))
		{
			var pseudo;
			socket.get('pseudo', function(err, name) {
				pseudo = name;
			});
			var index = pseudoArray.indexOf(pseudo);
			pseudo.slice(index - 1, 1);
		}
	});
});

function printPretty(obj) {
	var str = JSON.stringify(obj, undefined, 2); // indentation level = 2
	return str;
}

function callApi(pseudo, path, method, callback, body) {
	var options = {
	  host: config.apiDomain,
	  port: config.apiPort,
	  method: method
	};
	var post_data;
	var nonce = new Date().getTime();
	if (method === 'GET') {
		options.path = path + "?access_token=" + tokenMap[pseudo].token.access_token + "&nonce=" + nonce; 
		if (body) {
			options.path = options.path + "&" + querystring.stringify(body);
		}
	} else if (method === 'POST') {

		options.path = path + "?access_token=" + tokenMap[pseudo].token.access_token + "&nonce=" + nonce;
		//options.body = "access_token=" + token.token.access_token;
		if (body) {
			post_data = querystring.stringify(body);
			options.headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': post_data.length
      }
		}
		
	}
	

	console.log(JSON.stringify(options));

	var post_req = https.request(options, function(result) {
	  console.log('STATUS: ' + result.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(result.headers));
	  result.setEncoding('utf8');
	  result.on('data', function (chunk) {
	    console.log('BODY: ' + chunk);
	    var resp = JSON.parse(chunk);
	    callback(resp);
	  });
	});
	if (post_data) {
		post_req.write(post_data);
	}
	post_req.end();
}

function getTicker(socket, callback) {
	callApi(returnPseudo(socket), "/v1/ticker", "GET", function(resp) {
		callback(socket, "price: " + resp.last + " at " + formatDate(resp.timestamp));
	});
}



function getOrders(socket, type, callback) {
	callApi(returnPseudo(socket), "/v1/orderbook", "GET", function(resp) {
		var orders = resp.bids;
		if (type === 'asks') {
			orders = resp.asks;
		}
		var prettyOrders = "";
		for (var index in orders) {
			value = orders[index];
			prettyOrders = prettyOrders + "[Price: " + value[0] + "KRW, Amt: " + value[2] + "BTC], ";
		};

		callback(socket, prettyOrders);
	});
}

function getTx(socket, callback) {
	callApi(returnPseudo(socket), "/v1/transactions", "GET", function(resp) {
		var pretty = "";

		for (var index in resp) {		
			value = resp[index];
    	pretty = pretty + "[Date: " + formatDate(value.timestamp) + ", Price: " + value.price + "KRW, Amt: " + value.amount + "], ";
		};
		callback(socket, pretty);
	});
}

function getUserOrders(socket, callback) {
	callApi(returnPseudo(socket), "/v1/user/orders/open", "GET", function(resp) {
		var pretty = "";

		for (var index in resp) {		
			value = resp[index];
    	pretty = pretty + "[Date: " + formatDate(value.timestamp) + ", ID: " + value.id + ", Price: " + value.price.price + value.price.currency + ", Amt: " + value.openAmount + "], ";
		};
		callback(socket, pretty);
	});
}

function postOrder(socket, callback, params) {
	var body = {
		currency: "krw"
	}
	if (params.price) {
		body.type="limit";
		body.price=params.price;
	} else {
		body.type="market";
	}
	body.size=params.size;

	callApi(returnPseudo(socket), "/v1/user/orders/" + params.type, "POST", function(resp) {
		if (resp.status === 'success') {
			callback(socket, "Order request complete: " + resp.orderId);
		} else {
			callback(socket, "Order request failed: " + resp.status);
		}
	}, body);
}

function postFiat(socket, callback, params) {
	var body = {
		currency: "krw"
	}
	body.size=params.size;

	callApi(returnPseudo(socket), "/v1/user/fiat/send", "POST", function(resp) {
		if (resp.status === 'success') {
			callback(socket, "Withdrawal request complete: " + resp.transferId);
		} else {
			callback(socket, "Withdrawal request failed: " + resp.status);
		}
	}, body);
}

function postBank(socket, callback, params) {
	var body = {
		currency: "krw",
		bank: params.bank,
		account: params.account
	}
	
	callApi(returnPseudo(socket), "/v1/user/fiat/account/register", "POST", function(resp) {
		if (resp.status === 'success') {
			callback(socket, "Account registration complete");
		} else {
			callback(socket, "Account registration failed: " + resp.status);
		}
	}, body);
}

function postBtc(socket, callback, params) {
	var body = {
		size: params.size
	}
	if (params.email) {
		body.email=params.email;
	} else if (params.address) {
		body.address=params.address;
	}
	
	callApi(returnPseudo(socket), "/v1/user/btc/send", "POST", function(resp) {
		if (resp.status === 'success') {
			callback(socket, "Order request complete: " + resp.transferId);
		} else {
			callback(socket, "Order request failed: " + resp.status);
		}
	}, body);
}

function getPending(socket, type, callback) {
	var body = {};
	if (type === 'fiat') {
		body.currency="krw";
	}
	callApi(returnPseudo(socket), "/v1/user/" + type + "/transfer", "GET", function(resp) {
		var pretty = "";

		for (var index in resp) {		
			value = resp[index];
			if (type === 'fiat') {
				pretty = pretty + value.type == 0 ? "[Deposit": "[Withdrawal" + " Date: " + formatDate(value.timestamp) + ", ID: " + value.id + ", Amt: " + value.size.price + value.size.currency + ", Account: " + value.address.bank + " " + value.address.account + " (" + value.address.owner + ")], ";
			} else if (type === 'btc') {
				pretty = pretty + value.type == 0 ? "[Receive": "[Send" + " Date: " + formatDate(value.timestamp) + ", ID: " + value.id + ", Amt: " + value.size + ", Address: " + value.address + "], ";
			}

		};
		callback(socket, pretty);
	}, body);
}

function getWallet(socket, callback) {
	callApi(returnPseudo(socket), "/v1/user/wallet", "GET", function(resp) {
		var inputs="Inputs => ";
		for (var index in resp.inAddresses) {
			value = resp.inAddresses[index];
			console.log("value: " + value);
			if (value.currency == "krw") {
				inputs = inputs + "[Deposit Account: " + value.address.bank + " " + value.address.account + " (" + value.address.owner + ")], "; 
			} else if (value.currency == "btc") {
				inputs = inputs + "[Wallet BTC Address: " + value.address.address + "], "
			}
		};
		var outputs="Outputs => ";
		for (var index in resp.outAddresses) {
			value = resp.outAddresses[index];
			console.log("value: " + value);
			if (value.currency == "krw") {
				outputs = outputs + "[Withdrawal Account: " + value.address.bank + " " + value.address.account + " (" + value.address.owner + ")], "; 
			} 
		};
		var balance="Balance => ";
		for (var index in resp.balance) {
			value = resp.balance[index];
			console.log("value: " + value);
			balance = balance + value.price + value.currency + ", "
 		};
		

		var pretty = balance + inputs + outputs;
		callback(socket, pretty);
	});
}

function getUserTx(socket, type, callback) {
	var body = {
		category: type
	};

	callApi(returnPseudo(socket), "/v1/user/transactions", "GET", function(resp) {
		var pretty = "";
		for (var index in resp) {
			value = resp[index];
			var category;
			if (value.type == 0) {
				category = "Buy";
			} else if (value.type == 1) {
				category = "Sell";
			} else if (value.type == 2) {
				category = "Deposit";
			} else if (value.type == 3) {
				category = "Withdrawal";
			} else if (value.type == 4) {
				category = "BTC Received";
			} else if (value.type == 5) {
				category = "BTC Sent";
			} else if (value.type == 6) {
				category = "Korbit Received";
			} else if (value.type == 7) {
				category = "Korbit Sent";
			}
			if (category == "Buy" || category == "Sell") {
				pretty = pretty + "[" + category + " Date: " + formatDate(value.completedAt) + ", Price: " + value.price.price + value.price.currency + ", Amt: " + value.amount + "], ";
			} else if (category == "Deposit" || category == "Withdrawal") {
				pretty = pretty + "[" + category + " Date: " + formatDate(value.completedAt) + ", Amt: " + value.price.price + value.price.currency + ", Bank: " + value.address.bank + " " + value.address.account + " ("  + value.address.owner + ")], ";
			} else if (category == "BTC Received") {
				pretty = pretty + "[" + category + " Date: " + formatDate(value.completedAt) + ", Amt: " + value.amount + ", Transaction ID: " + value.btcDetail.transactionId + ")], ";
			} else if (category == "BTC Sent") {
				pretty = pretty + "[" + category + " Date: " + formatDate(value.completedAt) + ", Amt: " + value.amount + ", Address: " + value.address.address + ")], ";
			} else {
				pretty = pretty + "[" + category + " Date: " + formatDate(value.completedAt) + ", Amt: " + value.amount + ", Address: " + value.address.email + ", Transaction ID: " + value.btcDetail.transactionId + ")], ";				
			}

    };
		callback(socket, pretty);
	}, body);
}

function getInfo(socket, callback) {
	callApi(returnPseudo(socket), "/v1/user/info", "GET", function(resp) {
		callback(socket, "name: " + resp.name + ", email: " + resp.email + ", phone: " + resp.phone);
	});
}

function formatDate(timestamp) {
	var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
	d.setUTCSeconds(timestamp/1000);
	return d.toString();
}



function reloadUsers() { // Send the count of the users to all
	io.sockets.emit('nbUsers', {"nb": users, "usernames": pseudoArray.toString()});
}

function pseudoSet(socket) { // Test if the user has a name
	var test;
	socket.get('pseudo', function(err, name) {
		if (name == null ) test = false;
		else test = true;
	});
	return test;
}
function returnPseudo(socket) { // Return the name of the user
	var pseudo;
	socket.get('pseudo', function(err, name) {
		if (name == null ) pseudo = false;
		else pseudo = name;
	});
	return pseudo;
}